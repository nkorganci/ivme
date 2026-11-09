"""Join existing all-page evidence and current source work without re-extraction.

One disposition for every unique original PDF, including unresolved sources.
Legacy import evidence and text signals are never new-question acceptance.
"""
from collections import Counter
import csv
import json
from pathlib import Path

from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_pilot_kaynaklari import APP


def unique(rows,key):
    index={}
    for row in rows:
        value=row[key]
        if value in index:raise ValueError('Duplicate source identity in scope evidence')
        index[value]=row
    return index


def comparison_states(counters,identities):
    # A source outside the diagnostic set is not automatically a mock: books
    # and future source cohorts have their own scope.
    return dict(sum((counters[sha] for sha in identities if sha in counters),Counter()))


def supplement_counts(base,supplements):
    """One replacement per original source/locator, never an extra question."""
    counts=Counter(base);seen=set()
    for rows,accepted in supplements:
        for row in rows:
            if row['status']!=accepted:continue
            key=(row['sourceSha256'],row['sourceLocator'])
            if key in seen:raise ValueError('Same original source link counted twice in prior supplements')
            seen.add(key);counts[row['previousProofStatus']]-=1;counts[accepted]+=1
    if any(n<0 for n in counts.values()) or sum(counts.values())!=sum(base.values()):
        raise ValueError('Prior supplement changed the original number of source links')
    return dict(counts)


