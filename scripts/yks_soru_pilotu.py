"""Extract twelve source-backed diagnostic cards and compare the entire live bank.

Read-only preparation: source key proof, crops, native text and duplicate
candidates. A low similarity is not an automatic NEW/import decision.
"""
from collections import Counter
import hashlib
import io
import json
from pathlib import Path
import re

import joblib
import numpy as np
from PIL import Image
import pymupdf
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer

from yks_birlestirme import Store,digest,read_json,signature,write_json
from yks_anahtar_pilotu import SOURCE
from yks_stages.database import Snapshot,connection
from pdf_source_scan import read_scan
from pdf_question_duplicates import fingerprint,VERSION as IMAGE_VERSION
from pdf_source_reconcile import text_fingerprint
from yks_cevap_on_tarama import normalized

APP=Path(__file__).resolve().parents[1]
OUT=APP/'veri/pdf-source-registry'


def comparable_bank_text(native,ocr):
    text=native or ''
    if sum(c.isalpha() for c in ocr or '')>sum(c.isalpha() for c in text):text=ocr
    return text if len(text.strip())>30 else None


def crop_cards(source,folder,answer_report,answers):
    if answer_report['status']!='PASS' or answer_report['sourceSha256']!=SOURCE or answer_report['answers']!=12:
        raise ValueError('Independent printed-key readings must agree first')
    observed=read_scan(SOURCE);cards=[]
    with pymupdf.open(source) as document:
        for row in observed['pages'][:-1]:
            page=document[row['page']-1]
            anchors=row['anchors']
            footer_top=page.rect.height-30
            for block in page.get_text('dict',flags=pymupdf.TEXTFLAGS_TEXT)['blocks']:
                for line in block.get('lines',[]):
                    title=normalized(''.join(s['text'] for s in line['spans']))
                    if line['bbox'][1]>page.rect.height*.9 and (title=='ortaogretimgenelmudurlugu' or title.startswith('mebitaramatestleri')):
                        footer_top=min(footer_top,line['bbox'][1]-4)
            for column in (0,1):
                subset=sorted((a for a in anchors if (a['bbox'][0]>=page.rect.width/2)==bool(column)),key=lambda a:a['bbox'][1])
                for index,anchor in enumerate(subset):
                    number=anchor['number']
                    # The provider watermark runs vertically outside the common
                    # question-number margin; keep it outside the source crop.
                    left=min(a['bbox'][0] for a in subset)-2
                    right=page.rect.width-24 if column else page.rect.width/2-3
                    bottom=subset[index+1]['bbox'][1]-5 if index+1<len(subset) else footer_top
                    clip=pymupdf.Rect(left,anchor['bbox'][1]-4,right,bottom)
                    text=page.get_text(clip=clip).strip()
                    if Counter(re.findall(r'(?:^|\s)([A-E])\s*\)',text))!=Counter('ABCDE'):
                        raise ValueError(f'Pilot question {number} lacks exactly five source options')
                    code='mebi-'+SOURCE[:12]+'-q'+str(number)
                    image=folder/(code+'.webp')
                    pixmap=page.get_pixmap(dpi=180,clip=clip,alpha=False)
                    with Image.open(io.BytesIO(pixmap.tobytes('png'))) as picture:
                        picture.save(image,format='WEBP',lossless=True)
                    cards.append({'code':code,'printedNumber':number,'pdfPage':row['page'],'bboxPt':list(clip),
                        'text':text,'textSha256':hashlib.sha256(text.encode()).hexdigest(),
                        'textFingerprint':text_fingerprint(text),'answer':answers[number],
                        'answerMethodA':answers[number],'answerMethodB':answers[number],
                        'answerEvidenceSha256':signature(answer_report),'image':image.name,'imageSha256':digest(image),
                        'teacherApproved':False,'importDecision':'NOT_DECIDED'})
    cards.sort(key=lambda c:c['printedNumber'])
    if [c['printedNumber'] for c in cards]!=list(range(1,13)):
        raise ValueError('Pilot source question sequence is incomplete/duplicated')
    return cards


