"""Independently read printed 3 Adım key rows and accept proved source bodies."""
import argparse
import hashlib
import json
import re
import time
from collections import Counter,defaultdict
from mebi_pratik2_tam_pdf_tarama import BASE,SOURCE
from mebi_pratik2_genisletilmis_kabul import vision,complete
from mebi_pratik2_govde_model_pilotu import PROMPT
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json

ROOT=BASE/'three-step-crops'
OUT=BASE/'three-step-acceptance'
SCHEMA={'type':'object','properties':{'chapterHeading':{'type':'string'},'rowLabel':{'type':'string'},
    'answers':{'type':'object','additionalProperties':{'type':'string','enum':list('ABCDE')}},'uncertainty':{'type':'boolean'}},
    'required':['chapterHeading','rowLabel','answers','uncertainty'],'additionalProperties':False}


def read_key(module,group):
    folder=OUT/'key-readings';folder.mkdir(exist_ok=True,parents=True)
    image=BASE/group['keyImage'];sha=hashlib.sha256(image.read_bytes()).hexdigest()
    if sha!=group['keyImageSha256']:raise ValueError('Source key pixels changed')
    receipt=folder/(group['groupId']+'.json')
    if receipt.exists():
        result=json.loads(receipt.read_text(encoding='utf8'))
        if result['imageSha256']!=sha:raise ValueError('Previously read key image changed')
        return result
    prompt=('Read the PRINTED answer table image. Do not solve any question. '
        'Transcribe only the row labelled '+group['stepToken'][0]+'. ADIM'+(' - '+group['stepToken'][1:] if len(group['stepToken'])>1 else '')+
        '. Keep A/B step variants separate. A row may wrap to a second text line for numbers 11 onward. '
        'Return the exact printed chapter heading (including chapter index), the selected printed row label, '
        'and answers as a JSON object mapping printed question number to printed answer letter. '
        'Do not include another step row. Set uncertainty true when the requested row cannot be read unambiguously.')
    try:
        value,hit=module.ask(prompt,image=image,schema=SCHEMA,model='qwen3.5:9b',max_output_tokens=1200)
        label=normalize(value.get('rowLabel',''));match=re.fullmatch(r'([123]) adim(?: ([ab]))?',label)
        token=match[1]+(match[2].upper() if match and match[2] else '') if match else None
        answers={str(int(k)):v.strip().upper() for k,v in value.get('answers',{}).items()}
        agrees=(token==group['stepToken'] and normalize(value.get('chapterHeading',''))==normalize(group['chapter'])
            and answers==group['answers'] and value.get('uncertainty') is False)
        result={'status':'AGREES' if agrees else 'REVIEW_REQUIRED','imageSha256':sha,'reading':value,
            'parsedStepToken':token,'cacheHit':hit,'method':'INDEPENDENT_LOCAL_VISION_PRINTED_CHAPTER_STEP_KEY_ROW'}
    except Exception as error:result={'status':'REVIEW_REQUIRED','imageSha256':sha,'errorType':type(error).__name__}
    write_json(receipt,result);return result


