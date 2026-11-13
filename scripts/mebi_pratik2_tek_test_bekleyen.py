"""Account for remaining individual tests without repeating accepted questions."""
import hashlib
import json
from collections import Counter
from mebi_pratik2_tam_pdf_tarama import BASE
from yks_birlestirme import write_json,process_lock

OUT=BASE/'single-test-pending-evidence'


def run():
    OUT.mkdir(exist_ok=True);target=OUT/'chapter-packages.json'
    if target.exists():return
    reserved=set()
    for path in BASE.glob('*/chapter-packages.json'):
        reserved.update(r['code'] for r in json.loads(path.read_text(encoding='utf8')).get('items',[]))
    for path in BASE.rglob('source-pixel-acceptance.json'):
        reserved.update(r['code'] for r in json.loads(path.read_text(encoding='utf8')).get('accepted',[]))
    crops=json.loads((BASE/'single-test-crops/manifest.json').read_text(encoding='utf8'))['crops']
    geometry={(r['sourceSha256'],r['printedNumber']):r for r in json.loads((BASE/'single-test-crops/geometry-report.json').read_text(encoding='utf8'))['rows']}
    topics={r['sourceSha256']:r for r in json.loads((BASE/'single-test-crops/topic-candidates.json').read_text(encoding='utf8'))['rows']}
    items=[];groups=[]
    for crop in crops:
        sha=crop['sourceSha256'];number=crop['printedNumber'];code=f'MEBI2-{sha[:16]}-Q{number:03}'
        if code in reserved or geometry[(sha,number)]['status']!='NATIVE_GEOMETRY_ONLY_PASS':continue
        for field,checksum in [('image','imageSha256'),('keyImage','keyImageSha256')]:
            path=(BASE/crop[field]).resolve()
            if not path.is_relative_to(BASE.resolve()) or hashlib.sha256(path.read_bytes()).hexdigest()!=crop[checksum]:
                raise ValueError('Single-test evidence changed')
        topic=topics[sha];gid=sha[:16]+'-SINGLE-PENDING-Q'+str(number)
        groups.append({'groupId':gid,'sourceSha256':sha,'relativePath':crop['relativePath'],'keyIdentityType':'SINGLE_TEST_PRINTED_NUMBER',
            'sourceQuestionCode':code,'keyPage':crop['keyPage'],'keyClip':crop['keyClip'],'keyImage':crop['keyImage'],
            'keyImageSha256':crop['keyImageSha256'],'answers':{str(number):crop['answer']}})
        items.append({**crop,'code':code,'groupId':gid,'exam':topic['exam'],'subject':topic['lesson'],
            'subjectCandidates':[topic['lesson']],'categoryId':None,'subjectId':None,'topic':None,'unit':None,
            'sourceTopicCandidates':topic['matches'],'reasons':['FINE_TOPIC_NOT_YET_VERIFIED'],
            'teacherApproved':False,'studentVisible':False,'productionImportAllowed':False})
    write_json(target,{'status':'SINGLE_TEST_TOPIC_PENDING_EVIDENCE_NOT_PUBLISHED','items':items,'keyGroups':groups,
        'candidateBodies':len(items),'excludedReservedOrAdmittedCodes':len(reserved),'questionWrites':0,'teacherApprovalsCreated':0})
    print(json.dumps({'candidateBodies':len(items),'questionWrites':0}),flush=True)


def prime_keys():
    from mebi_pratik2_dort_dortluk_anahtar import read_key
    data=json.loads((OUT/'chapter-packages.json').read_text(encoding='utf8'));counts=Counter();bodies=Counter()
    for index,group in enumerate(data['keyGroups'],1):
        receipt=read_key(group,None,None,OUT);counts[receipt['status']]+=1
        old=BASE/'single-test-crops/body-model-review'/(group['sourceQuestionCode']+'.json')
        if old.exists():
            body=json.loads(old.read_text(encoding='utf8'));row=data['items'][index-1]
            bodies[body['status'] if body.get('imageSha256')==row['imageSha256'] else 'DIFFERENT_CROP_HASH_NOT_REUSED']+=1
        else:bodies['NO_PRIOR_BODY_RECEIPT']+=1
        if index%200==0 or index==len(data['keyGroups']):
            print(json.dumps({'completed':index,'total':len(data['keyGroups']),'keyReadings':dict(counts),'priorBodyReceipts':dict(bodies)}),flush=True)
    write_json(OUT/'prior-reading-reuse-report.json',{'status':'IDENTICAL_SINGLE_KEY_PRIOR_READINGS_INDEXED_NOT_PUBLICATION',
        'keyReadings':dict(counts),'priorBodyReceipts':dict(bodies),'newModelCalls':0,'questionWrites':0,'teacherApprovalsCreated':0})


if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--prime-keys',action='store_true');a=p.parse_args()
    with process_lock(BASE/'.jobs/single-test-pending-prepare.lock'):
        prime_keys() if a.prime_keys else run()
