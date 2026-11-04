"""Yurt dışı öğretmenlik çıkmış sorularını yerel PDF/Ollama hattıyla hazırla ve yayımla.

  python scripts/yurt-disi-sorular.py cikarim
  python scripts/yurt-disi-sorular.py siniflandir
  python scripts/yurt-disi-sorular.py yayinla --database ivme_test
  python scripts/yurt-disi-sorular.py envanter --database ivme

Kaynak arşivi salt okunurdur. PDF cevabı anahtardan alınır; model yalnız bölüm/konu adayı verir.
"""
import argparse
import hashlib
import json
import re
import shutil
import sys
from datetime import date
from pathlib import Path

import pymupdf

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
SOURCE = ROOT / 'Kaynaklar/yurt-disi/cikmis-sorular'
SCOPE = ROOT / 'Kaynaklar/yurt-disi/Konular/00_Resmi_Kapsam/MEB_2026_Ogretmen_Secme_Sinavi_Kilavuzu.pdf'
OUT = APP / 'veri/yurt-disi'
PREFIX = 'YD_MY'
EXAM = 'YURT_DISI_MY'
SECTIONS = [
    ('YD_TURKCE_KULTUR', 'Türkçe ve Türk Kültürü', 'Dil ve Anlam Bilgisi; Türk Edebiyatı; Türk ve Dünya edebiyatı; ortak kültürel miras; Türk kültürü.'),
    ('YD_TARIH_COGRAFYA', 'Tarih ve Coğrafya', 'Genel Türk tarihi; inkılap tarihi; Türkiye coğrafyası; Türk devletleri; bilim, sanat, medeniyet; düşünce tarihi.'),
    ('YD_EGITIM', 'Eğitim Bilimleri', 'Türk eğitim tarihi; öğretim ilke ve yöntemleri; öğrenme psikolojisi; kültürel diplomasi ve eğitim.'),
    ('YD_MEVZUAT_GENEL', 'Mevzuat ve Genel Kültür', '2003/5753; 657 sayılı DMK; 5682 Pasaport Kanunu; 1 sayılı Cumhurbaşkanlığı Kararnamesi MEB bölümü; uluslararası kuruluşlar; genel kültür.'),
]
ANSWER = re.compile(r'^\s*(?:\((\d{6})\)|([1-9]\d{0,2})\s*[.)])\s*([A-Ea-e]|İPT(?:AL)?)\s*$', re.I)
QUESTION = re.compile(r'^\s*(\d{1,3})\s*[.)](?:\s+\S.*)?$')
MODERN = re.compile(r'^\s*\(?\s*(\d{6})\s*\)?\s*$')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def lines(page):
    result = []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            text = ''.join(span['text'] for span in line['spans']).strip()
            if text:
                result.append((line['bbox'], text))
    return result


def key_answers(doc):
    answers = {}
    for page_no, page in enumerate(doc):
        for _, text in lines(page):
            m = ANSWER.fullmatch(text)
            if m:
                key = m.group(1) or m.group(2)
                value = m.group(3).upper()
                answers[key] = None if value.startswith('İPT') else value
    return answers


def question_pages(doc):
    pages = []
    for page_no, page in enumerate(doc):
        upper = page.get_text().upper()
        if 'CEVAP ANAHTARI' in upper or 'ADAYLARIN DİKKATİNE' in upper:
            continue
        found = []
        for bbox, text in lines(page):
            m = QUESTION.fullmatch(text) or MODERN.fullmatch(text)
            if m:
                n = int(m.group(1))
                # Page number, running heads and answer-key pages are not questions.
                if (m.re is QUESTION and 1 <= n <= 120) or (m.re is MODERN and 100000 <= n <= 999999):
                    found.append((n, bbox))
        if found:
            # Multi-column booklets: order anchors by reading column, then vertical position.
            width = page.rect.width
            found.sort(key=lambda item: (0 if item[1][0] < width * .50 else 1, item[1][1]))
            unique = []
            seen = set()
            for item in found:
                if item[0] not in seen:
                    unique.append(item)
                    seen.add(item[0])
            pages.append((page_no, unique))
    return pages


