"""Reconcile every inventoried path without claiming discovery is full extraction."""
import json
import sqlite3
from collections import Counter,defaultdict
from mebi_pratik2_tam_pdf_tarama import BASE
from yks_birlestirme import write_json


def run():
    inventory=json.loads((BASE/'inventory.json').read_text(encoding='utf8'))['items']
    pdfs={r['relativePath']:r for r in json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents']}
    containers={r['relativePath']:r for r in json.loads((BASE/'package-content-report.json').read_text(encoding='utf8'))['containers']}
    single={r['relativePath']:r for r in json.loads((BASE/'single-test-bindings.json').read_text(encoding='utf8'))['documents']}
    accepted=defaultdict(list)
    for row in json.loads((BASE/'single-test-crops/source-pixel-acceptance.json').read_text(encoding='utf8'))['accepted']:
        accepted[row['relativePath']].append(row['code'])
    rows=[]
    for item in inventory:
        path=item['relativePath'];ext=item['extension'];codes=accepted[path]
        row={'relativePath':path,'sourceSha256':item['sha256'],'extension':ext,
            'acceptedQuestionCodes':codes,'acceptedQuestions':len(codes),'totalQuestions':None,
            'studentVisible':False,'discoveryComplete':False,'numberedBodyKeyBindingComplete':False}
        if path in pdfs:
            doc=pdfs[path];row.update(discoveryComplete=doc['status']=='SCANNED',pageCount=doc['pageCount'],cache=doc['cache'])
            if path in single:
                count=len(single[path]['questions']);row['totalQuestions']=count
                row['status']='VERIFIED_QUESTION_PACKAGES_READY' if count==len(codes) else 'PARTIAL_OR_FULL_CANDIDATE_REVIEW'
                row['reviewCandidates']=count-len(codes)
                row['numberedBodyKeyBindingComplete']=True
            else:row['status']='PDF_DISCOVERED_LAYOUT_KEY_BINDING_REVIEW'
        elif path in containers:
            row.update(discoveryComplete=True,status='CONTAINER_DISCOVERED_QUESTION_CONTENT_REVIEW',containerCache=containers[path]['cache'])
        elif ext in {'.mp4','.mp3','.png','.jpg','.jpeg','.webp','.svg','.gif'}:
            row.update(discoveryComplete=True,status='MEDIA_INVENTORIED_QUESTION_EXTRACTION_NOT_EVALUATED')
        else:row.update(discoveryComplete=True,status='METADATA_OR_OTHER_FILE_REVIEW',inventoryReason=item.get('reason'))
        rows.append(row)
    if len(rows)!=len({r['relativePath'] for r in rows}):raise ValueError('Duplicate inventory paths')
    db=sqlite3.connect(BASE/'review-index.sqlite3')
    db.execute('CREATE TABLE IF NOT EXISTS source_decisions(relative_path TEXT PRIMARY KEY,status TEXT NOT NULL,payload TEXT NOT NULL,student_visible INTEGER NOT NULL DEFAULT 0 CHECK(student_visible=0))')
    with db:
        for row in rows:
            db.execute('INSERT INTO source_decisions(relative_path,status,payload) VALUES(?,?,?) ON CONFLICT(relative_path) DO UPDATE SET status=excluded.status,payload=excluded.payload',
                (row['relativePath'],row['status'],json.dumps(row,ensure_ascii=False)))
    db.close()
    summary={'status':'SOURCE_DECISIONS_RECONCILED_FULL_ARCHIVE_NOT_ACCEPTED','sourcePaths':len(rows),
        'discoveredPaths':sum(r['discoveryComplete'] for r in rows),'unclassifiedPaths':0,
        'numberedBodyKeyBindingPaths':sum(r['numberedBodyKeyBindingComplete'] for r in rows),
        'acceptedQuestions':sum(r['acceptedQuestions'] for r in rows),'totalArchiveQuestions':None,
        'states':dict(Counter(r['status'] for r in rows)),'stage02FullAcceptance':False,'applicationDatabaseWrites':0}
    write_json(BASE/'source-decision-matrix.json',{**summary,'sources':rows})
    write_json(BASE/'source-decision-summary.json',summary)
    print(json.dumps(summary))


if __name__=='__main__':run()
