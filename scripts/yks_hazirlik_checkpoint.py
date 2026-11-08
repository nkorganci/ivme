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
            'All 1179 prior sources/86912 occurrences are reconciled; use effectiveProofStates in full-source-coverage/report.json for the latest proven link counts. '
            '23 inactive/outside-active-YKS links and 5303 pending locators preserve their original identities. '
            'The booklet supplement validates 3231/3248 prior links with original ham/img, official answer records and actual printed keys; '
            'do not regenerate this completed all-prior or booklet work. '
            'Full Din topic retrieval and Qwen reading of 1099 bound questions are complete; do not rerun models or embeddings. '
            'Read full-question-topics/din/semantic-topic-review.json and check the worker before resuming GPT-OSS. '
            'The --from-reviewed-images selection is 37 source codes, not full 1099-question semantic acceptance; old pilot caches are reused. '
            'Chemistry retrieval1030, text-reading12, independent-prefix12 and image-pilot3 are complete. '
            'The image model agrees on only1/3 and generates unwanted answers; do not scale this unreliable topic method. '
            'Three actual laboratory images and registered PDF pages6/7 prove different unpublished topic candidates. '
            'All542 partial Chemistry sources reuse old IDs: first376 and an additional166 resolved through exact official book/page/printed-number locators and current controlled scope. '
            'The3036 diagnostic existing candidates are fully checked:1779 exact native/two-DPI/current-source links,1257 original source exceptions. '
            'The second diagnostic identity pass reused3036 raw caches with zero new comparisons/renders; do not repeat it. '
            'source-intake-queue/report.json contains12052 current versions:3697 single-ID source records,389 multiple-ID records,1543 unresolved bank candidates,6380 content/topic reviews,36 secondary source locators,4 blocks and3 isolated-pilot-only records. It preserves4475 distinct existing canonical IDs. '
            'The isolated complete-region union pass resolved103/450 diagnostic boundary exceptions;347 remain held (298 neighboring-question intersections,46 pixel changes,3 incomplete option sets). All74 regular mock union candidates remain held. These immutable proofs do not approve prepared crop content or fine topics; do not repeat their renders. '
            'All4086 PDFs/67277 pages have a saved native/OCR key-signal index. Its85 heading candidates include75 physics summaries,3 history summaries,2 separate answer documents and5 already-known mock/Turkce exceptions. Do not interpret missing signals as absence or redo those known exceptions. '
            'Physics summary key regions75/75 are reconciled:74 contiguous sources/214 printed cells; source e707d7a0c8ee literally prints1,2,4 and stays held without renumbering. All44 held key strips and2 whole source pages have actually been read; original model/OCR outputs remain frozen. Do not rerun that key-reading work. '
            'physics-summary-discovery contains3 actually viewed mirror questions with D/D/E printed keys and original lossless pixels, compared to all80230 bank questions. All24 retrieved relations/23 distinct bank images were actually read and differ; this is not a novelty proof. The exact unpublished MEBI special-rays leaf e02f14b7 has4 actually read PDF pages and supports all3 tasks and printed-answer consistency. Do not redo those image/topic readings. This separate pilot remains outside the original12052 main cohort; compare its questions against the other prepared and original pending source queues before novelty/main-queue admission. '
            'Mock identity passes are complete:1458 regular candidates (996 single/255 multi/207 held),447 combined-subject candidates (271 single/88 multi/88 held),103 source/scope exceptions (46 multi/57 held). Do not rerender those unchanged inputs. '
            '35 cross-source duplicate pairs and one printed C/D conflict have been actually read. '
            'Six source/bank exact question image pairs preserve old IDs; cross-exam associations remain separate review. '
            'The pending mathematics source matches two old pending locators with C/A keys and a contaminated old crop; no new intake. '
            'Chemistry has 150 original native/OCR-backed plus 392 additional native/Qwen-backed individually identical questions; all 42 visual key exceptions are complete. Read the two separate comparison reports and do not regenerate either cohort. '
            'din-question-amendments/report.json supersedes four source versions: table ordering/embedded labels and the contaminated TYT book Test1 Q24 crop. '
            'Q24 has a separate corrected original-PDF crop; never reuse its old 2-question image or old topic suggestion. '
            'The source mock fd0fdf7c0577 S2 Q19 really prints identical D/E options; it is excluded from new intake. '
            'Independent GPT-OSS selected37 is complete: 20 supported, 9 missing, 5 insufficient, 3 invalid; models alone accept nothing. '
            'actual-topic-support-challenges.json additionally holds 3 model-supported suggestions and adds one actual same-PDF quote. '
            'Eight old mock key links have already been read; seven support the old bank, md-ayt-sozel-21-39 old/new C conflicts with bank D. '
            'All40 images under the copied TYT instruction in AYT mock333642091490 have actually been read:39 clear preparation subjects (13 Physics/13 Chemistry/13 Biology), question13 remains shared Physics/Chemistry nanotechnology review with two actual registered PDF sources. Preserve the wrong printed instruction and source keys. '
            'Continue the511 remaining source subject/scope reviews, existing-candidate identity exceptions and truly new complete content/fine-topic reviews from the unified queue; no row allows production import. '
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