def reconcile(groups,observations,pages,keys,diagnostics,mocks,comparisons,existing=None,body=None,discoveries=None,decoding=None,document_reviews=None,book_sections=None):
    existing=existing or {};body=body or {};discoveries=discoveries or {};decoding=decoding or {};document_reviews=document_reviews or {}
    book_sections=book_sections or {}
    groups=unique(groups,'sha256');observations=unique(observations,'sourceSha256');pages=unique(pages,'sha256')
    if set(groups)!=set(observations) or set(groups)!=set(pages):raise ValueError('All unique PDFs must have complete page observations')
    if not set(keys)<=set(groups) or not set(diagnostics)<=set(groups) or not set(mocks)<=set(groups):raise ValueError('Unknown source in key scope')
    results=[]
    for sha,group in sorted(groups.items()):
        observed=observations[sha];scan=pages[sha];count=scan['pageCount']
        if scan.get('error') or count<1 or observed['pageCount']!=count or observed['observedPages']!=count:
            raise ValueError('Missing/error/unobserved source PDF pages')
        for name in ['candidatePages','visualReviewPages','questionSignalPages']:
            if any(type(n) is not int or not 1<=n<=count for n in observed[name]):raise ValueError('Invalid source physical page number')
        key=keys.get(sha);mock=mocks.get(sha);diagnostic=diagnostics.get(sha);legacy=group.get('previousEvidence') or {}
        sidebar_mock=any(Path(p['root']).name=='mebi-yks' and p['path'].startswith('Deneme-Tarama/Denemeler/') for p in group['occurrences'])
        if discoveries.get(sha,{}).get('status')=='EXCLUDED_PRINTED_YDT_FROM_TYT_AYT_QUESTION_QUEUE':
            state='PRINTED_YDT_EXCLUDED_FROM_TYT_AYT_QUESTION_SCOPE';remaining='KEEP_SOURCE_ARCHIVE_FIX_PROVIDER_COMMON_CATALOG_SCOPE_BEFORE_CUTOVER'
        elif document_reviews.get(sha,{}).get('status')=='WHOLE_SUMMARY_READ_QUESTION_HAS_NO_EXPLICIT_PRINTED_ANSWER_IN_THIS_PDF':
            state='EXPLICITLY_READ_UNKEYED_QUESTION_IN_SUMMARY_EXCLUDED_NEW_QUESTION_INTAKE';remaining='KEEP_SUMMARY_AND_OLD_QUESTION_REFERENCES_NO_NEW_INTAKE_WITHOUT_SOURCE_KEY'
        elif key:
            state='DIAGNOSTIC_KEY_VERIFIED_QUESTION_CONTENT_REVIEW_REQUIRED'
            remaining='SOURCE_QUESTION_GRAPHICS_FINE_TOPIC_AND_DUPLICATE_ACCEPTANCE'
        elif mock and mock['status']!='SOURCE_MOCK_KEY_VERIFIED':
            state='MOCK_IDENTITY_OR_KEY_EXCEPTION_REVIEW_REQUIRED';remaining=mock['status']
        elif mock and decoding.get(sha,{}).get('status')=='SOURCE_DECODING_REVIEW_REQUIRED':
            state='MOCK_DECODING_WARNING_SOURCE_BODY_REVIEW_REQUIRED';remaining='RESOLVE_NATIVE_OR_RASTER_DECODING_WARNINGS_BEFORE_QUESTION_ACCEPTANCE'
        elif mock and mock['status']=='SOURCE_MOCK_KEY_VERIFIED':
            state='MOCK_SECTION_KEYS_VERIFIED_QUESTION_BODY_BRANCH_REVIEW_REQUIRED'
            remaining='SECTION_BODY_NUMBER_SHARED_CONTEXT_AND_BRANCH_BINDING'
        elif diagnostic:
            state='DIAGNOSTIC_KEY_OR_BODY_EXCEPTION_REVIEW_REQUIRED'
            remaining=diagnostic['status']
        elif sha in book_sections:
            state='BOOK_SECTION_KEYS_AND_PRESENT_BODIES_PREPARED_WITH_EXCLUDED_SECTIONS'
            remaining='KEEP_BODY_KEY_COUNT_MISMATCHED_SECTIONS_EXCLUDED_ACCEPT_ONLY_SOURCE_BOUND_QUESTIONS_AFTER_TOPIC_AND_DUPLICATE_REVIEW'
        elif mock:
            state='MOCK_IDENTITY_OR_KEY_EXCEPTION_REVIEW_REQUIRED';remaining=mock['status']
        elif sidebar_mock:
            state='MOCK_PRINTED_KEY_SCOPE_PASS_PENDING';remaining='CONTINUE_FULL_SIDEBAR_MOCK_KEY_READER'
        elif existing.get(sha,{}).get('status')=='CURRENT_EXISTING_TRANSFER_EVIDENCE_REVALIDATED':
            state='PRIOR_TRANSFER_CURRENT_LINKS_REVALIDATED_DO_NOT_REIMPORT';remaining='KEEP_EXISTING_QUESTION_IDS_AND_REUSE_SOURCE_EVIDENCE'
        elif observed['candidatePages']:
            state='OTHER_LAYOUT_PRINTED_KEY_CANDIDATE_REVIEW_REQUIRED';remaining='VERIFY_PRINTED_KEY_QUESTION_IDENTITY_AND_PRIOR_IMPORT_EVIDENCE'
        else:
            state='OTHER_LAYOUT_SOURCE_VISUAL_OR_PRINTED_KEY_REVIEW_REQUIRED';remaining='NO_KEY_ABSENCE_CLAIM_VERIFY_SOURCE_VISUALLY'
        answers=len(key['sourceAnswers']) if key else sum(len(s['answers']) for s in mock.get('sections',[]) if s['status']=='TWO_PRINTED_SOURCE_READINGS_AGREE') if mock else 0
        if sha in book_sections:answers+=book_sections[sha]['independentlyReadPrintedAnswers']
        results.append({'sourceSha256':sha,'canonicalSource':group['canonicalCandidate'],'sourceAliases':group['occurrences'],
            'pageCount':count,'observedPages':observed['observedPages'],'state':state,'nextAction':remaining,
            'answerCandidatePhysicalPages':observed['candidatePages'],'questionSignalPhysicalPages':observed['questionSignalPages'],
            'visualReviewPhysicalPages':observed['visualReviewPages'],'verifiedPrintedAnswers':answers,
            'currentSourceKeyEvidence':None if not key else {k:key.get(k) for k in ['sourceKeyDocumentSha256','sourceKeyPage','keyEvidenceSha256','method']},
            'controlledRepeatStates':dict(comparisons.get(sha,{})),
            'currentExistingTransferRevalidation':None if sha not in existing else {k:existing[sha].get(k) for k in ['status','expectedQuestions','currentDistinctLinkedQuestions','issues','reuseAction','freshSemanticApproval']},
            'bodyExceptionPreparation':None if sha not in body else {k:body[sha].get(k) for k in ['status','questions','sourceKeysApproved','pixelsAndContentAccepted']},
            'newQuestionRegionDiscovery':discoveries.get(sha),
            'explicitWholeDocumentReview':document_reviews.get(sha),
            'bookSectionPreparation':book_sections.get(sha),
            'sourceDecodingCheck':None if sha not in decoding else {k:decoding[sha].get(k) for k in ['status','pageCount','issues','bodyContentAccepted','tagGlyphReview']},
            'mockKeyCheck':None if not mock else {k:mock.get(k) for k in ['status','printedMockNumber','sourceKeyPage','issue','branchAndTopicAssignmentsAccepted']},
            'priorImportEvidence':{'coverageState':legacy.get('coverageState'),'expectedQuestions':legacy.get('expectedQuestions'),
                'linkedQuestions':legacy.get('linkedQuestions'),'processingCandidate':group.get('processingCandidate'),
                'requiresCurrentBankAndSourceRevalidation':True},
            'absenceClaimed':False,'newQuestionsAccepted':0,'teacherApproved':False})
    return results


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);folder=root/'full-source-coverage';folder.mkdir(exist_ok=True)
    file=next(root/a['path'] for a in state['stages']['YKS-03:full']['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
    page=root/'pdf-on-tarama/progress.json';obs=root/'pdf-on-tarama/answer-observations-with-ocr.jsonl'
    key=root/'pdf-on-tarama/full-key-scan/verified-source-keys.json';diagnostic=root/'pdf-on-tarama/full-key-scan/progress.json'
    mock=root/'pdf-on-tarama/full-mock-keys/progress.json'
    inputs=[file,page,obs,key,diagnostic];inputs+=[mock] if mock.is_file() else []
    counters={};bank_snapshots=set()
    for name in ['full-question-comparison','full-question-repair-comparison','full-question-shared-comparison','full-question-raster-comparison','full-question-exception-comparison','full-question-multikey-comparison','full-question-rebound-comparison','full-mock-comparison','new-book-comparison/din','partial-chemistry-comparison','partial-chemistry-visual-comparison']:
        proof=root/name/'controlled-repeat-review.json'
        if not proof.is_file():continue
        inputs.append(proof)
        comparison=read_json(proof);bank_snapshots.add(comparison['bankSnapshotSha256'])
        for question in comparison['results']:
            counters.setdefault(question['sourceSha256'],Counter())[question['status']]+=1
    existing=root/'existing-transfer-reuse/report.json';body=root/'pdf-on-tarama/diagnostic-body-exceptions/report.json'
    reuse=read_json(existing) if existing.is_file() else {};body_report=read_json(body) if body.is_file() else {}
    if reuse:
        if reuse['status']!='PASS' or reuse['sourceGroupsSha256']!=digest(file):raise ValueError('Existing-transfer scope is incomplete or belongs to other sources')
        bank_snapshots.add(reuse['bankSnapshotSha256']);inputs.append(existing)
    reviewed=root/'reviewed-transfer-reuse/report.json';reviewed_report=read_json(reviewed) if reviewed.is_file() else {}
    if reviewed_report:
        if not reuse or reviewed_report['baseCurrentReuseReportSha256']!=digest(existing):raise ValueError('Reviewed existing-transfer result belongs to another base proof')
        bank_snapshots.add(reviewed_report['bankSnapshotSha256']);inputs.append(reviewed)
        previous={row['sourceSha256']:row for row in reuse['results']}
        for row in reviewed_report['results']:
            if row['status']!='CURRENT_REVIEWED_TRANSFER_EVIDENCE_REVALIDATED':continue
            original=previous[row['sourceSha256']]
            previous[row['sourceSha256']]={**original,'status':'CURRENT_EXISTING_TRANSFER_EVIDENCE_REVALIDATED',
                'issues':[],'checks':row['checks'],'methodOfSupplement':'FROZEN_ORIGINAL_REVIEW_CONTRACT_REVALIDATED'}
        reuse={**reuse,'results':list(previous.values()),'states':dict(Counter(r['status'] for r in previous.values()))}
    if len(bank_snapshots)>1:raise ValueError('Compared source and existing-transfer bank snapshots differ')
    if body_report:inputs.append(body)
    raster=root/'pdf-on-tarama/full-key-scan/raster-keys/report.json';key_rows=read_json(key)['results']
    if raster.is_file():
        from yks_raster_anahtar_incele import validate_key
        raster_report=read_json(raster)
        if raster_report['status']!='COMPLETE':raise ValueError('Wait for complete raster key source readings')
        additional=[validate_key(row) for row in raster_report['results'] if row['status']=='SOURCE_KEY_VERIFIED']
        if {r['sourceSha256'] for r in key_rows}&{r['sourceSha256'] for r in additional}:raise ValueError('Raster key extension overlaps existing native-key source set')
        key_rows+=additional;inputs.append(raster)
    exceptions=root/'pdf-on-tarama/full-key-scan/body-exception-keys/report.json'
    if exceptions.is_file():
        from yks_istisna_anahtar import validate_key
        exception_report=read_json(exceptions)
        if exception_report['status']!='COMPLETE':raise ValueError('Wait for complete body-exception key readings')
        additional=[validate_key(row) for row in exception_report['results'] if row['status']=='SOURCE_KEY_VERIFIED']
        if {r['sourceSha256'] for r in key_rows}&{r['sourceSha256'] for r in additional}:raise ValueError('Body-exception keys overlap prior accepted source set')
        key_rows+=additional;inputs.append(exceptions)
    multikey=root/'pdf-on-tarama/full-key-scan/multi-test-key/report.json'
    if multikey.is_file():
        from yks_coklu_test_anahtar import validate_key
        multi_report=read_json(multikey)
        if multi_report['status']!='COMPLETE':raise ValueError('Wait for complete multi-test section key')
        additional=[validate_key(row) for row in multi_report['results'] if row['status']=='SOURCE_KEY_VERIFIED']
        if {r['sourceSha256'] for r in key_rows}&{r['sourceSha256'] for r in additional}:raise ValueError('Multi-test key overlaps prior accepted source set')
        key_rows+=additional;inputs.append(multikey)
    rebound=root/'pdf-on-tarama/full-key-scan/rebound-literature-keys/report.json'
    if rebound.is_file():
        from yks_edebiyat_ayri_anahtar import validate_key
        rebound_report=read_json(rebound)
        if rebound_report['status']!='COMPLETE':raise ValueError('Wait for complete rebound official source key readings')
        additional=[validate_key(row) for row in rebound_report['results'] if row['status']=='SOURCE_KEY_VERIFIED']
        if {r['sourceSha256'] for r in key_rows}&{r['sourceSha256'] for r in additional}:raise ValueError('Rebound keys overlap prior accepted source set')
        key_rows+=additional;inputs.append(rebound)
    decoding=root/'pdf-on-tarama/mock-decoding/report.json';decoded=read_json(decoding) if decoding.is_file() else {}
    if decoded:
        if decoded['status']!='COMPLETE':raise ValueError('Wait for complete source decoding check')
        inputs.append(decoding)
    tags=root/'pdf-on-tarama/mock-tag-review/report.json';tag_report=read_json(tags) if tags.is_file() else {}
    if tag_report:
        if tag_report['status']!='COMPLETE' or tag_report['originalDecodeReportSha256']!=digest(decoding):raise ValueError('Tag source review is stale/incomplete')
        inputs.append(tags)
        decoded=dict(decoded);decoded['results']=[dict(r) for r in decoded['results']]
        mitigations={r['sourceSha256']:r for r in tag_report['results']}
        for row in decoded['results']:
            mitigation=mitigations.get(row['sourceSha256'])
            if mitigation:
                if digest(mitigation['evidencePath'])!=mitigation['evidenceSha256']:raise ValueError('Tag/glyph source evidence changed')
                row['tagGlyphReview']={k:mitigation.get(k) for k in ['status','affectedPages','evidencePath','evidenceSha256','semanticTextAccepted','bodyContentAccepted']}
    mock_bodies=root/'full-mock-bodies/progress.json';body_scope=read_json(mock_bodies) if mock_bodies.is_file() else {}
    if body_scope:
        if body_scope['status']!='COMPLETE':raise ValueError('Wait for complete supported mock body preparation')
        inputs.append(mock_bodies)
    discovery=root/'new-source-discovery/scoped-report.json'
    if not discovery.is_file():discovery=root/'new-source-discovery/progress.json'
    discovery_report=read_json(discovery) if discovery.is_file() else {}
    if discovery_report:
        if discovery_report['sourceGroupsSha256']!=digest(file):raise ValueError('New region discovery belongs to other source inventory')
        inputs.append(discovery)
    explicit_review=root/'new-source-discovery/explicit-document-review.json';document_reviews={}
    if explicit_review.is_file():
        from yks_ozet_belge_incele import review
        fresh=review(root);recorded=read_json(explicit_review)
        if recorded['status']!='PASS' or recorded['results']!=[fresh]:raise ValueError('Actually viewed complete document review changed')
        document_reviews=unique(recorded['results'],'sourceSha256');inputs.append(explicit_review)
    book_keys=root/'new-book-keys/din/progress.json';book_bodies=root/'new-book-bodies/din/progress.json';book_sections={}
    if book_keys.is_file() and book_bodies.is_file():
        from yks_din_kitap_anahtar import validate_section
        observations=read_json(book_keys);prepared=read_json(book_bodies)
        if observations['status']!='COMPLETE' or prepared['status']!='COMPLETE' or prepared['sourceKeyReportSha256']!=digest(book_keys):
            raise ValueError('Wait for complete book section readings/body pass')
        for item in observations['results']:
            if item['status']=='PRINTED_SECTION_KEY_READINGS_VERIFIED_BODY_BINDING_REQUIRED':validate_section(item)
            summary=book_sections.setdefault(item['sourceSha256'],{'independentlyReadPrintedAnswers':0,'preparedQuestionBindings':0,
                'presentBodies':0,'excludedSectionQuestions':0,'unboundPrintedAnswerNumbers':[],'excludedSections':[],
                'questionContentFineTopicsAccepted':False,'teacherApproved':False})
            if item['status']=='PRINTED_SECTION_KEY_READINGS_VERIFIED_BODY_BINDING_REQUIRED':summary['independentlyReadPrintedAnswers']+=len(item['nativePrintedAnswers'])
        for item in prepared['results']:
            summary=book_sections[item['sourceSha256']];summary['presentBodies']+=item.get('questions',0)
            if item['status']=='PREPARED':summary['preparedQuestionBindings']+=item['questions']
            else:
                summary['excludedSectionQuestions']+=item.get('questions',0);summary['excludedSections'].append({'sectionId':item['sectionId'],'status':item['status'],'issues':item.get('issues',[])})
            summary['unboundPrintedAnswerNumbers']+=[{'sectionId':item['sectionId'],'printedNumber':n} for n in item.get('unboundPrintedAnswerNumbers',[])]
        inputs.extend([book_keys,book_bodies])
    equivalence=root/'source-page-equivalence/3adim-turkce/progress.json';page_equivalence={}
    if equivalence.is_file():
        edition=read_json(equivalence)
        if edition['status']!='COMPLETE':raise ValueError('Wait for complete source edition page comparison')
        for role in ['old','new']:
            if digest(edition[role+'SourcePath'])!=edition['identity'][role+'SourceSha256']:raise ValueError('Page-equivalent source edition changed')
            page_equivalence[edition['identity'][role+'SourceSha256']]={'evidencePath':str(equivalence),'evidenceSha256':digest(equivalence),
                'equivalentPages':[r['newPhysicalPage'] for r in edition['results'] if r['status']=='FULL_PAGE_NATIVE_AND_PIXELS_IDENTICAL'],
                'differentPages':[r['newPhysicalPage'] for r in edition['results'] if r['status']!='FULL_PAGE_NATIVE_AND_PIXELS_IDENTICAL'],
                'questionOrAnswerReuseAutomaticallyAccepted':False}
        inputs.append(equivalence)
    prior_occurrence_path=root/'all-prior-occurrences/report.json';prior_occurrences={};prior_by_source={}
    if prior_occurrence_path.is_file():
        prior_occurrences=read_json(prior_occurrence_path)
        if prior_occurrences['status']!='COMPLETE' or prior_occurrences['sourceGroupsSha256']!=digest(file):
            raise ValueError('Wait for complete current prior-occurrence reconciliation')
        if prior_occurrences['bankSnapshotSha256'] not in bank_snapshots:raise ValueError('Prior source occurrence bank snapshot differs')
        prior_by_source=unique(prior_occurrences['results'],'sourceSha256');inputs.append(prior_occurrence_path)
    prior_booklets_path=root/'booklet-prior-reuse/report.json';prior_booklets={}
    if prior_booklets_path.is_file():
        prior_booklets=read_json(prior_booklets_path)
        if (not prior_occurrences or prior_booklets['status']!='PASS' or prior_booklets['basePriorReportSha256']!=digest(prior_occurrence_path)
                or prior_booklets['bankSnapshotSha256']!=prior_occurrences['bankSnapshotSha256']):
            raise ValueError('Booklet supplement belongs to another source occurrence proof')
        inputs.append(prior_booklets_path)
    partial_review_path=root/'partial-reviewed-transfer-reuse/report.json';partial_review={}
    if partial_review_path.is_file():
        partial_review=read_json(partial_review_path)
        if (not prior_occurrences or partial_review['status']!='PASS'
                or partial_review['basePriorReportSha256']!=digest(prior_occurrence_path)
                or partial_review['bankSnapshotSha256']!=prior_occurrences['bankSnapshotSha256']):
            raise ValueError('Partial-source admission supplement belongs to another current source proof')
        originals={}
        for row in partial_review['results']:
            if row['status']!='ORIGINAL_FROZEN_PARTIAL_SOURCE_ADMISSION_REVALIDATED_KEEP_ID':continue
            sha=row['sourceSha256']
            if sha not in originals:
                source=prior_by_source[sha];path=Path(source['evidencePath'])
                if digest(path)!=source['evidenceSha256']:raise ValueError('Original prior-link source report changed')
                originals[sha]={q['sourceLocator']:q for q in read_json(path)['results']}
            original=originals[sha][row['sourceLocator']]
            if original['status']!=row['previousProofStatus'] or original['canonicalCode']!=row['canonicalCode']:
                raise ValueError('Partial admission supplement changed original locator, code or status')
        inputs.append(partial_review_path)
    partial_path=root/'partial-chemistry-preparation/progress.json';partial_proof_path=partial_path.parent/'current-source-verification.json';partial_sources={};partial={}
    if partial_path.is_file() and partial_proof_path.is_file():
        partial=read_json(partial_path);proof=read_json(partial_proof_path)
        if partial['status']!='COMPLETE' or proof['status']!='PASS' or proof['sourcePreparationSha256']!=digest(partial_path):
            raise ValueError('Complete current individual source/key proof required before partial preparation is counted')
        partial_sources={r['sourceSha256']:r for r in partial['results'] if r['status']=='PREPARED'}
        if sum(r['questions'] for r in partial_sources.values())!=proof['questions']:raise ValueError('Partial original question count differs')
        inputs.extend([partial_path,partial_proof_path])
    visual_path=root/'partial-chemistry-visual-preparation/progress.json';visual_proof_path=visual_path.parent/'current-source-verification.json'
    if visual_path.is_file() and visual_proof_path.is_file():
        visual=read_json(visual_path);proof=read_json(visual_proof_path)
        if visual['status']!='COMPLETE' or proof['status']!='PASS' or proof['sourcePreparationSha256']!=digest(visual_path):
            raise ValueError('Complete current independent visual-key source verification required')
        additions={r['sourceSha256']:r for r in visual['results'] if r['status']=='PREPARED'}
        if set(additions)&set(partial_sources):raise ValueError('A chemistry source was already counted in the native/OCR cohort')
        if sum(r['questions'] for r in additions.values())!=proof['questions']:raise ValueError('Visual-key question count differs from current source proof')
        partial_sources.update(additions);inputs.extend([visual_path,visual_proof_path])
    amendment_path=root/'din-question-amendments/report.json';amendments={}
    if amendment_path.is_file():
        amendments=read_json(amendment_path)
        if amendments['status']!='PASS' or digest(amendments['amendedPackage'])!=amendments['amendedPackageSha256']:
            raise ValueError('Actually read source question amendments changed')
        if amendments['bankSnapshotSha256'] not in bank_snapshots:raise ValueError('Source question amendment bank snapshot differs')
        inputs.append(amendment_path)
    intake_path=root/'source-intake-queue/report.json';intake={};intake_by_source={}
    if intake_path.is_file():
        intake=read_json(intake_path)
        if intake['status']!='PASS' or intake['bankSnapshotSha256'] not in bank_snapshots:
            raise ValueError('Prepared source intake queue must use the same current bank snapshot')
        if len(intake['results'])!=intake['questions'] or len({r['sourceCode'] for r in intake['results']})!=intake['questions']:
            raise ValueError('Every prepared current source question must occur once in the intake queue')
        for row in intake['results']:
            if row['productionImportAllowed'] is not False or row['teacherApproved'] is not False:
                raise ValueError('Source preparation cannot contain production or invented teacher approval')
            intake_by_source.setdefault(row['sourceSha256'],Counter())[row['status']]+=1
        inputs.append(intake_path)
    saved_key_path=root/'saved-key-signal-discovery/report.json';saved_keys={};saved_key_by_source={}
    if saved_key_path.is_file():
        saved_keys=read_json(saved_key_path)
        if saved_keys['status']!='COMPLETE' or saved_keys['documents']!=len(saved_keys['results']):raise ValueError('Complete saved native/OCR key signal index required')
        saved_key_by_source=unique(saved_keys['results'],'sourceSha256');inputs.append(saved_key_path)
    summary_path=root/'physics-summary-discovery/report.json';summary={}
    if summary_path.is_file():
        summary=read_json(summary_path)
        if summary['status']!='COMPLETE' or summary['newQuestionAdmissionAccepted'] or digest(summary['package'])!=summary['packageSha256']:
            raise ValueError('Original bounded summary preparation changed')
        inputs.extend([summary_path,Path(summary['package']),Path(summary['keyEvidencePath'])])
        if digest(summary['keyEvidencePath'])!=summary['keyEvidenceSha256']:raise ValueError('Actually read summary key changed')
    summary_keys_path=root/'physics-summary-effective-key-regions/report.json';summary_keys={};summary_key_by_source={}
    if summary_keys_path.is_file():
        summary_keys=read_json(summary_keys_path)
        if summary_keys['status']!='COMPLETE' or summary_keys['sourceQuestionAnswersBound'] or summary_keys['wholeSourceKeyCompletenessAccepted']:
            raise ValueError('Printed-region preparation cannot accept unenumerated question bodies')
        summary_key_by_source=unique(summary_keys['results'],'sourceSha256');inputs.append(summary_keys_path)
    summary_bank_path=root/'physics-summary-discovery/actual-bank-image-review.json';summary_bank={}
    summary_topic_path=root/'physics-summary-topic-review/report.json';summary_topic={}
    for target,destination in [(summary_bank_path,summary_bank),(summary_topic_path,summary_topic)]:
        if target.is_file():
            destination.update(read_json(target))
            if destination['status']!='PASS' or destination['newQuestionAdmissionAccepted']:
                raise ValueError('Bounded actual image/topic proof cannot grant question admission')
            if destination.get('sourcePackageSha256')!=summary.get('packageSha256'):raise ValueError('Actual summary proof uses a different source package')
            inputs.append(target)
    summary_additional_path=root/'physics-summary-additional-source-review/report.json';summary_additional={}
    if summary_additional_path.is_file():
        summary_additional=read_json(summary_additional_path)
        if summary_additional['status']!='PASS' or summary_additional['noveltyAccepted'] or summary_additional['newQuestionAdmissionAccepted']:
            raise ValueError('Incremental exact-body comparison is not novelty acceptance')
        if summary_additional['bankSnapshotSha256'] not in bank_snapshots:raise ValueError('Additional summary source comparison uses a different bank')
        inputs.append(summary_additional_path)
    summary_body_preparations={}
    actual_summary_bodies=Counter()
    for name,relative in [('visibleGeometry','physics-summary-body-discovery/report.json'),
            ('actualLayouts','physics-summary-layout-actual-review/report.json'),
            ('fiveBodies','physics-summary-five-body-preparation-v2/report.json'),
            ('fiveBodyComparison','physics-summary-five-body-comparison/report.json'),
            ('fiveBodyActualBankReview','physics-summary-five-body-comparison/actual-bank-image-review.json'),
            ('fiveBodyTopicSupport','physics-summary-five-topic-review/report.json'),
            ('boundBodies','physics-summary-bound-bodies/report.json'),
            ('actualBoundCrops','physics-summary-bound-bodies/actual-crop-review.json'),
            ('secondBoundBodies','physics-summary-bound-bodies-02/report.json'),
            ('secondActualBoundCrops','physics-summary-bound-bodies-02/actual-crop-review.json'),
            ('finalSummaryOnePass','physics-summary-final-one-pass/report.json'),
            ('currentUserSourceSelection','verified-source-selection/report.json')]:
        target=root/relative
        if not target.is_file():continue
        report=read_json(target)
        if report['status'] not in {'PASS','COMPLETE'} or report.get('questionBankWrites') or report.get('newQuestionAdmissionAccepted'):
            raise ValueError('Summary geometry/body preparation cannot grant production admission')
        if report.get('noveltyAccepted') or report.get('categoryPublished') or report.get('oldIdsMerged'):
            raise ValueError('Bounded summary review cannot grant publication or merge old identities')
        if report.get('bankSnapshotSha256') and report['bankSnapshotSha256'] not in bank_snapshots:
            raise ValueError('Bounded summary comparison uses another canonical bank')
        if name=='fiveBodies' and (digest(report['package'])!=report['packageSha256'] or not report['cropImagesActuallyRead']):
            raise ValueError('Five actual corrected source crops must remain hash-bound')
        if name=='actualLayouts' and digest(report['sourceReport'])!=report['sourceReportSha256']:
            raise ValueError('Actual layout review belongs to an earlier source geometry report')
        if name in {'actualBoundCrops','secondActualBoundCrops','finalSummaryOnePass'}:
            for p,sha in report['inputs'].items():
                if digest(p)!=sha:raise ValueError('Actual summary crop review uses changed preparation')
            for card in report['results']:
                if name=='finalSummaryOnePass' and card['action']=='EXCLUDE_NO_RETRY':
                    if card.get('learnerVisible') or card.get('productionImportAllowed'):
                        raise ValueError('Excluded final summary cannot enter learner/import output')
                    continue
                if not card['preparedCropActuallyRead'] or card['visibleBodyOptionCuts'] or digest(card['image'])!=card['imageSha256']:
                    raise ValueError('Actual complete summary source crop required')
                actual_summary_bodies[card['sourceSha256']]+=1
        if name=='currentUserSourceSelection':
            for path,sha in report['inputs'].items():
                if digest(path)!=sha:raise ValueError('User policy selection inputs changed')
            for file_key in ['selectedPackage','exclusions','queuePolicy','remainingSources']:
                if digest(report[file_key])!=report[file_key+'Sha256']:
                    raise ValueError('Current filtered policy package changed')
        inputs.append(target)
        summary_body_preparations[name]={k:report[k] for k in ['status','documents','questions','states','actualLayoutBoardsRead',
            'actualIndividualPagesOpened','sourceStatementMarkerReviewQuestions','questionBankWrites',
            'policyId','sourceBodiesAssessed','sourceEvidenceCandidates','sourceQuestionsExcludedNoRetry',
            'remainingContiguousSummaryDocuments','remainingPrintedKeyCells','mainQueueActions',
            'excludedWithoutRetry','actualCropImagesRead','actualCropBoardsRead',
            'summarySourceDispositionComplete','summarySourceDocumentsDisposed'] if k in report}
    before={str(p):digest(p) for p in inputs};preflight=read_json(page)
    if preflight['status']!='PASS' or preflight['errors']:raise ValueError('Full page preflight required')
    mock_report=read_json(mock) if mock.is_file() else {}
    if mock_report and mock_report['status'] not in ['SUPPORTED_MOCK_PASS_COMPLETE','PARTIAL','RUNNING']:
        raise ValueError('Mock reader interrupted; inspect its saved source results first')
    with process_lock(folder/'.writer.lock'):
        rows=reconcile([json.loads(l) for l in file.read_text(encoding='utf-8').splitlines()],
            [json.loads(l) for l in obs.read_text(encoding='utf-8').splitlines()],preflight['documents'],
            unique(key_rows,'sourceSha256'),unique(read_json(diagnostic)['results'],'sourceSha256'),
            unique(mock_report.get('results',[]),'sourceSha256'),counters,
            unique(reuse.get('results',[]),'sourceSha256'),unique(body_report.get('results',[]),'sourceSha256'),
            unique(discovery_report.get('results',[]),'sourceSha256'),unique(decoded.get('results',[]),'sourceSha256'),document_reviews,book_sections)
        prepared_bodies={r['sourceSha256']:r for r in body_scope.get('results',[])}
        for row in rows:
            if saved_key_by_source:
                saved=saved_key_by_source[row['sourceSha256']]
                row['savedPrintedKeySignalReview']={k:saved[k] for k in ['status','keySignalPhysicalPages','priorOccurrenceCount','previousDiscoveredRegions','evidencePath','evidenceSha256']}
            if row['sourceSha256'] in summary_key_by_source:
                row['additionalSummaryPrintedRegionReview']=summary_key_by_source[row['sourceSha256']]
            if row['sourceSha256'] in actual_summary_bodies:
                row['actuallyReadSeparateSummaryBodyKeyBindings']={
                    'questions':actual_summary_bodies[row['sourceSha256']],
                    'evidence':'verified-source-selection/report.json',
                    'wholeMixedSubjectSourceAccepted':False,'mainQueueAdmissionAccepted':False}
            if summary and row['sourceSha256']==summary['sourceSha256']:
                if row['sourceSha256'] in intake_by_source:raise ValueError('Separate bounded summary pilot already belongs to the main intake queue')
                row['separateBoundedSummaryPreparation']={k:summary[k] for k in ['questions','package','packageSha256','keyEvidencePath','keyEvidenceSha256','newQuestionAdmissionAccepted']}
                row['verifiedPrintedAnswers']=len(summary['printedAnswers'])
                row['state']='SUMMARY_THREE_ORIGINAL_BODIES_KEYED_DUPLICATE_TOPIC_REVIEW_REQUIRED'
                row['nextAction']='REVIEW_BANK_IMAGE_CANDIDATES_AND_FINE_TOPIC_BEFORE_JOINING_MAIN_QUESTION_COHORT'
                if summary_bank and summary_topic:
                    row['separateBoundedSummaryCandidateImagesActuallyRead']=summary_bank['sourceCandidateRelationsActuallyRead']
                    row['separateBoundedSummaryFineTopicsSupportedForPreparation']=summary_topic['questions']
                    row['nextAction']='COMPARE_OTHER_PREPARED_AND_ORIGINAL_PENDING_QUEUES_BEFORE_NOVELTY_AND_MAIN_INTAKE'
                    if summary_additional:
                        row['separateBoundedSummaryPreparedPendingComparisonComplete']=True
                        row['nextAction']='UNPARSED_SOURCE_AND_NOVELTY_REVIEW_REQUIRED_NO_AUTOMATIC_MAIN_INTAKE'
            if row['sourceSha256'] in intake_by_source:
                row['preparedQuestionIntakeStates']=dict(intake_by_source[row['sourceSha256']])
            specific=[a for a in amendments.get('results',[]) if a['sourceSha256']==row['sourceSha256']]
            if specific:row['actualSourceQuestionAmendments']=specific
            result=prepared_bodies.get(row['sourceSha256'])
            if result:row['mockBodyPreparation']={k:result.get(k) for k in ['status','questionsPrepared','expectedQuestions','package','packageSha256','issues','administrativePagesContentAccepted']}
            if row['sourceSha256'] in page_equivalence:row['sourceEditionPageEquivalence']=page_equivalence[row['sourceSha256']]
            if row['sourceSha256'] in partial_sources:
                prepared=partial_sources[row['sourceSha256']]
                row['individuallyIdenticalPartialQuestionPreparation']={k:prepared[k] for k in ['status','questions','package','packageSha256','fullTestAccepted']}
                row['individuallyIdenticalPartialQuestionPreparation']['answerMethod']='EXACT_NATIVE_AND_TWO_DPI_QUESTION_PIXELS_PLUS_NATIVE_AND_INDEPENDENT_RENDERED_OFFICIAL_KEY'
            if row['sourceSha256'] in prior_by_source:
                original=prior_by_source[row['sourceSha256']]
                row['allPriorOccurrenceReconciliation']={k:original.get(k) for k in ['status','occurrences','sourceOccurrenceStates','proofStates','intakeActions','evidencePath','evidenceSha256','sourceFullyAccepted']}
        output=folder/'sources.jsonl';temporary=output.with_suffix('.jsonl.part')
        with temporary.open('w',encoding='utf-8') as stream:
            for row in rows:stream.write(json.dumps(row,ensure_ascii=False)+'\n')
        temporary.replace(output)
        csv_path=folder/'sources.csv';temporary=csv_path.with_suffix('.csv.part')
        with temporary.open('w',encoding='utf-8-sig',newline='') as stream:
            writer=csv.writer(stream);writer.writerow(['sha256','source','pages','state','printedAnswers','keyPages','visualPages','nextAction'])
            for row in rows:writer.writerow([row['sourceSha256'],str(Path(row['canonicalSource']['root'])/row['canonicalSource']['path']),row['pageCount'],
                row['state'],row['verifiedPrintedAnswers'],','.join(map(str,row['answerCandidatePhysicalPages'])),','.join(map(str,row['visualReviewPhysicalPages'])),row['nextAction']])
        temporary.replace(csv_path)
        if any(digest(p)!=sha for p,sha in before.items()):raise ValueError('Source work changed during scope reconciliation')
        report={'status':'PASS','scope':'ALL_PDFS_PAGE_COVERAGE_AND_EXPLICIT_REMAINING_WORK_ONLY','uniquePdfs':len(rows),
            'observedPages':sum(r['observedPages'] for r in rows),'states':dict(Counter(r['state'] for r in rows)),
            'verifiedPrintedAnswers':sum(r['verifiedPrintedAnswers'] for r in rows),'controlledRepeatStates':dict(sum(counters.values(),Counter())),
            'sourcesJsonlSha256':digest(output),'sourcesCsvSha256':digest(csv_path),'inputs':before,'toolSha256':digest(Path(__file__)),
            'newOcrCalls':0,'newModelCalls':0,'newRenders':0,'sourceWrites':0,'questionBankWrites':0,'fullYks07Accepted':False,'absenceClaimed':False,'teacherApproved':False}
        report['mockPassStatusSnapshot']=mock_report.get('status','NOT_STARTED')
        report['mockSourcesCompletedSnapshot']=mock_report.get('completed',0)
        report['mockSourcesPendingSnapshot']=mock_report.get('pending')
        report['mockBodyPreparationSnapshot']={k:body_scope.get(k) for k in ['status','documents','completed','pending','questionsPrepared','states']}
        key_shas={r['sourceSha256'] for r in key_rows}
        report['diagnosticQuestionComparisonStates']=comparison_states(counters,key_shas)
        report['mockQuestionComparisonStates']=comparison_states(counters,{r['sourceSha256'] for r in mock_report.get('results',[])})
        report['dinBookQuestionComparisonStates']=comparison_states(counters,set(book_sections))
        report['partialChemistryQuestionComparisonStates']=comparison_states(counters,set(partial_sources))
        report['individuallyPreparedChemistryQuestions']=sum(r['questions'] for r in partial_sources.values())
        report['actualDinSourceQuestionAmendments']={k:amendments.get(k) for k in ['status','questionsRead','amendedQuestions','excludedAmbiguousPrintedQuestions','additionalActuallyReadDuplicateGroups']}
        report['preparedQuestionIntakeSnapshot']={k:intake.get(k) for k in ['status','questions','sourceDocuments','states','provenExistingCanonicalIds']}
        report['savedPrintedKeySignalSnapshot']={k:saved_keys.get(k) for k in ['status','documents','completed','observedPages','states','unassessedHeadingSourcesWithoutPreviousRegions','sourceAnswersApproved','absenceClaimed']}
        report['separateBoundedSummaryPilotSnapshot']={k:summary.get(k) for k in ['status','sourceSha256','questions','newQuestionAdmissionAccepted','questionBankWrites']}
        report['additionalSummaryPrintedRegionSnapshot']={k:summary_keys.get(k) for k in ['status','documents','completed','states','readPrintedRegionCells','readContiguousRegionCells','sourceQuestionAnswersBound','wholeSourceKeyCompletenessAccepted']}
        report['separateSummaryActualBankImageSnapshot']={k:summary_bank.get(k) for k in ['status','sourceQuestions','sourceCandidateRelationsActuallyRead','distinctCanonicalImagesActuallyRead','newQuestionAdmissionAccepted']}
        report['separateSummaryActualTopicSnapshot']={k:summary_topic.get(k) for k in ['status','questions','actualTopicPdfPagesRead','categoryPublished','newQuestionAdmissionAccepted']}
        report['separateSummaryAdditionalSourceSnapshot']={k:summary_additional.get(k) for k in ['status','summaryQuestionsCompared','mainPreparedSourcesCompared','mainPreparedBodiesWithCompleteFiveOptions','originalPendingOccurrencesReused','originalPendingBodiesWithCompleteFiveOptions','preparedExactBodyRelations','originalPendingRelations','noveltyAccepted','newQuestionAdmissionAccepted']}
        report['separateSummaryBodyPreparationSnapshots']=summary_body_preparations
        report['bankSnapshotSha256']=next(iter(bank_snapshots),None)
        report['existingTransferStates']=reuse.get('states',{})
        if prior_occurrences:
            counts=supplement_counts(prior_occurrences['proofStates'],[
                (prior_booklets.get('results',[]),'CURRENT_ORIGINAL_BOOKLET_IMAGE_OFFICIAL_RECORD_AND_PRINTED_KEY_AGREE'),
                (partial_review.get('results',[]),'ORIGINAL_FROZEN_PARTIAL_SOURCE_ADMISSION_REVALIDATED_KEEP_ID')])
            report['allPriorOccurrenceSnapshot']={k:prior_occurrences[k] for k in ['sourceDocuments','completed','pending','occurrences','sourceOccurrenceStates','intakeActions']}
            report['allPriorOccurrenceSnapshot']['effectiveProofStates']=dict(counts)
            report['priorBookletContractSnapshot']={k:prior_booklets.get(k) for k in ['status','documents','questions','states']}
            report['partialSourceFrozenAdmissionSnapshot']={k:partial_review.get(k) for k in ['status','sourceLinks','states']}
        report['reviewedTransferNewlyRevalidatedLinks']=reviewed_report.get('newlyRevalidatedLinks',0)
        report['newRegionDiscoverySnapshot']={k:discovery_report.get(k) for k in ['status','documents','completed','pending','candidateRegions','sourceAnswersApproved']}
        write_json(folder/'report.json',report)
    print(json.dumps(report,ensure_ascii=False))


if __name__=='__main__':main()
