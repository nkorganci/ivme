"""Reconcile current question decisions across archive batches; preserve history."""
import csv
import hashlib
import json
import sqlite3
from collections import Counter
from mebi_pratik2_tam_pdf_tarama import BASE,SOURCE
from kaynakli_arastirma_db import db_connection,query
from yks_birlestirme import write_json
from mebi_pratik2_arsiv_kararlari import review_category
from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf


def run():
    accepted={};proofs={}
    admission_paths=['single-test-crops/source-pixel-acceptance.json','expanded-chapter-evidence/source-pixel-acceptance.json',
        'three-step-acceptance/source-pixel-acceptance.json','mock-language-intent/source-pixel-acceptance.json',
        'compiled-tarama-acceptance/source-pixel-acceptance.json','bounded-answer-recovery/source-pixel-acceptance.json']
    admission_paths.extend(str(p.relative_to(BASE)) for p in sorted(BASE.glob('*/part-*/source-pixel-acceptance.json')))
    admission_reviews=[]
    for relative in admission_paths:
        path=BASE/relative
        if not path.exists():continue
        proofs[relative]=hashlib.sha256(path.read_bytes()).hexdigest()
        data=json.loads(path.read_text(encoding='utf8'))
        for row in data['accepted']:accepted[row['code']]=row
        admission_reviews.extend(data.get('reviewQueueAdditions',[]))
    cmd,env,_=db_connection('ivme');published=set(json.loads(query((cmd,env,None),"SELECT coalesce(json_agg(code),'[]') FROM questions WHERE bank='MEBI_PRACTICE_2'")))
    crops=json.loads((BASE/'single-test-crops/manifest.json').read_text(encoding='utf8'))['crops']
    reasons={r['code']:r['reasons'] for r in json.loads((BASE/'single-test-crops/technical-packages.json').read_text(encoding='utf8'))['reviewQueueAdditions']}
    decisions={}
    for row in crops:
        code=f'MEBI2-{row["sourceSha256"][:16]}-Q{row["printedNumber"]:03}'
        decisions[code]={**row,'code':code,'status':'REVIEW_REQUIRED','reasons':reasons.get(code,[]),'studentVisible':False}
    book=BASE/'three-step-crops/native-proof-v3.json';group_reviews=[]
    if book.exists():
        data=json.loads(book.read_text(encoding='utf8'));group_reviews=data['reviewQueueAdditions']
        for row in data['items']:
            decisions[row['code']]={**row,'status':'INDEPENDENT_KEY_OR_VISUAL_BODY_REVIEW_PENDING','reasons':['SOURCE_ADMISSION_NOT_COMPLETE'],'studentVisible':False}
    for directory in ['three-step-all-bodies-v2','compiled-tarama-crops','four-square-crops','three-step-mock-crops']:
        manifest=BASE/directory/'report.json'
        if not manifest.exists():continue
        for source in json.loads(manifest.read_text(encoding='utf8'))['sources']:
            data=json.loads((BASE/directory/(source['sourceSha256']+'.json')).read_text(encoding='utf8'))
            for row in data['items']:
                if row['code'] not in decisions:
                    decisions[row['code']]={**row,'status':'REVIEW_REQUIRED',
                        'reasons':['CONTROLLED_TOPIC_REVIEW_REQUIRED' if not row.get('categoryId') else 'INDEPENDENT_KEY_BODY_REVIEW_REQUIRED'],'studentVisible':False}
            for row in data['reviewQueueAdditions']:
                if row.get('code') and row['code'] not in decisions:
                    decisions[row['code']]={**row,'status':'REVIEW_REQUIRED','studentVisible':False}
                elif not row.get('code'):group_reviews.append(row)
    mock=BASE/'full-mock-source-reuse/report.json'
    if mock.exists():
        for row in json.loads(mock.read_text(encoding='utf8'))['records']:
            source=row['sourceEvidence']
            decisions[row['code']]={**source,**row,'bodyPage':source['pdfPage'],'answer':source['answer'],
                'image':source['image'],'status':'REVIEW_REQUIRED','studentVisible':False}
    for row in admission_reviews:
        if row.get('code'):decisions[row['code']]={**decisions.get(row['code'],{}),**row,'status':'REVIEW_REQUIRED','studentVisible':False}
    # A new word-level crop is explicit changed evidence, not a repetition of
    # the same failed crop. Preserve the earlier reason as history.
    for directory in ['word-boundary-crops','four-square-header-crops','three-step-mock-additional-crops','full-mock-source-crops']:
        word_report=BASE/directory/'report.json'
        if not word_report.exists():continue
        for source in json.loads(word_report.read_text(encoding='utf8'))['sources']:
            source_view=BASE/directory/(source['sourceSha256']+'.json')
            if not source_view.exists():continue  # producer is still sealing per-source views
            data=json.loads(source_view.read_text(encoding='utf8'))
            for row in data['items']:
                if row['code'] in accepted:continue
                prior=decisions.get(row['code'],{})
                decisions[row['code']]={**prior,**row,'status':'REVIEW_REQUIRED',
                    'priorReviewReasons':prior.get('reasons',[]),
                    'reasons':['INDEPENDENT_KEY_BODY_REVIEW_REQUIRED' if row.get('categoryId') else 'CONTROLLED_TOPIC_REVIEW_REQUIRED'],'studentVisible':False}
    subject_overlay=BASE/'dual-exam-philosophy-expansion/subject-review-overlay.json'
    if subject_overlay.exists():
        for correction in json.loads(subject_overlay.read_text(encoding='utf8'))['rows']:
            code=correction['code']
            if code in accepted or code not in decisions:continue
            decisions[code].update(subject=correction['subject'],subjectId=correction['subjectId'],
                sourcePrintedExamScopes=correction['printedExamScopes'],subjectEvidence=correction['evidence'])
    for path in [* (BASE/'all-source-evidence/candidate-evidence').glob('*.json'),
                 * (BASE/'full-mock-pending-evidence/candidate-evidence').glob('*.json'),
                 * (BASE/'single-test-pending-evidence/candidate-evidence').glob('*.json')]:
        evidence=json.loads(path.read_text(encoding='utf8'));code=evidence['code']
        if code not in decisions or code in accepted:continue
        decisions[code]={**decisions[code],'status':evidence['status'],'reasons':evidence['reasons'],
            'sourceEvidenceReview':str(path.relative_to(BASE)),
            'sourceEvidenceReviewSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'studentVisible':False}
    aliases={};excluded={}
    for batch in sorted(BASE.glob('verified-source-batch-*')):
        final=batch/'final-source-acceptance.json'
        if final.exists():
            for row in json.loads(final.read_text(encoding='utf8')).get('reviewQueueAdditions',[]):excluded[row['code']]=row
        duplicates=batch/'exact-duplicate-evidence.json'
        if duplicates.exists():
            data=json.loads(duplicates.read_text(encoding='utf8'))
            for row in data.get('additionalSourceOccurrences',[]):aliases[row['sourceQuestion']['code']]=row
            for row in data.get('reviewQueueAdditions',[]):excluded[row['code']]=row
    for code,row in excluded.items():
        accepted.pop(code,None);decisions[code]={**row,'status':'EXCLUDE_NO_RETRY','studentVisible':False}
    for code,row in accepted.items():
        state='PUBLISHED_SOURCE_VERIFIED_NOT_TEACHER_APPROVED' if code in published else 'EXACT_DUPLICATE_SOURCE_OCCURRENCE' if code in aliases else 'SOURCE_VERIFIED_PENDING_PUBLICATION'
        decisions[code]={**row,'status':state,'existingQuestionCode':aliases.get(code,{}).get('existingQuestionCode'),'studentVisible':False}
    pdf_decisions=load_decisions();skipped_codes=set()
    for code,row in decisions.items():
        sha=row.get('sourceSha256')
        if code in published or not sha or sha not in pdf_decisions:continue
        if skip_pdf(sha,pdf_decisions):
            accepted.pop(code,None);skipped_codes.add(code)
            row.update(status='SOURCE_PDF_ALREADY_IN_EXISTING_PRACTICE',reasons=['PDF_DOCUMENT_ALREADY_USED_NO_QUESTION_COMPARISON'],
                       existingPracticePdfDecision=pdf_decisions[sha],studentVisible=False)
    pending=[r for code,r in decisions.items() if code not in accepted and code not in skipped_codes]
    if any(r['code'] in published for r in pending):raise ValueError('Published question remained unresolved in current queue')
    db=sqlite3.connect(BASE/'review-index.sqlite3')
    with db:
        for code,row in decisions.items():
            db.execute('INSERT INTO candidate_decisions(code,status,payload) VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET status=excluded.status,payload=excluded.payload',
                (code,row['status'],json.dumps(row,ensure_ascii=False,sort_keys=True)))
    db.close()
    out=BASE/'teacher-review-export/current';out.mkdir(exist_ok=True)
    write_json(out/'already-existing-practice-pdfs.json',{'sources':[r for r in pdf_decisions.values() if r['decision']!='NEW_PDF_DOCUMENT_NOT_SEEN'],
        'skippedPreparedCandidates':len(skipped_codes),'comparisonUnit':'PDF_DOCUMENT_ONLY','questionComparisons':0})
    for row in pending:
        row['reviewCategory']=review_category(row.get('reasons',[]))
        row['sourcePdf']=str(SOURCE/row['relativePath']) if row.get('relativePath') else row.get('sourcePath','')
        row['questionImage']=str(BASE/row['image']) if row.get('image') else ''
        row['answerImage']=str(BASE/row['keyImage']) if row.get('keyImage') else ''
        row['answerKeyPage']=row.get('keyPage',row.get('sourceKeyPage'))
    write_json(out/'question-candidates.json',{'records':pending,'recordCount':len(pending),'studentVisible':False})
    write_json(out/'source-group-reviews.json',{'records':group_reviews,'recordCount':len(group_reviews),'recordType':'SOURCE_GROUP_NOT_DISTINCT_QUESTION_COUNT','studentVisible':False})
    columns=['code','status','reviewCategory','reasons','relativePath','sourcePdf','bodyPage','printedNumber','answer','categoryId','questionImage','answerImage','answerKeyPage','image','keyImage']
    with (out/'question-candidates.csv').open('w',encoding='utf-8-sig',newline='') as stream:
        writer=csv.DictWriter(stream,fieldnames=columns);writer.writeheader()
        for row in pending:
            writer.writerow({k:json.dumps(row[k],ensure_ascii=False) if isinstance(row.get(k),(list,dict)) else row.get(k,'') for k in columns})
    reason_folder=out/'by-reason';reason_folder.mkdir(exist_ok=True)
    categories=sorted({row['reviewCategory'] for row in pending})
    for category in categories:
        with (reason_folder/(category+'.csv')).open('w',encoding='utf-8-sig',newline='') as stream:
            writer=csv.DictWriter(stream,fieldnames=columns);writer.writeheader()
            for row in pending:
                if row['reviewCategory']==category:writer.writerow({k:json.dumps(row[k],ensure_ascii=False) if isinstance(row.get(k),(list,dict)) else row.get(k,'') for k in columns})
    report={'status':'CURRENT_REVIEW_QUEUE_RECONCILED','acceptedSourceCodes':len(accepted),'publishedBankCodes':len(published),
        'pendingQuestionCandidateCodes':len(pending),'additionalSourceOccurrences':len(aliases),
        'finalPixelOrAnswerExclusions':len(excluded),'sourceGroupReviewRecordsNotQuestionCount':len(group_reviews),
        'decisionStates':dict(Counter(r['status'] for r in decisions.values())),
        'pendingReviewCategories':dict(Counter(r['reviewCategory'] for r in pending)),
        'sourceAdmissionProofs':proofs,'totalArchiveQuestions':None,'applicationDatabaseWrites':0}
    write_json(out/'report.json',report);print(json.dumps({k:v for k,v in report.items() if k!='sourceAdmissionProofs'}))


if __name__=='__main__':run()
