"""Extract source question crops from verified diagnostic keys; never import them.

Exact numbered sequence, separate option anchors, source test identity and each
crop hash are recorded. A crop with graphics still requires visual acceptance.
"""
from collections import Counter
import hashlib
import io
from pathlib import Path
import re
import importlib.util
import unicodedata

import pymupdf
from PIL import Image
from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_pilot_kaynaklari import APP,source_keys,plain
from pdf_source_reconcile import text_fingerprint
from yks_anahtar_pilotu import SOURCE

VERSION='mebi-two-column-diagnostic-boundaries-v3-formula-extents'
ANCHOR=re.compile(r'^\s*(\d{1,3})(?:\s*[.)](?:\s|$)|\s*$)')
OPTION=re.compile(r'(?:^|\s)([A-E])\s*\)')
SHARED=re.compile(r'\d+\s*[.\-–]+\s*\d+[.\s]*sorular[ıi]',re.I)


def source_lines(page):
    lines=[]
    for block in page.get_text('dict',flags=pymupdf.TEXTFLAGS_TEXT)['blocks']:
        for line in block.get('lines',[]):
            text=''.join(s['text'] for s in line['spans']).strip()
            if text:lines.append({'text':text,'bbox':list(line['bbox'])})
    return lines


def boundaries(lines,width,height):
    # This explicitly supported provider template uses two columns. Work with
    # each page's actual margins (some geography pages shift the right column).
    result=[];rejected=[]
    for col in (0,1):
        possible=[]
        for line in lines:
            match=ANCHOR.match(line['text']);x,y=line['bbox'][:2]
            if match and 0<int(match[1])<=200 and .07*height<y<.91*height and (x>=width/2)==bool(col):
                possible.append({**line,'number':int(match[1])})
        if not possible:continue
        margin=min(row['bbox'][0] for row in possible)
        selected=[row for row in possible if abs(row['bbox'][0]-margin)<=3]
        rejected.extend({**row,'reason':'INDENTED_NUMERIC_CONTENT_NOT_QUESTION_ANCHOR'} for row in possible if row not in selected)
        selected.sort(key=lambda row:(row['bbox'][1],row['bbox'][0]))
        for row in selected:
            top=row['bbox'][1];anchor_top=top
            # A fraction/superscript can start above the question-number baseline.
            # Follow connected source text extents upward; never infer/retype it.
            while True:
                starts=[line['bbox'][1] for line in lines
                    if line['bbox'][0]>=margin-1 and line['bbox'][2]<=(width-24 if col else width/2-3)
                    and line['bbox'][1]<=anchor_top+3 and line['bbox'][3]>=top-2
                    and line['bbox'][1]>.07*height]
                new_top=min([top,*starts])
                if new_top>=top-.01:break
                top=new_top
            row['contentTopPt']=top
        footer_top=min((line['bbox'][1]-4 for line in lines if line['bbox'][1]>.9*height and
            ('ORTAOGRETIMGENELMUDURLUGU' in re.sub(r'\s+','',plain(line['text'])) or
             'MEBITARAMATESTLERI' in re.sub(r'\s+','',plain(line['text'])) or
             'DINOGRETIMIGENELMUDURLUGU' in re.sub(r'\s+','',plain(line['text'])))),default=height*.93)
        for index,row in enumerate(selected):
            end=selected[index+1]['contentTopPt']-5 if index+1<len(selected) else footer_top
            box=[margin-2,row['contentTopPt']-4,width-24 if col else width/2-3,end]
            if box[3]<=box[1]:raise ValueError('Invalid/overlapping question crop bounds')
            result.append({'number':row['number'],'bboxPt':box,'column':col,'anchor':row})
    return result,rejected


def question_sequence(rows,answers):
    actual=[row['number'] for row in rows];expected=[row['number'] for row in answers]
    if actual!=expected or len(set(actual))!=len(actual):raise ValueError('Source question sequence is missing, duplicated, or out of order')


