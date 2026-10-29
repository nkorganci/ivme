"""Admit a reviewed YKS PDF batch once, preserving the published catalog snapshot.

Default is read-only preparation. --publish requires a database backup and checks
the source bytes, two answer readings, current duplicate comparison, image hashes,
controlled labels, canonical answers and bank snapshot before any bank insertion.
Teacher decisions and learner tables are never written.
"""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import shutil
import subprocess

from PIL import Image
from kaynakli_arastirma_db import db_connection,query
from pdf_source_scan import APP,OUT,ROOT,write_json,digest,read_evidence_scan
from pdf_source_reconcile import text_fingerprint,json_query


def load(path):return json.loads(path.read_text(encoding='utf-8'))
def compact(value):return json.dumps(value,ensure_ascii=False,separators=(',',':'))
def literal(value):return "'"+str(value).replace("'","''")+"'"


def reviewed_answer(card,decision):
    correction=decision.get('answerCorrection')
    if not correction:return card['answer']
    if correction.get('method')!='EXPLICIT_ROLE_ORDER' or correction.get('sourceAnswer')!=card['answer']:
        raise ValueError('Unsupported or unbound source answer correction')
    roles=correction['itemRoles'];requested=correction['requestedRoles'];text=card['text']
    if len(set(requested))!=len(requested) or set(requested)!={row['role'] for row in roles.values()}:
        raise ValueError('Role correction is not a complete ordering')
    for roman,row in roles.items():
        if not re.search(r'(?m)^\s*'+re.escape(roman)+r'\s*[.)]\s*'+re.escape(row['sourceText']),text):
            raise ValueError('Role correction does not quote the original numbered item')
    positions=[text.find(role) for role in requested]
    if -1 in positions or positions!=sorted(positions):raise ValueError('Requested source role order differs')
    expected=[next(roman for roman,row in roles.items() if row['role']==role) for role in requested]
    options=re.findall(r'(?ms)^\s*([A-E])\s*\)\s*(.*?)(?=^\s*[A-E]\s*\)|\Z)',text)
    correct=[letter for letter,body in options if re.findall(r'\b[IVXLCDM]+\b',body)==expected]
    if len(correct)!=1 or correct[0]!=correction['correctedAnswer'] or correct[0]==card['answer']:
        raise ValueError('Source answer correction is not proved by the recorded ordering')
    return correct[0]


def validate_card(card,decision,question=None):
    if not re.fullmatch(r'[a-zA-Z0-9-]{1,60}',card['code']):raise ValueError('Unsafe question code')
    if '\x00' in card['text']:raise ValueError('Unrepresentable source text requires a preserved OCR/visual repair before acceptance')
    answer=card['answer']
    if answer not in 'ABCDE' or len(answer)!=1 or card['answerMethodA']!=answer or card['answerMethodB']!=answer:
        raise ValueError('Two independent source answer readings must agree')
    if decision.get('teacherApproved') is not False:raise ValueError('Automated acceptance cannot attribute teacher approval')
    if decision['exam'] not in ('TYT','AYT') or not decision['categoryIds']:raise ValueError('YKS controlled scope required')
    if decision['imageSha256']!=card['imageSha256'] or decision['sourceTextSha256']!=hashlib.sha256(card['text'].encode()).hexdigest():
        raise ValueError('Reviewed source card changed')
    if decision['decision']=='MATCH':
        if not question or not question['active'] or question['exam_type'] not in ('TYT','AYT'):raise ValueError('Existing canonical YKS question required')
        permutation=decision.get('answerPermutation',{})
        if permutation and (len(set(permutation.values()))!=len(permutation) or set(permutation)!=set(permutation.values())):
            raise ValueError('Answer permutation must be a bijection')
        effective=reviewed_answer(card,decision)
        if permutation.get(effective,effective)!=question['correct_answer']:raise ValueError('Canonical answer differs without a proven option permutation')
    elif decision['decision']!='NEW':raise ValueError('Unreviewed question cannot be admitted')
    else:reviewed_answer(card,decision)


def bank_snapshot(questions):
    return hashlib.sha256(compact(sorted((q['code'],q['active'],q['source_stamp']) for q in questions)).encode()).hexdigest()


