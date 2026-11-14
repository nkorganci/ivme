"""Back up and verify the authorized bank transfer; never insert questions."""
import argparse
import hashlib
import json
import gzip
import subprocess
from pathlib import Path
from kaynakli_arastirma_db import db_connection,query
from yks_birlestirme import write_json

APP=Path(__file__).resolve().parents[1]
OUT=APP/'veri/mebi-pratik-2/main-bank-transfer'


def snapshot(connection):
    data=json.loads(query(connection,"""
      SELECT json_build_object(
        'banks',(SELECT json_object_agg(bank,n) FROM (SELECT bank,count(*) n FROM questions GROUP BY bank)b),
        'questionContent',(SELECT md5(string_agg(md5((to_jsonb(q)-'bank')::text),'' ORDER BY id)) FROM questions q),
        'questionCount',(SELECT count(*) FROM questions),
        'catalogRun',(SELECT run_key FROM learning_catalog.current_run),
        'catalogContent',(SELECT md5(string_agg(md5((to_jsonb(i)-'run_key'-'data')::text||(i.data-'bank')::text),'' ORDER BY item_key)) FROM learning_catalog.current_items i),
        'categories',(SELECT md5(string_agg(md5(category_id||definition::text),'' ORDER BY category_id)) FROM learning_catalog.current_categories),
        'assignments',(SELECT md5(string_agg(md5((to_jsonb(a)-'run_key')::text),'' ORDER BY item_key,category_id,relation)) FROM learning_catalog.current_assignments a),
        'transferCandidates',(SELECT coalesce(json_agg(json_build_object('id',q.id,'code',q.code,'exam',q.exam_type,'image',q.image,'categories',i.category_ids,'subjects',i.subject_ids,'exams',i.exam_ids) ORDER BY q.id),'[]')
          FROM questions q LEFT JOIN learning_catalog.current_items i ON i.question_code=q.code WHERE q.bank='MEBI_PRACTICE_2'))
    """))
    # Hash only: no student payload or answers are written to the report.
    data['protectedTables']={}
    tables=json.loads(query(connection,"SELECT json_agg(t) FROM (SELECT DISTINCT conrelid::regclass::text t FROM pg_constraint WHERE confrelid='questions'::regclass UNION SELECT 'study_sessions' UNION SELECT 'content_reviews' UNION SELECT 'content_review_history')x"))
    for table in tables:
        if not all(part.replace('_','').isalnum() for part in table.split('.')):raise ValueError('Unsafe table identity')
        data['protectedTables'][table]=json.loads(query(connection,f"SELECT json_build_object('rows',count(*),'hash',md5(string_agg(h,'' ORDER BY h))) FROM (SELECT md5(to_jsonb(t)::text) h FROM {table} t)x"))
    return data


def prepare():
    OUT.mkdir(parents=True,exist_ok=True);target=OUT/'before.json'
    if target.exists():print('Existing frozen transfer baseline retained');return
    connection=db_connection('ivme');print('Reading frozen content/category/history fingerprints',flush=True);before=snapshot(connection)
    if not before['transferCandidates']:raise ValueError('No existing Pratik 2 questions to transfer')
    if any(not row['categories'] or not row['subjects'] or not row['exams'] for row in before['transferCandidates']):raise ValueError('Existing published category bindings required')
    command,env,_=connection;binary=Path(command[0]).with_name('pg_dump.exe');backup=OUT/'before-transfer.dump'
    # Old immutable catalog runs are retained in place. Back up all application
    # tables plus the current catalog, avoiding copies of dozens of old runs.
    print('Backing up application data (public schema)',flush=True)
    subprocess.run([str(binary),'--format=custom','--no-owner','--schema=public','--file',str(backup),*command[4:]],env=env,check=True,capture_output=True)
    subprocess.run([str(binary.with_name('pg_restore.exe')),'--list',str(backup)],check=True,capture_output=True)
    catalog=OUT/'current-catalog.jsonl.gz'
    sql="COPY (SELECT jsonb_build_object('table','runs','row',to_jsonb(r)) FROM learning_catalog.runs r WHERE run_key=(SELECT run_key FROM learning_catalog.current_run) UNION ALL SELECT jsonb_build_object('table','categories','row',to_jsonb(c)) FROM learning_catalog.current_categories c UNION ALL SELECT jsonb_build_object('table','items','row',to_jsonb(i)) FROM learning_catalog.current_items i UNION ALL SELECT jsonb_build_object('table','assignments','row',to_jsonb(a)) FROM learning_catalog.current_assignments a) TO STDOUT;"
    print('Backing up current catalog; old catalog versions remain untouched',flush=True)
    with (OUT/'catalog-backup.stderr.log').open('wb') as errors:
        process=subprocess.Popen(command,env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=errors)
        process.stdin.write(sql.encode());process.stdin.close()
        with gzip.open(catalog,'wb') as stream:
            for chunk in iter(lambda:process.stdout.read(1024*1024),b''):stream.write(chunk)
        if process.wait():raise ValueError('Current catalog backup failed; see local stderr log')
    before['databaseBackup']={'scope':'ALL_PUBLIC_APPLICATION_TABLES_AND_CURRENT_CATALOG_OLD_RUNS_RETAINED',
        'path':str(backup),'bytes':backup.stat().st_size,'sha256':hashlib.sha256(backup.read_bytes()).hexdigest(),
        'catalogPath':str(catalog),'catalogSha256':hashlib.sha256(catalog.read_bytes()).hexdigest()}
    write_json(target,before)
    print(json.dumps({'status':'TRANSFER_BASELINE_AND_BACKUP_READY','questions':len(before['transferCandidates']),'banks':before['banks'],'backupBytes':backup.stat().st_size}))


def verify():
    before=json.loads((OUT/'before.json').read_text(encoding='utf8'));connection=db_connection('ivme');after=snapshot(connection)
    count=len(before['transferCandidates']);expected={**before['banks'],'OGM':before['banks'].get('OGM',0)+count};expected.pop('MEBI_PRACTICE_2',None)
    for key in ['questionCount','questionContent','catalogContent','categories','assignments','protectedTables']:
        if before[key]!=after[key]:raise ValueError('Preserved data differs: '+key)
    if after['banks']!=expected:raise ValueError('Bank transfer counts differ')
    codes=[r['code'] for r in before['transferCandidates']]
    records=json.loads(query(connection,"SELECT json_agg(json_build_object('code',q.code,'bank',q.bank,'catalogBank',i.data->>'bank','categories',i.category_ids,'visible',i.student_visible)) FROM questions q JOIN learning_catalog.current_items i ON i.question_code=q.code WHERE q.code IN ("+','.join("'"+c.replace("'","''")+"'" for c in codes)+")"))
    if len(records)!=count or any(r['bank']!='OGM' or r['catalogBank']!='OGM' or not r['categories'] or not r['visible'] for r in records):raise ValueError('Transferred catalog binding lost')
    report={'status':'PASS','transferredQuestions':count,'banks':after['banks'],'oldCatalogRun':before['catalogRun'],'newCatalogRun':after['catalogRun'],
            'questionIdsContentAnswersImagesAndTimestampsPreserved':True,'categoryAndSubjectExamBindingsPreserved':True,
            'sourceLinksAndCatalogEvidencePreserved':True,'protectedTablesUnchanged':list(before['protectedTables']),
            'newQuestionInsertions':0,'studentWrites':0}
    write_json(OUT/'acceptance.json',report);print(json.dumps(report))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--verify',action='store_true');args=parser.parse_args()
    verify() if args.verify else prepare()
