"""Label saved question candidates from source folders/printed headings only."""
import argparse
import hashlib
import json
import time
from collections import Counter
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_klasor_etiketleri import lookup,write_versioned_index
from mebi_pratik2_tek_tarama_konu import source_subject
from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf
from yks_birlestirme import write_json,process_lock


def retained_records(previous,rows,categories):
    records=previous['records'];current={r['code']:r for r,_ in rows.values()}
    if set(records)!=set(current):raise ValueError('Candidate scope changed; full label pass required')
    by_category={c['id']:c for c in categories}
    for code,record in records.items():
        row=current[code]
        if (record['sourceSha256'],record['imageSha256'])!=(row['sourceSha256'],row['imageSha256']):
            raise ValueError('Candidate binding changed; full label pass required')
        label=record['sourceLabelEvidence']
        if label.get('categoryId'):
            category=by_category.get(label['categoryId'])
            if not category or not category.get('selectable') or not category['id'].startswith('excel.'):
                raise ValueError('Main category changed; full label pass required')
            if any(category.get(k)!=label.get('canonical'+k.title()) for k in ['exam','subject','unit','topic']):
                raise ValueError('Main category definition changed; full label pass required')
    return dict(records)


def run(subjects=None):
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
    root=BASE/'question-source-labels';root.mkdir(exist_ok=True)
    categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    records={}
    if subjects:
        path=root/'index.json'
        if not path.exists():raise ValueError('First label pass must cover all candidates')
        records=retained_records(json.loads(path.read_text(encoding='utf8')),rows,categories)
    selected=[pair for pair in rows.values() if not subjects or source_subject(pair[0]['relativePath'],categories,pair[0]['exam']) in subjects]
    ordered=sorted(selected,key=lambda x:(x[0]['sourceSha256'],x[0]['bodyPage'],x[0]['printedNumber']))
    counts=Counter();pdf=None;sha=None;started=time.monotonic();last=started;bucket=-1
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
        write_versioned_index(root/'index.json',{'status':'SOURCE_LABEL_CANDIDATES_NOT_PUBLISHED','records':records,
                                    'counts':dict(Counter(r['sourceLabelEvidence']['status'] for r in records.values())),
                                    'updateScopeSubjects':sorted(subjects) if subjects else None,
                                    'scopeCandidatesRechecked':len(ordered),'otherCandidateReceiptsRetained':len(rows)-len(ordered),
                                    'modelCalls':0,'imageWrites':0,'questionWrites':0,'elapsedSeconds':round(time.monotonic()-started,1)})
    finally:
        if pdf:pdf.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--subjects',nargs='+');args=parser.parse_args()
    with process_lock(BASE/'.jobs/question-source-labels.lock'):run(set(args.subjects) if args.subjects else None)
