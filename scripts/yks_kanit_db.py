"""Archive YKS preparation bytes and queryable records in local PostgreSQL.

Default writes only yks_evidence in ogm_ders; no application data is published.
The immutable SHA-addressed archive can restore missing evidence without OCR/AI.
"""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time

from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock

APP=Path(__file__).resolve().parents[1]
DDL=APP/'scripts/yks-evidence-schema.sql'
EXTENSIONS={'.json','.jsonl','.csv','.log','.png','.webp','.npz','.joblib','.xml','.txt','.gz','.md'}
RECORD_REPORTS={
 'printed-key':('pdf-on-tarama/full-key-scan/verified-source-keys.json','results','sourceSha256'),
 'mock-key':('pdf-on-tarama/full-mock-keys/progress.json','results','sourceSha256'),
 'repeat':('full-question-comparison/controlled-repeat-review.json','results','sourceCode'),
 'repeat-repair':('full-question-repair-comparison/controlled-repeat-review.json','results','sourceCode'),
 'repeat-shared':('full-question-shared-comparison/controlled-repeat-review.json','results','sourceCode'),
 'existing-transfer':('existing-transfer-reuse/report.json','results','sourceSha256'),
 'answer-edition-conflict':('full-question-comparison/answer-edition-conflicts.json','results','sourceCode'),
 'new-discovery':('new-source-discovery/scoped-report.json','results','sourceSha256'),
 'body-exception':('pdf-on-tarama/diagnostic-body-exceptions/report.json','results','sourceSha256'),
}


def raw_sha(data):return hashlib.sha256(data).hexdigest()


def safe_json(value):
    # PostgreSQL JSONB cannot contain NUL/unpaired surrogates. The raw artifact
    # remains byte-identical, so replacement here never destroys source evidence.
    if isinstance(value,str):return ''.join('\ufffd' if c=='\0' or 0xd800<=ord(c)<=0xdfff else c for c in value)
    if isinstance(value,list):return [safe_json(v) for v in value]
    if isinstance(value,dict):return {safe_json(k):safe_json(v) for k,v in value.items()}
    return value


def selected_run_file(path,root):
    relative=path.relative_to(root);parts=relative.parts
    if not parts or parts[0]=='database-archive' or any(p in {'.git','node_modules','__pycache__'} for p in parts):return False
    if len(parts)>1 and parts[0]=='isolated-pilot' and parts[1].startswith('source-'):return False
    if path.suffix.lower() in EXTENSIONS:return True
    return path.parent.name=='embeddings' and len(path.name)==64


def stable_read(path):
    for _ in range(4):
        try:
            before=path.stat();data=path.read_bytes();after=path.stat()
            if (before.st_size,before.st_mtime_ns)==(after.st_size,after.st_mtime_ns) and len(data)==after.st_size:return data
        except PermissionError:pass
        time.sleep(.1)
    raise ValueError('Evidence changed while being captured: '+str(path))


def restore_destination(value):
    destination=Path(value).resolve();allowed=(APP/'veri/yks-restored').resolve()
    if not destination.is_relative_to(allowed) or destination==allowed:raise ValueError('Restore destination must be a new file under veri/yks-restored')
    if destination.exists():raise ValueError('Restore requires a new destination; existing evidence is never overwritten')
    return destination


def archive_connection(database='ogm_ders'):
    if database!='ogm_ders':raise ValueError('Archive target must be the local pipeline database ogm_ders')
    import psycopg
    from psycopg.rows import dict_row
    # Reuse established credential resolution without printing the secret.
    sys.path.insert(0,str(APP/'scripts'))
    from yks_stages.database import connection
    cmd,env=connection(APP,'ogm_ders');get=lambda key:cmd[cmd.index(key)+1]
    return psycopg.connect(host=get('--host'),port=get('--port'),user=get('--username'),password=env['PGPASSWORD'],
        dbname='ogm_ders',connect_timeout=5,autocommit=True,row_factory=dict_row,application_name='yks_evidence_archive')