def extract_file(pdf):
    doc = pymupdf.open(pdf)
    answers = key_answers(doc)
    pages = question_pages(doc)
    if any(n >= 100000 for _, values in pages for n, _ in values):
        valid_ids = set(answers)
        pages = [(page_no, [(n, box) for n, box in values if str(n) in valid_ids])
                 for page_no, values in pages]
        pages = [(page_no, values) for page_no, values in pages if values]
    # Preserve the page layout while dropping repeated running text and continuation anchors.
    seen_numbers = set()
    deduped = []
    for page_no, values in pages:
        kept = []
        for item in values:
            if item[0] not in seen_numbers:
                kept.append(item)
                seen_numbers.add(item[0])
        deduped.append((page_no, kept))
    pages = deduped
    anchors = [(page_no, n, bbox) for page_no, values in pages for n, bbox in values]
    modern = any(n >= 100000 for _, n, _ in anchors)
    # Modern e-exam IDs are randomized identifiers. The answer-key ID order maps to booklet order.
    if modern:
        ids = sorted({n for _, n, _ in anchors})
        keys = sorted(answers, key=lambda x: int(x))
        answer_by_question = {i + 1: answers.get(key) for i, key in enumerate(keys)}
    else:
        answer_by_question = {int(key): value for key, value in answers.items()}
    results = []
    booklet_number = 0
    for page_no, values in pages:
        page = doc[page_no]
        width = page.rect.width
        for index, (number, bbox) in enumerate(values):
            left = bbox[0] < width * .50
            same_column = [item for item in values[index + 1:] if (item[1][0] < width * .50) == left]
            bottom = same_column[0][1][1] - 2 if same_column else page.rect.height - 24
            top = max(0, bbox[1] - 8)
            x0, x1 = (0, width * .51) if left else (width * .49, width)
            rect = pymupdf.Rect(x0, top, x1, max(top + 20, bottom))
            booklet_number += 1
            code_no = number if not modern else booklet_number
            key = str(number)
            answer = answer_by_question.get(code_no)
            if answer is None and key in answers:
                answer = answers[key]
            source_id = hashlib.sha256(pdf.name.encode('utf-8')).hexdigest()[:8].upper()
            code = f'{PREFIX}_{source_id}_{code_no:03d}'
            pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=rect, alpha=False)
            image = f'{code}.png'
            (OUT / 'gorsel').mkdir(parents=True, exist_ok=True)
            pix.save(OUT / 'gorsel' / image)
            text = page.get_text(clip=rect).strip()
            results.append({'code': code, 'examType': EXAM, 'exam': pdf.stem[:4],
                'booklet': 'A' if re.search(r'[_-]A(?:_|\.)', pdf.stem) else ('B' if re.search(r'[_-]B(?:_|\.)', pdf.stem) else 'ESINAV'),
                'number': code_no, 'pdfNumber': number, 'answer': answer, 'subjectId': '', 'subject': '', 'topicId': '',
                'topic': '', 'confidence': 'UNREVIEWED', 'source': pdf.name, 'page': page_no + 1,
                'image': image, 'text': text, 'sourceSha256': sha(pdf.read_bytes()),
                'active': answer is not None and answer in 'ABCDE' and bool(text)})
    return results, len(answers), len(anchors)


def extract():
    OUT.mkdir(parents=True, exist_ok=True)
    questions, files = [], []
    for pdf in sorted(SOURCE.glob('*.pdf')):
        rows, answer_count, anchor_count = extract_file(pdf)
        questions.extend(rows)
        found_numbers = {q['number'] for q in rows}
        files.append({'file': pdf.name, 'sha256': sha(pdf.read_bytes()), 'questions': len(rows),
                      'answers': answer_count, 'anchors': anchor_count,
                      'missingQuestionNumbers': sorted(set(range(1, answer_count + 1)) - found_numbers),
                      'unanswered': [q['number'] for q in rows if q['answer'] is None]})
    payload = {'exam': EXAM, 'sourceFolder': str(SOURCE), 'scopePdf': str(SCOPE),
               'sections': [{'id': i, 'name': n, 'reference': r} for i, n, r in SECTIONS],
               'questions': questions, 'files': files}
    (OUT / 'sorular.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'pdf': len(files), 'questions': len(questions), 'active': sum(q['active'] for q in questions),
                      'unanswered': sum(q['answer'] is None for q in questions), 'output': str(OUT / 'sorular.json')}, ensure_ascii=False))


