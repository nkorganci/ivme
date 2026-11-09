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
    'crossSourceActualImageReview':'cross-source-candidates/actual-image-pair-review.json',
    'pendingSourceReuse':'pending-source-reuse/report.json',
    'additionalKeyedSourcePendingReuse':'pending-source-reuse/additional-keyed-sources/report.json',
    'pendingSourceImageReview':'pending-source-reuse/actual-pending-image-review.json',
    'chemistryIndividualEditions':'pdf-on-tarama/chemistry-question-editions/report.json',
    'chemistryPartialPreparation':'partial-chemistry-preparation/progress.json',
    'chemistryVisualKeyExceptions':'partial-chemistry-visual-keys/progress.json',
    'chemistryVisualKeyQuestionPreparation':'partial-chemistry-visual-preparation/progress.json',
    'chemistryVisualKeyQuestionComparison':'partial-chemistry-visual-comparison/controlled-repeat-review.json',
    'chemistryCanonicalSourceReuse':'partial-chemistry-canonical-reuse/report.json',
    'chemistryOfficialLocatorReuse':'partial-chemistry-locator-reuse/report.json',
    'chemistryPartialComparison':'partial-chemistry-comparison/controlled-repeat-review.json',
    'allPriorOccurrences':'all-prior-occurrences/report.json',
    'priorBookletContract':'booklet-prior-reuse/report.json',
    'partialFrozenAdmissionReuse':'partial-reviewed-transfer-reuse/report.json',
    'fullDinTopicRetrieval':'full-question-topics/din/topic-candidates.json',
    'fullDinTopicSourceReview':'full-question-topics/din/content-topic-review.json',
    'fullDinIndependentTopicReview':'full-question-topics/din/semantic-topic-review.json',
    'fullDinSecondaryBankComparison':'full-question-topics/din/secondary-bank-comparison.json',
    'fullDinExistingQuestionImageReview':'full-question-topics/din/exact-bank-image-review/report.json',
    'dinActualSourceExceptions':'din-question-amendments/report.json',
    'sourceCropGeometry':'source-crop-geometry/report.json',
    'dinAmendedQuestionComparison':'din-amendment-comparison/controlled-repeat-review.json',
    'bankMissingTextImageSupplement':'full-question-topics/din/bank-image-text-supplement.json',
    'actualTopicSupportChallenges':'full-question-topics/din/actual-topic-support-challenges.json',
    'fullChemistryTopicRetrieval':'full-question-topics/kimya/topic-candidates.json',
    'fullChemistrySourceTopicReview':'full-question-topics/kimya/content-topic-review.json',
    'fullChemistryIndependentTopicReview':'full-question-topics/kimya/semantic-topic-review.json',
    'chemistryActualTopicCorrections':'kimya-topic-pilot-actual/report.json',
    'chemistryImageTopicDiagnostic':'kimya-topic-vision-pilot/report.json',
    'preparedSourceIntakeQueue':'source-intake-queue/report.json',
    'diagnosticOfficialCanonicalReuse':'diagnostic-official-canonical-reuse/report.json',
    'diagnosticIsolatedUnionCanonicalReuse':'diagnostic-union-canonical-reuse/report.json',
    'mockOfficialCanonicalReuse':'mock-official-canonical-reuse/report.json',
    'mockIsolatedUnionCanonicalReuse':'mock-union-canonical-reuse/report.json',
    'mockCombinedSourceCanonicalReuse':'mock-combined-canonical-reuse/report.json',
    'mockSourceExceptionIdentities':'mock-source-exception-identities/report.json',
    'mockActualSubjectReview':'mock-actual-subject-review/333642091490/report.json',
    'savedPrintedKeySignals':'saved-key-signal-discovery/report.json',
    'physicsSummaryKeyRegions':'physics-summary-key-readings/report.json',
    'physicsSummaryActualKeyRegions':'physics-summary-key-actual-review/report.json',
    'physicsSummaryNativeKeyRetry':'physics-summary-native-key-readings/report.json',
    'physicsSummaryEffectiveKeyRegions':'physics-summary-effective-key-regions/report.json',
    'physicsSummaryBoundedPreparation':'physics-summary-discovery/report.json',
    'physicsSummaryBankCandidates':'physics-summary-discovery/comparison-report.json',
    'physicsSummaryActualBankImages':'physics-summary-discovery/actual-bank-image-review.json',
    'physicsSummaryActualTopicSupport':'physics-summary-topic-review/report.json',
    'physicsSummaryPreparedPendingComparison':'physics-summary-additional-source-review/report.json',
    'physicsSummaryVisibleBodyGeometry':'physics-summary-body-discovery/report.json',
    'physicsSummaryActualLayoutReview':'physics-summary-layout-actual-review/report.json',
    'physicsSummaryFiveBodyPreparation':'physics-summary-five-body-preparation-v2/report.json',
    'physicsSummaryFiveBodyComparison':'physics-summary-five-body-comparison/report.json',
    'physicsSummaryFiveActualBankReview':'physics-summary-five-body-comparison/actual-bank-image-review.json',
    'physicsSummaryFiveTopicSupport':'physics-summary-five-topic-review/report.json',
    'physicsSummaryBoundBodies':'physics-summary-bound-bodies/report.json',
    'physicsSummaryActualCrops':'physics-summary-bound-bodies/actual-crop-review.json',
    'physicsSummarySecondBodyBatch':'physics-summary-bound-bodies-02/report.json',
    'physicsSummarySecondActualCrops':'physics-summary-bound-bodies-02/actual-crop-review.json',
    'verifiableOnlySourceSelection':'verified-source-selection/report.json',
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
        policy_path=APP/'scripts/yks-secim-politikasi.json'
        state['selectionPolicy']={'path':str(policy_path),'sha256':digest(policy_path),
            'unresolvedAction':'EXCLUDE_NO_RETRY','sourceRepairAttempts':0}
        state['nextAction']=(
            'USER PRIORITY: finish YKS-07 using only verifiable content, then continue other stages. '
            'Apply scripts/yks-secim-politikasi.json: exclude missing, inconsistent, ambiguous or failed candidates immediately; '
            'no source repair, missing-key/figure search, repeat OCR/model or exception retries. '
            'Exclusion is a completed disposition, never verified question acceptance; excluded candidates cannot be learner-visible or imported. '
            'The authoritative active view is verified-source-selection/report.json and source-evidence-candidates.json. '
            '39 summary sources/115 bodies have actual source readings;100 source-evidence candidates remain,15 defective candidates are excluded. '
            'The original main12052 queue is an immutable observation index. Its policy view excludes1936 unresolved records without retries; '
            '3697 proven existing source identities preserve old IDs,36 secondary locators are not reimported,3 remain isolated pilot proof. '
            '6380 as-yet-unread source/content records may receive one pass only; skip any failure instead of repairing. '
            'Next: verified-source-selection/remaining-sources.json lists35 previously unread clear-key summaries/99 printed cells; '
            'start84a720abf787 Special Relativity and Quantum Physics. The printed1/2/4 gap source is excluded, not waiting for repair. '
            'Earlier native/OCR/key/model/all-bank comparisons and real isolated DB pilot proofs remain frozen; do not repeat unchanged work. '
            'Other known66 diagnostic, mock identity/key/decoding and book mismatch exceptions are exclusions, not blockers requiring rescue. '
            'Keep original bank IDs, student history and provenance. Only source-complete/current-duplicate/controlled-topic proof can advance. '
            'Do not mark full07 accepted until the remaining selected one-pass source dispositions are recorded. '
            'The summary evidence does not publish topics or questions; full08-10 acceptance and live11-13 remain separate.')
        store.save(state,{'event':'FULL_PREPARATION_CURSOR_SAVED','stage':'YKS-07:full',
            'fullStageAccepted':False,'questionBankWrites':0,'reports':list(REPORTS)})
        write_json(root/'session-checkpoint.json',{'runId':state['runId'],'revision':state['revision'],
            'sessionStatus':state['sessionStatus'],'resumeAt':state['resumeAt'],'nextAction':state['nextAction'],
            'preparations':saved,'sourceWrites':0,'questionBankWrites':0,'fullStageAccepted':False})
    print({'status':'SAVED','revision':state['revision'],'resumeAt':state['resumeAt'],'fullStageAccepted':False})


if __name__=='__main__':main()