def prepare(connection,review_path):
    review=load(review_path);review_hash=digest(review_path)
    package_path=(APP/review['sourcePackage']).resolve()
    if not package_path.is_relative_to((APP/'veri').resolve()):raise ValueError('Source package outside evidence directory')
    package=load(package_path)
    if review['packageSha256']!=digest(package_path) or review['sourceSha256']!=package['sourceSha256']:raise ValueError('Review/package source changed')
    sha=package['sourceSha256']
    if not re.fullmatch('[a-f0-9]{64}',sha):raise ValueError('Source hash required')
    previous=json_query(connection,"SELECT locator_key,evidence->>'acceptanceReviewSha256' review FROM learning_catalog.pdf_question_occurrences WHERE source_sha256="+literal(sha)+" AND evidence ? 'acceptanceReviewSha256'")
    if len(previous)==package['questionCount'] and all(r['review']==review_hash for r in previous):
        return {'alreadyAccepted':True,'sourceSha256':sha,'reviewSha256':review_hash}
    if previous:raise ValueError('Previously admitted source has another or partial review; explicit reconciliation required')
    source=(ROOT/'ogm-materyal'/package['sourceRelativePath']).resolve()
    if not source.is_relative_to(ROOT.resolve()) or digest(source)!=sha:raise ValueError('Source PDF bytes changed')
    if package.get('answerCheck')!='TWO_METHODS_AGREE':raise ValueError('Full printed-key check required for this adapter')
    cards=package['cards'];decisions={d['sourceCode']:d for d in review['items']}
    if len(cards)!=package['questionCount'] or len(cards)!=len(decisions) or len({c['code'] for c in cards})!=len(cards):raise ValueError('Incomplete source review')
    if sorted(c['printedNumber'] for c in cards)!=list(range(1,len(cards)+1)):raise ValueError('Printed source sequence is incomplete')
    observed=read_evidence_scan(sha,for_review=True)
    covered_pages={card['pdfPage'] for card in cards}
    for card in cards:
        page=observed['pages'][card['pdfPage']-1]
        if card['printedNumber'] not in [anchor['number'] for anchor in page['anchors']]:
            raise ValueError('Independent source question anchor is missing')
    if any(page['questionSignal'] and page['page'] not in covered_pages for page in observed['pages']):
        raise ValueError('Question-bearing source page has no reviewed cards')
    questions=json_query(connection,"SELECT code,active,exam_type,subject,topic,correct_answer,image,extract(epoch FROM updated_at)::text source_stamp FROM questions WHERE exam_type IN ('TYT','AYT') ORDER BY code")
    snapshot=bank_snapshot(questions);by_code={q['code']:q for q in questions}
    comparison_path=OUT/'text-duplicate-candidates.json';comparison=load(comparison_path)
    if comparison.get('bankSnapshotSha256')!=snapshot:raise ValueError('Compare candidates against the current bank first')
    image_ocr=load(OUT/'question-image-ocr-report.json')
    if image_ocr.get('failures'):raise ValueError('Bank image OCR is incomplete')
    compared={c['code']:c for c in comparison['candidates']}
    fingerprints={r['fingerprint']:r['question_code'] for r in json_query(connection,
        "SELECT f.question_code,f.fingerprint FROM learning_catalog.question_content_fingerprints f JOIN questions q ON q.code=f.question_code WHERE q.active AND q.exam_type IN ('TYT','AYT') AND f.algorithm IN ('NFC_CONTENT_SEQUENCE_V1','EXACT_IMAGE_BYTES_V1')")}
    image_root=APP/'veri/resimler-pilot';new=[];accepted=[]
    for card in cards:
        decision=decisions[card['code']];target=decision['canonicalCode'] if decision['decision']=='MATCH' else card['code']
        validate_card(card,decision,by_code.get(target))
        image=(package_path.parent/card['image']).resolve()
        if not image.is_relative_to(package_path.parent) or digest(image)!=card['imageSha256']:raise ValueError('Candidate image changed')
        with Image.open(image) as picture:
            picture.verify()
        if decision['decision']=='NEW':
            if target in by_code:raise ValueError('New question code already exists')
            duplicate=compared.get(card['code'])
            if not duplicate or not duplicate.get('textSha256') or duplicate['textChars']<30:raise ValueError('Bank-wide text comparison missing')
            if duplicate['matches'] and duplicate['matches'][0]['similarity']>.85:raise ValueError('High-similarity candidate needs an explicit canonical decision')
            for fingerprint in (card['imageSha256'],text_fingerprint(card['text'])):
                if fingerprint and fingerprint in fingerprints:raise ValueError('Exact existing-bank duplicate: '+fingerprints[fingerprint])
                if fingerprint:fingerprints[fingerprint]=target
            image_ref='pdf-intake/'+sha+'/'+card['code']+'.webp'
            row={'code':target,'exam':decision['exam'],'subject':decision['subject'],'subjectId':decision['subjectId'],
                 'topic':decision['topic'],'categoryIds':decision['categoryIds'],'image':image_ref,'answer':reviewed_answer(card,decision),
                 'source':source.name,'sourceImage':str(image),'sourceSha256':sha,'pdfPage':card['pdfPage']}
            new.append(row)
        proof={'acceptanceReviewSha256':review_hash,'origin':'REVIEWED_PDF_ACCEPTANCE','sourceCode':card['code'],
            'reference':review['sourcePackage']+'#code='+card['code'],
            'active':True,'bank':'OGM','exam':decision['exam'],
            'matchType':decision['matchType'],'sourceStamp':by_code.get(target,{}).get('source_stamp'),
            'sourcePdfRelativePath':source.relative_to(ROOT).as_posix(),'pdfPage':card['pdfPage'],
            'sourceFile':source.relative_to(ROOT).as_posix(),'page':card['pdfPage'],'topic':decision['topic'],
            'printedNumbers':[card['printedNumber']],'sourceText':card['text'],'imageSha256':card['imageSha256'],
            'answersA':[card['answerMethodA']],'answersB':[card['answerMethodB']],'sourceAnswer':card['answer'],
            'answerPermutation':decision.get('answerPermutation',{}),'teacherApproved':False,
            'comparisonSha256':digest(comparison_path),'bankSnapshotSha256':snapshot,'categoryIds':decision['categoryIds']}
        if decision.get('answerCorrection'):proof['answerCorrection']=decision['answerCorrection']
        accepted.append({'sourceCode':card['code'],'questionCode':target,'page':card['pdfPage'],
            'numbers':[card['printedNumber']],'decision':decision['decision'],'evidence':proof})
    page_count=int(query(connection,'SELECT page_count FROM learning_catalog.pdf_sources WHERE source_sha256='+literal(sha)))
    metadata=[{'kind':'QUESTION','code':q['code'],'exam':q['exam'],'subject':q['subject'],
        'topic':q['topic'],'categoryIds':q['categoryIds'],'bank':'OGM','active':True,'available':True,
        'image':q['image'],'source':q['source'],'pageCount':page_count,
        'locations':{category:[{'type':'QUESTION','questionCode':q['code']},
            {'type':'PDF','sourceKey':'pdf:'+str(min(package['sourceCatalogIds'])),
             'pdfPageStart':q['pdfPage'],'pdfPageEnd':q['pdfPage'],'pageCount':page_count}]
            for category in q['categoryIds']}} for q in new]
    result=subprocess.run(['node','scripts/resource-intake.mjs'],cwd=APP,input=compact(metadata),capture_output=True,text=True,encoding='utf-8')
    if result.returncode:raise ValueError('Shared learning-resource validation failed: '+result.stderr)
    resources=json.loads(result.stdout)['resources']
    current_run=query(connection,'SELECT run_key FROM learning_catalog.current_run')
    guard=query(connection,"SELECT md5(string_agg(code||':'||active::text||':'||extract(epoch FROM updated_at)::text,',' ORDER BY code)) FROM questions WHERE exam_type IN ('TYT','AYT')")
    value={'sourceSha256':sha,'reviewSha256':review_hash,'bankSnapshotSha256':snapshot,'bankGuard':guard,
        'previousRun':current_run,'run':'pdf-accept-'+review_hash[:16]+'-'+snapshot[:12],
        'newQuestions':new,'occurrences':accepted,'resources':resources,'teacherApproved':False}
    write_json(OUT/'acceptance'/sha/'prepared.json',value)
    return value


