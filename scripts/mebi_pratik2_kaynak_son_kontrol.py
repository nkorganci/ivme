"""Verify the complete read-only source archive still matches its inventory."""
import hashlib
import json
import time
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import BASE,SOURCE
from yks_birlestirme import write_json


def run():
    inventory=BASE/'inventory.json';rows=json.loads(inventory.read_text(encoding='utf8'))['items']
    started=time.monotonic();last=started;bucket=-1;bytes_read=0;issues=[]
    for index,row in enumerate(rows,1):
        path=(SOURCE/row['relativePath']).resolve()
        if not path.is_relative_to(SOURCE):raise ValueError('Inventory leaves source root')
        try:
            if path.stat().st_size!=row['bytes']:issues.append({'relativePath':row['relativePath'],'reason':'SIZE_CHANGED'})
            else:
                with path.open('rb') as stream:sha=hashlib.file_digest(stream,'sha256').hexdigest()
                bytes_read+=row['bytes']
                if sha!=row['sha256']:issues.append({'relativePath':row['relativePath'],'reason':'SHA256_CHANGED'})
        except OSError as error:issues.append({'relativePath':row['relativePath'],'reason':type(error).__name__})
        now=time.monotonic();current=10*index//len(rows)
        if current>bucket or now-last>=300 or index==len(rows):
            progress={'completedFiles':index,'totalFiles':len(rows),'percent':round(100*index/len(rows),2),
                'bytesRead':bytes_read,'issues':len(issues),'elapsedSeconds':round(now-started,2),'estimatedRemainingSeconds':None}
            with (BASE/'final-source-integrity-progress.jsonl').open('a',encoding='utf8') as stream:stream.write(json.dumps(progress)+'\n')
            print(json.dumps(progress),flush=True);last=now;bucket=current
    # Newly added local source files require their own recorded review scope;
    # tool scripts under _araclar are outside the content inventory by design.
    known={str(Path(r['relativePath'])) for r in rows}
    added=[str(p.relative_to(SOURCE)) for p in SOURCE.rglob('*') if p.is_file() and '_araclar' not in p.relative_to(SOURCE).parts and str(p.relative_to(SOURCE)) not in known]
    result={'status':'PASS' if not issues and not added else 'ARCHIVE_CHANGED_REVIEW_REQUIRED',
        'verifiedFiles':len(rows)-len(issues),'inventoryFiles':len(rows),'bytesRead':bytes_read,'issues':issues,
        'newUninventoriedFiles':added,'sourceWrites':0,'sourceDeletes':0,'applicationDatabaseWrites':0,
        'inventorySha256':hashlib.sha256(inventory.read_bytes()).hexdigest(),'elapsedSeconds':round(time.monotonic()-started,2)}
    write_json(BASE/'final-source-integrity.json',result);print(json.dumps(result))
    if issues or added:raise SystemExit(1)


if __name__=='__main__':run()
