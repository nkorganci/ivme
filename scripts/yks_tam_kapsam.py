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


def reconcile(groups,observations,pages,keys,diagnostics,mocks,comparisons,existing=None,body=None,discoveries=None,decoding=None):
    existing=existing or {};body=body or {};discoveries=discoveries or {};decoding=decoding or {}
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
        results.append({'sourceSha256':sha,'canonicalSource':group['canonicalCandidate'],'sourceAliases':group['occurrences'],
            'pageCount':count,'observedPages':observed['observedPages'],'state':state,'nextAction':remaining,
            'answerCandidatePhysicalPages':observed['candidatePages'],'questionSignalPhysicalPages':observed['questionSignalPages'],
            'visualReviewPhysicalPages':observed['visualReviewPages'],'verifiedPrintedAnswers':answers,
            'currentSourceKeyEvidence':None if not key else {k:key.get(k) for k in ['sourceKeyDocumentSha256','sourceKeyPage','keyEvidenceSha256','method']},
            'controlledRepeatStates':dict(comparisons.get(sha,{})),
            'currentExistingTransferRevalidation':None if sha not in existing else {k:existing[sha].get(k) for k in ['status','expectedQuestions','currentDistinctLinkedQuestions','issues','reuseAction','freshSemanticApproval']},
            'bodyExceptionPreparation':None if sha not in body else {k:body[sha].get(k) for k in ['status','questions','sourceKeysApproved','pixelsAndContentAccepted']},
            'newQuestionRegionDiscovery':discoveries.get(sha),
            'sourceDecodingCheck':None if sha not in decoding else {k:decoding[sha].get(k) for k in ['status','pageCount','issues','bodyContentAccepted']},
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
    for name in ['full-question-comparison','full-question-repair-comparison','full-question-shared-comparison','full-question-raster-comparison']:
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
    decoding=root/'pdf-on-tarama/mock-decoding/report.json';decoded=read_json(decoding) if decoding.is_file() else {}
    if decoded:
        if decoded['status']!='COMPLETE':raise ValueError('Wait for complete source decoding check')
        inputs.append(decoding)
    discovery=root/'new-source-discovery/scoped-report.json'
    if not discovery.is_file():discovery=root/'new-source-discovery/progress.json'
    discovery_report=read_json(discovery) if discovery.is_file() else {}
    if discovery_report:
        if discovery_report['sourceGroupsSha256']!=digest(file):raise ValueError('New region discovery belongs to other source inventory')
        inputs.append(discovery)
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
            unique(discovery_report.get('results',[]),'sourceSha256'),unique(decoded.get('results',[]),'sourceSha256'))
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
        report['bankSnapshotSha256']=next(iter(bank_snapshots),None)
        report['existingTransferStates']=reuse.get('states',{})
        report['newRegionDiscoverySnapshot']={k:discovery_report.get(k) for k in ['status','documents','completed','pending','candidateRegions','sourceAnswersApproved']}
        write_json(folder/'report.json',report)
    print(json.dumps(report,ensure_ascii=False))


if __name__=='__main__':main()
