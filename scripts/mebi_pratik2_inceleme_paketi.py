"""Export unresolved candidates with original evidence for later teacher review.

This is a portable evidence export, not a publication or an answer decision.
Historical source records can overlap new candidates; totals are never added
and represented as a distinct-question count.
"""
import csv
import hashlib
import json
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import BASE,SOURCE
from yks_birlestirme import write_json


def run():
    root=BASE/'single-test-crops'
    crops=json.loads((root/'manifest.json').read_text(encoding='utf8'))['crops']
    by_code={f'MEBI2-{r["sourceSha256"][:16]}-Q{r["printedNumber"]:03}':r for r in crops}
    topics={r['sourceSha256']:r for r in json.loads((root/'topic-candidates.json').read_text(encoding='utf8'))['rows']}
    reviews=json.loads((root/'technical-packages.json').read_text(encoding='utf8'))['reviewQueueAdditions']
    rows=[]
    for review in reviews:
        crop=by_code[review['code']];topic=topics[crop['sourceSha256']]
        rows.append({**review,'sourceSha256':crop['sourceSha256'],'sourcePdf':str(SOURCE/crop['relativePath']),
            'testNumber':crop['testNumber'],'printedNumber':crop['printedNumber'],
            'bodyPage':crop['bodyPage'],'keyPage':crop['keyPage'],'readAnswer':crop['answer'],
            'bodyImage':str(BASE/crop['image']),'keyImage':str(BASE/crop['keyImage']),
            'bodyClip':crop['bodyClip'],'keyClip':crop['keyClip'],'candidateExam':topic['exam'],
            'candidateSubject':topic['lesson'],'candidateCategories':topic['matches'],
            'status':'REVIEW_REQUIRED','teacherApproved':False,'studentVisible':False})
    folder=BASE/'teacher-review-export';folder.mkdir(exist_ok=True)
    write_json(folder/'question-candidates.json',{'status':'REVIEW_REQUIRED','records':rows,
        'recordCount':len(rows),'sourceScope':str(SOURCE),'studentVisible':False})
    columns=['code','status','reasons','candidateExam','candidateSubject','testNumber','printedNumber',
        'readAnswer','bodyPage','keyPage','sourcePdf','bodyImage','keyImage','candidateCategories','sourceSha256']
    with (folder/'question-candidates.csv').open('w',encoding='utf-8-sig',newline='') as stream:
        writer=csv.DictWriter(stream,fieldnames=columns);writer.writeheader()
        for row in rows:
            writer.writerow({k:json.dumps(row[k],ensure_ascii=False) if isinstance(row[k],(list,dict)) else row[k] for k in columns})
    prior=BASE/'prior-source-proof-reuse.json'
    prior_data=json.loads(prior.read_text(encoding='utf8'))
    write_json(folder/'prior-source-candidates.json',{'status':'TOPIC_AND_CONTENT_ACCEPTANCE_REQUIRED',
        'records':prior_data['candidates'],'recordCount':len(prior_data['candidates']),
        'overlapWithNewCandidatesNotExcluded':True,'studentVisible':False})
    report={'status':'REVIEW_EXPORT_READY','currentQuestionCandidateRecords':len(rows),
        'priorSourceEvidenceRecords':len(prior_data['candidates']),'distinctQuestionTotal':None,
        'rawObservationsIndex':str(BASE/'review-index.sqlite3'),'applicationDatabaseWrites':0,
        'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.iterdir() if p.suffix in ('.json','.csv') and p.name!='report.json'}}
    write_json(folder/'report.json',report)
    print(json.dumps({k:v for k,v in report.items() if k not in ('files','rawObservationsIndex')}))


if __name__=='__main__':run()
