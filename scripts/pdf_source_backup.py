"""Create and verify a local database snapshot before PDF bank maintenance."""
from datetime import datetime,timezone
import hashlib
import json
from pathlib import Path
import subprocess
from kaynakli_arastirma_db import db_connection,query
from pdf_source_scan import APP,OUT,write_json


def main():
    command,env,_=db_connection('ivme');bin_dir=Path(command[0]).parent
    folder=APP.parent/'yedekler';folder.mkdir(exist_ok=True)
    target=folder/('pdf-accept-'+datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')+'.dump')
    arguments=[]
    for flag in ('--host','--port','--username','--dbname'):arguments.extend([flag,command[command.index(flag)+1]])
    result=subprocess.run([str(bin_dir/'pg_dump.exe'),'--no-password','--format=custom',*arguments,'--file',str(target)],env=env,capture_output=True)
    if result.returncode:raise RuntimeError(result.stderr.decode('utf-8',errors='replace')[-1000:])
    verified=subprocess.run([str(bin_dir/'pg_restore.exe'),'--list',str(target)],env=env,capture_output=True,check=True)
    if b'questions ' not in verified.stdout:raise ValueError('Backup table of contents is incomplete')
    with target.open('rb') as stream:sha=hashlib.file_digest(stream,'sha256').hexdigest()
    report={'path':str(target),'sha256':sha,'bytes':target.stat().st_size,'verification':'PG_RESTORE_LIST',
            'currentCatalogRun':query((command,env,'ivme'),'SELECT run_key FROM learning_catalog.current_run')}
    write_json(OUT/'last-backup.json',report);print(json.dumps(report,ensure_ascii=False),flush=True)


if __name__=='__main__':main()