def add_blank_quarantine(connection,data):
    """Only the 3-way source audit can quarantine an empty question body."""
    if data.get('alreadyAccepted'):return
    if query(connection,"SELECT to_regclass('learning_catalog.question_source_issues') IS NOT NULL")!='t':
        raise ValueError('V88 is required before source quality quarantine')
    provider_path=OUT/'provider-recovery/blank-question-check.json'
    provider=load(provider_path);previews={r['code']:r for r in load(OUT/'empty-question-repair-preview.json')['records']}
    low={r['code']:r for r in load(OUT/'low-text-bank-images.json')}
    quarantine=[]
    for source in provider['records']:
        if not source['bodyMissing']:continue
        code=source['code']
        if not re.fullmatch(r'sb-\d+',code):raise ValueError('Invalid provider identity')
        rows=json_query(connection,"SELECT code,active,exam_type,image,correct_answer,extract(epoch FROM updated_at)::text stamp FROM questions WHERE code="+literal(code))
        if not rows or not rows[0]['active']:continue
        question=rows[0];preview=previews[code]
        if question['exam_type'] not in ('TYT','AYT') or source['answer']!=question['correct_answer']:raise ValueError('Source/body identity mismatch')
        if low[code]['text'].strip()!='A)\nB)\nC)\nD)\nE)':raise ValueError('Nonempty bank image cannot be quarantined by this adapter')
        if digest(APP/'veri/resimler-pilot'/question['image'])!=preview['oldImageSha256']:raise ValueError('Bank image changed')
        if digest(APP/preview['preview'])!=preview['previewSha256']:raise ValueError('Reviewed source crop changed')
        evidence={'reason':'SOURCE_QUESTION_BODY_MISSING','bankImageSha256':preview['oldImageSha256'],
            'maintenanceReviewSha256':data['reviewSha256'],
            'bankStampBefore':question['stamp'],'originalActive':True,'pdfSource':preview['source'],
            'pdfCropSha256':preview['previewSha256'],'providerUrl':source['sourceUrl'],'providerHtmlSha256':source['htmlSha256'],
            'providerCheckSha256':digest(provider_path),'reviewMethod':'BANK_IMAGE_PDF_CROP_AND_PROVIDER_BODY','teacherApproved':False}
        quarantine.append({'code':code,'imageSha256':preview['oldImageSha256'],'evidence':evidence})
    data['quarantines']=quarantine
    write_json(OUT/'acceptance'/data['sourceSha256']/'prepared.json',data)


