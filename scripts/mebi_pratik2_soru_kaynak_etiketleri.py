"""Label saved question candidates from source folders/printed headings only."""
import hashlib
import json
import time
from collections import Counter
import pymupdf
from mebi_pratik2_tam_pdf_tarama import BASE,SOURCE
from mebi_pratik2_klasor_etiketleri import lookup
from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf
from yks_birlestirme import write_json,process_lock


def run():
    packages=['all-source-evidence','single-test-pending-evidence','individual-tarama-pending-evidence',
              'individual-tarama-word-pending-evidence','bold-number-pending-evidence','scanned-literature-pending-evidence',
              'full-mock-pending-evidence']
    policy=load_decisions();rows={}
    for name in packages:
        folder=BASE/name;package=json.loads((folder/'chapter-packages.json').read_text(encoding='utf8'))
        groups={g['groupId']:g for g in package['keyGroups']}
        for row in package['items']:
            if skip_pdf(row['sourceSha256'],policy):continue
            rows[row['code']]=(row,groups[row['groupId']])
    ordered=sorted(rows.values(),key=lambda x:(x[0]['sourceSha256'],x[0]['bodyPage'],x[0]['printedNumber']))
    counts=Counter();records={};pdf=None;sha=None;started=time.monotonic();last=started;bucket=-1
    root=BASE/'question-source-labels';root.mkdir(exist_ok=True)
    try:
        for index,(row,group) in enumerate(ordered,1):
            if sha!=row['sourceSha256']:
                if pdf:pdf.close()
                sha=row['sourceSha256'];path=(SOURCE/row['relativePath']).resolve()
                if not path.is_relative_to(SOURCE):raise ValueError('Source label lookup leaves original root')
                with path.open('rb') as stream:
                    if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Original source identity changed')
                pdf=pymupdf.open(path)
            labels=lookup(row,pdf,group);counts[labels['status']]+=1
            records[row['code']]={'code':row['code'],'sourceSha256':sha,'imageSha256':row['imageSha256'],
                                  'sourceLabelEvidence':labels,'teacherApproved':False}
            now=time.monotonic();current=10*index//max(1,len(ordered))
            if current>bucket or now-last>=300 or index==len(ordered):
                p={'stage':'SAVED_QUESTION_SOURCE_LABELS','completed':index,'total':len(ordered),'counts':dict(counts),
                   'elapsedSeconds':round(now-started,1),'modelCalls':0,'imageWrites':0,'questionWrites':0}
                write_json(root/'progress.json',p);print(json.dumps(p),flush=True);last=now;bucket=current
        write_json(root/'index.json',{'status':'SOURCE_LABEL_CANDIDATES_NOT_PUBLISHED','records':records,'counts':dict(counts),
                                    'modelCalls':0,'imageWrites':0,'questionWrites':0,'elapsedSeconds':round(time.monotonic()-started,1)})
    finally:
        if pdf:pdf.close()


if __name__=='__main__':
    with process_lock(BASE/'.jobs/question-source-labels.lock'):run()
