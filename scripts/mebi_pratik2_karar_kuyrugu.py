"""Build a local review index; never touch the application/student database.

Raw regex observations retain their original reasons but are explicitly NOT
verified answer conflicts. File/page-level unresolved scope remains visible.
"""
import hashlib
import json
import sqlite3
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import BASE
from yks_birlestirme import write_json

REPORTS=[('review-queue.json','items'),('page-matrix.json','reviewQueueAdditions'),
    ('answer-document-pairs.json','reviewQueueAdditions'),
    ('printed-answer-readings.json','reviewQueueAdditions'),
    ('body-key-binding-candidates.json','reviewQueueAdditions'),
    ('single-test-bindings.json','reviewQueueAdditions'),
    ('package-content-report.json','reviewQueueAdditions'),
    ('prior-source-proof-reuse.json','reviewQueueAdditions')]


def run():
    db=sqlite3.connect(BASE/'review-index.sqlite3')
    db.execute('PRAGMA journal_mode=WAL')
    db.execute('CREATE TABLE IF NOT EXISTS observations (id TEXT PRIMARY KEY, report TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL, student_visible INTEGER NOT NULL DEFAULT 0 CHECK(student_visible=0))')
    db.execute('CREATE TABLE IF NOT EXISTS candidate_decisions (code TEXT PRIMARY KEY, status TEXT NOT NULL, payload TEXT NOT NULL, student_visible INTEGER NOT NULL DEFAULT 0 CHECK(student_visible=0))')
    db.execute('CREATE TABLE IF NOT EXISTS native_signals (id TEXT PRIMARY KEY,source_sha TEXT NOT NULL,page INTEGER NOT NULL,kind TEXT NOT NULL,payload TEXT NOT NULL,student_visible INTEGER NOT NULL DEFAULT 0 CHECK(student_visible=0))')
    db.execute('CREATE INDEX IF NOT EXISTS native_signals_source_page ON native_signals(source_sha,page)')
    reports={};written=0
    with db:
        def record(report,status,payload):
            nonlocal written
            raw=json.dumps(payload,ensure_ascii=False,sort_keys=True)
            identity=hashlib.sha256((report+'\n'+raw).encode('utf8')).hexdigest()
            db.execute('INSERT OR IGNORE INTO observations(id,report,status,payload) VALUES(?,?,?,?)',
                (identity,report,status,raw));written+=1
        for filename,field in REPORTS:
            path=BASE/filename
            if not path.exists():continue
            data=json.loads(path.read_text(encoding='utf8'))
            reports[filename]=hashlib.sha256(path.read_bytes()).hexdigest()
            for row in data.get(field,[]):
                record(filename,'UNVALIDATED_LEGACY_SIGNAL' if filename in
                    {'printed-answer-readings.json','body-key-binding-candidates.json'} else row.get('reviewStatus','SOURCE_REVIEW_REQUIRED'),row)
        native=BASE/'all-pdf-native-observations/observations.jsonl'
        if native.exists():
            with native.open(encoding='utf8') as stream:
                for raw in stream:
                    row=json.loads(raw)
                    db.execute('INSERT OR IGNORE INTO native_signals(id,source_sha,page,kind,payload) VALUES(?,?,?,?,?)',
                        (row['observationId'],row['sourceSha256'],row['physicalPage'],row['kind'],raw.strip()))
        coverage=json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))
        for doc in coverage['documents']:
            cached=json.loads((BASE/doc['cache']).read_text(encoding='utf8'))
            for page in cached['pages']:
                if page['readingStatus']=='VISUAL_REVIEW_REQUIRED':
                    record('full-pdf-coverage.json','VISUAL_PAGE_REVIEW_REQUIRED',
                        {'sourceSha256':doc['sourceSha256'],'relativePath':doc['relativePath'],
                         'physicalPage':page['physicalPage'],'cache':doc['cache'],'studentVisible':False})
        for filename,field,status in [('single-test-crops/geometry-report.json','rows','CROP_GEOMETRY_REVIEW'),
                                      ('single-test-crops/topic-candidates.json','rows','TOPIC_REVIEW')]:
            path=BASE/filename
            if path.exists():
                for row in json.loads(path.read_text(encoding='utf8'))[field]:
                    if row['status'] in ('REVIEW_REQUIRED','KONU_BELIRSIZ'):record(filename,status,row)
        technical=BASE/'single-test-crops/technical-packages.json'
        accepted_path=BASE/'single-test-crops/source-pixel-acceptance.json'
        if technical.exists() and accepted_path.exists():
            package=json.loads(technical.read_text(encoding='utf8'))
            admitted=json.loads(accepted_path.read_text(encoding='utf8'))
            verified={r['code']:r for r in admitted['accepted']}
            pending={r['code']:r for r in package['reviewQueueAdditions']}
            pending.update({r['code']:r for r in admitted['reviewQueueAdditions']})
            for code,row in {**pending,**verified}.items():
                status='SOURCE_VERIFIED_NOT_TEACHER_APPROVED' if code in verified else 'REVIEW_REQUIRED'
                db.execute('INSERT INTO candidate_decisions(code,status,payload) VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET status=excluded.status,payload=excluded.payload',
                    (code,status,json.dumps(row,ensure_ascii=False,sort_keys=True)))
    counts=dict(db.execute('SELECT status,count(*) FROM observations GROUP BY status').fetchall())
    result={'status':'LOCAL_REVIEW_INDEX_UPDATED','observations':sum(counts.values()),'counts':counts,
            'candidateDecisions':dict(db.execute('SELECT status,count(*) FROM candidate_decisions GROUP BY status').fetchall()),
            'rawNativeSignalsNotQuestionCounts':dict(db.execute('SELECT kind,count(*) FROM native_signals GROUP BY kind').fetchall()),
            'sourceReports':reports,'studentVisible':False,'applicationDatabaseWrites':0,
            'meaning':'OBSERVATIONS_ARE_NOT_DISTINCT_QUESTIONS; LEGACY_CONFLICT_LABELS_ARE_UNVERIFIED'}
    write_json(BASE/'review-index-report.json',result)
    db.close();print(json.dumps({k:v for k,v in result.items() if k!='sourceReports'}))


if __name__=='__main__':run()
