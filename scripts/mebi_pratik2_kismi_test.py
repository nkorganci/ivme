"""Recover unique keyed bodies without rejecting an entire partial test.

Only the two identified Din books are covered. Conflicting keys remain held;
all original anchors bound crops, including unselected/ambiguous anchors.
No question-bank comparison, answer inference or publication occurs here.
"""
import hashlib
import json
import argparse
import pymupdf
from collections import defaultdict
from copy import deepcopy
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_pdf_tekrar_kapisi import current_decisions,skip_pdf
from yks_birlestirme import write_json,process_lock
import mebi_pratik2_tarama_kitap_kirpim as capture

ROOT=BASE/'partial-test-recovery'
DISCOVERY=BASE/'partial-test-discovery'
CROPS=BASE/'partial-test-crops'
PENDING=BASE/'partial-test-pending-evidence'
PREFIXES=('0d71ed945447d067','3294337d6b620faf')
ALLOWED={'TEST_BODY_KEY_NUMBER_SETS_DIFFER','REPEATED_BODY_IDENTITY_IN_SAME_PRINTED_TEST'}


def select(group,reserved,sha):
    reasons=set(group.get('reasons',[]))
    if not reasons or not reasons<=ALLOWED:return None
    keys=defaultdict(list);bodies=defaultdict(list)
    for key in group['keys']:keys[key['printedNumber']].append(key)
    for body in group['bodies']:
        if body not in bodies[body['printedNumber']]:bodies[body['printedNumber']].append(body)
    if not keys or set(keys)!=set(range(1,max(keys)+1)):return None
    if any(len({k['answer'] for k in cells})!=1 for cells in keys.values()):return None
    if any(k['printedTestHeading'].get('test')!=group['testNumber'] for cells in keys.values() for k in cells):return None
    full=[{'printedNumber':n,'answer':keys[n][0]['answer'],'keyOccurrences':keys[n]} for n in sorted(keys)]
    questions=[]
    for question in full:
        n=question['printedNumber'];code=f'MEBI2-{sha[:12]}-T{group["testNumber"]}-Q{n:03}'
        if len(bodies[n])==1 and code not in reserved:questions.append({**question,'body':bodies[n][0]})
    if not questions:return None
    return {**group,'questions':questions,'keyEvidenceQuestions':full,
            'priorGroupReasons':group['reasons'],'reasons':[],
            'status':'NATIVE_PRINTED_TEST_BINDING_CANDIDATE',
            'bindingScope':'ONLY_UNIQUE_BODY_AND_UNCONFLICTED_FULL_PRINTED_TEST_KEY'}


def run():
    ROOT.mkdir(exist_ok=True);DISCOVERY.mkdir(exist_ok=True);PENDING.mkdir(exist_ok=True)
    target=PENDING/'chapter-packages.json'
    if target.exists():print(json.dumps({'status':'EXISTING_FROZEN_PARTIAL_TEST_PACKAGE'}));return
    reserved=set()
    for path in BASE.glob('*/chapter-packages.json'):
        reserved.update(r['code'] for r in json.loads(path.read_text(encoding='utf8')).get('items',[]))
    # Saved crop identity is administrative coverage, never bank similarity.
    for directory in BASE.glob('*crops*'):
        if not directory.is_dir() or directory==CROPS:continue
        for path in directory.glob('*.json'):
            data=json.loads(path.read_text(encoding='utf8'))
            if isinstance(data,dict):
                reserved.update(r['code'] for r in data.get('items',[])+data.get('crops',[]) if r.get('image') and r.get('code'))
    sources=[];selected=[]
    paths=[next((BASE/'compiled-tarama-discovery').glob(prefix+'*.json')) for prefix in PREFIXES]
    originals=[json.loads(p.read_text(encoding='utf8')) for p in paths]
    decisions=current_decisions(r['sourceSha256'] for r in originals)
    for original,path in zip(originals,paths):
        sha=original['sourceSha256']
        if skip_pdf(sha,decisions):continue
        data=deepcopy(original);count=0
        for index,group in enumerate(original['groups']):
            recovered=select(group,reserved,sha)
            if recovered:
                data['groups'][index]=recovered;count+=len(recovered['questions'])
                selected.append({'sourceSha256':sha,'testNumber':group['testNumber'],
                                 'selectedBodies':len(recovered['questions']),
                                 'fullPrintedAnswers':len(recovered['keyEvidenceQuestions']),
                                 'priorGroupReasons':group['reasons']})
            else:data['groups'][index]['status']='EXISTING_OR_UNRESOLVED_GROUP_NOT_RECAPTURED'
        if not count:continue
        data['originalDiscoverySha256']=hashlib.sha256(path.read_bytes()).hexdigest()
        write_json(DISCOVERY/(sha+'.json'),data)
        sources.append({**{k:v for k,v in original.items() if k not in ('groups','reviewQueueAdditions')},'exam':'AYT' if 'AYT' in original['relativePath'] else 'TYT'})
    capture.OUT=CROPS;capture.run(sources,discovery_dir=DISCOVERY.name)
    rows=[];keys={};reviews=[]
    for source in sources:
        data=json.loads((CROPS/(source['sourceSha256']+'.json')).read_text(encoding='utf8'))
        rows.extend(data['items']);keys.update({g['groupId']:g for g in data['keyGroups']})
        reviews.extend(r for r in data['reviewQueueAdditions'] if r.get('code'))
    write_json(target,{'status':'PARTIAL_TEST_SOURCE_CAPTURE_NOT_PUBLICATION','items':rows,
                      'keyGroups':list(keys.values()),'candidateBodies':len(rows),
                      'questionWrites':0,'teacherApprovalsCreated':0})
    report={'status':'PARTIAL_TEST_CAPTURE_COMPLETE_NOT_ARCHIVE_ACCEPTANCE','selectedGroups':selected,
            'selectedBodies':sum(r['selectedBodies'] for r in selected),'preparedBodies':len(rows),
            'bodyLayoutReview':reviews,'questionComparisons':0,'questionWrites':0,
            'modelCalls':0,'allPrintedQuestionsExtracted':False}
    write_json(ROOT/'report.json',report)
    print(json.dumps({k:v for k,v in report.items() if k!='bodyLayoutReview'}))