def run(pilot=False):
    OUT.mkdir(exist_ok=True);module=vision()
    source=ROOT/'native-proof-v3.json';package=json.loads(source.read_text(encoding='utf8'))
    groups={r['groupId']:r for r in package['keyGroups']};by_group=defaultdict(list)
    for row in package['items']:by_group[row['groupId']].append(row)
    order=sorted(by_group,key=lambda g:-sum(r['nativeBodyProofV2']['status']=='FULL_NATIVE_TEXT_NO_SHARED_CONTEXT_OR_GRAPHICS' for r in by_group[g]))
    if pilot:
        chosen=[];seen=set()
        for group_id in order:
            scope=by_group[group_id][0]['exam']+':'+by_group[group_id][0]['subject']
            if scope not in seen:chosen.append(group_id);seen.add(scope)
        chosen=(chosen+[g for g in order if g not in chosen])[:12]
        results=[]
        for index,group_id in enumerate(chosen,1):
            result=read_key(module,groups[group_id]);results.append({'groupId':group_id,**result})
            print(json.dumps({'stage':'NEW_BOOK_KEY_PILOT','completed':index,'total':len(chosen),'status':result['status']}),flush=True)
        write_json(OUT/'key-pilot-report.json',{'status':'COMPLETE','results':results,
            'agreed':sum(r['status']=='AGREES' for r in results),'total':len(results),'questionWrites':0});return
    calibration=json.loads((BASE/'expanded-chapter-evidence/negative-calibration-v2/report.json').read_text(encoding='utf8'))
    if calibration['status']!='PASS':raise ValueError('Visual completeness calibration required')
    accepted=[];review=list(package['reviewQueueAdditions']);started=time.monotonic();last_log=started;bucket=-1;done=0
    body_folder=OUT/'body-readings';body_folder.mkdir(exist_ok=True);verified_sources=set()
    for group_index,group_id in enumerate(order,1):
        group=groups[group_id];key=read_key(module,group)
        rows=by_group[group_id]
        if group['sourceSha256'] not in verified_sources:
            with (SOURCE/group['relativePath']).open('rb') as stream:
                if hashlib.file_digest(stream,'sha256').hexdigest()!=group['sourceSha256']:raise ValueError('Original book changed')
            verified_sources.add(group['sourceSha256'])
        for row in rows:
            done+=1;image=BASE/row['image']
            if hashlib.sha256(image.read_bytes()).hexdigest()!=row['imageSha256']:raise ValueError('Body pixels changed')
            if key['status']!='AGREES':result={'status':'REVIEW_REQUIRED','reason':'INDEPENDENT_PRINTED_KEY_ROW_NOT_AGREED'}
            elif row['nativeBodyProofV2']['status']=='FULL_NATIVE_TEXT_NO_SHARED_CONTEXT_OR_GRAPHICS':
                result={'status':'DETERMINISTIC_NATIVE_BODY_PROVED','basis':row['nativeBodyProofV2']}
            else:
                receipt=body_folder/(row['code']+'.json')
                if receipt.exists():
                    result=json.loads(receipt.read_text(encoding='utf8'))
                    if result['imageSha256']!=row['imageSha256']:raise ValueError('Cached visual body pixels changed')
                else:
                    try:
                        value,hit=module.ask(PROMPT,image=image,as_json=True,model='qwen3.5:9b',max_output_tokens=256)
                        result={'status':'MODEL_NO_VISIBLE_ISSUE' if complete(value) else 'REVIEW_REQUIRED',
                            'imageSha256':row['imageSha256'],'reading':value,'cacheHit':hit}
                    except Exception as error:result={'status':'REVIEW_REQUIRED','imageSha256':row['imageSha256'],'errorType':type(error).__name__}
                    write_json(receipt,result)
            if result['status'] in ('DETERMINISTIC_NATIVE_BODY_PROVED','MODEL_NO_VISIBLE_ISSUE'):
                accepted.append({**row,'keySecondReading':key,'bodyModelReview':result,
                    'bodyReviewMethod':result['status'],'productionImportAllowed':True,
                    'status':'SOURCE_VERIFIED_READY_FOR_INSERT_ONLY',
                    'acceptanceBasis':'PRINTED_CHAPTER_STEP_NATIVE_KEY_INDEPENDENT_KEY_SOURCE_PIXELS_COMPLETE_NATIVE_OR_CALIBRATED_VISUAL_BODY'})
            else:review.append({**row,'bodyReview':result,'keySecondReading':key,'reasons':[result.get('reason','BODY_COMPLETENESS_NOT_CONFIRMED')],
                'status':'REVIEW_REQUIRED','studentVisible':False})
            now=time.monotonic();current=10*done//len(package['items'])
            if current>bucket or now-last_log>=300 or done==len(package['items']):
                progress={'completedBodies':done,'totalBodies':len(package['items']),'percent':round(100*done/len(package['items']),2),
                    'completedKeyGroups':group_index,'totalKeyGroups':len(order),'accepted':len(accepted),'reviewRecords':len(review),
                    'elapsedSeconds':round(now-started,1),'estimatedRemainingSeconds':None}
                with (OUT/'progress.jsonl').open('a',encoding='utf8') as log:log.write(json.dumps(progress)+'\n')
                write_json(OUT/'progress-current.json',progress)
                write_json(OUT/'source-pixel-acceptance.partial.json',{'accepted':accepted,'reviewQueueAdditions':review,'progress':progress})
                print(json.dumps(progress),flush=True);last_log=now;bucket=current
    report={'status':'THREE_STEP_SOURCE_ACCEPTANCE_COMPLETE','accepted':accepted,'reviewQueueAdditions':review,
        'acceptedCount':len(accepted),'reviewCount':len(review),'teacherApprovalsCreated':0,'questionWrites':0,
        'inputSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
        'bodyReviewMethods':dict(Counter(r['bodyReviewMethod'] for r in accepted))}
    write_json(OUT/'source-pixel-acceptance.json',report)
    print(json.dumps({k:v for k,v in report.items() if k not in ('accepted','reviewQueueAdditions')}),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--key-pilot',action='store_true');run(parser.parse_args().key_pilot)
