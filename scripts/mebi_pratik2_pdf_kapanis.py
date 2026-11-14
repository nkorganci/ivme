"""Close PDF metadata only: no question discovery, OCR, images or publication."""
import hashlib
import json
import time
import shutil
from collections import Counter
from datetime import datetime,timezone
from pathlib import Path
import pymupdf
from kaynakli_arastirma_db import db_connection,query
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_klasor_etiketleri import path_key
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json,process_lock

OUT=APP/'veri/mebi-pratik-2/pdf-closeout'
CLASSIFIER_VERSION=3


def source_path(relative):
    path=(SOURCE/relative).resolve()
    if not path.is_relative_to(SOURCE.resolve()):raise ValueError('PDF path outside source archive')
    return path


def document_kind(relative):
    parts=[normalize(p) for p in relative.replace('\\','/').split('/') if p]
    text=parts[-1]
    for cue,kind in [('cevap anahtari','ANSWER_KEY'),('cikmis soru','PAST_EXAM_COMPILATION'),
                     ('tarama','SCREENING_TEST'),('konu ozeti','TOPIC_SUMMARY'),
                     ('3 adim','WORKBOOK')]:
        if cue in text:return kind
    if 'taramalar' in parts or 'mebi tarama testi kitaplari' in parts:return 'SCREENING_TEST'
    if 'konu pekistirme testleri' in parts:return 'TOPIC_PRACTICE_TESTS'
    if any('3 adim' in p for p in parts):return 'WORKBOOK'
    if 'deneme' in text or 'denemeler' in parts or any(p.startswith('mebi yks deneme') for p in parts):return 'MOCK_EXAM'
    return 'OTHER_PDF'


def category_binding(label,categories,verified):
    category=categories.get(label.get('categoryId'))
    if not verified or not category or not category.get('selectable'):return None
    if any(category.get(field)!=label.get('canonical'+field.capitalize()) for field in ['exam','subject','topic']):return None
    return {k:category.get(k) for k in ['id','exam','subjectId','subject','unit','topic']}


def unchanged_state(connection):
    return json.loads(query(connection,"""SELECT json_build_object(
      'catalogRun',(SELECT run_key FROM learning_catalog.current_run),
      'questionCount',(SELECT count(*) FROM questions),
      'questions',(SELECT md5(string_agg(md5(to_jsonb(q)::text),'' ORDER BY id)) FROM questions q),
      'assignments',(SELECT md5(string_agg(md5((to_jsonb(a)-'run_key')::text),'' ORDER BY item_key,category_id,relation)) FROM learning_catalog.current_assignments a))"""))