def extract_source(source,folder,visual_inside):
    sha=source['sourceSha256'];file=Path(source['sourcePath'])
    if source['status']!='SOURCE_KEY_VERIFIED' or digest(file)!=sha:raise ValueError('Verified source key/current PDF required')
    folder.mkdir(exist_ok=True);rows=[];rejected=[];cards=[]
    with pymupdf.open(file) as doc:
        page_lines={}
        for page in list(doc)[:source['bodyPageCount']]:
            lines=source_lines(page);page_lines[page.number]=lines
            regions,excluded=boundaries(lines,page.rect.width,page.rect.height)
            rows.extend({**r,'page':page.number+1} for r in regions)
            rejected.extend({**r,'page':page.number+1} for r in excluded)
        question_sequence(rows,source['sourceAnswers'])
        answers={row['number']:row['answer'] for row in source['sourceAnswers']}
        for row in rows:
            number=row['number'];page=doc[row['page']-1];clip=pymupdf.Rect(row['bboxPt']);lines=page_lines[page.number]
            text=page.get_text(clip=clip).strip();options=Counter(OPTION.findall(text))
            key=signature([VERSION,sha,row['page'],list(clip),180,pymupdf.VersionBind])
            code='mebi-'+sha[:12]+'-q'+str(number)
            image=folder/(code+'.webp');cache=folder/(code+'.crop.json')
            reused=False
            if sha==SOURCE:
                original=folder.parent.parent/'soru-pilotu'/SOURCE[:16]
                # Read the previously accepted twelve cards rather than generating
                # another source crop. Their exact source bounding boxes differ
                # only when the new template's geometry requires a fresh review.
                package=read_json(original/'candidates.json')
                prior=next(c for c in package['cards'] if c['printedNumber']==number)
                if prior['bboxPt']==list(clip) and digest(original/prior['image'])==prior['imageSha256']:
                    image=original/prior['image'];reused=True
            if not reused:
                saved=read_json(cache) if cache.is_file() else {}
                if saved.get('cropKey')==key and image.is_file() and digest(image)==saved.get('imageSha256'):
                    reused=True
                else:
                    pixmap=page.get_pixmap(dpi=180,clip=clip,alpha=False)
                    with Image.open(io.BytesIO(pixmap.tobytes('png'))) as picture:picture.save(image,format='WEBP',lossless=True)
                    write_json(cache,{'cropKey':key,'imageSha256':digest(image),'sourceSha256':sha,'pdfPage':row['page'],
                        'bboxPt':list(clip),'renderer':'pymupdf-'+pymupdf.VersionBind,'dpi':180})
            figures,ink=visual_inside(page,clip,lines)
            concerns=[]
            if options!=Counter('ABCDE'):concerns.append('OPTION_ANCHORS_NOT_EXACTLY_A_TO_E')
            if '\ufffd' in text or any(unicodedata.category(c)=='Co' for c in text):concerns.append('NATIVE_GLYPH_REQUIRES_VISUAL_READING')
            if SHARED.search(text):concerns.append('SHARED_PASSAGE_REQUIRES_EXPLICIT_CONTEXT_CROP')
            cards.append({'code':code,'sourceSha256':sha,'printedNumber':number,'pdfPage':row['page'],
                'bboxPt':list(clip),'image':str(image.resolve()),'imageSha256':digest(image),'cropCacheHit':reused,
                'text':text,'textSha256':hashlib.sha256(text.encode()).hexdigest(),'textFingerprint':text_fingerprint(text),
                'answer':answers[number],'sourceKeyPage':source['sourceKeyPage'],'keyEvidenceSha256':source['keyEvidenceSha256'],
                'sourceKeyDocumentSha256':source['sourceKeyDocumentSha256'],'sourceKeyPath':source['sourceKeyPath'],
                'answerOrigin':'EXPLICIT_PRINTED_SOURCE_KEY','answerReadingMethods':source['method'],
                'exam':source['exam'],'printedExamScopes':source['printedExamScopes'],'subjectId':source['subjectId'],
                'subject':source['subject'],'testId':source['testId'],'optionCounts':dict(options),
                'containsGraphics':figures,'darkInkAfterMaskingText':ink,'reviewConcerns':concerns,
                'cropAcceptance':'AUTOMATED_BOUNDARY_CHECK_ONLY','topicAssignment':'NOT_YET_VERIFIED',
                'importDecision':'NOT_ACCEPTED_FOR_IMPORT','teacherApproved':False})
    if digest(file)!=sha:raise ValueError('Original PDF changed during crop generation')
    package={'status':'PREPARED','extractorVersion':VERSION,'sourceSha256':sha,'sourcePath':str(file),
        'sourceKeyEvidenceSha256':source['keyEvidenceSha256'],'questionCount':len(cards),'cards':cards,
        'excludedNumericContent':rejected,'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False}
    write_json(folder/'candidates.json',package)
    return package


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    key_folder=store.child(state['runId']+'/pdf-on-tarama/key-cohort')
    sources=source_keys(key_folder)
    folder=store.child(state['runId']+'/question-cohort');folder.mkdir(exist_ok=True)
    spec=importlib.util.spec_from_file_location('pdf_metin',APP/'scripts/pdf-metin.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    with process_lock(folder/'.writer.lock'):
        results=[]
        for source in sources:
            if source['status']!='SOURCE_KEY_VERIFIED':
                results.append({'sourceSha256':source['sourceSha256'],'status':'EXCLUDED_NO_VERIFIED_SOURCE_KEY','reason':source['exclusionReason']});continue
            destination=folder/source['sourceSha256'][:16]
            try:
                package=extract_source(source,destination,module.visual_inside)
                result={'sourceSha256':source['sourceSha256'],'status':'PREPARED','questionCount':package['questionCount'],
                    'package':str(destination/'candidates.json'),'packageSha256':digest(destination/'candidates.json'),
                    'graphicQuestions':sum(c['containsGraphics'] for c in package['cards']),
                    'concernQuestions':sum(bool(c['reviewConcerns']) for c in package['cards'])}
                print(f'Source questions: {source["exam"]} {source["subject"]}: {package["questionCount"]} prepared',flush=True)
            except ValueError as exc:
                result={'sourceSha256':source['sourceSha256'],'status':'EXCLUDED_BOUNDARY_REVIEW_REQUIRED','reason':str(exc)}
                print('Boundary review required: '+str(exc),flush=True)
            results.append(result)
            write_json(folder/'progress.json',{'status':'RUNNING','results':results})
        report={'status':'PASS','scope':'REPRESENTATIVE_DIAGNOSTIC_SOURCE_CROP_PREPARATION_ONLY',
            'states':dict(Counter(r['status'] for r in results)),'questionsPrepared':sum(r.get('questionCount',0) for r in results),
            'graphicQuestions':sum(r.get('graphicQuestions',0) for r in results),'concernQuestions':sum(r.get('concernQuestions',0) for r in results),
            'keyScopeSignature':signature(sources),'extractorVersion':VERSION,'toolSha256':digest(Path(__file__)),
            'sourceWrites':0,'questionBankWrites':0,'questionsAccepted':0,'teacherApproved':False,'results':results}
        write_json(folder/'source-crop-report.json',report)
        write_json(folder/'progress.json',{'status':'PASS','results':results})
    print(__import__('json').dumps({k:v for k,v in report.items() if k!='results'}))


if __name__=='__main__':main()
