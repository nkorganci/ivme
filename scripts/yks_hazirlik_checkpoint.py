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
}


def main():
    store=Store(APP/'veri/yks-birlestirme')
    with process_lock(store.root/'.writer.lock'):
        state=store.current();root=store.child(state['runId']);saved=state.setdefault('preparations',{})
        for name,path in REPORTS.items():
            file=root/path
            if not file.is_file():continue
            report=read_json(file);saved[name]={'path':path,'sha256':digest(file),'status':report['status']}
            for key in ['documents','questions','questionsPrepared','verifiedAnswers','states','pending','completed']:
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
            'Resolve the explicit AYT mock 333642091490 page41 copied TYT discipline header (40 questions unassigned), '
            'combined Mathematics/Geometry and Philosophy Group subjects, source-answer conflicts, and the four new books/summary with 2069 regions. '
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
