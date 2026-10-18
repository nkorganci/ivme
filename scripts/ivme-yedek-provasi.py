"""Take a consistent local backup, restore to an isolated database/folder, and verify it."""
import argparse, hashlib, json, re, shutil, subprocess, sys, tarfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from kaynakli_arastirma_db import db_connection, query

APP=Path(__file__).resolve().parents[1]
SCHEMAS=('public','learning_catalog','source_research')
FINGERPRINT_SCHEMAS=('public',)
FINGERPRINT_TABLES={'learning_catalog.current_run','learning_catalog.runs','learning_catalog.categories',
    'learning_catalog.official_question_corrections','learning_catalog.question_intake','source_research.runs'}

def ident(value):return '"'+value.replace('"','""')+'"'
def literal(value):return "'"+value.replace("'","''")+"'"
def sha(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()

def database_state(connection,snapshot=None):
    tables=json.loads(query(connection,"SELECT coalesce(json_agg(x ORDER BY schema,name),'[]') FROM (SELECT n.nspname AS schema,c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','learning_catalog','source_research') AND c.relkind IN ('r','p'))x"))
    statements=[]
    for row in tables:
        name=row['schema']+'.'+row['name'];table=ident(row['schema'])+'.'+ident(row['name'])
        fingerprint="md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY md5(to_jsonb(t)::text)),''))" if row['schema'] in FINGERPRINT_SCHEMAS or name in FINGERPRINT_TABLES else 'null::text'
        statements.append(f"SELECT {literal(name)} AS name,count(*) AS rows,{fingerprint} AS fingerprint FROM {table} t")
    for name in ['current_items','current_assignments']:
        statements.append(f"SELECT 'learning_catalog.{name}' AS name,count(*) AS rows,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY md5(to_jsonb(t)::text)),'')) AS fingerprint FROM learning_catalog.{name} t")
    sql='BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;'
    if snapshot:sql+='SET TRANSACTION SNAPSHOT '+literal(snapshot)+';'
    sql+="SET LOCAL TIME ZONE 'UTC';SELECT json_agg(x ORDER BY name) FROM ("+' UNION ALL '.join(statements)+')x;COMMIT;'
    return json.loads(query(connection,sql))

def target_connection(connection,name):
    command,env,_=connection;command=list(command);command[command.index('--dbname')+1]=name
    return command,env,name

def restore_files(backup,manifest):
    probe=backup/'restore-probe';probe.mkdir(exist_ok=False)
    (probe/'.ivme-restore-probe.json').write_text(json.dumps({'backup':str(backup),'createdBy':'ivme-yedek-provasi.py'}),encoding='utf-8')
    checks=[]
    for key,item in manifest['files'].items():
        path=backup/item['name']
        if sha(path)!=item['sha256']:raise ValueError('Backup checksum mismatch: '+key)
        if key=='database':continue
        root=Path(item['sourceRoot']).resolve();destination=probe/key;destination.mkdir()
        with tarfile.open(path,'r:') as archive:
            members=archive.getmembers()
            for member in members:
                relative=PurePosixPath(member.name)
                if relative.is_absolute() or '..' in relative.parts or ':' in member.name or '\\' in member.name:
                    raise ValueError('Unsafe archive member')
                if not (member.isfile() or member.isdir() or member.islnk() or member.issym()):raise ValueError('Unsupported archive member')
                if member.islnk() or member.issym():
                    link=PurePosixPath(member.linkname)
                    if link.is_absolute() or '..' in link.parts or ':' in member.linkname or '\\' in member.linkname:raise ValueError('Unsafe archive link')
        subprocess.run(['tar.exe','-xf',str(path),'-C',str(destination)],check=True,capture_output=True)
        entries=[]
        for member in members:
            if member.isdir():continue
            relative=PurePosixPath(member.name);original=root/Path(*relative.parts);restored=destination/Path(*relative.parts)
            if not restored.resolve().is_relative_to(destination.resolve()):raise ValueError('Restored member outside probe')
            if member.issym():
                if not restored.is_symlink() or restored.readlink()!=original.readlink():raise ValueError('Symlink mismatch')
                entries.append({'path':member.name,'link':member.linkname});continue
            original_hash=sha(original);restored_hash=sha(restored)
            if original_hash!=restored_hash or restored.stat().st_size!=original.stat().st_size:raise ValueError('Restored source differs: '+str(original))
            entries.append({'path':member.name,'sha256':restored_hash,'bytes':restored.stat().st_size})
        check_file=backup/(key+'-restored-files.jsonl')
        check_file.write_text(''.join(json.dumps(row,ensure_ascii=False)+'\n' for row in entries),encoding='utf-8')
        checks.append({'kind':key,'filesVerified':len(entries),'bytes':sum(row.get('bytes',0) for row in entries),
            'archiveSha256':item['sha256'],'fileChecks':check_file.name,'fileChecksSha256':sha(check_file)})
        print('PASS restored files: '+key+' ('+str(len(entries))+')',flush=True)
    return probe,checks

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--destination',type=Path,required=True)
    parser.add_argument('--allow-same-disk',action='store_true');args=parser.parse_args()
    destination=args.destination.resolve()
    if destination==APP or destination.is_relative_to(APP):raise ValueError('Destination must be outside application')
    destination.mkdir(parents=True,exist_ok=True)
    connection=db_connection('ivme');command,env,_=connection
    env=env.copy();env['PGOPTIONS']=env.get('PGOPTIONS','')+' -c statement_timeout=0'
    connection=command,env,'ivme'
    exporter=subprocess.Popen([*command,'-w','-q','-t','-A'],env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8')
    backup=None
    try:
        exporter.stdin.write('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSELECT pg_export_snapshot();\n');exporter.stdin.flush()
        snapshot=exporter.stdout.readline().strip()
        if not re.fullmatch(r'[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9]+',snapshot):
            _,error=exporter.communicate(timeout=15)
            raise RuntimeError('Could not create backup snapshot: '+error[-2000:])
        print('Capturing source database counts and fingerprints...',flush=True)
        before=database_state(connection,snapshot)
        call=['pwsh','-NoProfile','-File',str(APP/'scripts/ivme-yedek-al.ps1'),'-Destination',str(destination),'-DatabaseSnapshot',snapshot]
        if args.allow_same_disk:call.append('-AllowSameDiskForDrill')
        print('Taking database, image, PDF and catalog backup...',flush=True)
        result=subprocess.run(call,env=env,capture_output=True,text=True,encoding='utf-8')
        if result.returncode:raise RuntimeError(result.stderr[-2000:])
        backup=Path(result.stdout.strip().splitlines()[-1]).resolve()
        if not backup.is_relative_to(destination):raise ValueError('Unexpected backup directory')
        print('Backup: '+str(backup),flush=True)
    finally:
        if exporter.poll() is None:
            try:exporter.communicate(input='ROLLBACK;\n\\q\n',timeout=15)
            except subprocess.TimeoutExpired:
                exporter.terminate();exporter.communicate(timeout=15)
    manifest=json.loads((backup/'manifest.json').read_text(encoding='utf-8-sig'))
    if sha(backup/'database.dump')!=manifest['files']['database']['sha256']:raise ValueError('Database dump checksum mismatch')
    restore_name='ivme_restore_probe_'+datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S_%f')
    assert re.fullmatch(r'ivme_restore_probe_[0-9_]+',restore_name) and restore_name not in {'ivme','ivme_test'}
    query(connection,'CREATE DATABASE '+ident(restore_name))
    restored=target_connection(connection,restore_name)
    print('Restoring into isolated database '+restore_name+'...',flush=True)
    pg_restore=str(Path(command[0]).with_name('pg_restore.exe'))
    restore_command=[pg_restore,'-w','--exit-on-error','--no-owner','--no-privileges','-j','4',
        '--host',command[command.index('--host')+1],'--port',command[command.index('--port')+1],
        '--username',command[command.index('--username')+1],'--dbname',restore_name,str(backup/'database.dump')]
    result=subprocess.run(restore_command,env=env,capture_output=True,text=True,encoding='utf-8')
    if result.returncode:raise RuntimeError(result.stderr[-2000:])
    after=database_state(restored)
    if before!=after:raise ValueError('Restored database differs from exported snapshot')
    print('PASS database: '+str(len(after))+' table/view checks',flush=True)
    probe,files=restore_files(backup,manifest)
    # The name is generated above and checked against the live/test names. Only
    # this newly created probe is dropped; the application databases are untouched.
    assert query(restored,'SELECT current_database()')==restore_name
    query(connection,'DROP DATABASE '+ident(restore_name))
    report={'version':1,'status':'PASS','checkedAt':datetime.now(timezone.utc).isoformat(),'backupDirectory':str(backup),
        'manifestSha256':sha(backup/'manifest.json'),'sourceDatabase':'ivme','restoredDatabase':restore_name,
        'probeDatabaseDropped':True,'sourceDatabaseWrites':0,'learnerHistoryWrites':0,
        'sourceDisk':manifest['sourceDisk'],'targetDisk':manifest['targetDisk'],'separatePhysicalDisk':manifest['separatePhysicalDisk'],
        'sameDiskAuthorized':args.allow_same_disk,'databaseSnapshotConsistent':True,'databaseChecks':after,
        'rowFingerprintAlgorithm':'MD5 of sorted MD5 canonical JSON rows; archive/dump/file integrity uses SHA-256',
        'fileChecks':files,'restoreProbeDirectory':str(probe),'restoreFilesRetained':True}
    (backup/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    evidence=APP/'veri/content-labels/backup-restore';evidence.mkdir(parents=True,exist_ok=True)
    output=evidence/(backup.name+'.json');output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'PASS','report':output.relative_to(APP).as_posix(),'backup':str(backup),'verifiedFileSets':len(files)},ensure_ascii=False),flush=True)

if __name__=='__main__':main()
