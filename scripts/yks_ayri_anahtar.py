"""Certify a separate official key only for an identical printed test body.

Same title/test number is insufficient: full question-body text AND rendered
pixels must match on every page. A detected chemistry version variant is kept
excluded, with its native differences available for review.
"""
import difflib
import hashlib
from pathlib import Path
import re
import sys
import unicodedata

import pymupdf
from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_pilot_kaynaklari import APP,plain,test_identities
from yks_pilot_sorular import source_lines
from yks_anahtar_cohort import read_pairs,OCR_PAIR
from yks_anahtar_gorsel import transcription
from yks_anahtar_pilotu import api,MODEL
from pdf_ocr_cache import model_hash

CASES={
    '00bf430ac7fd1791287e9d1336bdb55d2306de09373b2ebe024a71b9c6941641':{
        'bookSha256':'ad53e46d182b7028d912625dae1e3a3f0f0b69423fec0fa57169a12647a5073b','exam':'AYT','test':18},
    '142487f3728bc12f347379ccf9ac4098a10ee6b0a3980162a77c58c53d5d89e5':{
        'bookSha256':'89c4c36da8a5a6ec928b69abe5d40649c9b83117633dc53aa9c44b485fddf53b','exam':'TYT','test':4}}


def normalized_body(text):return re.sub(r'\s+','',unicodedata.normalize('NFC',text))


def body_check(left,right):
    if list(left.rect)!=list(right.rect):return {'matches':False,'reason':'PAGE_DIMENSIONS_DIFFER'}
    def body_bottom(page):
        footer=[line['bbox'][1]-4 for line in source_lines(page) if line['bbox'][1]>.9*page.rect.height
            and any(marker in re.sub(r'\s+','',plain(line['text'])) for marker in (
                'ORTAOGRETIMGENELMUDURLUGU','MEBITARAMATESTLERI','DINOGRETIMIGENELMUDURLUGU'))]
        # Never use a percentage that can cut off low options/diagrams. A missing
        # known footer makes this template unsupported rather than weakening the proof.
        return min(footer) if footer else None
    bottom_a=body_bottom(left);bottom_b=body_bottom(right)
    # Synthetic test fixtures have no publication footer, so their complete body
    # is compared to the bottom edge; production sources record the footer below.
    if bottom_a is None and bottom_b is None:bottom_a=bottom_b=left.rect.height
    if bottom_a is None or bottom_b is None or abs(bottom_a-bottom_b)>.1:
        return {'matches':False,'reason':'SOURCE_FOOTER_GEOMETRY_DIFFERS'}
    clip=pymupdf.Rect(30,70,left.rect.width-20,bottom_a)
    a=left.get_text(clip=clip);b=right.get_text(clip=clip)
    text_equal=normalized_body(a)==normalized_body(b)
    pix_a=left.get_pixmap(dpi=144,clip=clip,alpha=False);pix_b=right.get_pixmap(dpi=144,clip=clip,alpha=False)
    sha_a=hashlib.sha256(pix_a.samples).hexdigest();sha_b=hashlib.sha256(pix_b.samples).hexdigest()
    return {'matches':text_equal and sha_a==sha_b,'clipPt':list(clip),'renderDpi':144,
        'questionBodyBottomPt':bottom_a,'rendererVersion':pymupdf.VersionBind,
        'sourceBodyTextSha256':hashlib.sha256(normalized_body(a).encode()).hexdigest(),
        'bookBodyTextSha256':hashlib.sha256(normalized_body(b).encode()).hexdigest(),
        'sourcePixelSha256':sha_a,'bookPixelSha256':sha_b,
        'nativeDifference':list(difflib.unified_diff(a.splitlines(),b.splitlines()))[:24] if not text_equal else []}


