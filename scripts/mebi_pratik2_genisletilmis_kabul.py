"""Review the next source-bound chapters with cached local vision and pixels.

No question solving, invented teacher approvals, source modifications or DB
writes occur. A failed reading is retained for review and is not retried.
"""
import argparse
import hashlib
import importlib.util
import json
import re
import time
from collections import Counter
import pymupdf
from PIL import Image
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_govde_model_pilotu import PROMPT
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json

OUT=BASE/'expanded-chapter-evidence'


def vision():
    spec=importlib.util.spec_from_file_location('local_vision',APP/'scripts/ollama-sor.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module


def complete(value):
    return (value.get('one_question') is True and value.get('all_five_choices_visible') is True
        and value.get('visible_truncation') is False and value.get('missing_context') is False and value.get('uncertainty') is False)


def negatives(module):
    folder=OUT/'negative-calibration-v2';folder.mkdir(exist_ok=True,parents=True)
    pilot=json.loads((BASE/'single-test-crop-pilot/reviewed-package.json').read_text(encoding='utf8'))['items'][:6]
    results=[]
    for index,row in enumerate(pilot,1):
        image=folder/f'missing-bottom-{index}.png'
        if not image.exists():
            # A percentage may cut only whitespace. Remove the actual printed E
            # option using its native source position, making this a real negative.
            with pymupdf.open(SOURCE/row['relativePath']) as pdf:
                option_lines=[]
                for block in pdf[row['bodyPage']-1].get_text('dict',clip=pymupdf.Rect(row['bodyClip']))['blocks']:
                    for line in block.get('lines',[]):
                        text=''.join(span['text'] for span in line['spans'])
                        if re.search(r'(?:^|\s)E\s*\)',text):option_lines.append(line)
                if not option_lines:raise ValueError('Negative fixture needs an actual E-option position')
                cut=int((min(line['bbox'][1] for line in option_lines)-row['bodyClip'][1])*2)-3
            with Image.open(BASE/row['image']) as source:
                if not 0<cut<source.height:raise ValueError('Invalid negative fixture boundary')
                source.crop((0,0,source.width,cut)).save(image)
        sha=hashlib.sha256(image.read_bytes()).hexdigest();receipt=folder/f'missing-bottom-{index}.json'
        if receipt.exists():
            result=json.loads(receipt.read_text(encoding='utf8'))
            if result['imageSha256']!=sha:raise ValueError('Negative calibration image changed')
        else:
            value,_=module.ask(PROMPT,image=image,as_json=True,model='qwen3.5:9b',max_output_tokens=256)
            result={'imageSha256':sha,'reading':value,'detectedIncomplete':not complete(value),'syntheticNegativeNotForPublication':True}
            write_json(receipt,result)
        results.append(result);print(json.dumps({'stage':'NEGATIVE_CALIBRATION','completed':index,'total':len(pilot),'detectedIncomplete':result['detectedIncomplete']}),flush=True)
    report={'status':'PASS' if all(r['detectedIncomplete'] for r in results) else 'FAIL_NO_BULK_REVIEW_ALLOWED',
        'cases':len(results),'results':results,'sourcePositiveCalibration':'single-test-crop-pilot/body-model-calibration/report.json'}
    write_json(folder/'report.json',report)
    if report['status']!='PASS':raise ValueError('Body model did not detect known truncated questions; bulk review disabled')


def run(negative_only=False):
    module=vision();negatives(module)
    if negative_only:return
    package=json.loads((OUT/'chapter-packages.json').read_text(encoding='utf8'))
    folder=OUT/'body-model-review';folder.mkdir(exist_ok=True)
    cats={r['id']:r for r in json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']}
    items=package['items'];accepted=[];review=list(package['reviewQueueAdditions']);started=time.monotonic();last_log=started;bucket=-1
    documents={};hashed=set()
    try:
        for index,row in enumerate(items,1):
            reasons=[];proofs=[];sha=row['sourceSha256'];path=(SOURCE/row['relativePath']).resolve()
            if not path.is_relative_to(SOURCE):raise ValueError('Source path leaves MEBI scope')
            if sha not in hashed:
                with path.open('rb') as stream:
                    if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Original PDF changed')
                hashed.add(sha);documents[sha]=pymupdf.open(path)
            pdf=documents[sha];category=cats[row['categoryId']]
            for prefix,page,clip,filename in [('body',row['bodyPage'],row['bodyClip'],row['image']),('key',row['keyPage'],row['keyClip'],row['keyImage'])]:
                raw=(BASE/filename).read_bytes();expected=row['imageSha256' if prefix=='body' else 'keyImageSha256']
                if hashlib.sha256(raw).hexdigest()!=expected:raise ValueError('Previously read evidence changed')
                original=pdf[page-1].get_pixmap(matrix=pymupdf.Matrix(2 if prefix=='body' else 3,2 if prefix=='body' else 3),clip=pymupdf.Rect(clip),alpha=False)
                saved=pymupdf.Pixmap(str(BASE/filename))
                same=(original.width,original.height,original.n,original.samples)==(saved.width,saved.height,saved.n,saved.samples)
                if not same:reasons.append(prefix.upper()+'_PIXELS_DIFFER')
                proofs.append({'kind':prefix,'page':page,'clip':clip,'pixelsEqual':same,'pixelSha256':hashlib.sha256(original.samples).hexdigest()})
            header=pdf[0].get_text(clip=pymupdf.Rect(0,0,pdf[0].rect.width,75))
            expected_subject=row['sourceSubject'] or row['subject']
            if normalize(expected_subject) not in normalize(header):reasons.append('PRINTED_SUBJECT_NOT_FOUND')
            if row['exam'] not in header:reasons.append('PRINTED_EXAM_NOT_FOUND')
            if row['keySecondReading']['imageSha256']!=row['keyImageSha256']:reasons.append('INDEPENDENT_KEY_PIXELS_DIFFER')
            receipt=folder/(row['code']+'.json')
            if reasons:result={'status':'REVIEW_REQUIRED','reasons':reasons,'imageSha256':row['imageSha256']}
            elif receipt.exists():
                result=json.loads(receipt.read_text(encoding='utf8'))
                if result['imageSha256']!=row['imageSha256']:raise ValueError('Cached body reading changed')
            else:
                try:
                    value,hit=module.ask(PROMPT,image=BASE/row['image'],as_json=True,model='qwen3.5:9b',max_output_tokens=256)
                    result={'status':'MODEL_NO_VISIBLE_ISSUE' if complete(value) else 'REVIEW_REQUIRED',
                        'imageSha256':row['imageSha256'],'reading':value,'cacheHit':hit}
                except Exception as error:result={'status':'REVIEW_REQUIRED','imageSha256':row['imageSha256'],'errorType':type(error).__name__}
                write_json(receipt,result)
            if result['status']=='MODEL_NO_VISIBLE_ISSUE':
                accepted.append({**row,'bodyModelReview':result,'sourcePixelProofs':proofs,
                    'status':'SOURCE_VERIFIED_READY_FOR_INSERT_ONLY','productionImportAllowed':True,
                    'acceptanceBasis':'REVIEWED_PRINTED_CHAPTER_ORIGINAL_PIXELS_NATIVE_GEOMETRY_TWO_KEYS_CALIBRATED_LOCAL_BODY_REVIEW'})
            else:review.append({**row,'status':'REVIEW_REQUIRED','bodyModelReview':result,'reasons':reasons or ['BODY_COMPLETENESS_NOT_CONFIRMED'],'studentVisible':False})
            now=time.monotonic();current=10*index//len(items)
            if current>bucket or now-last_log>=300 or index==len(items):
                progress={'completed':index,'total':len(items),'percent':round(100*index/len(items),2),
                    'accepted':len(accepted),'review':len(review),'elapsedSeconds':round(now-started,1),'estimatedRemainingSeconds':None}
                with (OUT/'progress.jsonl').open('a',encoding='utf8') as log:log.write(json.dumps(progress)+'\n')
                write_json(OUT/'progress-current.json',progress);print(json.dumps(progress),flush=True);last_log=now;bucket=current
                write_json(OUT/'source-pixel-acceptance.partial.json',{'accepted':accepted,'reviewQueueAdditions':review,'progress':progress})
    finally:
        for pdf in documents.values():pdf.close()
    report={'status':'EXPANDED_CHAPTER_REVIEW_COMPLETE','accepted':accepted,'reviewQueueAdditions':review,
        'acceptedCount':len(accepted),'reviewCount':len(review),'questionWrites':0,'teacherApprovalsCreated':0,
        'byExamSubject':dict(Counter(r['exam']+':'+r['subject'] for r in accepted))}
    write_json(OUT/'source-pixel-acceptance.json',report)
    print(json.dumps({k:v for k,v in report.items() if k not in ('accepted','reviewQueueAdditions')}),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--negative-calibration-only',action='store_true')
    run(parser.parse_args().negative_calibration_only)
