"""Observe the current publication without stopping or changing it."""
import json
import time
from datetime import datetime,timezone
from kaynakli_arastirma_db import db_connection,query
from mebi_pratik2_tam_pdf_tarama import BASE
from yks_birlestirme import write_json


def run():
    folder=BASE/'publication-preparation';cmd,env,_=db_connection('ivme')
    while True:
        result=folder/'publication-result.json'
        if result.exists():
            report={'atUtc':datetime.now(timezone.utc).isoformat(),'status':'PUBLISHED',
                'publication':json.loads(result.read_text(encoding='utf8')),'percent':100}
        else:
            active=json.loads(query((cmd,env,None),"""SELECT coalesce(json_agg(json_build_object(
                'pid',pid,'secondsInStatement',extract(epoch from clock_timestamp()-query_start),
                'waitType',coalesce(wait_event_type,'CPU'),'waitEvent',wait_event)), '[]')
                FROM pg_stat_activity WHERE datname=current_database() AND state='active'
                AND pid<>pg_backend_pid() AND (query LIKE '%learning_catalog.current_items o LEFT JOIN%'
                    OR query LIKE '%old_hash AS MATERIALIZED%')"""))
            report={'atUtc':datetime.now(timezone.utc).isoformat(),
                'status':'INTEGRITY_CHECK_RUNNING' if active else 'NO_ACTIVE_INTEGRITY_CHECK',
                'activeChecks':active,'percent':None,'estimatedRemainingSeconds':None}
        with (folder/'publication-progress.jsonl').open('a',encoding='utf8') as stream:stream.write(json.dumps(report)+'\n')
        write_json(folder/'publication-progress-current.json',report)
        print(json.dumps(report),flush=True)
        if report['status']!='INTEGRITY_CHECK_RUNNING':break
        time.sleep(300)


if __name__=='__main__':run()
