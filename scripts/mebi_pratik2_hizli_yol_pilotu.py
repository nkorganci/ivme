"""Measure the existing-crop profile route across representative source books."""
import hashlib
import json
import time
from collections import Counter,defaultdict
import pymupdf
from mebi_pratik2_tam_pdf_tarama import BASE,SOURCE
from mebi_pratik2_hizli_yol import ROOT,prove,code_digest,STATUS
from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf
from yks_birlestirme import write_json,process_lock


def select(package):
    sources=defaultdict(list)
    for r in package['items']:sources[(r['exam'],r['sourceSha256'])].append(r)
    chosen=[]
    for exam in ['TYT','AYT']:
        keys=[k for k in sources if k[0]==exam]
        chosen+=list(dict.fromkeys(keys[:4]+keys[-4:]))
    rows=[]
    for key in chosen:
        groups=defaultdict(list)
        for r in sources[key]:groups[r['groupId']].append(r)
        for group in groups.values():
            rows.extend(group[i] for i in dict.fromkeys([len(group)//3,2*len(group)//3]))
    return rows


def run():
    ROOT.mkdir(exist_ok=True);folder=BASE/'full-mock-pending-evidence'
    package=json.loads((folder/'chapter-packages.json').read_text(encoding='utf8'))
    groups={g['groupId']:g for g in package['keyGroups']};rows=select(package)
    policy=load_decisions();opened={};records=[];counts=Counter();started=time.monotonic();last=started;bucket=-1
    for index,row in enumerate(rows,1):
        if skip_pdf(row['sourceSha256'],policy):continue
        sha=row['sourceSha256']
        if sha not in opened:
            for document in opened.values():document.close()
            opened={};path=SOURCE/row['relativePath']
            with path.open('rb') as stream:
                if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Pilot original source changed')
            opened[sha]=pymupdf.open(path)
        image=BASE/row['image'];before=image.stat()
        proof=prove(opened[sha],row,image,group=groups[row['groupId']],pilot=True)
        after=image.stat()
        if (before.st_size,before.st_mtime_ns)!=(after.st_size,after.st_mtime_ns):raise ValueError('Pilot changed a saved crop')
        status=proof['status'] if proof else 'VISUAL_EXCEPTION_RETAINED';counts[status]+=1
        records.append({'code':row['code'],'sourceSha256':sha,'image':row['image'],'imageSha256':row['imageSha256'],
                        'status':status,'proof':proof,'keyImageSha256':row['keyImageSha256']})
        now=time.monotonic();current=10*index//len(rows)
        if current>bucket or now-last>=300 or index==len(rows):
            data={'stage':'EXISTING_CROP_PROFILE_PILOT','completed':index,'total':len(rows),'counts':dict(counts),
                  'elapsedSeconds':round(now-started,2),'imageWrites':0,'modelCalls':0}
            write_json(ROOT/'pilot-progress.json',data);print(json.dumps(data),flush=True);last=now;bucket=current
    for document in opened.values():document.close()
    for row in records:
        if hashlib.sha256((BASE/row['image']).read_bytes()).hexdigest()!=row['imageSha256']:raise ValueError('Pilot image bytes changed')
    report={'status':'PROFILE_PILOT_MEASURED_REQUIRES_ACTUAL_IMAGE_REVIEW','records':records,'counts':dict(counts),
            'scope':len(rows),'sourcePdfs':len({r['sourceSha256'] for r in records}),'codeSha256':code_digest(),
            'elapsedSeconds':round(time.monotonic()-started,2),'imageWrites':0,'modelCalls':0,
            'questionWrites':0,'teacherApprovalsCreated':0,'allPrintedQuestionsExtracted':False}
    write_json(ROOT/'pilot-report.json',report)
    print(json.dumps({k:v for k,v in report.items() if k!='records'}),flush=True)


if __name__=='__main__':
    with process_lock(BASE/'.jobs/fast-profile-pilot.lock'):run()
