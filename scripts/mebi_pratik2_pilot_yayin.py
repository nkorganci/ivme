"""Atomically append the reviewed pilot to a new immutable catalog snapshot.

Every old resource/category/assignment is copied unchanged in PostgreSQL. Only
the 21 reviewed, already INSERT_ONLY-imported question codes are appended.
No question, answer or student table is updated by this publisher.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import BASE
from kaynakli_arastirma_db import db_connection,query
from yks_birlestirme import write_json


def literal(value):return "'"+str(value).replace("'","''")+"'"


def run(apply=False,batch=False,batch_dir=None):
    if batch_dir:
        if Path(batch_dir).name!=batch_dir or not batch_dir.startswith('verified-source-batch-'):raise ValueError('Unsafe batch directory')
        batch=True
    folder=BASE/(batch_dir or ('verified-source-batch-001' if batch else 'publication-preparation'))
    before=json.loads((folder/'report.json').read_text(encoding='utf8'))
    imported=json.loads((folder/'import-result.json').read_text(encoding='utf8'))
    count=before['sourceRows'] if batch else 21
    if not before.get('databaseBackup') or imported.get('inserted')!=count or imported.get('updated') or imported.get('errorCount'):
        raise ValueError('Backup and successful reviewed INSERT_ONLY import required')
    pack=json.loads((folder/'batch-resources.json' if batch else BASE/'single-test-crop-pilot/pilot-resources.json').read_text(encoding='utf8'))['resources']
    images={r['code']:r for r in before['images']}
    codes=[r['questionCode'] for r in pack]
    if len(codes)!=count or len(set(codes))!=count:raise ValueError('Unique source-verified batch codes required')
    cmd,env,_=db_connection('ivme');conn=(cmd,env,None)
    stamps=json.loads(query(conn,"SELECT json_object_agg(code,extract(epoch from updated_at)::text) FROM questions WHERE code IN ("+','.join(literal(c) for c in codes)+")"))
    for item in pack:
        code=item['questionCode']
        if code not in stamps or item['bank']!='MEBI_PRACTICE_2':raise ValueError('Imported bank/source mismatch')
        item['sourceUpdatedAt']=stamps[code]
        item['sourceImage']={'reference':images[code]['relative'],'sha256':images[code]['sha256'],'status':'PRESERVED_REFERENCE'}
    old=before['before']['catalogRun'];new='labels-v1-'+hashlib.sha256(json.dumps([old,pack],sort_keys=True,ensure_ascii=False).encode()).hexdigest()[:24]
    current=query(conn,'SELECT run_key FROM learning_catalog.current_run')
    if current==new:
        print(json.dumps({'status':'ALREADY_PUBLISHED','runKey':new}));return
    if current!=old:raise ValueError('Current catalog changed; reconcile before publication')
    old_inventory=json.loads(query(conn,"SELECT json_build_object('questions',count(*),'fingerprint',md5(string_agg(code||':'||extract(epoch from updated_at)::text,'|' ORDER BY code))) FROM questions WHERE code NOT IN ("+','.join(literal(c) for c in codes)+")"))
    if old_inventory!={k:before['before'][k] for k in ('questions','fingerprint')}:
        raise ValueError('Established question inventory changed since backup')
    values=','.join('('+literal(json.dumps(r,ensure_ascii=False))+'::jsonb)' for r in pack)
    sql=f"""BEGIN;
SET LOCAL work_mem='128MB';
SELECT pg_advisory_xact_lock(738452019);
DO $guard$ BEGIN IF (SELECT run_key FROM learning_catalog.current_run) IS DISTINCT FROM {literal(old)}
 THEN RAISE EXCEPTION 'Catalog changed during publication'; END IF; END $guard$;
CREATE TEMP TABLE mebi_incoming(data jsonb) ON COMMIT DROP;
INSERT INTO mebi_incoming VALUES {values};
DO $guard$ BEGIN
 IF EXISTS(SELECT 1 FROM mebi_incoming i JOIN questions q ON q.code=i.data->>'questionCode'
 WHERE q.bank<>'MEBI_PRACTICE_2' OR extract(epoch from q.updated_at)::text<>i.data->>'sourceUpdatedAt')
 THEN RAISE EXCEPTION 'Question stamp changed'; END IF;
 IF EXISTS(SELECT 1 FROM mebi_incoming i CROSS JOIN LATERAL jsonb_array_elements_text(i.data->'categoryIds') c(id)
 LEFT JOIN learning_catalog.current_categories x ON x.category_id=c.id WHERE x.category_id IS NULL)
 THEN RAISE EXCEPTION 'Controlled category missing'; END IF;
