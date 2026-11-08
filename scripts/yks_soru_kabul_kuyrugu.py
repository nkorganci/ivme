"""Join immutable source evidence into one resumable, unpublished intake queue.

No low similarity score, model support, duplicate group or key alone grants
new-question admission. Existing IDs and original pending locators win.
"""
from collections import Counter,defaultdict
from pathlib import Path
from yks_birlestirme import Store,read_json,write_json,digest,signature
from yks_soru_pilotu import APP,live_bank
from yks_partiler_arasi_tekrar import COHORTS


def disposition(blocks,existing,group,pilot,has_candidates):
    if blocks:return 'BLOCKED_SOURCE_OR_PRINTED_ANSWER_EXCEPTION'
    if len(existing)>1:return 'MULTIPLE_CANONICAL_IDENTITIES_REVIEW_REQUIRED'
    if existing:return 'KEEP_EXISTING_CANONICAL_ID_DO_NOT_REIMPORT'
    if group and not group['preferred']:return 'SAME_SOURCE_QUESTION_GROUP_USE_PREFERRED_LOCATOR'
    if pilot:return 'THREE_QUESTION_ISOLATED_PILOT_ONLY_NOT_PRODUCTION'
    if has_candidates:return 'EXISTING_BANK_CANDIDATE_REVIEW_BEFORE_ANY_NEW_INTAKE'
    return 'ORIGINAL_CONTENT_GRAPHICS_AND_FINE_TOPIC_REVIEW_REQUIRED'


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);inputs={}
    def load(relative):
        file=root/relative;inputs[str(file)]=digest(file);return read_json(file)
    index=load('cross-source-candidates/expanded-with-visual-chemistry/report.json')
    if index['status']!='PASS':raise ValueError('Current complete prepared source index required')
    cards={};packages={};candidate_codes=defaultdict(set);candidate_states={}
    for cohort in COHORTS+['partial-chemistry-comparison','partial-chemistry-visual-comparison']:
        report=load(cohort+'/controlled-repeat-review.json')
        if report['status']!='PASS' or report['bankSnapshotSha256']!=index['bankSnapshotSha256']:raise ValueError('Prepared source cohorts use different bank versions')
        for row in report['results']:
            candidate_codes[row['sourceCode']].update(m['code'] for m in row['exactTextCandidates'])
            candidate_states[row['sourceCode']]=row['status']
    for path,sha in index['sourcePackages'].items():
        if digest(path)!=sha:raise ValueError('Original prepared package changed')
        packages[path]=sha
        for card in read_json(path)['cards']:
            if card['code'] in cards and signature(cards[card['code']])!=signature(card):raise ValueError('Conflicting original source code versions')
            cards[card['code']]=card
    amendments=load('din-question-amendments/report.json');amended_path=amendments['amendedPackage']
    if digest(amended_path)!=amendments['amendedPackageSha256']:raise ValueError('Current amended source package changed')
    packages[amended_path]=amendments['amendedPackageSha256'];superseded={}
    for card in read_json(amended_path)['cards']:
        old=cards[card['code']]
        if old['imageSha256']!=card['originalSourceImageSha256']:raise ValueError('Source amendment does not replace the original frozen version')
        superseded[card['code']]={'imageSha256':old['imageSha256'],'textSha256':old['textSha256']};cards[card['code']]=card
    amended_repeat=load('din-amendment-comparison/controlled-repeat-review.json')
    for row in amended_repeat['results']:
        candidate_codes[row['sourceCode']]={m['code'] for m in row['exactTextCandidates']};candidate_states[row['sourceCode']]=row['status']
    existing=defaultdict(set);references=defaultdict(list);blocks=defaultdict(list);groups={};pending=defaultdict(list);subject_review=set()
    chem=load('partial-chemistry-canonical-reuse/report.json')
    for row in chem['results']:
        if row['canonicalCode']:existing[row['sourceCode']].add(row['canonicalCode']);references[row['sourceCode']].append('partial-chemistry-canonical-reuse/report.json')
    locator=load('partial-chemistry-locator-reuse/report.json')
    for row in locator['results']:
        if row['canonicalCode']:
            existing[row['sourceCode']].add(row['canonicalCode']);references[row['sourceCode']].append('partial-chemistry-locator-reuse/report.json')
    diagnostics=load('diagnostic-official-canonical-reuse/report.json')
    if diagnostics['status']!='COMPLETE' or diagnostics['bankSnapshotSha256']!=index['bankSnapshotSha256']:
        raise ValueError('Finish the current official diagnostic source identity pass before updating the unified queue')
    for row in diagnostics['results']:
        if digest(row['evidencePath'])!=row['evidenceSha256']:raise ValueError('Immutable diagnostic source identity proof changed')
        if row['canonicalCode']:
            existing[row['sourceCode']].add(row['canonicalCode']);references[row['sourceCode']].append('diagnostic-official-canonical-reuse/report.json')
    unions=load('diagnostic-union-canonical-reuse/report.json')
    if unions['status']!='COMPLETE' or unions['bankSnapshotSha256']!=index['bankSnapshotSha256']:
        raise ValueError('Complete current isolated diagnostic union proof required')
    if unions['inputs'][str(root/'diagnostic-official-canonical-reuse/report.json')]!=inputs[str(root/'diagnostic-official-canonical-reuse/report.json')]:
        raise ValueError('Isolated union proof belongs to a different original diagnostic identity pass')
    for row in unions['results']:
        if digest(row['evidencePath'])!=row['evidenceSha256']:raise ValueError('Immutable isolated union source identity proof changed')
        if row['originalPreparedCropContentAccepted'] is not False:raise ValueError('Identity proof cannot accept a prepared crop')
        if row['canonicalCode']:
            existing[row['sourceCode']].add(row['canonicalCode']);references[row['sourceCode']].append('diagnostic-union-canonical-reuse/report.json')
    mocks=load('mock-official-canonical-reuse/report.json')
    if mocks['status']!='COMPLETE' or mocks['bankSnapshotSha256']!=index['bankSnapshotSha256']:
        raise ValueError('Finish the current official mock source identity pass before updating the unified queue')
    for row in mocks['results']:
        if digest(row['evidencePath'])!=row['evidenceSha256']:raise ValueError('Immutable mock source identity proof changed')
        if row['canonicalCodes']:
            existing[row['sourceCode']].update(row['canonicalCodes']);references[row['sourceCode']].append('mock-official-canonical-reuse/report.json')
    mock_unions=load('mock-union-canonical-reuse/report.json')
    if mock_unions['status']!='COMPLETE' or mock_unions['bankSnapshotSha256']!=index['bankSnapshotSha256']:
        raise ValueError('Complete current isolated mock union proof required')
    parent_path=str(root/'mock-official-canonical-reuse/report.json')
    if mock_unions['inputs'][parent_path]!=inputs[parent_path]:raise ValueError('Isolated mock union proof belongs to an old parent pass')
    for row in mock_unions['results']:
        if digest(row['evidencePath'])!=row['evidenceSha256']:raise ValueError('Immutable isolated mock union proof changed')
        if row['originalPreparedCropContentAccepted'] is not False:raise ValueError('Identity proof cannot accept a prepared mock crop')
        if row['canonicalCodes']:
            existing[row['sourceCode']].update(row['canonicalCodes']);references[row['sourceCode']].append('mock-union-canonical-reuse/report.json')
    combined=load('mock-combined-canonical-reuse/report.json')
    if combined['status']!='COMPLETE' or combined['bankSnapshotSha256']!=index['bankSnapshotSha256']:
        raise ValueError('Finish the combined printed-subject source identity pass first')
    for row in combined['results']:
        if digest(row['evidencePath'])!=row['evidenceSha256']:raise ValueError('Immutable combined-subject source identity proof changed')
        if row['sourceSubjectReviewRequired'] is not True:raise ValueError('Source identity cannot accept a combined printed subject')
        subject_review.add(row['sourceCode'])
        if row['canonicalCodes']:
            existing[row['sourceCode']].update(row['canonicalCodes']);references[row['sourceCode']].append('mock-combined-canonical-reuse/report.json')
    exceptions=load('mock-source-exception-identities/report.json')
    if exceptions['status']!='COMPLETE' or exceptions['bankSnapshotSha256']!=index['bankSnapshotSha256']:
        raise ValueError('Finish source-exception identity review before updating the complete queue')
    for row in exceptions['results']:
        if digest(row['evidencePath'])!=row['evidenceSha256']:raise ValueError('Immutable source-exception identity proof changed')
        subject_review.add(row['sourceCode'])
        if row['canonicalCodes']:
            existing[row['sourceCode']].update(row['canonicalCodes']);references[row['sourceCode']].append('mock-source-exception-identities/report.json')
    exact=load('full-question-topics/din/exact-bank-image-review/report.json')
    for row in exact['results']:
        existing[row['sourceCode']].add(row['canonicalCode']);references[row['sourceCode']].append('full-question-topics/din/exact-bank-image-review/report.json')
    selected=load('question-cohort/bounded-pilot-selection.json');pilots={r['sourceCode'] for r in selected['newPilotQuestions']}
    for row in selected['reusedQuestions']:
        existing[row['sourceCode']].add(row['canonicalQuestionCode']);references[row['sourceCode']].append('question-cohort/bounded-pilot-selection.json')
    pairs=load('cross-source-candidates/actual-image-pair-review.json')
    for pair in pairs['results']:
        for member in pair['members']:
            code=member['sourceCode']
            if not pair['printedCorrectOptionAgrees']:blocks[code].append('ACTUALLY_READ_PRINTED_CORRECT_OPTION_CONTENT_CONFLICT')
            else:groups[code]={'groupId':pair['clusterId'],'preferredSourceLocator':pair['preferredSourceLocator'],
                'preferred':code==pair['preferredSourceLocator'],'maximumCanonicalQuestions':1}
    for group in amendments['additionalActuallyReadDuplicateGroups']:
        preferred=min(group['members'],key=lambda c:('din-book-' in c,c));group_id=signature(sorted(group['members']))
        for code in group['members']:groups[code]={'groupId':group_id,'preferredSourceLocator':preferred,'preferred':code==preferred,'maximumCanonicalQuestions':1}
    for row in amendments['results']:
        if row['status']=='PRINTED_IDENTICAL_D_AND_E_OPTIONS_EXCLUDE_NEW_INTAKE':blocks[row['sourceCode']].append('SOURCE_REALLY_PRINTS_IDENTICAL_D_AND_E_OPTIONS')
    for relative in ['pending-source-reuse/report.json','pending-source-reuse/additional-keyed-sources/report.json']:
        for row in load(relative)['results']:
            pending[row['sourceCode']].extend(row['oldPendingRelations'])
            if row['oldPendingRelations']:blocks[row['sourceCode']].append('PRESERVE_ORIGINAL_PENDING_QUEUE_OR_ANSWER_CONFLICT')
    actual_subjects=load('mock-actual-subject-review/333642091490/report.json')
    if actual_subjects['status']!='PASS':raise ValueError('Complete actual source subject readings required')
    actual_subject_by_code={r['sourceCode']:r for r in actual_subjects['results']}
    for code,row in actual_subject_by_code.items():
        if digest(row['sourceImagePath'])!=row['sourceImageSha256']:raise ValueError('Actually reviewed subject image changed')
        if row['sourceSubjectAcceptedForPreparation']:subject_review.discard(code)
    bank,_=live_bank(APP);bank_sha=signature(bank);by_code={q['code']:q for q in bank}
    if bank_sha!=index['bankSnapshotSha256']:raise ValueError('Current canonical bank changed')
    results=[]
    for code,card in sorted(cards.items()):
        if digest(card['image'])!=card['imageSha256']:raise ValueError('Current source question image changed')
        if card['answer'] not in list('ABCDE'):raise ValueError('Question with no original source answer entered the prepared queue')
        for canonical in existing[code]:
            if canonical not in by_code or by_code[canonical]['correct_answer']!=card['answer']:raise ValueError('A proven existing identity has a different current answer')
        state=disposition(blocks[code],existing[code],groups.get(code),code in pilots,bool(candidate_codes[code]))
        results.append({'sourceCode':code,'sourceSha256':card['sourceSha256'],'sourceImageSha256':card['imageSha256'],
            'sourceTextSha256':card['textSha256'],'sourcePrintedAnswer':card['answer'],'status':state,
            'existingCanonicalCodes':sorted(existing[code]),'existingIdentityEvidence':references[code],
            'relatedBankCandidateCodes':sorted(candidate_codes[code]),'controlledCandidateState':candidate_states.get(code),
            'actualDuplicateGroup':groups.get(code),'originalPendingRelations':pending[code],'blocks':blocks[code],
            'supersededVersion':superseded.get(code),'isIsolatedPilotOnly':code in pilots,
            'sourceExam':card['exam'],'examAssociationReviewRequired':any(by_code[c]['exam_type']!=card['exam'] for c in existing[code]),
            'categoryAssociationAccepted':False,
            'actualSourceSubjectReview':actual_subject_by_code.get(code),
            'sourceSubjectReviewRequired':code in subject_review,
            'sourceTopicReviewRequired':code in subject_review or state not in ['KEEP_EXISTING_CANONICAL_ID_DO_NOT_REIMPORT','THREE_QUESTION_ISOLATED_PILOT_ONLY_NOT_PRODUCTION'],
            'productionImportAllowed':False,'teacherApproved':False})
    after,_=live_bank(APP)
    if signature(after)!=bank_sha or any(digest(p)!=sha for p,sha in {**inputs,**packages}.items()):raise ValueError('Queue inputs or canonical bank changed during preparation')
    priority=[r['sourceCode'] for r in results if r['status']=='EXISTING_BANK_CANDIDATE_REVIEW_BEFORE_ANY_NEW_INTAKE']
    output={'status':'PASS','scope':'ALL_CURRENT_PREPARED_QUESTION_IDENTITIES_AND_BLOCKS_ONLY_NOT_FULL_ARCHIVE_ACCEPTANCE',
        'questions':len(results),'sourceDocuments':len({r['sourceSha256'] for r in results}),'states':dict(Counter(r['status'] for r in results)),
        'provenExistingCanonicalIds':len({c for r in results for c in r['existingCanonicalCodes']}),
        'bankSnapshotSha256':bank_sha,'sourcePackages':packages,'inputs':inputs,'results':results,
        'nextIndependentSourceReview':{'scope':'REMAINING_BANK_CANDIDATES_PRESERVE_ORIGINAL_OFFICIAL_SOURCE_LOCATORS','sourceCodes':priority,
            'instruction':'Read actual source images and printed keys; preserve any bank candidate or old pending locator; do not infer NEW or use model topic agreement as admission.'},
        'fullYks07Accepted':False,'fullYks08Accepted':False,'fullYks09Accepted':False,'productionQuestionWrites':0,
        'teacherApproved':False,'toolSha256':digest(Path(__file__))}
    write_json(root/'source-intake-queue/report.json',output);print({k:v for k,v in output.items() if k not in ['sourcePackages','inputs','results','nextIndependentSourceReview']})


if __name__=='__main__':main()
