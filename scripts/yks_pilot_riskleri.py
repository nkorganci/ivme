"""Assemble real pilot risk evidence without granting import or cutover approval."""
from pathlib import Path
from yks_birlestirme import Store,digest,read_json,write_json

APP=Path(__file__).resolve().parents[1]


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);folder=root/'pilot-riskleri'
    names={'keyScopes':'pdf-on-tarama/key-cohort/source-key-scope-report.json',
        'separateKey':'pdf-on-tarama/key-cohort/separate-key/separate-key-report.json',
        'mockKeys':'pdf-on-tarama/mock-key-pilot/mock-key-report.json',
        'sharedPassage':'pilot-riskleri/shared-passage/shared-passage-report.json',
        'scannedQuestion':'pilot-riskleri/scanned-question/scanned-question-report.json',
        'permutation':'pilot-riskleri/option-permutation-report.json','zip':'pilot-riskleri/zip-duplicate-report.json',
        'cropIntegrity':'question-cohort/crop-integrity-report.json','duplicates':'question-cohort/controlled-repeat-review.json'}
    proofs={k:read_json(root/name) for k,name in names.items()}
    keys=proofs['keyScopes'];separate=proofs['separateKey'];mock=proofs['mockKeys'];shared=proofs['sharedPassage'];scan=proofs['scannedQuestion'];perm=proofs['permutation'];zip_proof=proofs['zip'];crop=proofs['cropIntegrity']
    if any(p['status']!='PASS' for p in proofs.values()):raise ValueError('A pilot observation report failed')
    if keys['verifiedAnswers']!=387 or mock['pendingSections'] or mock['verifiedPrintedAnswers']!=291:
        raise ValueError('Printed pilot key coverage differs')
    if any(card['contextIds']!=[shared['context']['contextId']] for card in shared['cards']) or len(shared['cards'])!=2:
        raise ValueError('Shared passage not attached to both source questions')
    for entry in [shared['context'],*shared['cards'],*scan['sourceParts']]:
        path=entry.get('image') or entry.get('file');sha=entry.get('imageSha256') or entry.get('sha256')
        if digest(path)!=sha:raise ValueError('Pilot source image evidence changed')
    if scan['nativeQuestionSignal'] or not scan['withOcrQuestionSignal'] or scan['importAccepted']:
        raise ValueError('Raster-only question safety gate differs')
    if not perm['answerContentAgrees'] or perm['sameLetterCanBeCopied'] or perm['questionIdsMerged']:
        raise ValueError('Option permutation safety failed')
    for image in perm['images'].values():
        if digest(image['path'])!=image['sha256']:raise ValueError('Existing permutation question image changed')
    if not zip_proof['exactMemberEqualsStandalone'] or zip_proof['newQuestionSourceCreated']:raise ValueError('ZIP duplicate was treated as a new source')
    if not crop['sourceAndPreparedCropPixelsEqual'] or crop['uncoveredNativeBodyLines']:raise ValueError('Incomplete native/source crop coverage')
    variants=[r for r in separate['results'] if r['status']=='EXCLUDED_TEST_VERSION_VARIANT']
    shared_exam=[r for r in keys['results'] if r.get('printedExamScopes')==['TYT','AYT']]
    if len(variants)!=1 or not shared_exam:raise ValueError('No real source-version/shared-exam counterexample')
    file=next(root/a['path'] for a in state['stages']['YKS-03:full']['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
    partial=next(g for g in map(__import__('json').loads,file.read_text(encoding='utf-8').splitlines())
        if g['processingCandidate']=='PARTIAL_OR_REVIEW_REQUIRED' and g.get('previousEvidence',{}).get('linkedQuestions',0)>0)
    stage=state['stages']['YKS-04:full'];navfile=next(root/a['path'] for a in stage['artifacts'] if a['path'].endswith('navigation-candidate.json'))
    nav=read_json(navfile)
    branches={(c['exam'],c['subjectId']) for c in nav['navigation']}
    if not {('TYT','matematik'),('TYT','geometri'),('AYT','matematik'),('AYT','geometri')}.issubset(branches):
        raise ValueError('Controlled math/geometry split is missing')
    risks=[
        {'risk':'EXACT_FILE_AND_ZIP_DUPLICATE','sourceSha256':zip_proof['sourceSha256'],'result':'REUSE_SAME_PHYSICAL_CONTENT_NOT_NEW_SOURCE'},
        {'risk':'PARTIALLY_IMPORTED_PDF','sourceSha256':partial['sha256'],'priorLinkedQuestions':partial['previousEvidence']['linkedQuestions'],
            'result':'RECONCILE_QUESTION_LEVEL_COVERAGE_DO_NOT_SKIP_OR_REIMPORT_WHOLE_PDF'},
        {'risk':'SHARED_TYT_AYT_SCOPE','sourceSha256':shared_exam[0]['sourceSha256'],'result':'EXPLICIT_PRINTED_BOTH_EXAMS_NO_PROGRESS_COPY'},
        {'risk':'MOCK_RESTARTED_NUMBERS_AND_ALTERNATIVE_QUESTIONS','result':'EIGHT_SEPARATE_KEY_SECTIONS_291_PRINTED_ANSWERS',
            'bodyQuestionAndDisciplineAssignment':'YKS_09_REMAINS_REQUIRED'},
        {'risk':'MATH_GEOMETRY_BRANCHES','result':'SEPARATE_CONTROLLED_PROVIDER_BRANCHES_PRESERVED',
            'questionTopicAssignment':'A_GEOMETRIC_FIGURE_ALONE_DOES_NOT_APPROVE_A_GEOMETRY_TOPIC'},
        {'risk':'SHARED_PASSAGE','sourceSha256':shared['sourceSha256'],'questionNumbers':[35,36],'result':'SAME_SOURCE_CONTEXT_ATTACHED_TO_BOTH'},
        {'risk':'SCANNED_QUESTION','sourceSha256':scan['sourceSha256'],'result':'QUESTION_OBSERVED_WITH_CACHED_OCR_EXCLUDED_UNTIL_PRINTED_KEY_VERIFIED'},
        {'risk':'OPTION_PERMUTATION','codes':perm['codes'],'result':'ANSWER_CONTENT_SAME_LETTER_CHANGES_E_TO_B_IDS_REMAIN_SEPARATE'},
        {'risk':'UNVERIFIED_KEY_AND_DIFFERENT_SOURCE_VERSION','sourceSha256':variants[0]['sourceSha256'],
            'result':'SAME_TEST_NUMBER_NEVER_TRANSFERS_A_KEY_TO_DIFFERENT_BODY'},
        {'risk':'TALL_FORMULA_AND_CROP_PIXELS','result':'387_EXACT_SOURCE_RENDER_CROPS_97_BODY_PAGES_NO_UNCOVERED_NATIVE_LINES'}]
    report={'status':'PASS','scope':'REAL_REPRESENTATIVE_PILOT_RISK_OBSERVATIONS_ONLY','risks':risks,
        'sourceProofs':{key:{'path':name,'sha256':digest(root/name)} for key,name in names.items()},
        'sourceGroupsSha256':digest(file),'providerTreeSha256':digest(navfile),'toolSha256':digest(Path(__file__)),
        'newQuestionsAccepted':0,'questionBankWrites':0,'catalogPublished':False,
        'teacherApproved':False,'fineTopicAndQuestionAcceptancePending':True,'fullArchiveAccepted':False}
    write_json(folder/'risk-matrix-report.json',report)
    print(__import__('json').dumps({k:v for k,v in report.items() if k not in ('risks','sourceProofs')}))


if __name__=='__main__':main()
