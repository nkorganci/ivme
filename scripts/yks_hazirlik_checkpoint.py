"""Save the current preparation cursor without asserting full-stage acceptance."""
from yks_birlestirme import Store,read_json,write_json,digest,process_lock
from yks_pilot_kaynaklari import APP

REPORTS={
    'allPdfCoverage':'full-source-coverage/report.json',
    'diagnosticBodyExceptions':'pdf-on-tarama/diagnostic-body-exceptions/report.json',
    'bodyExceptionKeys':'pdf-on-tarama/full-key-scan/body-exception-keys/report.json',
    'bodyExceptionCrops':'full-question-exception-crops/progress.json',
    'bodyExceptionComparison':'full-question-exception-comparison/controlled-repeat-review.json',
    'multiTestKey':'pdf-on-tarama/full-key-scan/multi-test-key/report.json',
    'multiTestComparison':'full-question-multikey-comparison/controlled-repeat-review.json',
    'reboundLiteratureKeys':'pdf-on-tarama/full-key-scan/rebound-literature-keys/report.json',
    'reboundLiteratureComparison':'full-question-rebound-comparison/controlled-repeat-review.json',
    'mockTagGlyphReview':'pdf-on-tarama/mock-tag-review/report.json',
    'fullMockBodies':'full-mock-bodies/progress.json',
    'fullMockComparison':'full-mock-comparison/controlled-repeat-review.json',
    'fullMockPrintedScopes':'full-mock-comparison/printed-section-scopes.json',
    'oldMockAnswerEditions':'full-mock-comparison/old-printed-key-review/report.json',
    'explicitSummaryReading':'new-source-discovery/explicit-document-review.json',
    'dinBookKeys':'new-book-keys/din/progress.json',
    'dinBookBodies':'new-book-bodies/din/progress.json',
    'dinBookComparison':'new-book-comparison/din/controlled-repeat-review.json',
    'turkcePageEquivalence':'source-page-equivalence/3adim-turkce/progress.json',
    'turkceIncrementalReuse':'source-page-equivalence/3adim-turkce/incremental-reuse.json',
    'crossSourceRepeat':'cross-source-candidates/report.json',
    'allPriorOccurrences':'all-prior-occurrences/report.json',
    'priorBookletContract':'booklet-prior-reuse/report.json',
    'fullDinTopicRetrieval':'full-question-topics/din/topic-candidates.json',
    'fullDinTopicSourceReview':'full-question-topics/din/content-topic-review.json',
}


def main():
    store=Store(APP/'veri/yks-birlestirme')
    with process_lock(store.root/'.writer.lock'):
        state=store.current();root=store.child(state['runId']);saved=state.setdefault('preparations',{})
        for name,path in REPORTS.items():
            file=root/path
            if not file.is_file():continue
            report=read_json(file);saved[name]={'path':path,'sha256':digest(file),'status':report['status']}
            for key in ['documents','sourceDocuments','questions','questionsPrepared','verifiedAnswers','states','pending','completed',
                    'occurrences','sourceOccurrenceStates','proofStates','intakeActions','pendingQuestions','newModelCallsThisPass']:
                if key in report:saved[name][key]=report[key]
        archive=root/'database-archive/archive-report.json'
        if archive.is_file():
            proof=read_json(archive)
            if proof['status']!='PASS' or proof.get('secondSaveInsertedArtifacts')!=0:raise ValueError('Actual archive readback/idempotence proof required')
            saved['postgresArchive']={'checkpoint':proof['checkpoint'],'status':'VERIFIED_READBACK_AND_IDEMPOTENT',
                'database':'ogm_ders','schema':'yks_evidence','proofPath':'database-archive/archive-report.json','proofSha256':digest(archive)}
        state['sessionStatus']='ACTIVE';state['resumeAt']='YKS-07:full'
        state['nextAction']=('Continue full YKS-07/08/09 source acceptance from full-source-coverage/report.json. '
            '270 diagnostics/5061 keys and crops, 41 mock bodies/5863 section-keyed crops already prepared and all-bank compared; do not regenerate them. '
            'Two Din books have 647 printed key cells, 643 present bodies and 586 bound questions in 20 prepared sections; '
            'exclude both entire mismatched sections (57 present bodies), not just their four orphan answer cells. '
            'All 586 bound Din questions have been bank-compared; do not re-render or re-run those comparisons. '
            'The 3 Adim Turkce editions have 281/283 exactly equal native and 180/330 DPI pages; '
            'reuse old completed and pending IDs on equivalent pages, review body page30 and key page280 incrementally. '
            'The changed key is Yazim Kurallari-1, 3. Adim, Q1 (old E/new D), not 2. Adim. '
            'All 1179 prior sources/86912 occurrences are reconciled: 81127 prior links have current proofs, '
            '458 links remain review-only, 23 inactive/outside-active-YKS links and 5303 pending locators preserve their original identities. '
            'The booklet supplement validates 3231/3248 prior links with original ham/img, official answer records and actual printed keys; '
            'do not regenerate this completed all-prior or booklet work. '
            'Full Din topic retrieval covers 1099 bound questions; the local Qwen document review is resumable and may still be running. '
            'Read full-question-topics/din/content-topic-review.json and check the actual worker before launching another model. '
            'After Qwen completes, run the independent GPT-OSS full-scope semantic check; do not rerun the 33 old pilot readings. '
            'Eight old mock key links have already been read; seven support the old bank, md-ayt-sozel-21-39 old/new C conflicts with bank D. '
            'Resolve the explicit AYT mock 333642091490 page41 copied TYT discipline header (40 questions unassigned), '
            'combined Mathematics/Geometry and Philosophy Group subjects and cross-pending-source duplicate/topic decisions. '
            '66 diagnostic key exceptions include known source-version differences and remain unapproved. '
            'Full stages 07-10 and live 11-13 are not accepted; retain original sources, all bank IDs, student history and model caches. '
            'Append the next meaningful batch with yks_kanit_db.py save; checkpoint only after actual evidence.')
        store.save(state,{'event':'FULL_PREPARATION_CURSOR_SAVED','stage':'YKS-07:full',
            'fullStageAccepted':False,'questionBankWrites':0,'reports':list(REPORTS)})
        write_json(root/'session-checkpoint.json',{'runId':state['runId'],'revision':state['revision'],
            'sessionStatus':state['sessionStatus'],'resumeAt':state['resumeAt'],'nextAction':state['nextAction'],
            'preparations':saved,'sourceWrites':0,'questionBankWrites':0,'fullStageAccepted':False})
    print({'status':'SAVED','revision':state['revision'],'resumeAt':state['resumeAt'],'fullStageAccepted':False})


if __name__=='__main__':main()