def live_bank(app):
    cmd,env=connection(app)
    with Snapshot(cmd,env) as snapshot:
        questions=json.loads(snapshot.execute("""SELECT json_agg(x ORDER BY code) FROM (
           SELECT code,image,exam_type,subject,correct_answer,extract(epoch FROM updated_at)::text stamp
           FROM questions WHERE active AND exam_type IN ('TYT','AYT')) x;"""))
        ocr=json.loads(snapshot.execute("""SELECT coalesce(json_agg(x),'[]') FROM (
           SELECT DISTINCT ON(o.question_code) o.question_code,o.observations->>'text' text
           FROM learning_catalog.question_content_observations o JOIN questions q ON q.code=o.question_code
           AND extract(epoch FROM q.updated_at)::text=o.observations->>'questionStamp'
           WHERE q.active AND q.exam_type IN ('TYT','AYT') ORDER BY o.question_code,o.recorded_at DESC) x;"""))
    return questions,{r['question_code']:r['text'] for r in ocr}


def compare(cards,folder,source_sha=SOURCE,shared_cache_folder=None):
    questions,ocr=live_bank(APP);stamp=signature(questions)
    cached=read_json(OUT/'bank-image-fingerprints.json')
    if cached['version']!=IMAGE_VERSION:raise ValueError('Unknown bank image fingerprint version')
    visual_by_code={r['code']:r for r in cached['images']}
    image_root=(APP/'veri/resimler-pilot').resolve()
    for question in questions:
        path=(image_root/question['image']).resolve()
        if not path.is_relative_to(image_root) or not path.is_file():raise ValueError('Live bank image missing/unsafe')
        stat=path.stat();expected=f"{question['stamp']}:{stat.st_size}:{stat.st_mtime_ns}"
        if visual_by_code.get(question['code'],{}).get('stamp')!=expected or visual_by_code[question['code']].get('error'):
            raise ValueError('Bank visual comparison evidence is incomplete/stale: '+question['code'])
    original=read_json(APP/'veri/content-labels/source-inventory.json')
    original={q['code']:q.get('original',{}).get('text','') for q in original['questions']}
    bank=[];no_text=[]
    for question in questions:
        code=question['code'];text=comparable_bank_text(original.get(code,''),ocr.get(code,''))
        if text is not None:bank.append((code,text))
        else:no_text.append(code)
    cache=OUT/'text-comparison';cache.mkdir(exist_ok=True)
    key=hashlib.sha256(json.dumps(bank,ensure_ascii=False).encode()).hexdigest()
    cache_stamp=cache/'stamp.txt'
    own_stamp=folder/'bank-text-stamp.json'
    saved=read_json(own_stamp) if own_stamp.is_file() else {}
    if saved.get('bankTextSha256')==key and all((folder/name).is_file() and digest(folder/name)==value for name,value in saved.get('files',{}).items()) and len(saved.get('files',{}))==2:
        vectorizer=joblib.load(folder/'bank-vectorizer.joblib');matrix=sparse.load_npz(folder/'bank-text.npz');cache_hit=True
    elif cache_stamp.is_file() and cache_stamp.read_text()==key:
        vectorizer=joblib.load(cache/'vectorizer.joblib');matrix=sparse.load_npz(cache/'bank.npz');cache_hit=True
    elif shared_cache_folder is not None and (Path(shared_cache_folder)/'bank-text-stamp.json').is_file():
        shared=Path(shared_cache_folder);proof=read_json(shared/'bank-text-stamp.json')
        if proof.get('bankTextSha256')==key and len(proof.get('files',{}))==2 and not any(
            not (shared/name).is_file() or digest(shared/name)!=sha for name,sha in proof['files'].items()):
            vectorizer=joblib.load(shared/'bank-vectorizer.joblib');matrix=sparse.load_npz(shared/'bank-text.npz');cache_hit=True
        else:cache_hit=False
    else:cache_hit=False
    if not cache_hit:
        vectorizer=TfidfVectorizer(ngram_range=(1,2),max_features=250000,sublinear_tf=True,dtype=np.float32)
        matrix=vectorizer.fit_transform(text for code,text in bank).tocsr();cache_hit=False
        # Keep this new bank snapshot separate from the existing accepted batch cache.
        joblib.dump(vectorizer,folder/'bank-vectorizer.joblib');sparse.save_npz(folder/'bank-text.npz',matrix)
        write_json(own_stamp,{'bankTextSha256':key,'files':{name:digest(folder/name) for name in ['bank-vectorizer.joblib','bank-text.npz']}})
    similarities=(vectorizer.transform(c['text'] for c in cards)@matrix.T).tocsr()
    visuals=[visual_by_code[q['code']] for q in questions];results=[]
    for index,card in enumerate(cards):
        row=similarities.getrow(index);top=np.argsort(row.data)[-8:][::-1]
        text_matches=[{'code':bank[row.indices[n]][0],'similarity':round(float(row.data[n]),6)} for n in top if row.data[n]>.2]
        fp=fingerprint((card['code'],str(folder/card['image']),source_sha or card['sourceSha256']))
        if fp.get('error'):raise ValueError('Pilot crop visual fingerprint failed')
        phash=int(fp['phash'],16);matches=[]
        for visual in visuals:
            distance=(phash^int(visual['phash'],16)).bit_count()
            exact=fp['fileSha256']==visual['fileSha256'] or fp['normalizedSha256']==visual['normalizedSha256']
            if exact or distance<=12:matches.append({'code':visual['code'],'distance':distance,'exactImage':exact})
        matches.sort(key=lambda m:(not m['exactImage'],m['distance'],m['code']))
        results.append({'sourceCode':card['code'],'textMatches':text_matches,'visualMatches':matches[:20],
                        'visualMatchCount':len(matches),'decision':'REVIEW_REQUIRED','fingerprint':fp})
    after,_=live_bank(APP)
    if signature(after)!=stamp:raise ValueError('Bank changed during pilot comparison')
    report={'status':'PASS','scope':'DUPLICATE_CANDIDATES_ONLY','sourceSha256':source_sha,
            'bankSnapshotSha256':stamp,'bankQuestions':len(questions),'bankImagesCompared':len(visuals),
            'bankTextsCompared':len(bank),'bankQuestionsWithoutComparableText':no_text,
            'bankTextCacheHit':cache_hit,'bankTextSha256':key,'candidates':results,'newDecisions':0,'questionsInserted':0,
            'note':'Similarity and visual distance are candidates. Every MATCH/NEW needs source and option comparison.'}
    write_json(folder/'bank-comparison.json',report);return report


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    key_folder=store.child(state['runId']+'/pdf-on-tarama/key-pilot/'+SOURCE)
    answer_report=read_json(key_folder/'key-pilot-report.json');source_evidence=read_json(key_folder/'source-key.json')
    source=Path(source_evidence['sourcePath'])
    if digest(source)!=SOURCE:raise ValueError('Pilot source bytes changed')
    folder=store.child(state['runId']+'/soru-pilotu/'+SOURCE[:16]);folder.mkdir(parents=True,exist_ok=True)
    answers={r['number']:r['answer'] for r in source_evidence['nativeTextReading']}
    cards=crop_cards(source,folder,answer_report,answers)
    write_json(folder/'candidates.json',{'sourceSha256':SOURCE,'questionCount':len(cards),
              'sourcePath':str(source),'answerCheck':'TWO_METHODS_AGREE','cards':cards,
              'extractorVersion':'pymupdf-'+pymupdf.VersionBind+'-two-column-diagnostic-pilot-v1','teacherApproved':False})
    print('Pilot: extracted 12 source-backed question crops; comparing live bank',flush=True)
    report=compare(cards,folder)
    print(json.dumps({k:v for k,v in report.items() if k not in ('candidates','bankQuestionsWithoutComparableText')}),flush=True)
    print('Bank questions without comparable text:',len(report['bankQuestionsWithoutComparableText']),flush=True)


if __name__=='__main__':main()
