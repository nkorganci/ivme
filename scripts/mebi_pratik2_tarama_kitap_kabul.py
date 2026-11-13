"""One-pass independent compiled-test key and body acceptance.

Unbound topics and failed readings receive a review reason immediately.
No repair, question solving, repeated model attempts or teacher decisions.
"""
import json
import time
import hashlib
from collections import defaultdict
from mebi_pratik2_tam_pdf_tarama import BASE
from mebi_pratik2_genisletilmis_kabul import vision,complete
from mebi_pratik2_govde_model_pilotu import PROMPT
from yks_birlestirme import write_json

ROOT=BASE/'compiled-tarama-crops'
OUT=BASE/'compiled-tarama-acceptance'
SCHEMA={'type':'object','properties':{'testNumber':{'type':'integer'},'answers':{'type':'object','additionalProperties':{'type':'string','enum':list('ABCDE')}},'uncertainty':{'type':'boolean'}},'required':['testNumber','answers','uncertainty'],'additionalProperties':False}


def run():
    OUT.mkdir(exist_ok=True);(OUT/'key-readings').mkdir(exist_ok=True);(OUT/'body-readings').mkdir(exist_ok=True)
    module=vision();sources=json.loads((ROOT/'report.json').read_text(encoding='utf8'))['sources']
    groups={};items=[];review=[]
    for source in sources:
        data=json.loads((ROOT/(source['sourceSha256']+'.json')).read_text(encoding='utf8'))
        groups.update({g['groupId']:g for g in data['keyGroups']});review.extend(data['reviewQueueAdditions'])
        for row in data['items']:
            if row['categoryId']:items.append(row)
            else:review.append({**row,'status':'REVIEW_REQUIRED','reasons':['CONTROLLED_TOPIC_REVIEW_PENDING'],'studentVisible':False})
    by_group=defaultdict(list)
    for row in items:by_group[row['groupId']].append(row)
    accepted=[];done=0;started=time.monotonic();last=started;bucket=-1
    for group_id,rows in by_group.items():
        group=groups[group_id];receipt=OUT/'key-readings'/(group_id+'.json')
        if hashlib.sha256((BASE/group['keyImage']).read_bytes()).hexdigest()!=group['keyImageSha256']:raise ValueError('Compiled key pixels changed')
        if receipt.exists():key=json.loads(receipt.read_text(encoding='utf8'))
        else:
            try:
                value,hit=module.ask('Transcribe the printed test answer key. Do not solve any question. Return the printed TARAMA TESTI number and every numbered answer letter. Include all rows. Set uncertainty true if any identity or answer is unclear.',image=BASE/group['keyImage'],schema=SCHEMA,model='qwen3.5:9b',max_output_tokens=1500)
                answers={str(int(k)):v.strip().upper() for k,v in value.get('answers',{}).items()}
                agreed=value.get('testNumber')==group['testNumber'] and answers==group['answers'] and value.get('uncertainty') is False
                key={'status':'AGREES' if agreed else 'REVIEW_REQUIRED','imageSha256':group['keyImageSha256'],'reading':value,'cacheHit':hit}
            except Exception as error:key={'status':'REVIEW_REQUIRED','imageSha256':group['keyImageSha256'],'errorType':type(error).__name__}
            write_json(receipt,key)
        if key['imageSha256']!=group['keyImageSha256']:raise ValueError('Independent key cache changed')
        for row in rows:
            if hashlib.sha256((BASE/row['image']).read_bytes()).hexdigest()!=row['imageSha256']:raise ValueError('Compiled question crop changed')
            receipt=OUT/'body-readings'/(row['code']+'.json')
            if key['status']!='AGREES':body={'status':'REVIEW_REQUIRED','reason':'INDEPENDENT_PRINTED_TEST_KEY_NOT_AGREED'}
            elif receipt.exists():body=json.loads(receipt.read_text(encoding='utf8'))
            else:
                try:
                    value,hit=module.ask(PROMPT,image=BASE/row['image'],as_json=True,model='qwen3.5:9b',max_output_tokens=256)
                    body={'status':'MODEL_NO_VISIBLE_ISSUE' if complete(value) else 'REVIEW_REQUIRED','imageSha256':row['imageSha256'],'reading':value,'cacheHit':hit}
                except Exception as error:body={'status':'REVIEW_REQUIRED','imageSha256':row['imageSha256'],'errorType':type(error).__name__}
                write_json(receipt,body)
            if body.get('imageSha256',row['imageSha256'])!=row['imageSha256']:raise ValueError('Independent body cache changed')
            if key['status']=='AGREES' and body['status']=='MODEL_NO_VISIBLE_ISSUE':
                accepted.append({**row,'keySecondReading':key,'bodyModelReview':body,'status':'SOURCE_VERIFIED_READY_FOR_INSERT_ONLY','productionImportAllowed':True,
                    'acceptanceBasis':'PRINTED_TEST_IDENTITY_CONTROLLED_CHAPTER_COMPLETE_NATIVE_CHOICES_INDEPENDENT_KEY_LOCAL_BODY'})
            else:review.append({**row,'keySecondReading':key,'bodyModelReview':body,'status':'REVIEW_REQUIRED','reasons':[body.get('reason','BODY_COMPLETENESS_NOT_CONFIRMED')],'studentVisible':False})
            done+=1;now=time.monotonic();current=10*done//len(items)
            if current>bucket or now-last>=300 or done==len(items):
                progress={'completed':done,'total':len(items),'percent':round(100*done/len(items),2),'accepted':len(accepted),'reviewRecords':len(review),'elapsedSeconds':round(now-started,1),'estimatedRemainingSeconds':None}
                write_json(OUT/'progress-current.json',progress)
                with (OUT/'progress.jsonl').open('a',encoding='utf8') as stream:stream.write(json.dumps(progress)+'\n')
                print(json.dumps(progress),flush=True);last=now;bucket=current
    result={'status':'COMPILED_TEST_ONE_PASS_ACCEPTANCE_COMPLETE','accepted':accepted,'reviewQueueAdditions':review,'acceptedCount':len(accepted),'reviewCount':len(review),'questionWrites':0,'teacherApprovalsCreated':0}
    write_json(OUT/'source-pixel-acceptance.json',result);print(json.dumps({k:v for k,v in result.items() if k not in ('accepted','reviewQueueAdditions')}))


if __name__=='__main__':run()
