"""Install/check two allowlisted pipeline consumer projections from versioned sources."""
import argparse
from pathlib import Path
import shutil

from yks_birlestirme import Store,digest,write_json,process_lock

APP=Path(__file__).resolve().parents[1]
FILES=('catalog_reference.py','catalog_taxonomy.py','source_archive.py')
PATCHES={
    'stages.py':[("from text_processing import recurring_margins", "from source_archive import pdf_paths\nfrom text_processing import recurring_margins"),
                 ("paths=sorted(SOURCE.rglob('*.pdf'),key=lambda p:str(p).casefold())","paths=pdf_paths(SOURCE)")],
    'progress.py':[("from core import ","from source_archive import pdf_paths\nfrom core import "),
                   ("sum(1 for _ in SOURCE.rglob('*.pdf'))","len(pdf_paths(SOURCE))")],
}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply',action='store_true')
    args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    folder=store.child(state['runId']+'/yol-uyumluluk/pipeline');folder.mkdir(parents=True,exist_ok=True)
    rows=[]
    with process_lock(folder/'.writer.lock'):
        for name in FILES:
            source=APP/'scripts/pipeline-adapters'/name;target=APP.parent/'pipeline'/name
            if source.is_symlink() or target.is_symlink() or target.resolve().parent!=(APP.parent/'pipeline').resolve():
                raise ValueError('Unsafe pipeline adapter path')
            old=digest(target) if target.exists() else None;new=digest(source)
            if old!=new:
                if not args.apply:raise ValueError('Pipeline consumer differs from versioned adapter: '+name)
                if old is not None:
                    backup=folder/(name+'.before-'+old)
                    if not backup.exists():shutil.copyfile(target,backup)
                    if digest(backup)!=old:raise ValueError('Pipeline before-image differs')
                temporary=target.with_suffix('.yks.tmp');shutil.copyfile(source,temporary);temporary.replace(target)
            if digest(target)!=new:raise ValueError('Pipeline adapter installation failed')
            rows.append({'file':name,'sourceSha256':new,'installedSha256':digest(target),'changed':old!=new})
        for name,patches in PATCHES.items():
            target=APP.parent/'pipeline'/name
            text=target.read_text(encoding='utf-8');updated=text
            for previous,replacement in patches:
                if replacement in updated:continue
                if previous not in updated:raise ValueError('Pipeline integration point changed: '+name)
                updated=updated.replace(previous,replacement)
            changed=updated!=text
            if changed:
                if not args.apply:raise ValueError('Pipeline integration patch not installed: '+name)
                old=digest(target);backup=folder/(name+'.before-'+old)
                if not backup.exists():shutil.copyfile(target,backup)
                if digest(backup)!=old:raise ValueError('Pipeline patch before-image differs')
                temporary=target.with_suffix('.yks.tmp');temporary.write_text(updated,encoding='utf-8');temporary.replace(target)
            rows.append({'file':name,'installedSha256':digest(target),'changed':changed})
    report={'status':'PASS','scope':'PIPELINE_CONSUMER_CODE_ONLY','files':rows,'databaseWrites':0,
            'sourcesReextracted':0,'embeddingsRebuilt':0,'sourceRootChanged':False}
    write_json(folder/'pipeline-adapter-report.json',report)
    print(__import__('json').dumps(report))


if __name__=='__main__':main()
