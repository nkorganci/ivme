"""Resume a new verified archive batch through import, publication and live read.

Only the completed source acceptance manifest authorizes insertions. Waiting,
model checks and publishing are one sequential journalled job, not a promise
that an independent background scan will somehow continue the rest.
"""
import argparse
import hashlib
import json
import subprocess
import sys
import time
from datetime import datetime,timezone
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from kaynakli_arastirma_db import db_connection,query
from yks_birlestirme import write_json,process_lock


def run(acceptance,batch_dir,after_batch=None):
    proof=(BASE/acceptance).resolve()
    if not proof.is_relative_to(BASE.resolve()) or Path(batch_dir).name!=batch_dir or not batch_dir.startswith('verified-source-batch-'):
        raise ValueError('Unsafe evidence or batch directory')
    folder=BASE/batch_dir;folder.mkdir(exist_ok=True);started=time.monotonic()
    def log(stage,**details):
        value={'atUtc':datetime.now(timezone.utc).isoformat(),'stage':stage,'elapsedSeconds':round(time.monotonic()-started,2),**details}
        with (folder/'continuation-progress.jsonl').open('a',encoding='utf8') as stream:stream.write(json.dumps(value)+'\n')
        print(json.dumps(value),flush=True)
    log('WAITING_FOR_SOURCE_ACCEPTANCE',totalArchiveQuestions=None,overallPercent=None)
    next_log=time.monotonic()+300
    while not proof.exists():
        if time.monotonic()>=next_log:log('WAITING_FOR_SOURCE_ACCEPTANCE');next_log=time.monotonic()+300
        time.sleep(5)
    if after_batch:
        if Path(after_batch).name!=after_batch or not after_batch.startswith('verified-source-batch-'):raise ValueError('Unsafe preceding batch')
        previous=BASE/after_batch/'bank-acceptance.json';next_log=0
        while not previous.exists():
            if time.monotonic()>=next_log:log('WAITING_FOR_PREVIOUS_BATCH_ACCEPTANCE',afterBatch=after_batch);next_log=time.monotonic()+300
            time.sleep(5)
        if json.loads(previous.read_text(encoding='utf8'))['status']!='PASS':raise ValueError('Previous batch is not accepted')
    admitted=json.loads(proof.read_text(encoding='utf8'))['accepted']
    if not admitted:
        write_json(folder/'bank-acceptance.json',{'status':'PASS','scope':'REVIEW_ONLY_SOURCE_BATCH',
            'newQuestions':0,'questionWrites':0,'previousQuestionsUnchanged':True,'teacherApprovalsCreated':0});return
    def command(stage,args,receipt):
        if receipt.exists():
            existing=json.loads(receipt.read_text(encoding='utf8'))
            if existing.get('errorCount',0):
                receipt.rename(receipt.with_name(receipt.stem+'.failed-'+str(time.time_ns())+receipt.suffix))
                log(stage+'_FAILED_RECEIPT_RETAINED')
            else:log(stage+'_RECEIPT_EXISTS');return
        log(stage+'_START')
        result=subprocess.run(args,cwd=APP)
        if result.returncode:
            log(stage+'_FAILED',exitCode=result.returncode,laterStepsStarted=False)
            raise RuntimeError(stage+' failed; later steps not run')
        if not receipt.exists():raise RuntimeError('Required receipt missing: '+stage)
        log(stage+'_COMPLETE')
    command('PREPARE',[sys.executable,'scripts/mebi_pratik2_dogrulanmis_parti.py','--acceptance',acceptance,'--batch-dir',batch_dir],folder/'report.json')
    prepared=json.loads((folder/'report.json').read_text(encoding='utf8'))
    if prepared['sourceRows']==0:
        result={'status':'PASS','scope':'EMPTY_VERIFIED_SOURCE_DELTA','newQuestions':0,'questionWrites':0,'teacherApprovalsCreated':0}
        write_json(folder/'bank-acceptance.json',result);log('NO_NEW_VERIFIED_ROWS',**result);return
    command('SHARED_CONTRACT',['node','scripts/mebi-pratik2-batch-package.mjs','--batch-dir='+batch_dir],folder/'batch-resources.json')
    command('PREVIEW',[sys.executable,'scripts/mebi_pratik2_pilot_import.py','--batch-dir',batch_dir],folder/'dry-run-result.json')
    command('IMPORT',[sys.executable,'-u','scripts/mebi_pratik2_pilot_import.py','--batch-dir',batch_dir,'--apply'],folder/'import-result.json')
    command('REPEAT_ZERO',[sys.executable,'scripts/mebi_pratik2_pilot_import.py','--batch-dir',batch_dir,'--repeat-check'],folder/'repeat-check-result.json')
    command('PUBLISH',[sys.executable,'-u','scripts/mebi_pratik2_pilot_yayin.py','--batch-dir',batch_dir,'--apply'],folder/'publication-result.json')
    prepared=json.loads((folder/'report.json').read_text(encoding='utf8'));images={r['code']:r for r in prepared['images']}
    cmd,env,_=db_connection('ivme');conn=(cmd,env,None)
    def literal(value):return "'"+str(value).replace("'","''")+"'"
    codes=','.join(literal(code) for code in images)
    current=json.loads(query(conn,"SELECT json_agg(json_build_object('code',q.code,'answer',q.correct_answer,'image',q.image,'active',q.active,'categoryIds',i.category_ids,'visible',i.student_visible)) FROM questions q LEFT JOIN learning_catalog.current_items i ON i.question_code=q.code WHERE q.code IN ("+codes+")"))
    source={r['code']:r for r in admitted};live={r['code']:r for r in current}
    if len(live)!=len(current) or set(live)!=set(images):raise ValueError('Published code delta differs')
    for code,value in live.items():
        row=source[code]
        if value['answer']!=row['answer'] or not value['active'] or not value['visible'] or value['categoryIds']!=[row['categoryId']]:raise ValueError('Published evidence differs')
        if hashlib.sha256((APP/'veri/resimler-pilot'/value['image']).read_bytes()).hexdigest()!=row['imageSha256']:raise ValueError('Published crop differs')
    old=json.loads(query(conn,"SELECT json_build_object('questions',count(*),'fingerprint',md5(string_agg(code||':'||extract(epoch from updated_at)::text,'|' ORDER BY code))) FROM questions WHERE code NOT IN ("+codes+")"))
    if old!={k:prepared['before'][k] for k in ('questions','fingerprint')}:raise ValueError('Previously established questions changed')
    command('LIVE_READ',['node','testler/mebi-pratik2-live-batch.mjs','--batch-dir='+batch_dir],folder/'live-bank-read-report.json')
    duplicates=json.loads((folder/'exact-duplicate-evidence.json').read_text(encoding='utf8')) if (folder/'exact-duplicate-evidence.json').exists() else {}
    result={'status':'PASS','scope':'NEW_SOURCE_VERIFIED_ARCHIVE_BATCH','newQuestions':len(live),
        'additionalSourceOccurrences':duplicates.get('additionalSourceOccurrenceCount',0),
        'previousQuestionsUnchanged':True,'previousQuestions':old['questions'],
        'sourceAcceptanceSha256':hashlib.sha256(proof.read_bytes()).hexdigest(),
        'runKey':query(conn,'SELECT run_key FROM learning_catalog.current_run'),'teacherApprovalsCreated':0,'answerWritesByCheck':0}
    write_json(folder/'bank-acceptance.json',result);log('BATCH_ACCEPTED',**result)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--acceptance',required=True);parser.add_argument('--batch-dir',required=True)
    parser.add_argument('--after-batch');args=parser.parse_args()
    with process_lock(BASE/'.jobs'/(hashlib.sha256(args.batch_dir.encode()).hexdigest()[:16]+'.lock')):
        run(args.acceptance,args.batch_dir,args.after_batch)