def run():
    OUT.mkdir(parents=True,exist_ok=True)
    if (OUT/'acceptance.json').exists():
        saved=json.loads((OUT/'acceptance.json').read_text(encoding='utf8'))
        if saved.get('classifierVersion')==CLASSIFIER_VERSION:
            if hashlib.sha256((OUT/'manifest.json').read_bytes()).hexdigest()!=saved['manifestSha256']:
                raise ValueError('Local PDF closeout manifest changed')
            connection=db_connection('ivme')
            stored=query(connection,"SELECT inventory_audit->'mebiPdfCloseout'->>'manifestSha256' FROM learning_catalog.source_audits WHERE run_key='"+saved['catalogRun']+"'")
            if stored!=saved['manifestSha256']:raise ValueError('Stored PDF closeout differs')
            print(json.dumps({**saved,'status':'EXISTING_VERIFIED_PDF_CLOSEOUT_REUSED','reused':True}));return
        history=OUT/'history'/saved['manifestSha256'];history.mkdir(parents=True,exist_ok=True)
        for name in ['manifest.json','acceptance.json','prior-source-audit.json']:
            if not (history/name).exists():shutil.copyfile(OUT/name,history/name)
    connection=db_connection('ivme');before=unchanged_state(connection)
    categories=json.loads(query(connection,"SELECT json_agg(jsonb_build_object('id',category_id)||definition) FROM learning_catalog.current_categories"))
    categories={c['id']:c for c in categories}
    inventory_path=BASE/'inventory.json';folder_path=BASE/'source-folder-labels/index.json'
    items=[r for r in json.loads(inventory_path.read_text(encoding='utf8'))['items'] if r['extension']=='.pdf']
    labels=json.loads(folder_path.read_text(encoding='utf8'))['records']
    coverage={r['relativePath']:r for r in json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents']}
    decisions=json.loads((BASE/'pdf-reuse-check/decisions.json').read_text(encoding='utf8'))['bySha256']
    records=[];verified_physical={};started=time.monotonic();bucket=-1;last=started
    for index,item in enumerate(items,1):
        relative=item['relativePath'];label=labels.get(path_key(relative),{})
        row={'relativePath':relative,'expectedSha256':item['sha256'],'sourceCategoryPath':[p for p in relative.replace('\\','/').split('/') if p][:-1],
             'documentKind':document_kind(relative),'sourceHierarchies':label.get('sourceHierarchies',[]),
             'sourceLabels':[{k:r.get(k) for k in ['sourceExam','sourceSubject','sourceUnit','sourceTopic']} for r in label.get('resolvedSourceLabels',[])],
             'existingPracticePdfDecision':decisions.get(item['sha256'],{}).get('decision'),
             'studentVisible':False,'questionDiscoveryAllowed':False}
        try:
            path=source_path(relative);stat=path.stat();identity=(stat.st_dev,stat.st_ino,stat.st_size,stat.st_mtime_ns)
            if identity not in verified_physical:
                with path.open('rb') as stream:sha=hashlib.file_digest(stream,'sha256').hexdigest()
                with pymupdf.open(path) as pdf:pages=len(pdf)
                verified_physical[identity]=(sha,pages)
            sha,pages=verified_physical[identity]
            good=sha==item['sha256'] and stat.st_size==item['bytes'] and pages==coverage[relative]['pageCount']
            row.update(sha256=sha,bytes=stat.st_size,pageCount=pages,verification='VERIFIED' if good else 'ARCHIVED_SOURCE_CHANGED')
        except (OSError,RuntimeError,ValueError) as error:
            good=False;row.update(verification='ARCHIVED_UNAVAILABLE_SOURCE',errorType=type(error).__name__)
        row['canonicalCategory']=category_binding(label,categories,good and label.get('sourceSha256')==item['sha256'])
        row['categoryDisposition']='EXISTING_MAIN_CATEGORY_BOUND' if row['canonicalCategory'] else 'SOURCE_FOLDER_CATEGORY_RETAINED_NO_SINGLE_MAIN_TOPIC_CLAIM'
        records.append(row)
        now=time.monotonic();current=10*index//len(items)
        if current>bucket or now-last>=300 or index==len(items):
            print(json.dumps({'stage':'PDF_HASH_PAGE_AND_SOURCE_CATEGORY_METADATA_ONLY','completed':index,'total':len(items),
                 'percent':round(100*index/len(items),2),'elapsedSeconds':round(now-started,1),'estimatedRemainingSeconds':None,
                 'questionWrites':0,'imageWrites':0,'modelCalls':0}),flush=True);bucket=current;last=now
    manifest={'version':1,'classifierVersion':CLASSIFIER_VERSION,'status':'PDF_METADATA_CLOSED_WITH_EXPLICIT_SOURCE_CATEGORIES','createdAt':datetime.now(timezone.utc).isoformat(),
        'catalogRun':before['catalogRun'],'sourceRoot':str(SOURCE),'records':records,
        'pdfPaths':len(records),'uniqueInventoriedPdfHashes':len({r['expectedSha256'] for r in records}),
        'verificationCounts':dict(Counter(r['verification'] for r in records)),
        'categoryCounts':dict(Counter(r['categoryDisposition'] for r in records)),
        'documentKinds':dict(Counter(r['documentKind'] for r in records)),
        'inventorySha256':hashlib.sha256(inventory_path.read_bytes()).hexdigest(),
        'folderLabelsSha256':hashlib.sha256(folder_path.read_bytes()).hexdigest(),
        'questionWrites':0,'imageWrites':0,'modelCalls':0,'sourceWrites':0,
        'remainingQuestionWorkCancelled':True,'fullQuestionExtractionClaimed':False}
    write_json(OUT/'manifest.json',manifest);digest=hashlib.sha256((OUT/'manifest.json').read_bytes()).hexdigest()
    payload={**manifest,'manifestSha256':digest};payload_sql=json.dumps(payload,ensure_ascii=False).replace("'","''")
    run=before['catalogRun'].replace("'","''")
    previous=query(connection,f"SELECT coalesce(json_agg(a),'[]') FROM learning_catalog.source_audits a WHERE run_key='{run}'")
    write_json(OUT/'prior-source-audit.json',json.loads(previous))
    query(connection,f"""BEGIN;SELECT pg_advisory_xact_lock(738452019);
      DO $guard$ BEGIN IF (SELECT run_key FROM learning_catalog.current_run) IS DISTINCT FROM '{run}' THEN RAISE EXCEPTION 'Catalog changed'; END IF; END $guard$;
      INSERT INTO learning_catalog.source_audits(run_key,inventory_audit,curriculum_references)
      VALUES ('{run}',jsonb_build_object('mebiPdfCloseout','{payload_sql}'::jsonb),'[]'::jsonb)
      ON CONFLICT(run_key) DO UPDATE SET inventory_audit=learning_catalog.source_audits.inventory_audit||excluded.inventory_audit;
      COMMIT;""")
    if unchanged_state(connection)!=before:raise ValueError('Questions or published catalog changed during metadata closeout')
    stored=query(connection,f"SELECT inventory_audit->'mebiPdfCloseout'->>'manifestSha256' FROM learning_catalog.source_audits WHERE run_key='{run}'")
    if stored!=digest:raise ValueError('PDF metadata database receipt differs')
    report={k:v for k,v in manifest.items() if k not in ['records','sourceRoot']}
    report.update(status='PASS',manifestSha256=digest,databaseTable='learning_catalog.source_audits',
                  databaseField='inventory_audit.mebiPdfCloseout',questionsAndPublishedCatalogUnchanged=True,
                  elapsedSeconds=round(time.monotonic()-started,1))
    write_json(OUT/'acceptance.json',report);print(json.dumps(report))


if __name__=='__main__':
    with process_lock(BASE/'.jobs/pdf-metadata-closeout.lock'):run()