END $guard$;
INSERT INTO learning_catalog.runs(run_key,method,summary)
 SELECT {literal(new)},'MEBI_PRACTICE_2_INSERT_ONLY',summary||jsonb_build_object('runKey',{literal(new)},
 'previousRunKey',{literal(old)},'resources',(SELECT count(*)+{count} FROM learning_catalog.current_items),'mebiPractice2Added',{count})
 FROM learning_catalog.runs WHERE run_key={literal(old)};
INSERT INTO learning_catalog.categories SELECT {literal(new)},category_id,definition FROM learning_catalog.current_categories;
INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids)
 SELECT {literal(new)},item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids FROM learning_catalog.current_items;
INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids)
 SELECT {literal(new)},data->>'key','QUESTION',data->>'exam',data->>'subjectId',true,data,
 ARRAY(SELECT jsonb_array_elements_text(data->'categoryIds')),ARRAY(SELECT jsonb_array_elements_text(data->'subjectIds')),
 ARRAY(SELECT jsonb_array_elements_text(data->'examIds')) FROM mebi_incoming;
INSERT INTO learning_catalog.assignments SELECT {literal(new)},item_key,category_id,relation FROM learning_catalog.current_assignments;
INSERT INTO learning_catalog.assignments SELECT {literal(new)},i.data->>'key',a->>'categoryId',a->>'relation'
 FROM mebi_incoming i CROSS JOIN LATERAL jsonb_array_elements(i.data->'automaticLabels'->'assignments') a;
INSERT INTO learning_catalog.source_audits(run_key,inventory_audit,curriculum_references)
 SELECT {literal(new)},inventory_audit||jsonb_build_object('runKey',{literal(new)},'mebiPractice2Added',{count}),curriculum_references
 FROM learning_catalog.source_audits WHERE run_key={literal(old)};
CREATE TEMP TABLE mebi_old_hash ON COMMIT DROP AS
 SELECT item_key,sha256(convert_to(data::text,'UTF8')) digest FROM learning_catalog.current_items;
CREATE TEMP TABLE mebi_new_hash ON COMMIT DROP AS
 SELECT item_key,sha256(convert_to(data::text,'UTF8')) digest FROM learning_catalog.items WHERE run_key={literal(new)};
CREATE UNIQUE INDEX ON mebi_old_hash(item_key);
CREATE UNIQUE INDEX ON mebi_new_hash(item_key);
ANALYZE mebi_old_hash;
ANALYZE mebi_new_hash;
DO $guard$ BEGIN
 IF (SELECT count(*) FROM mebi_old_hash o LEFT JOIN mebi_new_hash n USING(item_key)
     WHERE n.item_key IS NULL OR n.digest IS DISTINCT FROM o.digest)>0
 THEN RAISE EXCEPTION 'Established resource changed'; END IF;
 IF (SELECT count(*) FROM learning_catalog.items WHERE run_key={literal(new)})<>(SELECT count(*)+{count} FROM learning_catalog.current_items)
 THEN RAISE EXCEPTION 'Catalog delta differs'; END IF;
END $guard$;
UPDATE learning_catalog.current_run SET run_key={literal(new)};
UPDATE learning_catalog.question_intake SET status='PUBLISHED' WHERE question_code IN ({','.join(literal(c) for c in codes)});
COMMIT;
"""
    sql_path=folder/'publish-pilot.sql';sql_path.write_text(sql,encoding='utf8')
    if not apply:print(json.dumps({'status':'PREPARED','newRunKey':new,'newQuestions':count,'oldQuestionsUnchanged':True}));return
    with sql_path.open('rb') as stream:
        result=subprocess.run([*cmd,'--quiet','-v','ON_ERROR_STOP=1'],stdin=stream,capture_output=True,env=env)
    if result.returncode:raise RuntimeError(result.stderr.decode('utf8',errors='replace')[-1200:])
    report={'status':'PUBLISHED','previousRunKey':old,'newRunKey':new,'questionsAppended':count,
        'oldQuestionsUnchanged':True,'oldResourcesCopiedUnchanged':True,'studentRowsWritten':0,
        'sqlSha256':hashlib.sha256(sql_path.read_bytes()).hexdigest()}
    write_json(folder/'publication-result.json',report);print(json.dumps(report))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');parser.add_argument('--batch',action='store_true')
    parser.add_argument('--batch-dir');args=parser.parse_args();run(args.apply,args.batch,args.batch_dir)
