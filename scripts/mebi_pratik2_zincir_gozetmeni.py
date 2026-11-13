"""Resume stopped archive jobs without interrupting an existing writer.

Only these frozen source packages are supervised. A completed chain is not
full archive acceptance. Restarts are bounded and preserve all receipts;
the normal source/import/catalog/live gates still perform every write.
"""
import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime,timezone
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from yks_birlestirme import write_json,process_lock

ROOT=BASE/'chain-supervisor'
PACKAGES=[
    ('word-boundary-expansion',19,200,'curated-chapter-expansion'),
    ('four-square-expansion',25,500,'word-boundary-expansion'),
    ('source-identity-recovery',35,500,'four-square-expansion'),
    ('reviewed-topic-expansion',36,500,'source-identity-recovery'),
    ('three-step-mock-expansion',41,500,'reviewed-topic-expansion'),
    ('four-square-header-expansion',42,500,'three-step-mock-expansion'),
    ('full-mock-expansion',44,500,'four-square-header-expansion'),
    ('dual-exam-philosophy-expansion',45,500,'full-mock-expansion'),
]
JOBS=[{'name':name,'dependency':dep,'kind':'publisher','args':['scripts/mebi_pratik2_arsiv_kabul.py',
       '--package-dir',name,'--first-batch',str(first),'--chunk-size',str(size),'--publish']}
      for name,first,size,dep in PACKAGES]
JOBS += [{'name':name,'dependency':dep,'kind':'evidence','args':['scripts/mebi_pratik2_konu_bekleyen_kanit.py','--package-dir',name]}
         for name,dep in [('all-source-evidence','full-mock-expansion'),('full-mock-pending-evidence','full-mock-expansion'),
                          ('single-test-pending-evidence','full-mock-expansion')]]


def checkpoint(name,kind='publisher'):
    path=BASE/name/'pass-result.json'
    if not path.exists():return False
    data=json.loads(path.read_text(encoding='utf8'))
    if kind=='publisher':
        if data.get('publishedThroughExistingGuardedPipeline') is not True:raise ValueError('Publisher checkpoint lacks guarded publication: '+name)
    elif data.get('status')!='PREPARED_TOPIC_PENDING_EVIDENCE_PASS_COMPLETE_NOT_ARCHIVE_ACCEPTANCE':
        raise ValueError('Evidence checkpoint is not completed: '+name)
    manifest=BASE/name/'chapter-packages.json'
    if manifest.exists():
        package=json.loads(manifest.read_text(encoding='utf8'))
        if data.get('candidateBodies')!=len(package['items']):raise ValueError('Checkpoint/package scope differs: '+name)
    return True


def writer_running(name):
    try:
        with process_lock(BASE/'.jobs'/(name+'.lock')):pass
        return False
    except RuntimeError as error:
        if 'Another YKS writer holds' not in str(error):raise
        return True


def decide(done,active,dependency_ready,attempts):
    if done:return 'COMPLETE'
    if active:return 'EXISTING_WRITER_RUNNING'
    if not dependency_ready:return 'WAITING_FOR_DEPENDENCY'
    if attempts>=3:return 'RESTART_LIMIT_REQUIRES_REVIEW'
    return 'READY_TO_RESUME'


def run(watch):
    ROOT.mkdir(exist_ok=True);state_path=ROOT/'restart-state.json'
    persisted=json.loads(state_path.read_text(encoding='utf8')) if state_path.exists() else {}
    children={};logs={};last_log=0;previous=None
    try:
        while True:
            rows=[];now=time.time()
            for job in JOBS:
                name=job['name'];saved=persisted.setdefault(name,{'starts':0,'lastStartEpoch':0})
                child=children.get(name)
                if child is not None and child.poll() is not None:
                    saved['lastExitCode']=child.returncode;children.pop(name)
                    logs.pop(name).close()
                try:
                    done=checkpoint(name,job['kind']);active=name in children or writer_running(name)
                    dependency=checkpoint(job['dependency'])
                    status=decide(done,active,dependency,saved['starts'])
                    if status=='READY_TO_RESUME':
                        package=BASE/name/'chapter-packages.json'
                        if not package.exists():status='FROZEN_PACKAGE_MISSING_REQUIRES_REVIEW'
                        elif now-saved['lastStartEpoch']<60:status='BOUNDED_RESTART_BACKOFF'
                        elif watch:
                            log=ROOT/(name+'.log');stream=log.open('a',encoding='utf8')
                            flags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0
                            process=subprocess.Popen([sys.executable,'-u',*job['args']],cwd=APP,
                                stdout=stream,stderr=subprocess.STDOUT,creationflags=flags)
                            children[name]=process;logs[name]=stream
                            saved.update(starts=saved['starts']+1,lastStartEpoch=now,pid=process.pid)
                            status='RESUMED_FROM_EXISTING_RECEIPTS'
                    rows.append({'package':name,'status':status,'resumeStarts':saved['starts'],
                                 'dependency':job['dependency'],'workerLog':str((ROOT/(name+'.log')).relative_to(BASE))})
                except (ValueError,json.JSONDecodeError) as error:
                    rows.append({'package':name,'status':'INVALID_CHECKPOINT_REQUIRES_REVIEW','reason':str(error)})
            data={'atUtc':datetime.now(timezone.utc).isoformat(),'supervisorPid':os.getpid(),'status':'KNOWN_PACKAGE_CHAIN_SUPERVISED_NOT_FULL_ARCHIVE_ACCEPTANCE',
                  'jobs':rows,'allKnownPackagesComplete':all(r['status']=='COMPLETE' for r in rows),
                  'allPrintedQuestionsExtracted':False,'workersTerminated':0,'questionWritesBySupervisor':0}
            signature=tuple((r['package'],r['status'],r.get('resumeStarts',0)) for r in rows)
            write_json(ROOT/'current.json',data);write_json(state_path,persisted)
            if signature!=previous or time.monotonic()-last_log>=300:
                with (ROOT/'events.jsonl').open('a',encoding='utf8') as stream:stream.write(json.dumps(data)+'\n')
                print(json.dumps(data),flush=True);last_log=time.monotonic();previous=signature
            if not watch or data['allKnownPackagesComplete']:return
            time.sleep(20)
    finally:
        # Never stop content/model workers when this observer exits.
        for stream in logs.values():stream.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--watch',action='store_true');args=parser.parse_args()
    with process_lock(BASE/'.jobs/chain-supervisor.lock'):run(args.watch)
