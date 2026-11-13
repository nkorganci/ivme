"""Close the authorized first pass only after every queued batch is accepted.

Deferred uncertain sources remain a separate, explicit deliverable; their
existence is never converted into a claim that all questions were extracted.
"""
import argparse
import json
import subprocess
import sys
import time
from datetime import datetime,timezone
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from kaynakli_arastirma_db import db_connection,query
from yks_birlestirme import write_json


def run():
    batches=[]
    for name in ['publication-preparation',*[f'verified-source-batch-{n:03}' for n in range(1,6)]]:
        folder=BASE/name
        if name=='publication-preparation':receipt=folder/'publication-result.json'
        else:receipt=folder/'bank-acceptance.json'
        if not receipt.exists():raise ValueError('Required batch has not finished: '+name)
        result=json.loads(receipt.read_text(encoding='utf8'))
        if result['status'] not in ('PASS','PUBLISHED'):raise ValueError('Batch acceptance failed: '+name)
        publication=folder/'publication-result.json'
        if publication.exists():batches.append({'batch':name,'acceptance':str(receipt.relative_to(BASE)),**json.loads(publication.read_text(encoding='utf8'))})
    integrity=json.loads((BASE/'final-source-integrity.json').read_text(encoding='utf8'))
    if integrity['status']!='PASS':raise ValueError('Full current source integrity proof required')
    for script in ['mebi_pratik2_guncel_kuyruk.py','mebi_pratik2_arsiv_kararlari.py','mebi_pratik2_ilerleme.py']:
        subprocess.run([sys.executable,'scripts/'+script],cwd=APP,check=True)
    queue=json.loads((BASE/'teacher-review-export/current/report.json').read_text(encoding='utf8'))
    if queue['decisionStates'].get('SOURCE_VERIFIED_PENDING_PUBLICATION',0):raise ValueError('Admitted source rows remain unaccounted for')
    disposition=json.loads((BASE/'archive-disposition/report.json').read_text(encoding='utf8'))
    cmd,env,_=db_connection('ivme');conn=(cmd,env,None)
    live=json.loads(query(conn,"""SELECT json_build_object('bankQuestions',count(*),
      'currentCatalogQuestions',count(i.question_code),'hiddenBankQuestions',count(*) FILTER(WHERE NOT q.active OR NOT coalesce(i.student_visible,false)),
      'missingAnswers',count(*) FILTER(WHERE q.correct_answer IS NULL OR q.correct_answer NOT IN ('A','B','C','D','E')),
      'emptyCategories',count(*) FILTER(WHERE cardinality(i.category_ids) IS NULL OR cardinality(i.category_ids)=0),
      'catalogRun',(SELECT run_key FROM learning_catalog.current_run))
      FROM questions q LEFT JOIN learning_catalog.current_items i ON i.question_code=q.code WHERE q.bank='MEBI_PRACTICE_2'"""))
    expected=sum(r['questionsAppended'] for r in batches)
    if live['bankQuestions']!=expected or live['currentCatalogQuestions']!=expected or any(live[k] for k in ['hiddenBankQuestions','missingAnswers','emptyCategories']):
        raise ValueError('Final live bank/catalog delta differs')
    original=json.loads(query(conn,"SELECT json_build_object('questions',count(*),'fingerprint',md5(string_agg(code||':'||extract(epoch from updated_at)::text,'|' ORDER BY code))) FROM questions WHERE bank<>'MEBI_PRACTICE_2'"))
    baseline=json.loads((BASE/'publication-preparation/report.json').read_text(encoding='utf8'))['before']
    if original!={k:baseline[k] for k in ('questions','fingerprint')}:raise ValueError('Original bank was changed')
    result={'status':'FIRST_PASS_COMPLETE_WITH_EXPLICIT_DEFERRED_REVIEW','publishedQuestions':expected,'live':live,
        'sourceFilesAccounted':disposition['assignedSourcePaths'],'pdfPagesAccounted':disposition['assignedPdfPages'],
        'sourceArchiveUnchanged':True,'sourceBytesVerified':integrity['bytesRead'],'originalBankUnchanged':True,
        'reviewQueue':queue,'batchAcceptances':batches,'teacherApprovalsCreated':0,'studentAnswerWritesByChecks':0,
        'allPrintedQuestionsExtracted':False,'totalArchiveQuestions':None,
        'scope':'VERIFY_AND_IMPORT_SUPPORTED_LOCAL_QUESTIONS;CATEGORIZE_UNRESOLVED_WITHOUT_REPAIR_OR_RETRY',
        'unresolvedDeliverables':['teacher-review-export/current/question-candidates.csv','teacher-review-export/current/source-group-reviews.json',
            'archive-disposition/source-review.csv','archive-disposition/pdf-page-decisions.jsonl','review-index.sqlite3'],
        'meaning':'SUPPORTED_PASS_FINISHED;DEFERRED_REVIEW_REMAINS;NOT_ALL_ARCHIVE_QUESTIONS_PROVEN_EXTRACTED'}
    write_json(BASE/'archive-closeout.json',result)
    print(json.dumps({k:v for k,v in result.items() if k not in ('reviewQueue','batchAcceptances')}))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--wait',action='store_true');args=parser.parse_args()
    if args.wait:
        started=time.monotonic();last=0
        while True:
            pending=[f'verified-source-batch-{n:03}' for n in range(1,6) if not (BASE/f'verified-source-batch-{n:03}'/'bank-acceptance.json').exists()]
            if not pending:break
            now=time.monotonic()
            if not last or now-last>=300:
                progress={'atUtc':datetime.now(timezone.utc).isoformat(),'stage':'WAITING_FOR_ALL_BATCH_ACCEPTANCES','pendingBatches':pending,
                    'elapsedSeconds':round(now-started,1),'estimatedRemainingSeconds':None}
                with (BASE/'closeout-progress.jsonl').open('a',encoding='utf8') as stream:stream.write(json.dumps(progress)+'\n')
                print(json.dumps(progress),flush=True);last=now
            time.sleep(5)
    run()