def prepare_keys():
    """Read full printed keys once with local OCR; uncertain keys stay held."""
    import mebi_pratik2_arsiv_kabul as admission
    from mebi_pratik2_konu_bekleyen_kanit import NoModelCalls
    admission.OUT=PENDING
    data=json.loads((PENDING/'chapter-packages.json').read_text(encoding='utf8'))
    results=[]
    for group in data['keyGroups']:
        original=(SOURCE/group['relativePath']).resolve()
        if not original.is_relative_to(SOURCE.resolve()):raise ValueError('Source leaves archive')
        with original.open('rb') as stream:
            if hashlib.file_digest(stream,'sha256').hexdigest()!=group['sourceSha256']:raise ValueError('Source changed')
        path=DISCOVERY/(group['sourceSha256']+'.json')
        discovery=json.loads(path.read_text(encoding='utf8'))
        with pymupdf.open(original) as pdf:result=admission.compiled_key(group,pdf,discovery,NoModelCalls())
        results.append({'groupId':group['groupId'],'status':result['status'],
                        'partialDiscovery':str(path.relative_to(BASE)),
                        'partialDiscoverySha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                        'keyImageSha256':group['keyImageSha256']})
    write_json(ROOT/'independent-key-report.json',{'groups':results,'modelCalls':0,'questionWrites':0})
    print(json.dumps({'independentPrintedKeys':results,'modelCalls':0}))


def prepare_words():
    """A separate frozen package for previously uncaptured word-boundary bodies."""
    import mebi_pratik2_sozcuk_kirpim as words
    words.OUT=BASE/'partial-test-word-crops'
    target=BASE/'partial-test-word-pending-evidence/chapter-packages.json'
    if target.exists():return
    words.run(directories=[CROPS.name],prepare=False)
    items=[];groups={}
    for path in words.OUT.glob('*.json'):
        data=json.loads(path.read_text(encoding='utf8'))
        if not isinstance(data,dict):continue
        items.extend(data.get('items',[]));groups.update({g['groupId']:g for g in data.get('keyGroups',[])})
    target.parent.mkdir(exist_ok=True)
    used={r['groupId'] for r in items}
    write_json(target,{'status':'PARTIAL_WORD_BODY_CAPTURE_NOT_PUBLICATION','items':items,
                      'keyGroups':[groups[k] for k in sorted(used)],'candidateBodies':len(items),
                      'questionWrites':0,'teacherApprovalsCreated':0})
    for group_id in used:
        receipt=PENDING/'independent-keys'/(group_id+'.json')
        if receipt.exists():
            dest=target.parent/'independent-keys'/receipt.name;dest.parent.mkdir(exist_ok=True)
            if not dest.exists():
                with dest.open('xb') as stream:stream.write(receipt.read_bytes())


def validate_key_visual(review,group):
    if (review.get('reviewer')!='CURRENT_CODEX_ORIGINAL_PRINTED_KEY_VISUAL_REVIEW'
        or review.get('teacherApproved') is not False
        or review.get('groupId')!=group['groupId'] or review.get('testNumber')!=group['testNumber']
        or review.get('imageSha256')!=group['keyImageSha256']
        or review.get('answers')!=group['answers']):raise ValueError('Visual full-key review differs')


def prepare_combined():
    """Keep earlier frozen failures; seal changed evidence in a new package."""
    folder=BASE/'partial-test-complete-evidence';target=folder/'chapter-packages.json'
    if target.exists():return
    packages=[PENDING,BASE/'partial-test-word-pending-evidence'];rows=[];groups={}
    for package in packages:
        data=json.loads((package/'chapter-packages.json').read_text(encoding='utf8'))
        rows.extend(data['items']);groups.update({g['groupId']:g for g in data['keyGroups']})
    if len(rows)!=len({r['code'] for r in rows}):raise ValueError('Previously captured body selected twice')
    folder.mkdir(exist_ok=True);keys=folder/'independent-keys';keys.mkdir(exist_ok=True)
    visual_path=APP/'scripts/mebi-pratik2-partial-key-visual-review.json'
    visual=json.loads(visual_path.read_text(encoding='utf8'))
    for identity,group in groups.items():
        prior=PENDING/'independent-keys'/(identity+'.json');value=json.loads(prior.read_text(encoding='utf8'))
        if identity==visual['groupId']:
            validate_key_visual(visual,group)
            if hashlib.sha256((BASE/group['keyImage']).read_bytes()).hexdigest()!=visual['imageSha256']:raise ValueError('Original key PNG changed')
            value={'status':'AGREES','imageSha256':visual['imageSha256'],
                   'method':'INDEPENDENT_CURRENT_CODEX_VISUAL_FULL_PRINTED_KEY_READ',
                   'visualReview':visual,'visualReviewSha256':hashlib.sha256(visual_path.read_bytes()).hexdigest(),
                   'priorOcrAttempt':value,'teacherApproved':False}
        write_json(keys/prior.name,value)
    write_json(target,{'status':'PARTIAL_TEST_COMBINED_CHANGED_EVIDENCE_NOT_PUBLICATION','items':rows,
                      'keyGroups':list(groups.values()),'candidateBodies':len(rows),
                      'questionWrites':0,'teacherApprovalsCreated':0})


def seal_scope():
    groups=[];held=[];total=0;selected=0
    for path in DISCOVERY.glob('*.json'):
        data=json.loads(path.read_text(encoding='utf8'))
        for group in data['groups']:
            if not group.get('keyEvidenceQuestions'):continue
            numbers={q['printedNumber'] for q in group['questions']}
            all_numbers={q['printedNumber'] for q in group['keyEvidenceQuestions']}
            total+=len(all_numbers);selected+=len(numbers)
            groups.append({'sourceSha256':data['sourceSha256'],'testNumber':group['testNumber'],
                           'printedAnswers':len(all_numbers),'selectedBodies':len(numbers)})
            for n in sorted(all_numbers-numbers):
                anchors=[a for a in group['bodies'] if a['printedNumber']==n]
                held.append({'sourceSha256':data['sourceSha256'],'relativePath':data['relativePath'],
                             'exam':'AYT' if 'AYT' in data['relativePath'] else 'TYT',
                             'code':f'MEBI2-{data["sourceSha256"][:12]}-T{group["testNumber"]}-Q{n:03}',
                             'answer':next(q['answer'] for q in group['keyEvidenceQuestions'] if q['printedNumber']==n),
                             'testNumber':group['testNumber'],
                             'printedNumber':n,'reason':'SOURCE_BODY_NUMBER_NOT_UNIQUE' if len(anchors)>1 else
                             'PRINTED_KEY_WITHOUT_BODY_ANCHOR' if not anchors else 'EXISTING_CROP_NOT_REGENERATED',
                             'bodyAnchors':anchors,'studentVisible':False})
    if selected+len(held)!=total:raise ValueError('Partial-key scope accounting gap')
    write_json(ROOT/'scope-closure.json',{'status':'SELECTED_THREE_TESTS_ALL_KEY_NUMBERS_ACCOUNTED_NOT_PUBLICATION',
               'groups':groups,'printedAnswerCells':total,'selectedBodyCandidates':selected,
               'unselectedNumberReviews':held,'questionWrites':0,'allPrintedQuestionsExtracted':False})


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--keys',action='store_true');parser.add_argument('--words',action='store_true');parser.add_argument('--combined',action='store_true');args=parser.parse_args()
    with process_lock(BASE/'.jobs/partial-test-recovery.lock'):
        run()
        if args.keys:prepare_keys()
        if args.words:prepare_words()
        if args.combined:prepare_combined()
        seal_scope()