def capture(root,staging):
    rows=[];seen={};data_cache={}
    def add(path,logical,role):
        if logical in seen:return
        data=stable_read(path);sha=raw_sha(data);target=staging/sha
        if not target.is_file():target.write_bytes(data)
        row={'logicalPath':logical,'sha256':sha,'bytes':len(data),'role':role};rows.append(row);seen[logical]=row
        return data
    for path in sorted(root.rglob('*')):
        if path.is_file() and selected_run_file(path,root):
            data=add(path,'run/'+path.relative_to(root).as_posix(),'RUN_PREPARATION_EVIDENCE')
            if path.suffix in {'.json','.jsonl'}:data_cache['run/'+path.relative_to(root).as_posix()]=data
    coverage=data_cache.get('run/full-source-coverage/sources.jsonl')
    if coverage is None:raise ValueError('Complete all-source coverage projection is required for archiving')
    sources=[json.loads(l) for l in coverage.decode('utf-8').splitlines()]
    for row in sources:
        sha=row['sourceSha256'];path=APP/'veri/pdf-source-registry/pages'/sha[:2]/(sha+'-yks-page-observations-v1.json.gz')
        data=add(path,'page-cache/'+path.name,'ALL_SOURCE_NATIVE_PAGE_OBSERVATIONS')
        page=json.loads(gzip.decompress(data))
        if page['sha256']!=sha or page['pageCount']!=row['pageCount']:raise ValueError('Cached page source/hash/count differs')
    # OCR files are selected by the 4086 source hashes; never ingest unrelated
    # projects, local credentials, original PDF binaries or database backup dumps.
    shas={row['sourceSha256'] for row in sources};ocr_root=APP/'veri/content-labels/pdf-ocr-cache'
    for path in sorted(ocr_root.rglob('*.json')):
        # The cache naming convention begins with source hash; validate payload
        # as well to support versioned nested layouts without trusting a filename.
        if not any(p in shas for p in path.parts) and not path.name[:64] in shas:continue
        data=stable_read(path);record=json.loads(data)
        if record.get('sourceSha256') not in shas:continue
        add(path,'ocr-cache/'+path.relative_to(ocr_root).as_posix(),'SOURCE_OCR_OBSERVATION')
    # Isolated test result files are referenced from reports and not read by
    # recursively copying the checkout (which contains private local settings).
    for name in ['isolated-pilot/isolated-import-report.json']:
        data=data_cache.get('run/'+name)
        if not data:continue
        report=json.loads(data)
        for key in ['testProofPath','logPath']:
            if report.get(key):
                path=Path(report[key]);add(path,'isolated-proof/'+path.name,'ISOLATED_TEST_ACCEPTANCE')
        checkout=Path(report['sourceSnapshot']);xml=checkout/'backend/target-tests/surefire-reports'
        for path in sorted(xml.glob('*YksSourcePilotTest*')):
            if path.suffix in {'.xml','.txt'}:add(path,'isolated-proof/'+path.name,'ISOLATED_TEST_ACCEPTANCE')
    for name in ['database-test-report.json','database-test-summary.json','database-test-raw.log','database-test.log',
        'TEST-com.hedefyks.YksEvidenceArchiveTest.xml','archive-report.json','restore-report.json']:
        path=root/'database-archive'/name
        if path.is_file():add(path,'archive-verification/'+name,'ARCHIVE_DATABASE_TEST_AND_READBACK_EVIDENCE')
    for path in [DDL,Path(__file__),APP/'scripts/yks_kanit_db_prova.py',APP/'scripts/yks-pilot-fixtures/YksEvidenceArchiveTest.java']:
        add(path,'archive-tools/'+path.name,'EXACT_ARCHIVE_TOOL_VERSION')
    rows.sort(key=lambda r:r['logicalPath'])
    manifest={'version':1,'runId':root.name,'files':rows,'originalSourcesStoredAs':'SHA_IDENTITIES_AND_LOCATORS_NOT_DUPLICATED_PDF_BINARIES',
        'protectedLiveDataWritten':False,'filesystemSnapshot':'EACH_FILE_FROZEN_WITH_HASH_RUNNING_REPORTS_REMAIN_RUNNING'}
    data=(json.dumps(manifest,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode();sha=raw_sha(data);(staging/sha).write_bytes(data)
    return manifest,sha,sources,data_cache


def records(manifest,cache,staging):
    by_path={r['logicalPath']:r for r in manifest['files']};rows=[]
    def add(kind,key,value,parent):
        rows.append((kind,str(key),value.get('sourceSha256'),value.get('sourceCode',value.get('code')),
            value.get('status',value.get('decision','OBSERVATION_ONLY')),parent,value))
    for kind,(file,key,idkey) in RECORD_REPORTS.items():
        logical='run/'+file
        if logical not in cache:continue
        report=json.loads(cache[logical]);items=report.get(key,[])
        # Edition reports use a named conflicts list, depending on producer.
        if kind=='answer-edition-conflict':items=report.get('results',report.get('conflicts',[]))
        for index,item in enumerate(items):add(kind,item.get(idkey,item.get('bankCode',index)),item,by_path[logical]['sha256'])
    # Native question cards, context and exact source regions remain queryable.
    for logical,data in cache.items():
        if not logical.endswith('/candidates.json'):continue
        report=json.loads(data)
        for card in report.get('cards',[]):
            add('question-card',logical+'#'+str(card['code']),card,by_path[logical]['sha256'])
    # Page summaries point to compressed raw artifact bytes; original complete
    # native text remains inside that artifact, including unsupported symbols.
    for file in manifest['files']:
        if file['role']!='ALL_SOURCE_NATIVE_PAGE_OBSERVATIONS':continue
        page=json.loads(gzip.decompress((staging/file['sha256']).read_bytes()))
        for item in page['pages']:
            add('page',page['sha256']+':'+str(item['page']),{'sourceSha256':page['sha256'],**item},file['sha256'])
    return rows


def save_checkpoint(conn,manifest,manifest_sha,sources,items,staging):
    from psycopg.types.json import Jsonb
    checkpoint=manifest_sha;summary={'files':len(manifest['files']),'sourceDocuments':len(sources),'records':len(items),
        'sourceStates':dict(__import__('collections').Counter(r['state'] for r in sources)),'questionBankWrites':0,'teacherApproved':False}
    with conn.transaction():
        conn.execute("SELECT pg_advisory_xact_lock(159876231,7)")
        conn.execute(DDL.read_text(encoding='utf-8'))
        prior=conn.execute('SELECT summary FROM yks_evidence.checkpoints WHERE checkpoint_sha256=%s',(checkpoint,)).fetchone()
        if prior:return {'checkpoint':checkpoint,'reused':True,'insertedArtifacts':0,**prior['summary']}
        entries={r['sha256']:r['bytes'] for r in manifest['files']};entries[manifest_sha]=(staging/manifest_sha).stat().st_size
        old={r['sha256'] for r in conn.execute('SELECT sha256 FROM yks_evidence.artifacts WHERE sha256=ANY(%s)',(list(entries),))}
        inserted=0
        for sha,byte_count in entries.items():
            if sha in old:continue
            data=(staging/sha).read_bytes()
            if len(data)!=byte_count or raw_sha(data)!=sha:raise ValueError('Frozen archive bytes changed')
            conn.execute('INSERT INTO yks_evidence.artifacts(sha256,byte_count,content) VALUES(%s,%s,%s) ON CONFLICT DO NOTHING',(sha,byte_count,data));inserted+=1
        conn.execute("INSERT INTO yks_evidence.checkpoints(checkpoint_sha256,run_id,manifest_sha256,status,summary) VALUES(%s,%s,%s,'ARCHIVED',%s)",
            (checkpoint,manifest['runId'],manifest_sha,Jsonb(summary)))
        with conn.cursor() as cur:
            with cur.copy('COPY yks_evidence.checkpoint_files(checkpoint_sha256,logical_path,artifact_sha256,role) FROM STDIN') as copy:
                for r in manifest['files']:copy.write_row((checkpoint,r['logicalPath'],r['sha256'],r['role']))
            with cur.copy('COPY yks_evidence.source_dispositions(checkpoint_sha256,source_sha256,page_count,state,next_action,evidence) FROM STDIN') as copy:
                for r in sources:copy.write_row((checkpoint,r['sourceSha256'],r['pageCount'],r['state'],r['nextAction'],Jsonb(safe_json(r))))
            with cur.copy('COPY yks_evidence.records(checkpoint_sha256,record_kind,record_key,source_sha256,source_code,status,parent_artifact_sha256,evidence) FROM STDIN') as copy:
                for kind,key,source,code,status,parent,evidence in items:
                    copy.write_row((checkpoint,kind,key,source,code,status,parent,Jsonb(safe_json(evidence))))
    return {'checkpoint':checkpoint,'reused':False,'insertedArtifacts':inserted,**summary}


def verify_checkpoint(conn,checkpoint):
    row=conn.execute('SELECT * FROM yks_evidence.checkpoints WHERE checkpoint_sha256=%s',(checkpoint,)).fetchone()
    if not row:raise ValueError('Saved checkpoint missing')
    count=0;total=0
    # Read every distinct stored byte sequence back; the SQL constraint alone is
    # not presented as a successful restore or complete archive verification.
    with conn.cursor(name='yks_archive_readback') as cur:
        # A count-limited batch can still contain several hundred MB of native
        # reports. Fetch one binary artifact at a time to bound server/client RAM.
        cur.itersize=1
        cur.execute('SELECT a.sha256,a.byte_count,a.content FROM yks_evidence.artifacts a WHERE a.sha256 IN (SELECT artifact_sha256 FROM yks_evidence.checkpoint_files WHERE checkpoint_sha256=%s UNION SELECT manifest_sha256 FROM yks_evidence.checkpoints WHERE checkpoint_sha256=%s)',(checkpoint,checkpoint),binary=True)
        for item in cur:
            data=bytes(item['content'])
            if len(data)!=item['byte_count'] or raw_sha(data)!=item['sha256']:raise ValueError('Database archive read-back hash mismatch')
            count+=1;total+=len(data)
    totals=conn.execute('SELECT (SELECT count(*) FROM yks_evidence.checkpoint_files WHERE checkpoint_sha256=%s) files,(SELECT count(*) FROM yks_evidence.source_dispositions WHERE checkpoint_sha256=%s) sources,(SELECT count(*) FROM yks_evidence.records WHERE checkpoint_sha256=%s) records',(checkpoint,checkpoint,checkpoint)).fetchone()
    if totals!={'files':row['summary']['files'],'sources':row['summary']['sourceDocuments'],'records':row['summary']['records']}:raise ValueError('Database archive row membership incomplete')
    return {'status':'PASS','checkpoint':checkpoint,'distinctArtifactHashesReRead':count,'bytesReRead':total,**totals}


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('command',choices=['save','verify','roundtrip','status','restore']);parser.add_argument('--checkpoint');parser.add_argument('--path');parser.add_argument('--destination');args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);folder=root/'database-archive';folder.mkdir(exist_ok=True)
    with process_lock(folder/'.writer.lock'),archive_connection() as conn:
        if args.command=='roundtrip':
            checkpoint=args.checkpoint or conn.execute('SELECT checkpoint_sha256 FROM yks_evidence.checkpoints ORDER BY created_at DESC LIMIT 1').fetchone()['checkpoint_sha256']
            files=conn.execute('SELECT logical_path,artifact_sha256,role FROM yks_evidence.checkpoint_files WHERE checkpoint_sha256=%s ORDER BY logical_path',(checkpoint,)).fetchall()
            choices=[next(r for r in files if r['logical_path'].endswith(suffix)) for suffix in ['answer-edition-conflicts.json','.json.gz','.webp','.npz']]
            results=[]
            for index,item in enumerate(choices):
                artifact=conn.execute('SELECT content FROM yks_evidence.artifacts WHERE sha256=%s',(item['artifact_sha256'],)).fetchone();data=bytes(artifact['content'])
                if raw_sha(data)!=item['artifact_sha256']:raise ValueError('Roundtrip source archive bytes changed')
                target=(APP/'veri/yks-restored'/checkpoint[:16]/(str(index)+'-'+Path(item['logical_path']).name)).resolve()
                if target.is_file():
                    if digest(target)!=item['artifact_sha256']:raise ValueError('Existing restored evidence has changed; never overwrite it')
                else:
                    target=restore_destination(target);target.parent.mkdir(parents=True,exist_ok=True)
                    with target.open('xb') as stream:stream.write(data)
                if digest(target)!=item['artifact_sha256']:raise ValueError('Actual restored file does not match database archive')
                results.append({'logicalPath':item['logical_path'],'restoredPath':str(target),'sha256':item['artifact_sha256'],'status':'PASS'})
            proof={'status':'PASS','checkpoint':checkpoint,'files':results,'sourceWrites':0,'questionBankWrites':0,'modelsCalled':0,'teacherApproved':False}
            write_json(folder/'restore-report.json',proof);print(json.dumps(proof,ensure_ascii=False));return
        if args.command=='verify':
            checkpoint=args.checkpoint or conn.execute('SELECT checkpoint_sha256 FROM yks_evidence.checkpoints ORDER BY created_at DESC LIMIT 1').fetchone()['checkpoint_sha256']
            with conn.transaction():proof=verify_checkpoint(conn,checkpoint)
            proof.update(database='ogm_ders',schema='yks_evidence',questionBankWrites=0,teacherApproved=False,
                toolSha256=digest(Path(__file__)),schemaSha256=digest(DDL))
            write_json(folder/'archive-report.json',proof)
            manifest=conn.execute('SELECT a.content FROM yks_evidence.checkpoints c JOIN yks_evidence.artifacts a ON a.sha256=c.manifest_sha256 WHERE c.checkpoint_sha256=%s',(checkpoint,)).fetchone()
            original=bytes(manifest['content'])
            if raw_sha(original)!=checkpoint:raise ValueError('Saved checkpoint manifest differs from its key')
            saved_manifest=json.loads(original);write_json(folder/'manifest.json',saved_manifest)
            again=save_checkpoint(conn,saved_manifest,checkpoint,[],[],folder)
            if not again['reused'] or again['insertedArtifacts']!=0:raise ValueError('Existing archive checkpoint was not reused')
            proof['secondSaveInsertedArtifacts']=0;proof['secondSaveReusedCheckpoint']=True
            write_json(folder/'archive-report.json',proof)
            print(json.dumps(proof,ensure_ascii=False));return
        if args.command=='status':
            row=conn.execute('SELECT checkpoint_sha256,run_id,summary,created_at::text FROM yks_evidence.checkpoints ORDER BY created_at DESC LIMIT 1').fetchone();print(json.dumps(row,ensure_ascii=False));return
        if args.command=='restore':
            if not all([args.checkpoint,args.path,args.destination]):parser.error('Restore requires checkpoint, logical path and new destination')
            row=conn.execute('SELECT a.sha256,a.content FROM yks_evidence.checkpoint_files f JOIN yks_evidence.artifacts a ON a.sha256=f.artifact_sha256 WHERE f.checkpoint_sha256=%s AND f.logical_path=%s',(args.checkpoint,args.path)).fetchone()
            if not row:raise ValueError('Archived logical path not found')
            data=bytes(row['content'])
            if raw_sha(data)!=row['sha256']:raise ValueError('Archived restoration bytes damaged')
            destination=restore_destination(args.destination)
            destination.parent.mkdir(parents=True,exist_ok=True)
            with destination.open('xb') as stream:stream.write(data)
            print({'status':'PASS','restoredSha256':digest(destination),'destination':str(destination)});return
        with tempfile.TemporaryDirectory(prefix='yks-archive-',dir=folder) as temporary:
            staging=Path(temporary);manifest,sha,sources,cache=capture(root,staging);items=records(manifest,cache,staging)
            result=save_checkpoint(conn,manifest,sha,sources,items,staging)
            # Named cursors require a read transaction.
            with conn.transaction():proof=verify_checkpoint(conn,result['checkpoint'])
            again=save_checkpoint(conn,manifest,sha,sources,items,staging)
            if not again['reused'] or again['insertedArtifacts']!=0:raise ValueError('Identical archive checkpoint was not reused')
            proof.update(database='ogm_ders',schema='yks_evidence',summary=result,secondSaveInsertedArtifacts=0,
                questionBankWrites=0,teacherApproved=False,toolSha256=digest(Path(__file__)),schemaSha256=digest(DDL))
            write_json(folder/'archive-report.json',proof);write_json(folder/'manifest.json',manifest)
        print(json.dumps(proof,ensure_ascii=False))


if __name__=='__main__':main()