def classify():
    """Official section order assigns broad categories without spending model tokens."""
    payload = json.loads((OUT / 'sorular.json').read_text(encoding='utf-8'))
    file_counts = {f['file']: f['answers'] for f in payload['files']}
    for q in payload['questions']:
        count = file_counts.get(q['source'], 100)
        if count >= 90:
            bounds = [25, 50, 75, count]
        else:
            bounds = [round(count * .30), round(count * .60), round(count * .80), count]
        index = next((i for i, edge in enumerate(bounds) if q['number'] <= edge), 3)
        ident, name, _ = SECTIONS[index]
        q.update(subjectId=ident, subject=name, topicId=ident, topic=name,
                 confidence='HIGH', classificationMethod='OFFICIAL_BOOKLET_ORDER')
    (OUT / 'sorular.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'tagged':len(payload['questions']),'total':len(payload['questions']),
                      'method':'Resmî MEB kapsamı + kitapçık sırası; Ollama çağrısı yok'},ensure_ascii=False))


def classify_ollama():
    """Optional, slower content-level suggestions from the local Ollama model."""
    sys.path.insert(0, str(APP / 'scripts'))
    import importlib.util
    spec = importlib.util.spec_from_file_location('ollama_sor', APP / 'scripts/ollama-sor.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    path = OUT / 'sorular.json'
    payload = json.loads(path.read_text(encoding='utf-8'))
    cache_path = OUT / 'ollama-oneri.json'
    cached = json.loads(cache_path.read_text(encoding='utf-8')) if cache_path.exists() else {}
    labels = {s[0]: s[1] for s in SECTIONS}
    pending = [q for q in payload['questions'] if q['code'] not in cached and q['text']]
    schema = {'type':'object','properties':{'items':{'type':'array','items':{'type':'object','properties':{
        'code':{'type':'string'},'group':{'type':'string','enum':list(labels)}},'required':['code','group']}}},
        'required':['items']}
    def label_batch(batch):
        # Keep the prompt inside the local 4k-context model: short stem excerpts and tiny JSON output.
        samples = [{'code': q['code'], 'text': q['text'][:150]} for q in batch]
        prompt = ('Her soruyu MEB 2026 kılavuzundaki yazılı sınav kapsamına göre sınıflandır. '
                  'Yalnız verilen group kimliklerinden seç. Cevapta her soru için sadece code ve group alanlarını ver. '
                  'JSON nesnesi biçimi: {items:[{code,group}]}. '
                  'Gruplar: ' + json.dumps(labels, ensure_ascii=False) + '\nSorular: ' + json.dumps(samples, ensure_ascii=False))
        try:
            result, _ = module.ask(prompt, schema=schema, max_output_tokens=2048)
        except (json.JSONDecodeError, ValueError):
            if len(batch) == 1:
                return
            middle = len(batch) // 2
            label_batch(batch[:middle])
            label_batch(batch[middle:])
            return
        for item in result.get('items', []) if isinstance(result, dict) else []:
            if item.get('code') in {q['code'] for q in batch} and item.get('group') in labels:
                item.setdefault('topic', labels[item['group']])
                item.setdefault('confidence', 'low')
                cached[item['code']] = item
        cache_path.write_text(json.dumps(cached, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        missing = [q for q in batch if q['code'] not in cached]
        if missing and len(batch) > 1:
            middle = len(missing) // 2
            label_batch(missing[:middle])
            label_batch(missing[middle:])
    for offset in range(0, len(pending), 40):
        label_batch(pending[offset:offset + 40])
    for q in payload['questions']:
        result = cached.get(q['code'])
        if result and result.get('group') in labels:
            q['subjectId'] = result['group']
            q['subject'] = labels[result['group']]
            q['topicId'] = result['group']
            q['topic'] = str(result.get('topic') or labels[result['group']])[:160]
            q['confidence'] = str(result.get('confidence') or 'low').upper()
            q['classificationMethod'] = 'OLLAMA_CONTENT_CANDIDATE'
    cache_path.write_text(json.dumps(cached, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'tagged': sum(bool(q['topicId']) for q in payload['questions']),
                      'total': len(payload['questions']), 'cache': str(cache_path)}, ensure_ascii=False))


def publish(database):
    from kaynakli_arastirma_db import db_connection, query

    payload = json.loads((OUT / 'sorular.json').read_text(encoding='utf-8'))
    if any(not q['topicId'] for q in payload['questions']):
        raise ValueError('Önce siniflandir çalıştırılmalı; her soru resmî kapsamdaki bir konuya bağlanmalı.')
    valid = [q for q in payload['questions'] if q['answer'] and q['answer'] in 'ABCDE']
    if len({q['code'] for q in valid}) != len(valid):
        raise ValueError('PDF çıkarımında yinelenen soru kimliği var; yayın durduruldu.')
    connection = db_connection(database)
    image_root = APP / 'veri/resimler-pilot/yurt-disi'
    image_root.mkdir(parents=True, exist_ok=True)
    for q in valid:
        source = OUT / 'gorsel' / q['image']
        if not source.is_file() or source.stat().st_size < 800:
            raise ValueError(f"Soru görseli eksik veya boş: {q['code']}")
        target = image_root / q['image']
        if not target.is_file() or sha(target.read_bytes()) != sha(source.read_bytes()):
            shutil.copyfile(source, target)
    qrows = [dict(code=q['code'], exam_type=EXAM, subject=q['subject'], topic=q['topic'], exam_year=int(q['exam']),
                  source=f"Yurt Dışı Öğretmenlik {q['exam']} {q['booklet']} · {q['source']}",
                  image=f"yurt-disi/{q['image']}", correct_answer=q['answer'], choice_count=4, active=q['active']) for q in valid]
    quoted = lambda value: "'" + str(value).replace("'", "''") + "'"
    sql = f"""
BEGIN;
CREATE TEMP TABLE yd_in ON COMMIT DROP AS SELECT * FROM jsonb_to_recordset({quoted(json.dumps(qrows,ensure_ascii=False))}::jsonb)
 AS x(code text,exam_type text,subject text,topic text,exam_year int,source text,image text,correct_answer text,choice_count int,active boolean);
INSERT INTO questions(code,bank,exam_type,subject,topic,exam_year,source,image,correct_answer,choice_count,active,created_at,updated_at)
 SELECT code,'CIKMIS',exam_type,subject,topic,exam_year,source,image,correct_answer,choice_count,active,now(),now() FROM yd_in
 ON CONFLICT(code) DO UPDATE SET bank='CIKMIS',exam_type=excluded.exam_type,subject=excluded.subject,topic=excluded.topic,
 exam_year=excluded.exam_year,source=excluded.source,image=excluded.image,correct_answer=excluded.correct_answer,
 choice_count=excluded.choice_count,active=excluded.active,updated_at=now()
 WHERE (questions.bank,questions.exam_type,questions.subject,questions.topic,questions.exam_year,questions.source,
 questions.image,questions.correct_answer,questions.choice_count,questions.active)
 IS DISTINCT FROM ('CIKMIS',excluded.exam_type,excluded.subject,excluded.topic,excluded.exam_year,excluded.source,
 excluded.image,excluded.correct_answer,excluded.choice_count,excluded.active);
CREATE TEMP TABLE yd_meta ON COMMIT DROP AS SELECT json_build_object('current',(SELECT run_key FROM learning_catalog.current_run),
 'stamps',(SELECT coalesce(json_object_agg(code,extract(epoch from updated_at)::text),'{{}}') FROM questions WHERE code LIKE '{PREFIX}_%')) AS v;
"""
    # Prefix every question label with only the four kılavuz-derived course identities.
    category_json = []
    category_by_id = {}
    for order, (ident, name, reference) in enumerate(SECTIONS, 1):
        category = {'id': ident, 'exam': EXAM, 'subjectId': ident, 'subject': name, 'sourceSubject': name,
            'unit': name, 'unitId': ident, 'unitNumber': order, 'topic': name, 'subtopic': '',
            'origin': 'CURRICULUM', 'curriculumSource': 'MEB_2026_REFERENCE', 'selectable': True,
            'canonicalUnit': True, 'canonicalTopic': True, 'order': order, 'topicNumber': order,
            'grade': None, 'gradeLabel': '', 'estimatedGrades': [], 'aliases': [], 'matchingPatterns': [],
            'track': 'YURT_DISI_OGRETMEN', 'curriculumReference': {'file': str(SCOPE.relative_to(ROOT)).replace('\\','/'),
            'sha256': sha(SCOPE.read_bytes()), 'kind': 'CURRICULUM_REFERENCE', 'basis': reference}}
        category_json.append(category)
        category_by_id[ident] = category
    item_json = []
    for q in valid:
        cat = category_by_id[q['topicId']]
        source_version = sha(json.dumps([q['code'], q['sourceSha256'], q['page'], q['answer'], q['topicId'], q['topic']], ensure_ascii=False).encode())
        assignment = {'review': {'status': 'PENDING', 'reviewer': None, 'reviewedAt': None,
                    'sourceVersion': source_version, 'categoryFingerprint': sha(json.dumps(cat,ensure_ascii=False).encode())},
            'evidence': [{'type':'CONTENT_READ','text':q['topic'],'method':'LOCAL_OLLAMA_CANDIDATE',
                          'reference':f"{q['source']}#page={q['page']}",'association':'RELATION',
                          'readability':'NOT_MEASURED','sourceVersion':source_version}],
            'locators':[{'type':'QUESTION','questionCode':q['code'],'questionNumbers':[q['number']]}],
            'relation':'PRIMARY','categoryId':q['topicId'],'confidence':'MEDIUM' if q['confidence']=='HIGH' else 'LOW',
            'relationKey':'relation:'+sha((q['code']+'|'+q['topicId']).encode())[:24], 'scopeStatus':'CANDIDATE',
            'locatorReason':'PDF sayfası ve özgün soru numarası.', 'locatorStatus':'VERIFIED',
            'sourceVersion':source_version,'confidenceReason':'Resmî kapsam ve kitapçık sırası; öğretmen onayı değildir.'}
        data = {'key':'question:'+q['code'],'url':'/soru/'+q['code'],'bank':'CIKMIS','exam':EXAM,'kind':'QUESTION',
            'title':q['code'],'displayTitle':f"{q['exam']} · {q['subject']} · Soru {q['number']}",'topic':q['topic'],
            'examIds':[EXAM],'subject':q['subject'],'subjectId':q['subjectId'],'subjectIds':[q['subjectId']],
            'categoryIds':[q['topicId']],'searchText':f"{q['code']} {q['exam']} {q['subject']} {q['topic']}".lower(),
            'sourceImage':{'reference':f"yurt-disi/{q['image']}",'originalReference':f"{q['source']}#page={q['page']}",
                           'status':'PRESERVED_REFERENCE','reason':'Özgün PDF sayfasından PyMuPDF kırpımı.'},
            'sourceLabel':'CIKMIS','sourceTopic':q['topic'],'availability':'available' if q['active'] else 'source_only',
            'questionCode':q['code'],'resourceRole':'ACTIVE_QUESTION' if q['active'] else 'ARCHIVE_QUESTION',
            'originalTitle':q['code'],'sourceVersion':source_version,'taxonomyVersion':'yurt-disi-v1',
            'contractVersion':2,'sourceRecordRef':'veri/yurt-disi/sorular.json#'+q['code'],
            'sourceUpdatedAt':'__STAMP__','studentVisible':bool(q['active']),
            'automaticLabels':{'basis':'CONTENT_READ','grades':[],'skills':[],'difficulty':'BELIRLENMEDI',
                'provenance':'OFFICIAL_BOOKLET_ORDER','evidence':[{'type':'CONTENT_READ','text':q['topic'],
                'reference':f"{q['source']}#page={q['page']}"}], 'gradeStatus':'NOT_APPLICABLE','gradeReason':'Yetişkin sınavı.',
                'sourceMethod':q.get('classificationMethod','OFFICIAL_BOOKLET_ORDER').lower(),
                'contentFormat':'SORU','reviewReasons':['TOPIC_APPROVAL_REQUIRED'],
                'reviewRequired':True,'inputFingerprint':source_version,'assignments':[assignment]}}
        item_json.append({'code':q['code'],'data':data})
    SQL_META = json.dumps({'categories':category_json,'items':item_json},ensure_ascii=False)
    sql += f"""
CREATE TEMP TABLE yd_payload ON COMMIT DROP AS SELECT * FROM jsonb_to_record({quoted(SQL_META)}::jsonb) AS x(categories jsonb,items jsonb);
CREATE TEMP TABLE yd_run ON COMMIT DROP AS SELECT 'labels-v1-'||substr(md5((SELECT v::text FROM yd_meta)||{quoted(sha(SQL_META.encode()))}),1,24) AS run_key;
INSERT INTO learning_catalog.runs(run_key,method,summary)
 SELECT run_key,'YURT_DISI_INCREMENTAL',jsonb_build_object('track','YURT_DISI_OGRETMEN','questions',{len(valid)},'source',
 'PyMuPDF + MEB resmî kapsam/bölüm sırası; öğretmen onayı değildir.') FROM yd_run ON CONFLICT DO NOTHING;
INSERT INTO learning_catalog.categories SELECT (SELECT run_key FROM yd_run),category_id,definition
 FROM learning_catalog.current_categories ON CONFLICT DO NOTHING;
INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids)
 SELECT (SELECT run_key FROM yd_run),item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids
 FROM learning_catalog.current_items ON CONFLICT DO NOTHING;
INSERT INTO learning_catalog.assignments SELECT (SELECT run_key FROM yd_run),item_key,category_id,relation
 FROM learning_catalog.current_assignments ON CONFLICT DO NOTHING;
INSERT INTO learning_catalog.categories(run_key,category_id,definition)
 SELECT (SELECT run_key FROM yd_run),c->>'id',c FROM yd_payload CROSS JOIN LATERAL jsonb_array_elements(categories) c ON CONFLICT DO NOTHING;
CREATE TEMP TABLE yd_items ON COMMIT DROP AS
 SELECT x.code,x.data || jsonb_build_object('sourceUpdatedAt',extract(epoch from q.updated_at)::text) AS data
 FROM yd_payload p CROSS JOIN LATERAL jsonb_array_elements(p.items) xj
 CROSS JOIN LATERAL jsonb_to_record(xj) AS x(code text,data jsonb) JOIN questions q ON q.code=x.code;
INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids)
 SELECT (SELECT run_key FROM yd_run),data->>'key','QUESTION',data->>'exam',data->>'subjectId',(data->>'studentVisible')::boolean,
 data,ARRAY(SELECT jsonb_array_elements_text(data->'categoryIds')),ARRAY(SELECT jsonb_array_elements_text(data->'subjectIds')),
 ARRAY(SELECT jsonb_array_elements_text(data->'examIds')) FROM yd_items ON CONFLICT DO NOTHING;
INSERT INTO learning_catalog.assignments SELECT (SELECT run_key FROM yd_run),data->>'key',a->>'categoryId',a->>'relation'
 FROM yd_items CROSS JOIN LATERAL jsonb_array_elements(data->'automaticLabels'->'assignments') a ON CONFLICT DO NOTHING;
INSERT INTO learning_catalog.source_audits(run_key,inventory_audit,curriculum_references)
 SELECT run_key,jsonb_build_object('type','YURT_DISI_TRACK_ADDITION','questions',{len(valid)},'sourcePreserved',true),
 jsonb_build_array(jsonb_build_object('source',{quoted(str(SCOPE.relative_to(ROOT)).replace('\\','/'))},'sha256',{quoted(sha(SCOPE.read_bytes()))})) FROM yd_run
 ON CONFLICT(run_key) DO NOTHING;
INSERT INTO learning_catalog.current_run(singleton,run_key) SELECT true,run_key FROM yd_run
 ON CONFLICT(singleton) DO UPDATE SET run_key=excluded.run_key;
UPDATE exam_tracks SET status='ACTIVE',note='Çıkmış sorular seçili sınavda soru bankası ve pratikte kullanılabilir.'
 WHERE id='YURT_DISI_OGRETMEN';
SELECT json_build_object('track','YURT_DISI_OGRETMEN','inserted',(SELECT count(*) FROM yd_items),'run',(SELECT run_key FROM yd_run));
COMMIT;
"""
    print(query(connection, sql).splitlines()[-1])


def inventory(database):
    """Read-only PDF archive scan; write only this track's inventory rows."""
    from kaynakli_arastirma_db import db_connection, query
    connection = db_connection(database)
    payload = json.loads((OUT / 'sorular.json').read_text(encoding='utf-8'))
    active = set(json.loads(query(connection,
        "SELECT coalesce(json_agg(code),'[]') FROM questions WHERE exam_type='YURT_DISI_MY' AND active")))
    files = {f['file']: f for f in payload['files']}
    folder = ROOT / 'Kaynaklar/yurt-disi'
    documents = []
    for pdf in sorted(folder.rglob('*.pdf')):
        relative = pdf.relative_to(folder).as_posix()
        record = files.get(pdf.name) if relative.startswith('cikmis-sorular/') else None
        rows = [q for q in payload['questions'] if record and q['source'] == pdf.name]
        with pymupdf.open(pdf) as doc:
            pages = len(doc)
        expected = record['answers'] if record else None
        missing = record.get('missingQuestionNumbers', []) if record else []
        unanswered = record.get('unanswered', []) if record else []
        published = sum(q['code'] in active for q in rows)
        note = (f'{len(rows)} soru çıkarıldı; {published} cevaplı soru pratikte.'
                + (f' {len(missing)} soru numarası çıkarımda bulunamadı.' if missing else '')
                + (f' {len(unanswered)} iptal veya geçerli cevabı okunamayan soru yayımlanmadı.' if unanswered else '')) if record else (
                'Resmî yazılı sınav kapsamı referansı; soru kitabı değildir.' if '00_Resmi_Kapsam/' in relative
                else 'Konu / yardımcı kaynak. Bu dosyadan henüz soru aktarılmadı.')
        documents.append(dict(path=relative, sha256=sha(pdf.read_bytes()), role='SORU_KITAPCIGI' if record else 'YARDIMCI',
            status='ISLENDI' if record or '00_Resmi_Kapsam/' in relative else 'ISLENMEDI',
            exam_years=[int(pdf.name[:4])] if record else [], question_count=len(rows), active_count=published,
            page_count=pages, expected_count=expected, missing_numbers=missing, unanswered_numbers=unanswered, note=note))
    literal = "'" + json.dumps(documents, ensure_ascii=False).replace("'", "''") + "'"
    query(connection, f"""BEGIN;
        INSERT INTO exam_source_documents(track_id,path,sha256,role,status,exam_years,question_count,active_count,
            page_count,expected_count,missing_numbers,unanswered_numbers,note,catalog_run_key)
        SELECT 'YURT_DISI_OGRETMEN',path,sha256,role,status,exam_years,question_count,active_count,
            page_count,expected_count,missing_numbers,unanswered_numbers,note,(SELECT run_key FROM learning_catalog.current_run)
        FROM jsonb_to_recordset({literal}::jsonb) AS x(path text,sha256 text,role text,status text,exam_years int[],
            question_count int,active_count int,page_count int,expected_count int,missing_numbers int[],unanswered_numbers int[],note text)
        ON CONFLICT(track_id,path) DO UPDATE SET sha256=excluded.sha256,role=excluded.role,status=excluded.status,
            exam_years=excluded.exam_years,question_count=excluded.question_count,active_count=excluded.active_count,
            page_count=excluded.page_count,expected_count=excluded.expected_count,missing_numbers=excluded.missing_numbers,
            unanswered_numbers=excluded.unanswered_numbers,note=excluded.note,catalog_run_key=excluded.catalog_run_key;
        COMMIT;""")
    report = dict(database=database, pdfs=len(documents), questionPdfs=sum(d['role']=='SORU_KITAPCIGI' for d in documents),
                  active=sum(d['active_count'] for d in documents), documents=documents)
    (OUT / 'envanter-raporu.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='documents'}, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('cikarim')
    sub.add_parser('siniflandir', help='MEB bölüm/soru sırası ile hızlı ve tokensız kategorileme')
    sub.add_parser('siniflandir-ollama', help='Yerel Ollama ile içerik bazlı konu önerisi')
    publish_parser = sub.add_parser('yayinla')
    publish_parser.add_argument('--database', choices=['ivme', 'ivme_test'], required=True)
    inventory_parser = sub.add_parser('envanter', help='Yurt dışı PDF envanterini DB’ye kaydet; soruları yeniden üretmez')
    inventory_parser.add_argument('--database', choices=['ivme', 'ivme_test'], required=True)
    args = parser.parse_args()
    if args.command == 'cikarim':
        extract()
    elif args.command == 'siniflandir':
        classify()
    elif args.command == 'siniflandir-ollama':
        classify_ollama()
    elif args.command == 'envanter':
        inventory(args.database)
    else:
        publish(args.database)


if __name__ == '__main__':
    main()
