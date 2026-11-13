"""Reconcile current question decisions across archive batches; preserve history."""
import csv
import hashlib
import json
import sqlite3
from collections import Counter
from mebi_pratik2_tam_pdf_tarama import BASE
from kaynakli_arastirma_db import db_connection,query
from yks_birlestirme import write_json


def run():
    accepted={};proofs={}
    for relative in ['single-test-crops/source-pixel-acceptance.json','expanded-chapter-evidence/source-pixel-acceptance.json','three-step-acceptance/source-pixel-acceptance.json']:
        path=BASE/relative
        if not path.exists():continue
        proofs[relative]=hashlib.sha256(path.read_bytes()).hexdigest()
        for row in json.loads(path.read_text(encoding='utf8'))['accepted']:accepted[row['code']]=row
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
    for code,row in accepted.items():
        decisions[code]={**row,'status':'PUBLISHED_SOURCE_VERIFIED_NOT_TEACHER_APPROVED' if code in published else 'SOURCE_VERIFIED_PENDING_PUBLICATION','studentVisible':False}
    pending=[r for code,r in decisions.items() if code not in accepted]
    if any(r['code'] in published for r in pending):raise ValueError('Published question remained unresolved in current queue')
    db=sqlite3.connect(BASE/'review-index.sqlite3')
    with db:
        for code,row in decisions.items():
            db.execute('INSERT INTO candidate_decisions(code,status,payload) VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET status=excluded.status,payload=excluded.payload',
                (code,row['status'],json.dumps(row,ensure_ascii=False,sort_keys=True)))
    db.close()
    out=BASE/'teacher-review-export/current';out.mkdir(exist_ok=True)
    write_json(out/'question-candidates.json',{'records':pending,'recordCount':len(pending),'studentVisible':False})
    write_json(out/'source-group-reviews.json',{'records':group_reviews,'recordCount':len(group_reviews),'recordType':'SOURCE_GROUP_NOT_DISTINCT_QUESTION_COUNT','studentVisible':False})
    columns=['code','status','reasons','relativePath','bodyPage','printedNumber','answer','categoryId','image','keyImage']
    with (out/'question-candidates.csv').open('w',encoding='utf-8-sig',newline='') as stream:
        writer=csv.DictWriter(stream,fieldnames=columns);writer.writeheader()
        for row in pending:
            writer.writerow({k:json.dumps(row[k],ensure_ascii=False) if isinstance(row.get(k),(list,dict)) else row.get(k,'') for k in columns})
    report={'status':'CURRENT_REVIEW_QUEUE_RECONCILED','acceptedSourceCodes':len(accepted),'publishedBankCodes':len(published),
        'pendingQuestionCandidateCodes':len(pending),'sourceGroupReviewRecordsNotQuestionCount':len(group_reviews),
        'decisionStates':dict(Counter(r['status'] for r in decisions.values())),
        'sourceAdmissionProofs':proofs,'totalArchiveQuestions':None,'applicationDatabaseWrites':0}
    write_json(out/'report.json',report);print(json.dumps({k:v for k,v in report.items() if k!='sourceAdmissionProofs'}))


if __name__=='__main__':run()