def key_section(page,exam,test):
    lines=source_lines(page)
    headers=sorted((line for line in lines if len(test_identities(line['text']))==1),key=lambda l:l['bbox'][1])
    target=[h for h in headers if test_identities(h['text'])=={(exam,test)}]
    if len(target)!=1:return None
    header=target[0];following=[h['bbox'][1] for h in headers if h['bbox'][1]>header['bbox'][1]+1]
    bottom=min(following) if following else page.rect.height*.95
    region=[line for line in lines if header['bbox'][1]-.1<=line['bbox'][1]<bottom-.1]
    text='\n'.join(line['text'] for line in region);rows=read_pairs(text)
    if rows is None:return None
    clip=pymupdf.Rect(min(l['bbox'][0] for l in region)-5,min(l['bbox'][1] for l in region)-5,
        max(l['bbox'][2] for l in region)+5,max(l['bbox'][3] for l in region)+5)&page.rect
    return {'page':page.number+1,'bboxPt':list(clip),'text':text,'answers':rows}


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    root=store.child(state['runId']);key_folder=root/'pdf-on-tarama/key-cohort'
    cohort=read_json(key_folder/'cohort-report.json');sources={r['sourceSha256']:r for r in cohort['results']}
    inventory=next(root/a['path'] for a in state['stages']['YKS-03:full']['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
    groups={g['sha256']:g for g in map(__import__('json').loads,inventory.read_text(encoding='utf-8').splitlines())}
    folder=key_folder/'separate-key';folder.mkdir(exist_ok=True);results=[]
    with process_lock(folder/'.writer.lock'):
        for sha,case in CASES.items():
            source=Path(sources[sha]['sourcePath']);entry=groups[case['bookSha256']]['canonicalCandidate']
            book=Path(entry['root'])/entry['path']
            if entry['kind']!='FILE' or digest(source)!=sha or digest(book)!=case['bookSha256']:raise ValueError('Separate key source inventory changed')
            output=folder/sha[:16];output.mkdir(exist_ok=True)
            with pymupdf.open(source) as doc,pymupdf.open(book) as official:
                identity={(case['exam'],case['test'])}
                if set().union(*(test_identities(p.get_text()) for p in doc))!=identity:raise ValueError('Diagnostic printed test identity differs')
                starts=[p.number for p in official if test_identities(p.get_text())==identity]
                candidates=[]
                for start in starts:
                    if start+len(doc)>len(official):continue
                    checks=[{'sourcePage':i+1,'bookPage':start+i+1,**body_check(p,official[start+i])} for i,p in enumerate(doc)]
                    candidates.append({'startPage':start+1,'checks':checks,'matchedPages':sum(c['matches'] for c in checks)})
                if not candidates:raise ValueError('No printed counterpart body found in official book')
                best=max(candidates,key=lambda c:c['matchedPages'])
                relation={'sourceSha256':sha,'sourcePath':str(source),'officialBookSha256':case['bookSha256'],
                    'officialBookPath':str(book),'exam':case['exam'],'testNumber':case['test'],
                    'sourcePages':len(doc),'bookBodyStartPage':best['startPage'],'bodyChecks':best['checks'],
                    'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False}
                if best['matchedPages']!=len(doc):
                    relation.update(status='EXCLUDED_TEST_VERSION_VARIANT',reason='Same exam/test number, but printed question bodies differ; separate book key cannot be assigned.',answers=None)
                    write_json(output/'relation.json',relation);results.append(relation);continue
                sections=[s for p in official if (s:=key_section(p,case['exam'],case['test']))]
                if len(sections)!=1:raise ValueError('Official separate key section missing or ambiguous')
                section=sections[0];page=official[section['page']-1];crop=output/'printed-key.png'
                pixmap=page.get_pixmap(dpi=220,clip=pymupdf.Rect(section['bboxPt']),alpha=False);pixmap.save(crop)
                ocr_id=signature([digest(crop),model_hash(),'separate-key-crop-tur-ocr-v1',pymupdf.VersionBind])
                ocr_file=output/(ocr_id+'.json')
                if ocr_file.is_file():ocr=read_json(ocr_file)
                else:
                    with pymupdf.open('pdf',pixmap.pdfocr_tobytes(language='tur',tessdata=str(APP/'veri/tessdata'))) as recognized:
                        text=recognized[0].get_text()
                    ocr={'text':text,'cropSha256':digest(crop),'ocrModelSha256':model_hash()};write_json(ocr_file,ocr)
                observed=read_pairs(ocr['text'],OCR_PAIR);method='NATIVE_PLUS_RENDERED_KEY_CROP_OCR';proof=digest(ocr_file)
                if observed!=section['answers']:
                    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
                    models=api('/api/tags')['models'];model=next(m for m in models if m['name']==MODEL)
                    with ModelLease(role='yks-separate-source-key',model=MODEL):
                        try:
                            for active in api('/api/ps').get('models',[]):
                                if active['name']!=MODEL:api('/api/generate',{'model':active['name'],'keep_alive':0})
                            vision=output/'vision';vision.mkdir(exist_ok=True)
                            reading=transcription(model,crop,vision);observed=reading['reading'];proof=reading['evidenceSha256']
                            method='NATIVE_PLUS_INDEPENDENT_QWEN_KEY_CROP'
                            relation['visualEvidence']=reading
                        finally:api('/api/generate',{'model':MODEL,'keep_alive':0})
                agree=observed==section['answers']
                relation.update(status='SEPARATE_OFFICIAL_KEY_VERIFIED' if agree else 'EXCLUDED_SEPARATE_KEY_READING_DISAGREES',
                    keySourcePage=section['page'],keyBboxPt=section['bboxPt'],cropPath=str(crop),cropSha256=digest(crop),
                    method=method,keyEvidenceSha256=proof,nativePrintedAnswers=section['answers'],independentPrintedAnswers=observed,
                    answers=section['answers'] if agree else None)
                write_json(output/'relation.json',relation);results.append(relation)
            if digest(source)!=sha or digest(book)!=case['bookSha256']:raise ValueError('Printed source changed during separate key verification')
        report={'status':'PASS','scope':'SEPARATE_PRINTED_KEY_RELATIONS_WITH_EXACT_BODY_CHECKS','toolSha256':digest(Path(__file__)),
            'results':results,'states':dict(__import__('collections').Counter(r['status'] for r in results)),
            'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False}
        write_json(folder/'separate-key-report.json',report)
    print(__import__('json').dumps({k:v for k,v in report.items() if k!='results'}))


if __name__=='__main__':main()