def publish(connection,data,backup,image_root=None,evidence_dir=None):
    if data.get('alreadyAccepted'):return
    if not backup or not backup.is_file() or backup.stat().st_size<1000000:raise ValueError('A verified database backup is required')
    image_root=image_root or APP/'veri/resimler-pilot'
    for row in data['newQuestions']:
        source=Path(row['sourceImage']);target=image_root/row['image'];target.parent.mkdir(parents=True,exist_ok=True)
        expected=row.get('imageSha256') or next(o['evidence']['imageSha256'] for o in data['occurrences'] if o['questionCode']==row['code'] and o['decision']=='NEW')
        if digest(source)!=expected:raise ValueError('Staged image changed before publish')
        if target.exists() and digest(target)!=expected:raise ValueError('Existing intake image differs')
        if not target.exists():
            temp=target.with_suffix('.tmp');shutil.copyfile(source,temp);temp.replace(target)
    stream=io.StringIO();run=literal(data['run']);previous=literal(data['previousRun']);sha=literal(data['sourceSha256'])
    stream.write('BEGIN;\nSELECT pg_advisory_xact_lock(738452019);\nSELECT pg_advisory_xact_lock(738452020);\n')
    # The shared locks serialize catalog/registry writers. Lock bank edits for the
    # short validation + snapshot commit so an unrelated import cannot race it.
    stream.write('LOCK TABLE questions IN SHARE ROW EXCLUSIVE MODE;\n')
    stream.write("DO $guard$ BEGIN IF (SELECT run_key FROM learning_catalog.current_run) IS DISTINCT FROM "+previous+" OR (SELECT md5(string_agg(code||':'||active::text||':'||extract(epoch FROM updated_at)::text,',' ORDER BY code)) FROM questions WHERE exam_type IN ('TYT','AYT')) IS DISTINCT FROM "+literal(data['bankGuard'])+" THEN RAISE EXCEPTION 'Catalog or bank changed; prepare again'; END IF; END $guard$;\n")
    def incoming(name,rows):
        stream.write('CREATE TEMP TABLE '+name+' (data jsonb) ON COMMIT DROP;\nCOPY '+name+' FROM STDIN WITH (FORMAT csv);\n')
        writer=csv.writer(stream,lineterminator='\n')
        for row in rows:writer.writerow([compact(row)])
        stream.write('\\.\n')
    incoming('new_questions',data['newQuestions']);incoming('new_resources',data['resources']);incoming('accepted',data['occurrences'])
    incoming('quarantines',data.get('quarantines',[]))
    stream.write("""
INSERT INTO questions(code,exam_type,subject,topic,source,image,correct_answer,bank,active)
 SELECT data->>'code',data->>'exam',data->>'subject',data->>'topic',data->>'source',data->>'image',data->>'answer','OGM',true FROM new_questions;
UPDATE new_resources r SET data=jsonb_set(r.data,'{sourceUpdatedAt}',to_jsonb(extract(epoch FROM q.updated_at)::text),true)
 FROM questions q WHERE q.code=r.data->>'questionCode';
INSERT INTO learning_catalog.question_intake(question_code,source_stamp,resource,status)
 SELECT data->>'questionCode',data->>'sourceUpdatedAt',data,'PUBLISHED' FROM new_resources;
INSERT INTO learning_catalog.question_source_issues(question_code,issue_code,source_image_sha256,status,previous_active,evidence)
 SELECT data->>'code','SOURCE_QUESTION_BODY_MISSING',data->>'imageSha256','QUARANTINED',true,data->'evidence' FROM quarantines;
UPDATE questions q SET active=false,updated_at=now() FROM quarantines i
 WHERE q.code=i.data->>'code' AND q.exam_type IN ('TYT','AYT') AND q.active;
""")
    stream.write(f"INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES ({run},'REVIEWED_YKS_PDF_ACCEPTANCE',"+literal(compact({'sourceSha256':data['sourceSha256'],'newQuestions':len(data['newQuestions']),'reviewSha256':data['reviewSha256']}))+"::jsonb);\n")
    stream.write(f"""
INSERT INTO learning_catalog.source_audits SELECT {run},inventory_audit,curriculum_references FROM learning_catalog.source_audits WHERE run_key={previous};
INSERT INTO learning_catalog.categories SELECT {run},category_id,definition FROM learning_catalog.categories WHERE run_key={previous};
INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids)
 SELECT {run},item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids FROM learning_catalog.items WHERE run_key={previous};
INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids)
 SELECT {run},data->>'key','QUESTION',data->>'exam',data->>'subjectId',true,data,
 ARRAY(SELECT jsonb_array_elements_text(data->'categoryIds')),ARRAY(SELECT jsonb_array_elements_text(data->'subjectIds')),
 ARRAY(SELECT jsonb_array_elements_text(data->'examIds')) FROM new_resources;
UPDATE learning_catalog.items i SET data=jsonb_set(i.data,'{{automaticLabels,contentFormat}}','"KARMA"'::jsonb,true)
 FROM learning_catalog.pdf_sources s WHERE i.run_key={run} AND i.kind='PDF' AND i.exam IN ('TYT','AYT','TYT-AYT')
 AND i.data->>'canonicalAssetId'='sha256:'||s.source_sha256 AND s.content_format='KARMA';
UPDATE learning_catalog.items i SET student_visible=false,data=i.data||jsonb_build_object(
 'studentVisible',false,'availability','needs_repair','resourceRole','ARCHIVE_QUESTION',
 'sourceUpdatedAt',extract(epoch FROM q.updated_at)::text,
 'manualReview',jsonb_build_object('status','NEEDS_MANUAL_REVIEW','code','SOURCE_REPAIR','label','Kaynak soru içeriği eksik',
 'reason','Banka görseli, PDF kopyası ve sağlayıcı kaydında soru gövdesi yok.','pages','[]'::jsonb))
 FROM questions q JOIN quarantines x ON q.code=x.data->>'code'
 WHERE i.run_key={run} AND i.item_key='question:'||q.code;
INSERT INTO learning_catalog.assignments SELECT {run},item_key,category_id,relation FROM learning_catalog.assignments WHERE run_key={previous};
INSERT INTO learning_catalog.assignments SELECT {run},r.data->>'key',a->>'categoryId',a->>'relation'
 FROM new_resources r CROSS JOIN LATERAL jsonb_array_elements(r.data->'automaticLabels'->'assignments') a;
INSERT INTO learning_catalog.pdf_question_occurrences(source_sha256,locator_key,page_number,printed_numbers,question_code,status,evidence)
 SELECT coalesce(a.data->>'sourceSha256',{sha}),'raw:'||(a.data->>'sourceCode'),(a.data->>'page')::integer,
 ARRAY(SELECT jsonb_array_elements_text(a.data->'numbers'))::integer[],q.code,'LINKED',
 jsonb_set(a.data->'evidence','{{sourceStamp}}',to_jsonb(extract(epoch FROM q.updated_at)::text),true)
 FROM accepted a JOIN questions q ON q.code=a.data->>'questionCode'
 ON CONFLICT(source_sha256,locator_key) DO UPDATE SET question_code=excluded.question_code,status=excluded.status,evidence=excluded.evidence;
INSERT INTO learning_catalog.question_source_registry(question_code,source_kind,source_sha256,source_reference,source_stamp,evidence)
 SELECT q.code,'PDF',coalesce(a.data->>'sourceSha256',{sha}),'pdf:'||coalesce(a.data->>'sourceSha256',{sha})||':page:'||(a.data->>'page'),extract(epoch FROM q.updated_at)::text,a.data->'evidence'
 FROM accepted a JOIN questions q ON q.code=a.data->>'questionCode' WHERE a.data->>'decision'='NEW';
DO $check$ BEGIN
 IF (SELECT count(*) FROM learning_catalog.pdf_question_occurrences WHERE evidence->>'acceptanceReviewSha256'={literal(data['reviewSha256'])}) <> {len(data['occurrences'])}
 THEN RAISE EXCEPTION 'Incomplete source acceptance'; END IF;
 IF (SELECT count(*) FROM learning_catalog.items WHERE run_key={run})<>(SELECT count(*) FROM learning_catalog.items WHERE run_key={previous})+{len(data['newQuestions'])}
 THEN RAISE EXCEPTION 'Incomplete catalog snapshot'; END IF;
END $check$;
UPDATE learning_catalog.current_run SET run_key={run} WHERE singleton;
COMMIT;
""")
    sql=(evidence_dir or OUT/'acceptance'/data['sourceSha256'])/'publish.sql'
    sql.parent.mkdir(parents=True,exist_ok=True);sql.write_text(stream.getvalue(),encoding='utf-8')
    command,env,_=connection
    with sql.open('rb') as source:result=subprocess.run([*command,'--quiet'],stdin=source,capture_output=True,env=env)
    if result.returncode:raise RuntimeError(result.stderr.decode('utf-8',errors='replace')[-4000:])
    write_json(sql.parent/'applied.json',{'reviewSha256':data['reviewSha256'],'run':data['run'],
        'newQuestions':len(data['newQuestions']),'existingMatches':len(data['occurrences'])-len(data['newQuestions']),
        'quarantinedQuestions':len(data.get('quarantines',[])),'backup':str(backup.resolve())})


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--review',type=Path,default=OUT/'mini-test-04-content-review.json')
    parser.add_argument('--database',choices=['ivme','ivme_test'],default='ivme')
    parser.add_argument('--publish',action='store_true');parser.add_argument('--backup',type=Path)
    parser.add_argument('--quarantine-confirmed-empty',action='store_true')
    args=parser.parse_args();connection=db_connection(args.database);data=prepare(connection,args.review)
    if args.quarantine_confirmed_empty:add_blank_quarantine(connection,data)
    if args.publish:publish(connection,data,args.backup)
    print(compact({'alreadyAccepted':data.get('alreadyAccepted',False),'sourceSha256':data['sourceSha256'],
        'newQuestions':len(data.get('newQuestions',[])),'existingMatches':sum(o['decision']=='MATCH' for o in data.get('occurrences',[])),
        'quarantined':len(data.get('quarantines',[])),'published':args.publish}))
