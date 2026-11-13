"""Continue the already-authorized verified subset after the running publication.

The journal gates every dependent command. It never publishes unverified
archive observations or marks the full archive complete.
"""
import hashlib
import json
import subprocess
import sys
import time
from datetime import datetime,timezone
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from kaynakli_arastirma_db import db_connection,query
from yks_birlestirme import write_json


def run():
    folder=BASE/'verified-source-batch-001';folder.mkdir(exist_ok=True)
    journal=folder/'continuation-progress.jsonl';started=time.monotonic()
    def log(stage,**extra):
        row={'atUtc':datetime.now(timezone.utc).isoformat(),'stage':stage,
            'elapsedSeconds':round(time.monotonic()-started,2),**extra}
        with journal.open('a',encoding='utf8') as stream:stream.write(json.dumps(row)+'\n')
        print(json.dumps(row),flush=True)
    log('WAITING_FOR_RUNNING_PILOT_PUBLICATION',overallPercent=None,estimatedRemainingSeconds=None)
    next_log=time.monotonic()+300
    while not (BASE/'publication-preparation/publication-result.json').exists():
        if time.monotonic()>=next_log:
            log('WAITING_FOR_RUNNING_PILOT_PUBLICATION',overallPercent=None,estimatedRemainingSeconds=None);next_log=time.monotonic()+300
        time.sleep(5)
    def command(stage,args,receipt):
        if receipt.exists():log(stage+'_RECEIPT_EXISTS');return
        log(stage+'_START')
        result=subprocess.run(args,cwd=APP)
        if result.returncode:
            log(stage+'_FAILED',exitCode=result.returncode,laterStepsStarted=False)
            raise RuntimeError(f'{stage} failed; later steps were not run')
        if not receipt.exists():raise RuntimeError(f'{stage} did not produce required receipt')
        log(stage+'_COMPLETE')
    command('LIVE_PILOT_READ',['node','testler/mebi-pratik2-live-read.mjs'],BASE/'pilot-live-read-report.json')
    command('PREPARE_VERIFIED_BATCH',[sys.executable,'scripts/mebi_pratik2_dogrulanmis_parti.py'],folder/'report.json')
    command('ADAPT_SHARED_RESOURCE_CONTRACT',['node','scripts/mebi-pratik2-batch-package.mjs'],folder/'batch-resources.json')
    command('PREVIEW_INSERT_ONLY',[sys.executable,'scripts/mebi_pratik2_pilot_import.py','--batch'],folder/'dry-run-result.json')
    command('IMPORT_ATOMIC_BATCHES',[sys.executable,'-u','scripts/mebi_pratik2_pilot_import.py','--batch','--apply'],folder/'import-result.json')
    command('REPEAT_ZERO_DELTA',[sys.executable,'scripts/mebi_pratik2_pilot_import.py','--batch','--repeat-check'],folder/'repeat-check-result.json')
    command('PUBLISH_VERIFIED_BATCH',[sys.executable,'-u','scripts/mebi_pratik2_pilot_yayin.py','--batch','--apply'],folder/'publication-result.json')
    command('LIVE_VERIFIED_BANK_READ',['node','testler/mebi-pratik2-live-bank.mjs'],folder/'live-bank-read-report.json')
    admitted=json.loads((BASE/'single-test-crops/source-pixel-acceptance.json').read_text(encoding='utf8'))['accepted']
    cmd,env,_=db_connection('ivme');conn=(cmd,env,None)
    current=json.loads(query(conn,"""SELECT json_agg(json_build_object('code',q.code,'answer',q.correct_answer,
        'image',q.image,'active',q.active,'categoryIds',i.category_ids,'visible',i.student_visible))
        FROM questions q LEFT JOIN learning_catalog.current_items i ON i.question_code=q.code
        WHERE q.bank='MEBI_PRACTICE_2'"""))
    live={r['code']:r for r in current}
    if len(current)!=len(live) or set(live)!={r['code'] for r in admitted}:raise ValueError('Live admitted-code set differs')
    for row in admitted:
        value=live[row['code']]
        if value['answer']!=row['answer'] or not value['active'] or not value['visible'] or value['categoryIds']!=[row['categoryId']]:
            raise ValueError('Live answer/category/visibility differs')
        image=APP/'veri/resimler-pilot'/value['image']
        if hashlib.sha256(image.read_bytes()).hexdigest()!=row['imageSha256']:raise ValueError('Live crop hash differs')
    original=json.loads(query(conn,"SELECT json_build_object('questions',count(*),'fingerprint',md5(string_agg(code||':'||extract(epoch from updated_at)::text,'|' ORDER BY code))) FROM questions WHERE bank<>'MEBI_PRACTICE_2'"))
    baseline=json.loads((BASE/'publication-preparation/report.json').read_text(encoding='utf8'))['before']
    if original!={k:baseline[k] for k in ('questions','fingerprint')}:raise ValueError('Original question bank changed')
    proof={'status':'PASS','scope':'557_SOURCE_VERIFIED_QUESTIONS_ONLY_FULL_ARCHIVE_OPEN',
        'acceptedQuestions':len(admitted),'liveQuestions':len(live),'answerImageCategoryMatches':len(live),
        'originalQuestionBankUnchanged':True,'originalQuestions':original['questions'],
        'runKey':query(conn,'SELECT run_key FROM learning_catalog.current_run'),
        'answerWritesByAcceptanceCheck':0,'teacherApprovalsCreated':0,'fullArchiveAccepted':False}
    write_json(folder/'bank-acceptance.json',proof);log('VERIFIED_SUBSET_ACCEPTED',**proof)


if __name__=='__main__':run()
