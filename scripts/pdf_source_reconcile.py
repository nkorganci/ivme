"""Reconcile YKS source occurrences against live questions, without creating questions.

The database is the runtime authority. JSON files here are reproducible evidence
and resumable work files. --publish writes the source registry and refined PDF
format/catalog projections, not learners, answers, teacher decisions or the bank.
"""
import argparse
import base64
from collections import Counter, defaultdict
import csv
import hashlib
import json
from pathlib import Path
import re
import subprocess
import unicodedata

from kaynakli_arastirma_db import db_connection, query
from pdf_source_scan import OUT, ROOT, VERSION, read_scan, read_evidence_scan, write_json,digest
from pdf_sb_evidence import source_parts, printed_positions, printed_answers, text_coverage

APP = Path(__file__).resolve().parents[1]
PIPELINE = APP.parent / 'veri-hatti/ogm-sorular/kayit'

# Explicit source reading: the poster explains right triangles, Pythagoras and
# Euclid, followed by six geometry questions. The current controlled catalog
# already identifies Geometri; the old inventory projection said Matematik.
SOURCE_METADATA_READINGS={
    'cadf0334b87754db2d3a95c328864ae2d477fc33c97ee4c6545b02a62fbb6acc':{
        'subjectId':'geometri','subject':'Geometri','page':1,
        'nativeTextSha256':'479b1d8b0f9d4b1b70459c2acfbf356358ae2f2938799df3351f4e13474b545f',
        'sourceReading':'Üçgenler başlığı, özel dik üçgenler, Pisagor ve Öklid teoremleri ile altı üçgen sorusu okundu. Dersin kontrollü karşılığı Geometridir; eski envanterin Matematik projeksiyonu düzeltilir.',
        'teacherApproved':False}}


def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def normalized(text):
    # Preserve mathematical signs and digits; this is not a semantic duplicate key.
    text = unicodedata.normalize('NFC', text).replace('\u00ad', '')
    return re.sub(r'\s+', ' ', text).strip()


def text_fingerprint(text):
    text = re.sub(r'^\s*(?:Soru\s+\d+\s*:?\s*|\d{1,3}\s*[.)]\s*)', '', text, count=1, flags=re.I)
    value = normalized(text)
    if len(value) < 80: return None
    # PDF line wrapping may split words. Keep every non-whitespace character,
    # numeric token boundary, single-letter variable and case independently.
    # Thus "1 2" != "12", "x²" != "x2", and "a" != "A".
    content = [re.sub(r'\s+','',value),re.findall(r'\d+(?:[.,]\d+)?',value),
               re.findall(r'(?<!\w)[^\W\d_](?!\w)',value)]
    return hashlib.sha256(json.dumps(content,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()


def prose_fingerprint(text):
    """Only for long, complete history/philosophy MC texts with no visual cue.

    This does not remove negation, qualifiers, dates, option text or operators.
    The optional stem connector and typographic case/quotes do not change the
    question. Formula/diagram questions remain outside this matching gate.
    """
    if re.search(r'şekil|tablo|grafik|harita|görsel|resim|devre|diyagram|[=<>≤≥±√∧∨→↔¬]',text,re.I):return None
    if sorted(set(re.findall(r'(?:^|\s)([A-E])\s*\)',text)))!=list('ABCDE'):return None
    text=re.sub(r'^\s*(?:Soru\s+\d+\s*:?\s*|\d{1,3}\s*[.)]\s*)','',text,count=1,flags=re.I)
    text=re.sub(r'(?m)^\s*Buna göre,?\s+','',text)
    text=re.sub(r'([A-Za-zÇĞİÖŞÜçğıöşü]{3,})-\s*\n\s*([A-Za-zÇĞİÖŞÜçğıöşü]{3,})',r'\1\2',text)
    original=normalized(text)
    value=original.casefold().translate(str.maketrans({'“':'"','”':'"','‘':"'",'’':"'"}))
    if len(value)<180:return None
    content=[re.sub(r'\s+','',value),re.findall(r'\d+(?:[.,]\d+)?',value),
             re.findall(r'(?<!\w)[^\W\d_](?!\w)',original)]
    return hashlib.sha256(json.dumps(content,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()


def excluded_exam(text):
    match=re.search(r'(?m)^\s*(?:19|20)\d{2}\s*[-–]\s*(MS[ÜU]|KPSS|DGS|ALES|LGS|TEOG)\b',text,re.I)
    return match[1].upper() if match else None


def canonical(path):
    value = str(path or '').replace('\\', '/').casefold()
    for prefix in ('kaynaklar/', 'ogm-materyal/'):
        if value.startswith(prefix):
            value = value[len(prefix):]
    return value


def json_query(connection, sql):
    return json.loads(query(connection, f"SELECT coalesce(json_agg(x),'[]') FROM ({sql}) x"))


def database_page(page):
    if '\x00' not in page['text']:
        return page
    return {**page, 'text': page['text'].replace('\x00', '\ufffd'),
            'originalTextUtf8Base64': base64.b64encode(page['text'].encode()).decode('ascii'),
            'requiresVisualReview': True}


def source_format(category, observations, linked, path):
    header='\n'.join(p['text'] for p in observations['pages'][:5])
    if '/Rehberlik/' in path and re.search(r'rehber',header,re.I):
        return 'CALISMA_REHBERI'
    lesson=category in ('Sunu','Konu özeti','Konu anlatımı')
    questions=bool(linked) or any(len(p['options'])>=4 for p in observations['pages'])
    if lesson:questions=questions or any(p['questionSignal'] for p in observations['pages'])
    return 'KARMA' if lesson and questions else 'KONU_ANLATIMI' if lesson else 'TEST' if questions else 'UNREVIEWED'


def header_orphans(profile, observations):
    headings = [normalized(str(value)).casefold() for record in profile['records']
                for value in (record.get('konu_basligi'),record.get('test')) if value]
    results=[]
    for orphan in profile['summary'].get('yetim',[]):
        if len(orphan)<4 or not 0<=orphan[0]<len(observations['pages']):return False
        text=re.sub(r'\s*[-–]\s*[AB]$','',orphan[2]).strip()
        term=normalized(text).casefold()
        page=observations['pages'][orphan[0]]
        rectangles=orphan[3]
        top=bool(rectangles) and all(r[3]<=page['height']*.13 and r[3]-r[1]<30 for r in rectangles)
        heading=not term or len(term)>=4 and any(term in h for h in headings) or term=='cevap anahtarı'
        disposition='REPEATED_SOURCE_HEADING'
        caption=re.fullmatch(r'(?:ÖSYM\s+)?(?:(?:TYT|AYT|YGS|LYS\d?|ÖSS|ÖYS)(?:\s+(?:19|20)\d{2})?|(?:19|20)\d{2}\s+(?:TYT|AYT|YGS|LYS\d?|ÖSS|ÖYS))(?:\s+(?:PSİKOLOJİ|MANTIK|SOSYOLOJİ|TARİH))?',text,re.I)
        if caption and bool(rectangles) and all(r[3]<=page['height']*.17 and r[3]-r[1]<30 for r in rectangles):
            top=heading=True;disposition='PRINTED_EXAM_CAPTION'
        # The numbered test instructions are not questions. Restrict this to
        # the printed header, with the independent answer-sheet instruction.
        if re.match(r'^1\.\s*Bu testte\s+(?:sırasıyla\b|Matematik alanına ait toplam \d+ soru vardır\.)',text,re.I) and bool(rectangles) and all(r[3]<=page['height']*.2 for r in rectangles):
            header=' '.join(line['text'] for line in page.get('evidenceLines',[])
                            if line['bbox'][3]<=page['height']*.2)
            if not header:header=page['text'][:1500]
            if re.search(r'2\.\s*Cevaplarınızı',header,re.I) and 'cevap kâğıdının' in normalized(header).casefold():
                top=heading=True;disposition='PRINTED_TEST_INSTRUCTIONS'
        if not top or not heading:return False
        results.append({'page':orphan[0]+1,'text':text,'disposition':disposition})
    return results


def link_key(record):
    return 'raw:' + record['code']


def reconcile(connection):
    manifest = load(OUT / 'manifest.json')
    scan = load(OUT / 'scan.json')
    files = {canonical(f['path']): f for f in manifest['files']}
    source_paths={f['sha256']:f['path'] for f in manifest['files']}
    documents = {d['sha256']: dict(d) for d in scan['documents']}
    aliases = json_query(connection, 'SELECT catalog_id,data FROM learning_catalog.pdf_audit_rows ORDER BY catalog_id')
    questions = {r['code']: r for r in json_query(connection,
        "SELECT code,active,exam_type,subject,topic,correct_answer,image,bank,extract(epoch FROM updated_at)::text source_stamp FROM questions WHERE exam_type IN ('TYT','AYT')")}
    inventory = load(APP / 'veri/content-labels/source-inventory.json')
    originals = {r['code']: r for r in inventory['questions'] if r.get('exam_type') in ('TYT', 'AYT')}
    registry_ready = query(connection, "SELECT to_regclass('learning_catalog.question_source_registry') IS NOT NULL") == 't'
    accepted_provenance = {}
    accepted_occurrences = []
    quality_codes=set()
    if query(connection,"SELECT to_regclass('learning_catalog.question_source_issues') IS NOT NULL")=='t':
        quality_codes={r['question_code'] for r in json_query(connection,"SELECT question_code FROM learning_catalog.question_source_issues WHERE status='QUARANTINED'")}
    if registry_ready:
        accepted_provenance = {r['question_code']: r for r in json_query(connection,
            "SELECT * FROM learning_catalog.question_source_registry WHERE evidence ? 'acceptanceReviewSha256'")}
        accepted_occurrences = json_query(connection,
            "SELECT * FROM learning_catalog.pdf_question_occurrences WHERE evidence ? 'acceptanceReviewSha256'")
    fingerprint_index = defaultdict(list)
    prose_index=defaultdict(set)
    bank_texts={code:originals.get(code,{}).get('original',{}).get('text','') for code in questions}
    for code in questions:
        original = originals.get(code, {}).get('original', {})
        if fp := text_fingerprint(original.get('text') or ''):
            fingerprint_index[fp].append(code)
        if questions[code]['active'] and questions[code]['subject'] in ('Felsefe','Tarih'):
            if fp:=prose_fingerprint(original.get('text') or ''):prose_index[fp].add(code)
    for observed in json_query(connection,"""SELECT DISTINCT ON(o.question_code) o.question_code,o.observations->>'text' text
      FROM learning_catalog.question_content_observations o JOIN questions q ON q.code=o.question_code
      WHERE q.active AND q.exam_type IN ('TYT','AYT')
      AND extract(epoch FROM q.updated_at)::text=o.observations->>'questionStamp' ORDER BY o.question_code,o.recorded_at DESC"""):
        if questions[observed['question_code']]['subject'] in ('Felsefe','Tarih'):
            if fp:=prose_fingerprint(observed['text']):prose_index[fp].add(observed['question_code'])
        if sum(c.isalpha() for c in observed['text'])>sum(c.isalpha() for c in bank_texts.get(observed['question_code'],'')):
            bank_texts[observed['question_code']]=observed['text']
    alias_hash, source_aliases = {}, defaultdict(list)
    for alias in aliases:
        row = alias['data']
        path = row.get('relativePath') or ''
        actual = files.get(canonical(path))
        if actual:
            if row.get('sha256') and actual['sha256'] != row['sha256']:
                raise ValueError(f"PDF changed since catalog audit: {row['id']}")
            alias_hash[row['id']] = actual['sha256']
            source_aliases[actual['sha256']].append(row)
    occurrences, provenance, fingerprints = {}, [], []
    for row in accepted_occurrences:
        if row['source_sha256'] in documents:
            occurrences[row['source_sha256'],row['locator_key']] = {'sha256':row['source_sha256'],
                'locator':row['locator_key'],'page':row['page_number'],'numbers':row['printed_numbers'],
                'code':row['question_code'],'status':row['status'],'evidence':row['evidence']}
    raw_profiles = {}
    raw_by_code = {}
    raw_package_by_code={}
    raw_review_path=OUT/'raw-verified-links.json'
    raw_reviews={r['sourceCode']:r for r in load(raw_review_path)['verifiedLinks']} if raw_review_path.exists() else {}
    for path in sorted(PIPELINE.glob('*.json')):
        data = load(path)
        if isinstance(data, dict) and data.get('dosya'):
            source = files.get(canonical(data['dosya']))
            if source:
                raw_profiles[source['sha256']] = {'file': path.name, 'summary': data.get('ozet', {}), 'records': data.get('kayitlar', [])}
        for record in data if isinstance(data, list) else data.get('kayitlar', []):
            raw_by_code[record['id']] = record
            raw_package_by_code[record['id']]=path

    def add_occurrence(sha, code, page, numbers, reference, origin, status=None, text_override=None, answer_override=None):
        if sha not in documents or not isinstance(page, int) or not 0 < page <= documents[sha]['pageCount']:
            return False
        accepted = occurrences.get((sha, f'raw:{code}'))
        if accepted and accepted['evidence'].get('acceptanceReviewSha256'):
            target=questions.get(accepted['code'])
            # Earlier typography-only links cannot prove spelling/punctuation
            # questions. Retain their audit evidence, but withdraw completion
            # until complete literal language comparison passes.
            if accepted['evidence'].get('origin')=='REVIEWED_RAW_SOURCE_BANK_LINK' and target and target['subject'] in ('Türkçe','Türk Dili ve Edebiyatı'):
                from pdf_slide_compare import compare,validate_link
                from pdf_raw_compare import source_comparison_text
                raw=raw_by_code.get(code,{})
                review=raw_reviews.get(code)
                if review and review.get('canonicalCode')==target['code'] and ('sourceDiscretionaryWraps' in review or review.get('reviewMethod')=='RAW_SOURCE_CONTENT_REVIEW'):
                    if review['sourceSha256']!=sha or review['pdfPage']!=page or review['sourcePackage']!=raw_package_by_code[code].relative_to(APP.parent).as_posix():
                        raise ValueError('Reviewed raw source location changed')
                    card={'code':code,'text':raw['metin'],'imageSha256':digest(APP.parent/'icerik'/raw['gorsel']),
                          'answer':raw['cevaplar'][0],'answerMethodA':raw['cevaplar_A'][0],'answerMethodB':raw['cevaplar_B'][0]}
                    validate_link(review,card,raw_package_by_code[code],target,bank_texts[target['code']],digest(APP/'veri/resimler-pilot'/target['image']))
                    accepted['evidence']['comparisonEvidence']=review
                comparison=accepted['evidence']['comparisonEvidence']
                source_text=source_comparison_text(comparison,raw.get('metin',''))
                result=compare(source_text,bank_texts.get(target['code'],''),raw.get('cevaplar',[''])[0],target['correct_answer'],strict_language=True)
                explicit=comparison.get('reviewMethod')=='RAW_SOURCE_CONTENT_REVIEW' and comparison['status']=='VERIFIED_SOURCE_CONTENT_READING'
                if result['status']!='VERIFIED_TEXT_OPTIONS_AND_MAPPED_ANSWER' and not explicit:
                    accepted['status']='NEEDS_REVIEW'
                    accepted['evidence']['sourceQualityReview']={'reason':'LITERAL_LANGUAGE_COMPARISON_REQUIRED',
                        'sourceReading':'Türkçe/edebiyatta noktalama, sözcük aralığı veya vurgu anlamı değiştirebilir. Tam metin ve seçeneklerin bu ayrıntıları ayrıca karşılaştırılmalı.',
                        'teacherApproved':False}
                elif accepted['evidence'].get('sourceQualityReview',{}).get('reason')=='LITERAL_LANGUAGE_COMPARISON_REQUIRED':
                    accepted['status']='LINKED';accepted['evidence'].pop('sourceQualityReview')
                if explicit:
                    accepted['evidence']['acceptanceReviewSha256']=comparison['reviewSha256']
                    accepted['evidence']['sourceReading']=comparison['sourceReading']
                    accepted['evidence']['matchType']=comparison['matchType']
                elif result['status']=='VERIFIED_TEXT_OPTIONS_AND_MAPPED_ANSWER':
                    comparison=accepted['evidence']['comparisonEvidence']
                    comparison['comparisonMode']='LITERAL_LANGUAGE'
                    comparison.pop('reviewSha256',None)
                    comparison['reviewSha256']=hashlib.sha256(json.dumps(comparison,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
                    accepted['evidence']['acceptanceReviewSha256']=comparison['reviewSha256']
            return True
        linked_code = code
        current = questions.get(code)
        original = originals.get(code, {}).get('original', {})
        raw = raw_by_code.get(code, {})
        duplicate_method = None
        reviewed=None
        if current is None:
            source_text=text_override or raw.get('metin') or original.get('text') or ''
            fp = text_fingerprint(source_text)
            answers = answer_override if answer_override is not None else raw.get('cevaplar') or []
            matches = [candidate for candidate in fingerprint_index.get(fp, [])
                       if questions[candidate]['active'] and answers == [questions[candidate]['correct_answer']]]
            prose_match=False
            if not matches and text_override:
                matches=[candidate for candidate in prose_index.get(prose_fingerprint(source_text),[])
                    if answers==[questions[candidate]['correct_answer']]]
                prose_match=bool(matches)
            if matches:
                from pdf_slide_compare import compare
                matches=[candidate for candidate in matches if questions[candidate]['subject'] not in ('Türkçe','Türk Dili ve Edebiyatı') or
                    compare(source_text,bank_texts.get(candidate,''),answers[0] if len(answers)==1 else '',
                        questions[candidate]['correct_answer'],strict_language=True)['status']=='VERIFIED_TEXT_OPTIONS_AND_MAPPED_ANSWER']
            if matches:
                linked_code = sorted(matches)[0]
                current = questions[linked_code]
                duplicate_method = 'TYPOGRAPHY_AND_CONNECTOR_VARIANT' if prose_match else 'EXACT_QUESTION_TEXT_OPTIONS_AND_ANSWER'
                # Equal text cannot prove that two diagrams are equal.
                if re.search(r'şekil|tablo|grafik|harita|görsel|resim|devre|diyagram', source_text, re.I):
                    status = 'NEEDS_REVIEW'
            review=raw_reviews.get(code)
            target=questions.get(review['canonicalCode']) if review else None
            if review and target and target['active'] and review['bankStamp']==target['source_stamp']:
                from pdf_slide_compare import validate_link
                from pdf_raw_compare import SUBJECTS
                package_path=raw_package_by_code[code]
                if target['subject'] not in SUBJECTS or review['sourceSha256']!=sha or review['pdfPage']!=page or review['sourcePackage']!=package_path.relative_to(APP.parent).as_posix():
                    raise ValueError('Raw reviewed source scope/location changed')
                card={'code':code,'text':raw['metin'],'imageSha256':digest(APP.parent/'icerik'/raw['gorsel']),
                    'answer':raw['cevaplar'][0],'answerMethodA':raw['cevaplar_A'][0],'answerMethodB':raw['cevaplar_B'][0]}
                validate_link(review,card,package_path,target,bank_texts[target['code']],digest(APP/'veri/resimler-pilot'/target['image']))
                current=target;linked_code=target['code'];reviewed=review;status='LINKED'
                duplicate_method=review['matchType']
        key = f'raw:{code}'
        # The same source card can occur in different physical book locations.
        if (sha, key) in occurrences and occurrences[sha, key]['page'] != page:
            key += f':page:{page}'
        occurrences[sha, key] = {'sha256': sha, 'locator': key, 'page': page,
            'numbers': numbers, 'code': linked_code if current else None,
            'status': status or ('LINKED' if current else 'CANDIDATE'),
            'evidence': {'sourceCode': code, 'reference': reference, 'origin': origin,
                         'textSha256': text_fingerprint(raw.get('metin') or original.get('text') or ''),
                         'answersA': raw.get('cevaplar_A'), 'answersB': raw.get('cevaplar_B'),
                         'answers': raw.get('cevaplar'), 'image': raw.get('gorsel') or original.get('image'),
                         'testOrder': raw.get('test_sira'), 'sourceStamp': current['source_stamp'] if current else None}}
        if duplicate_method:
            occurrences[sha, key]['evidence']['duplicateMatch'] = duplicate_method
        if reviewed:
            occurrences[sha,key]['evidence'].update({'acceptanceReviewSha256':reviewed['reviewSha256'],
                'origin':'REVIEWED_RAW_SOURCE_BANK_LINK','matchType':reviewed['matchType'],
                'sourceText':raw['metin'],'sourceFile':source_paths[sha],
                'page':page,'imageSha256':card['imageSha256'],'sourceAnswer':card['answer'],
                'answerPermutation':reviewed.get('answerPermutation',{}),'teacherApproved':False,
                'comparisonEvidence':reviewed})
        return True

    for code, row in questions.items():
        accepted = accepted_provenance.get(code)
        if accepted and accepted['source_sha256'] in documents:
            provenance.append({'code':code,'kind':accepted['source_kind'],'sha256':accepted['source_sha256'],
                'reference':accepted['source_reference'],'stamp':accepted['source_stamp'],
                'evidence':{**accepted['evidence'],'active':row['active'],'bank':row['bank'],'exam':row['exam_type']}})
            continue
        evidence = originals.get(code, {})
        original = evidence.get('original', {})
        raw = raw_by_code.get(code, {})
        sha = None
        source = files.get(canonical(original.get('file')))
        if source and add_occurrence(source['sha256'], code, original.get('page'), original.get('questionNumbers', []),
                                     original.get('rawRef', ''), 'EXACT_RAW_FILE'):
            sha = source['sha256']
        # The OGM outgoing archive preserves its booklet names in bookReferences.
        # Resolve only an existing exact booklet filename under yks-cikmis-sorular.
        for copy in original.get('bookReferences', []):
            book = copy.get('kitap', '')
            candidate = files.get(canonical(f'yks-cikmis-sorular/OGM Kitapciklari/{book}.pdf'))
            if candidate and add_occurrence(candidate['sha256'], code, copy.get('sayfa'), copy.get('kitap_nolar', []),
                                            original.get('rawRef', ''), 'EXACT_BOOKLET_REFERENCE'):
                sha = sha or candidate['sha256']
        kind = 'PDF' if sha else 'WEB' if code.startswith('sb-') and raw.get('id') == code else 'UNRESOLVED'
        provenance.append({'code': code, 'kind': kind, 'sha256': sha,
                           'reference': original.get('rawRef') or evidence.get('archive', {}).get('evidence_ref') or '',
                           'stamp': row['source_stamp'],
                           'evidence': {'active': row['active'], 'bank': row['bank'], 'exam': row['exam_type'],
                                        'webId': code.removeprefix('sb-') if kind == 'WEB' else None,
                                        'answerApi': raw.get('cevap_api') if kind == 'WEB' else None,
                                        'answerPrint': raw.get('cevap') if kind == 'WEB' else None}})
        fp = text_fingerprint(original.get('text') or raw.get('metin') or '')
        if fp:
            fingerprints.append((code, 'NFC_CONTENT_SEQUENCE_V1', fp))
    for fingerprint,codes in prose_index.items():
        fingerprints.extend((code,'PROSE_TYPOGRAPHY_CONNECTOR_V1',fingerprint) for code in codes)
    # Include unimported raw cards; absent cards must prevent a false "complete".
    for sha, profile in raw_profiles.items():
        for raw in profile['records']:
            add_occurrence(sha, raw['id'], raw.get('sayfa'), raw.get('nolar', []),
                           f"veri-hatti/ogm-sorular/kayit/{profile['file']}#id={raw['id']}", 'EXACT_RAW_FILE')
    staged_path = APP / 'veri/content-labels/pdf-extraction/mini-test-04/candidates.json'
    staged = load(staged_path) if staged_path.exists() else None
    if staged and staged['sourceSha256'] in documents:
        for candidate in staged['cards']:
            add_occurrence(staged['sourceSha256'], candidate['code'], candidate['pdfPage'], [candidate['printedNumber']],
                           staged_path.relative_to(APP).as_posix() + '#code=' + candidate['code'], 'STAGED_TWO_ANSWER_READINGS')
            occurrences[staged['sourceSha256'], 'raw:' + candidate['code']]['evidence'].update({
                'textSha256': text_fingerprint(candidate['text']), 'answersA': [candidate['answerMethodA']],
                'answersB': [candidate['answerMethodB']], 'answers': [candidate['answer']],
                'image': staged_path.parent.relative_to(APP).as_posix() + '/' + candidate['image'],
                'imageSha256': candidate['imageSha256']})

    slide_packages={}
    verified_links_path=OUT/'slide-verified-links.json'
    verified_links={r['sourceCode']:r for r in load(verified_links_path)['verifiedLinks']} if verified_links_path.exists() else {}
    slide_question_pages=set()
    slide_answer_pages=set()
    for package_path in sorted((OUT/'slide-candidates').glob('*/candidates.json')):
        package=load(package_path);sha=package['sourceSha256']
        if sha not in documents or not package['cards']:continue
        slide_packages[sha]=(package_path,package)
        for card in package['cards']:
            slide_question_pages.add((sha,card['pdfPage']))
            slide_answer_pages.add((sha,card['answerPage']))
            add_occurrence(sha,card['code'],card['pdfPage'],[],
                package_path.relative_to(APP).as_posix()+'#code='+card['code'],'STAGED_TWO_ANSWER_READINGS',
                text_override=card['text'] if len(card['text'])>180 and package['sourceSubject'] in ('Felsefe','Tarih','Türkçe','Türk Dili ve Edebiyatı','Din Kültürü ve Ahlak Bilgisi') else None,
                answer_override=[card['answer']])
            occurrence=occurrences[sha,'raw:'+card['code']]
            if not occurrence['evidence'].get('acceptanceReviewSha256'):
                occurrence['evidence'].update({'textSha256':text_fingerprint(card['text']),
                    'answersA':[card['answerMethodA']],'answersB':[card['answerMethodB']],'answers':[card['answer']],
                    'answerPage':card['answerPage'],'answerProof':card['answerProof'],
                    'image':package_path.parent.relative_to(APP).as_posix()+'/'+card['image'],
                    'imageSha256':card['imageSha256']})
                if exam:=excluded_exam(card['text']):
                    occurrence['status']='EXCLUDED';occurrence['code']=None
                    occurrence['evidence'].update({'scopeExclusion':'OTHER_EXAM','originalExam':exam,
                        'scopeReason':'Bu işlem yalnız TYT/AYT ve önceki üniversite sınavı sistemlerinin ders örneklerini kapsar.'})
                elif card['code'] in verified_links:
                    from pdf_slide_compare import validate_link
                    reviewed=verified_links[card['code']];target=questions.get(reviewed['canonicalCode'])
                    if target and target['active'] and reviewed['bankStamp']==target['source_stamp']:
                        validate_link(reviewed,card,package_path,target,bank_texts[target['code']],
                            digest(APP/'veri/resimler-pilot'/target['image']))
                        if reviewed['sourceSha256']!=sha or digest(package_path.parent/card['image'])!=card['imageSha256']:
                            raise ValueError('Reviewed source identity/crop changed')
                        occurrence.update({'code':target['code'],'status':'LINKED'})
                        occurrence['evidence'].update({'acceptanceReviewSha256':reviewed['reviewSha256'],
                            'origin':'REVIEWED_SOURCE_BANK_LINK','sourceStamp':target['source_stamp'],
                            'sourceText':card['text'],'sourceFile':package['sourceRelativePath'],
                            'page':card['pdfPage'],'sourceAnswer':card['answer'],
                            'matchType':reviewed['matchType'],'answerPermutation':reviewed.get('answerPermutation',{}),
                            'sourceReading':reviewed.get('sourceReading','Tam soru kökü, beş seçenek ve eşlenen banka cevabı birlikte doğrulandı.'),
                            'teacherApproved':False,'comparisonEvidence':reviewed})

    sb_checks = {}
    provider_review_path=OUT/'provider-content-review.json'
    provider_reviews={(r['sourceSha256'],r['sourceCode']):r for r in load(provider_review_path)['items']} if provider_review_path.exists() else {}
    from pdf_provider_content_review import validate as validate_provider_reading
    provenance_by_code = {r['code']: r for r in provenance}
    for relative, part in source_parts(raw_by_code):
        source = files.get(canonical(relative))
        if not source:
            continue
        sha = source['sha256']
        observations = read_evidence_scan(sha,for_review=True)
        positions, duplicate_numbers = printed_positions(observations)
        answers, key_conflicts = printed_answers(ROOT / source['path'], observations)
        pages = {p['page']: p for p in observations['pages']}
        issues, text_failures, answer_failures = [], [], []
        complete_image_readings=[];source_content_issues=[]
        native_pages=read_scan(sha)['pages'] if any(s==sha for s,code in provider_reviews) else []
        if duplicate_numbers or sorted(positions) != list(range(1, len(part) + 1)):
            issues.append('PRINTED_QUESTION_SEQUENCE_MISMATCH')
        if key_conflicts or sorted(answers) != list(range(1, len(part) + 1)):
            issues.append('PRINTED_ANSWER_SEQUENCE_MISMATCH')
        for number, question in enumerate(part, 1):
            code = f"sb-{question['id']}"
            raw = raw_by_code[code]
            page = positions.get(number)
            if page is None:
                continue
            coverage = text_coverage(raw.get('metin', ''), pages[page]['text'])
            reviewed=provider_reviews.get((sha,code))
            if reviewed:
                target=questions.get(code)
                if not target or not target['active'] or digest(APP/'veri/resimler-pilot'/target['image'])!=reviewed['bankImageSha256']:
                    raise ValueError('Reviewed provider bank image changed')
                validate_provider_reading(reviewed,sha,number,code,target,native_pages[page-1],answers.get(number),question.get('api_cevap'))
                (complete_image_readings if reviewed['status']=='VERIFIED' else source_content_issues).append(reviewed)
            if coverage < .90 and not (reviewed and reviewed['status']=='VERIFIED'):text_failures.append(number)
            if answers.get(number) != raw.get('cevap') or raw.get('cevap') != question.get('api_cevap'):
                answer_failures.append(number)
            add_occurrence(sha, code, page, [number], f'veri-hatti/ogm-indirme/sb_yapi.json#id={question["id"]}',
                           'PROVIDER_ID_PRINTED_SEQUENCE_AND_ANSWER')
            occurrence = occurrences.get((sha, f'raw:{code}'))
            if occurrence:
                occurrence['evidence'].update({'printedAnswer': answers.get(number), 'apiAnswer': question.get('api_cevap'),
                                               'textTokenCoverage': round(coverage, 4)})
                if reviewed:occurrence['evidence']['providerContentReview']=reviewed
            registered = provenance_by_code.get(code)
            if registered and registered['kind'] == 'WEB':
                registered['kind'], registered['sha256'] = 'PDF', sha
                registered['evidence']['origin'] = 'WEB_PROVIDER_WITH_PDF_MIRROR'
        if text_failures:
            issues.append('PDF_TEXT_CHECK_REQUIRES_VISUAL_REVIEW')
        if answer_failures:
            issues.append('PROVIDER_PRINTED_ANSWER_CONFLICT')
        if source_content_issues:issues.append('PDF_QUESTION_CONTENT_DEFECT')
        sb_checks[sha] = {'expected': len(part), 'issues': issues, 'textReviewNumbers': text_failures,
                          'completeImageReadings':complete_image_readings,'sourceContentIssues':source_content_issues,
                          'answerReviewNumbers': answer_failures, 'printedQuestions': len(positions),
                          'printedAnswers': len(answers)}

    discovery_path = OUT / 'discovery.json'
    if discovery_path.exists():
        known_slots={(o['sha256'],o['page'],n) for o in occurrences.values() for n in o['numbers']}
        for region in load(discovery_path)['candidates']:
            sha,key=region['sha256'],region['locator']
            if sha not in documents or (sha,key) in occurrences:continue
            if (sha,region['page']) in slide_question_pages or (sha,region['page']) in slide_answer_pages:continue
            if region['number'] is not None and (sha,region['page'],region['number']) in known_slots:continue
            occurrences[sha,key]={'sha256':sha,'locator':key,'page':region['page'],
                'numbers':[region['number']] if region['number'] is not None else [],'code':None,'status':'CANDIDATE',
                'evidence':{'origin':'PAGE_QUESTION_REGION','reference':'discovery:'+key,
                            'bbox':region['bbox'],'textSha256':region['textSha256'],
                            'reviewRequired':['ANSWER','DUPLICATE','CROP','CATEGORY']}}

    by_source = defaultdict(list)
    content_review=OUT/'slide-content-review.json'
    if content_review.exists():
        for issue in load(content_review).get('issues',[]):
            occurrence=occurrences.get((issue['sourceSha256'],'raw:'+issue['sourceCode']))
            if occurrence and occurrence['evidence'].get('imageSha256')==issue['imageSha256'] and not occurrence['evidence'].get('acceptanceReviewSha256'):
                occurrence['status']='NEEDS_REVIEW'
                occurrence['evidence']['sourceQualityReview']=issue
    for occurrence in occurrences.values():
        by_source[occurrence['sha256']].append(occurrence)
    linked_by_code={o['code']:o for o in occurrences.values() if o['status']=='LINKED'}
    from pdf_page_dispositions import validate as validate_page_disposition
    disposition_path=OUT/'page-dispositions.json'
    page_dispositions={(p['sourceSha256'],p['page']):p for p in load(disposition_path)['pages']} if disposition_path.exists() else {}
    for record in provenance:
        if record['kind']!='PDF' and record['code'] in linked_by_code:
            occurrence=linked_by_code[record['code']]
            record.update({'kind':'PDF','sha256':occurrence['sha256'],
                           'reference':occurrence['evidence'].get('reference') or 'pdf:'+occurrence['sha256']+':'+occurrence['locator']})
            record['evidence']['recoveredFromOccurrence']=occurrence['locator']
    for source_index,(sha,document) in enumerate(documents.items(),1):
        observations = read_evidence_scan(sha,for_review=True)
        metadata_review=SOURCE_METADATA_READINGS.get(sha)
        if metadata_review and read_scan(sha)['pages'][metadata_review['page']-1]['textSha256']!=metadata_review['nativeTextSha256']:
            raise ValueError('Source metadata reading changed')
        reviewed_pages=[validate_page_disposition(page_dispositions[sha,p['page']],sha,p)
                        for p in observations['pages'] if (sha,p['page']) in page_dispositions]
        reviewed_numbers={p['page'] for p in reviewed_pages}
        document['ocrPages']=[p['page'] for p in observations['pages'] if p['needsOcr'] and p['page'] not in reviewed_numbers]
        document['ocrEvidenceSha256']=observations['ocrEvidenceSha256']
        document['questionSignalPages']=[p['page'] for p in observations['pages'] if p['questionSignal']]
        document['summaryOcrPages']=[p['page'] for p in observations['pages'] if p.get('evidenceLines')]
        linked = by_source[sha]
        profile = raw_profiles.get(sha)
        source_rows = source_aliases[sha]
        source_category = source_rows[0]['category'] if source_rows else 'Diğer / incele'
        document['format'] = source_format(source_category,observations,linked,source_paths[sha])
        document['coverageState'] = 'INCOMPLETE' if linked else 'NEEDS_REVIEW'
        document['expectedQuestions'] = None
        reasons = []
        if document['error']:
            reasons.append('PDF_READ_ERROR')
        quality_questions=sorted({o['code'] for o in linked if o['code'] in quality_codes})
        if quality_questions:reasons.append('SOURCE_QUESTION_BODY_MISSING')
        if document['ocrPages']:
            reasons.append('PAGES_REQUIRE_OCR_OR_VISUAL_REVIEW')
        if any('\x00' in p['text'] or sum(ord(c)<32 and not c.isspace() for c in p['text'])>2 for p in observations['pages']):
            reasons.append('ENCODED_TEXT_REQUIRES_OCR_OR_VISUAL_REVIEW')
        if sha in sb_checks:
            check = sb_checks[sha]
            document['expectedQuestions'] = check['expected']
            reasons += check['issues']
            if len(linked) != check['expected'] or any(o['status'] != 'LINKED' for o in linked):
                reasons.append('SOURCE_CARDS_NOT_IN_BANK')
            if not reasons:
                document['coverageState'] = 'VERIFIED'
        elif staged and sha == staged['sourceSha256']:
            document['expectedQuestions'] = staged['questionCount']
            if len(linked)==staged['questionCount'] and all(o['status']=='LINKED' and o['evidence'].get('acceptanceReviewSha256') for o in linked):
                if not reasons:document['coverageState']='VERIFIED'
            else:reasons.append('STAGED_QUESTIONS_REQUIRE_DUPLICATE_IMAGE_AND_CATEGORY_REVIEW')
        elif sha in slide_packages:
            package=slide_packages[sha][1]
            question_pages={card['pdfPage'] for card in package['cards']}
            answer_pages={card['answerPage'] for card in package['cards']}|set(package['answerPages'])
            unaccounted=[p['page'] for p in observations['pages'] if p['questionSignal'] and p['page'] not in question_pages|answer_pages]
            unresolved=[p for p in package['unresolvedPages'] if p['page'] not in answer_pages]
            excluded=[o for o in linked if o['status']=='EXCLUDED' and o['evidence'].get('scopeExclusion')=='OTHER_EXAM']
            if unaccounted or unresolved:reasons.append('FULL_QUESTION_ENUMERATION_REQUIRED')
            else:document['expectedQuestions']=len(package['cards'])-len(excluded)
            if any(o['status']!='LINKED' and o not in excluded for o in linked):reasons.append('STAGED_QUESTIONS_REQUIRE_DUPLICATE_IMAGE_AND_CATEGORY_REVIEW')
            if not reasons and len(linked)==len(package['cards']):
                document['coverageState']='VERIFIED' if document['expectedQuestions'] else 'NO_QUESTIONS'
        elif profile:
            summary = profile['summary']
            document['expectedQuestions'] = summary.get('soru')
            for key in ('red', 'yetim', 'sorunlar', 'anahtar_farki'):
                if summary.get(key) and not (key=='yetim' and header_orphans(profile,observations) is not False):
                    reasons.append('EXTRACTOR_' + key.upper())
            if any(o['status'] != 'LINKED' for o in linked):
                reasons.append('SOURCE_CARDS_NOT_IN_BANK')
            # Independent page evidence: every raw question number must be present
            # at its preserved page, and every question-bearing page accounted for.
            raw_pages = defaultdict(list)
            missing_anchors = []
            for record in profile['records']:
                raw_pages[record['sayfa']].extend(record.get('nolar', []))
            for page in observations['pages']:
                found = Counter(a['number'] for a in page['anchors'])
                expected = Counter(raw_pages[page['page']])
                if expected - found:
                    missing_anchors.append(page['page'])
                if page['questionSignal'] and not expected and 'cevap anahtar' not in page['text'].casefold():
                    reasons.append('UNACCOUNTED_QUESTION_PAGE')
            if missing_anchors:
                reasons.append('INDEPENDENT_ANCHOR_CHECK_FAILED')
            source_slots = sum(len(r.get('nolar', [])) for r in profile['records'])
            if source_slots != summary.get('soru'):
                reasons.append('PROFILE_QUESTION_COUNT_MISMATCH')
            if not reasons and source_slots > 0:
                document['coverageState'] = 'VERIFIED'
        else:
            reasons.append('FULL_QUESTION_ENUMERATION_REQUIRED')
        if source_category == 'Cevap anahtarı' and not linked and not any(len(p['options']) >= 4 for p in observations['pages']):
            document['format'] = 'CEVAP_ANAHTARI'
            document['coverageState'] = 'NO_QUESTIONS'
            document['expectedQuestions'] = 0
            reasons = []
        document['coverageEvidence'] = {'version': VERSION, 'reasons': sorted(set(reasons)),
            'metadataReview':metadata_review,
            'reviewedNonquestionPages':reviewed_pages,
            'unreadablePageNumbers':document['ocrPages'],
            'sourceContentIssues':sb_checks.get(sha,{}).get('sourceContentIssues',[]),
            'quarantinedQuestionCodes':quality_questions,
            'excludedOtherExamCards':sum(o['status']=='EXCLUDED' and o['evidence'].get('scopeExclusion')=='OTHER_EXAM' for o in linked),
            'candidatePackage':staged_path.relative_to(APP).as_posix() if staged and sha==staged['sourceSha256']
                else slide_packages[sha][0].relative_to(APP).as_posix() if sha in slide_packages else None,
            'pairedAnswerPages':sorted(page for source,page in slide_answer_pages if source==sha),
            'rawProfile': profile['file'] if profile else None,
            'orphanHeadingDispositions': header_orphans(profile,observations) if profile else [],
            'providerPrintCheck': sb_checks.get(sha),
            'independentPageScan': True, 'teacherApproved': False,
            'linkedCards': sum(o['status'] == 'LINKED' for o in linked),
            'candidateCards': sum(o['status'] == 'CANDIDATE' for o in linked)}
        if source_index%200==0:
            print(f'Source evidence reconciled: {source_index}/{len(documents)} PDFs',flush=True)
    from pdf_document_content_review import apply_readings as apply_document_readings
    document_data={'files':manifest['files'],'documents':list(documents.values()),'occurrences':list(occurrences.values())}
    apply_document_readings(document_data)
    active = [r for r in provenance if questions[r['code']]['active']]
    old_counts = Counter(o['data'].get('status') for o in aliases)
    report = {'version': 1, 'scope': ['TYT', 'AYT'], 'bankTotal': len(active),
              'bankBySource': dict(Counter(r['kind'] for r in active)),
              'physicalFiles': len(manifest['files']), 'uniquePdfSources': len(documents),
              'catalogRows': len(aliases), 'coverage': dict(Counter(d['coverageState'] for d in documents.values())),
              'formats': dict(Counter(d['format'] for d in documents.values())),
              'rawProfileSources': len(raw_profiles),
              'occurrences': len(occurrences), 'unlinkedOccurrences': sum(o['status'] != 'LINKED' for o in occurrences.values()),
              'unresolvedQuestions': [r['code'] for r in active if r['kind'] == 'UNRESOLVED']}
    snapshot=hashlib.sha256(json.dumps(sorted((code,q['active'],q['source_stamp']) for code,q in questions.items()),separators=(',',':')).encode()).hexdigest()
    payload = {'report': report, 'questionSnapshotSha256':snapshot,'documents': list(documents.values()), 'files': manifest['files'],
               'aliases': [{'id': k, 'sha256': v} for k, v in alias_hash.items()],
               'occurrences': list(occurrences.values()), 'provenance': provenance, 'fingerprints': fingerprints}
    write_json(OUT / 'reconciliation.json', payload)
    write_json(OUT / 'report.json', report)
    print(json.dumps({k: v for k, v in report.items() if k != 'unresolvedQuestions'}, ensure_ascii=False), flush=True)
    return payload


def publish(connection, data):
    if query(connection, "SELECT to_regclass('learning_catalog.pdf_sources') IS NOT NULL") != 't':
        raise ValueError('Run V85 through Flyway before registry publication')
    current=json_query(connection,"SELECT code,active,extract(epoch FROM updated_at)::text stamp FROM questions WHERE exam_type IN ('TYT','AYT') ORDER BY code")
    snapshot=hashlib.sha256(json.dumps(sorted((q['code'],q['active'],q['stamp']) for q in current),separators=(',',':')).encode()).hexdigest()
    if snapshot!=data.get('questionSnapshotSha256'):raise ValueError('YKS bank changed; reconcile again before publication')
    for file in data['files']:
        source=(ROOT/file['path']).resolve()
        if not source.is_relative_to(ROOT.resolve()):raise ValueError('Source outside YKS resource root')
        stat=source.stat()
        if (stat.st_size,stat.st_mtime_ns)!=(file['size'],file['mtimeNs']):raise ValueError('PDF bytes may have changed; scan again')
    guard_sql="SELECT md5(string_agg(code||':'||active::text||':'||extract(epoch FROM updated_at)::text,',' ORDER BY code)) FROM questions WHERE exam_type IN ('TYT','AYT')"
    guard=query(connection,guard_sql)
    path = OUT / 'publish.sql'
    def j(value):
        def clean(item):
            if isinstance(item, str): return item.replace('\x00', '\ufffd')
            if isinstance(item, list): return [clean(v) for v in item]
            if isinstance(item, dict): return {k: clean(v) for k, v in item.items()}
            return item
        return json.dumps(clean(value), ensure_ascii=False, separators=(',', ':'))
    def copy(stream, table, columns, rows, update):
        stage = 'incoming_' + table
        stream.write(f'CREATE TEMP TABLE {stage} (LIKE learning_catalog.{table} INCLUDING DEFAULTS) ON COMMIT DROP;\n')
        stream.write(f'COPY {stage} ({columns}) FROM STDIN WITH (FORMAT csv, NULL \'\\N\');\n')
        writer = csv.writer(stream, lineterminator='\n')
        for row in rows:
            writer.writerow(['\\N' if value is None else value for value in row])
        stream.write('\\.\n')
        stream.write(f'INSERT INTO learning_catalog.{table} ({columns}) SELECT {columns} FROM {stage} {update};\n')
    with path.open('w', encoding='utf-8', newline='') as stream:
        stream.write('BEGIN;\nSELECT pg_advisory_xact_lock(738452019);\nSELECT pg_advisory_xact_lock(738452020);\n')
        stream.write("DO $guard$ BEGIN IF ("+guard_sql+") IS DISTINCT FROM '"+guard+"' THEN RAISE EXCEPTION 'YKS bank changed during publication'; END IF; END $guard$;\n")
        copy(stream, 'pdf_sources', 'source_sha256,page_count,extractor_version,observations,content_format,coverage_state,expected_questions,coverage_evidence',
             ((d['sha256'], d['pageCount'], VERSION, j({k:v for k,v in d.items() if k not in ('coverageState','coverageEvidence','expectedQuestions','format')}),
               d['format'], d['coverageState'], d['expectedQuestions'], j(d['coverageEvidence'])) for d in data['documents']),
             'ON CONFLICT(source_sha256) DO UPDATE SET page_count=excluded.page_count,extractor_version=excluded.extractor_version,observations=excluded.observations,content_format=excluded.content_format,coverage_state=excluded.coverage_state,expected_questions=excluded.expected_questions,coverage_evidence=excluded.coverage_evidence,recorded_at=now() WHERE (pdf_sources.page_count,pdf_sources.extractor_version,pdf_sources.observations,pdf_sources.content_format,pdf_sources.coverage_state,pdf_sources.expected_questions,pdf_sources.coverage_evidence) IS DISTINCT FROM (excluded.page_count,excluded.extractor_version,excluded.observations,excluded.content_format,excluded.coverage_state,excluded.expected_questions,excluded.coverage_evidence)')
        copy(stream, 'pdf_source_files', 'relative_path,source_sha256,size_bytes,mtime_ns',
             ((f['path'],f['sha256'],f['size'],f['mtimeNs']) for f in data['files']),
             'ON CONFLICT(relative_path) DO UPDATE SET source_sha256=excluded.source_sha256,size_bytes=excluded.size_bytes,mtime_ns=excluded.mtime_ns')
        copy(stream, 'pdf_source_catalog', 'catalog_id,source_sha256', ((a['id'],a['sha256']) for a in data['aliases']),
             'ON CONFLICT(catalog_id) DO UPDATE SET source_sha256=excluded.source_sha256')
        # Page data are copied only when absent: byte hash + extractor version is immutable.
        existing={r['source_sha256']:r['ocr_hash'] for r in json_query(connection,
            "SELECT source_sha256,min(observations->>'sourceOcrEvidenceSha256') ocr_hash FROM learning_catalog.pdf_source_pages GROUP BY source_sha256 HAVING bool_and(observations->>'registryEvidenceVersion'='2')")}
        copy(stream, 'pdf_source_pages', 'source_sha256,page_number,observations',
             ((d['sha256'],p['page'],j({**database_page(p),'registryEvidenceVersion':'2','sourceOcrEvidenceSha256':d.get('ocrEvidenceSha256')}))
              for d in data['documents'] if existing.get(d['sha256'])!=d.get('ocrEvidenceSha256')
              for p in read_evidence_scan(d['sha256'])['pages']), 'ON CONFLICT(source_sha256,page_number) DO UPDATE SET observations=excluded.observations')
        copy(stream, 'pdf_question_occurrences', 'source_sha256,locator_key,page_number,printed_numbers,question_code,status,evidence',
             ((o['sha256'],o['locator'],o['page'],'{'+','.join(map(str,o['numbers']))+'}',o['code'],o['status'],j(o['evidence'])) for o in data['occurrences']),
             "ON CONFLICT(source_sha256,locator_key) DO UPDATE SET question_code=excluded.question_code,status=excluded.status,evidence=excluded.evidence WHERE NOT (pdf_question_occurrences.evidence ? 'acceptanceReviewSha256') OR excluded.evidence ? 'acceptanceReviewSha256'")
        stream.write("DELETE FROM learning_catalog.pdf_question_occurrences old WHERE old.evidence->>'origin'='PAGE_QUESTION_REGION' AND NOT old.evidence ? 'acceptanceReviewSha256' AND NOT EXISTS(SELECT 1 FROM incoming_pdf_question_occurrences i WHERE i.source_sha256=old.source_sha256 AND i.locator_key=old.locator_key);\n")
        copy(stream, 'question_source_registry', 'question_code,source_kind,source_sha256,source_reference,source_stamp,evidence',
             ((r['code'],r['kind'],r['sha256'],r['reference'],r['stamp'],j(r['evidence'])) for r in data['provenance']),
             "ON CONFLICT(question_code) DO UPDATE SET source_kind=excluded.source_kind,source_sha256=excluded.source_sha256,source_reference=excluded.source_reference,source_stamp=excluded.source_stamp,evidence=excluded.evidence WHERE NOT (question_source_registry.evidence ? 'acceptanceReviewSha256') OR excluded.evidence ? 'acceptanceReviewSha256'")
        copy(stream, 'question_content_fingerprints', 'question_code,algorithm,fingerprint', data['fingerprints'],
             'ON CONFLICT DO NOTHING')
        # Refined PDF formats use the same immutable catalog revisions as all
        # other labels. Copy every unrelated item/assignment, including KPSS.
        stream.write("""
CREATE TEMP TABLE pdf_format_changes ON COMMIT DROP AS
 SELECT i.item_key,s.content_format FROM learning_catalog.current_items i
 JOIN learning_catalog.pdf_sources s ON i.data->>'canonicalAssetId'='sha256:'||s.source_sha256
 WHERE i.kind='PDF' AND i.exam IN ('TYT','AYT','TYT-AYT') AND s.content_format IN ('KARMA','CALISMA_REHBERI')
 AND i.content_format IS DISTINCT FROM s.content_format;
-- Only frozen source readings that agree with the current controlled catalog
-- can repair an old inventory projection. Retain its original label as evidence.
UPDATE learning_catalog.pdf_audit_rows r SET data=
 jsonb_set(r.data,'{subject}',s.coverage_evidence->'metadataReview'->'subject',true)
 ||jsonb_build_object('originalSubject',coalesce(r.data->'originalSubject',r.data->'subject')),updated_at=now()
 FROM learning_catalog.pdf_source_catalog a JOIN learning_catalog.pdf_sources s USING(source_sha256)
 JOIN learning_catalog.current_items i ON i.item_key='pdf:'||a.catalog_id
 WHERE r.catalog_id=a.catalog_id AND s.coverage_evidence->'metadataReview'->>'subjectId'=i.subject_id
 AND r.data->>'subject' IS DISTINCT FROM s.coverage_evidence->'metadataReview'->>'subject';
CREATE TEMP TABLE pdf_projection_changes ON COMMIT DROP AS
 SELECT i.item_key,array_agg(DISTINCT a.category_id ORDER BY a.category_id) category_ids,
 array_agg(DISTINCT c.definition->>'subjectId' ORDER BY c.definition->>'subjectId') subject_ids,
 array_agg(DISTINCT c.definition->>'exam' ORDER BY c.definition->>'exam') exam_ids
 FROM learning_catalog.current_items i JOIN learning_catalog.current_assignments a USING(item_key)
 JOIN learning_catalog.current_categories c USING(category_id)
 JOIN questions q ON q.code=i.question_code AND q.active
 JOIN learning_catalog.question_source_registry r ON r.question_code=q.code AND r.evidence ? 'acceptanceReviewSha256'
 WHERE i.kind='QUESTION' AND i.exam IN ('TYT','AYT') AND (cardinality(i.category_ids)=0 OR cardinality(i.subject_ids)=0 OR cardinality(i.exam_ids)=0)
 GROUP BY i.item_key;
DO $catalog$
DECLARE previous_key text; next_key text; changed integer;
BEGIN
 SELECT (SELECT count(*) FROM pdf_format_changes)+(SELECT count(*) FROM pdf_projection_changes) INTO changed;
 IF changed>0 THEN
  SELECT run_key INTO previous_key FROM learning_catalog.current_run;
  SELECT 'pdf-scope-'||md5(previous_key||string_agg(item_key||definition,',' ORDER BY item_key)) INTO next_key FROM (
   SELECT item_key,content_format definition FROM pdf_format_changes UNION ALL
   SELECT item_key,array_to_string(category_ids,',')||array_to_string(exam_ids,',') definition FROM pdf_projection_changes) changes;
  INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES(next_key,'YKS_PDF_SOURCE_FORMATS',jsonb_build_object('changedPdfs',changed,'previousRun',previous_key));
  INSERT INTO learning_catalog.source_audits SELECT next_key,inventory_audit,curriculum_references FROM learning_catalog.source_audits WHERE run_key=previous_key;
  INSERT INTO learning_catalog.categories SELECT next_key,category_id,definition FROM learning_catalog.categories WHERE run_key=previous_key;
  INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids)
   SELECT next_key,i.item_key,i.kind,i.exam,i.subject_id,i.student_visible,
    (CASE WHEN f.item_key IS NULL THEN i.data ELSE jsonb_set(i.data,'{automaticLabels,contentFormat}',to_jsonb(f.content_format),true) END)
      ||CASE WHEN p.item_key IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('categoryIds',p.category_ids,'subjectIds',p.subject_ids,'examIds',p.exam_ids,'resourceRole','ACTIVE_QUESTION') END,
    coalesce(p.category_ids,i.category_ids),coalesce(p.subject_ids,i.subject_ids),coalesce(p.exam_ids,i.exam_ids)
    FROM learning_catalog.items i LEFT JOIN pdf_format_changes f USING(item_key) LEFT JOIN pdf_projection_changes p USING(item_key) WHERE i.run_key=previous_key;
  INSERT INTO learning_catalog.assignments SELECT next_key,item_key,category_id,relation FROM learning_catalog.assignments WHERE run_key=previous_key;
  UPDATE learning_catalog.current_run SET run_key=next_key WHERE singleton;
  UPDATE learning_catalog.question_intake d SET resource=i.data FROM learning_catalog.current_items i
   JOIN pdf_projection_changes p USING(item_key) WHERE d.question_code=i.question_code AND d.source_stamp=i.source_stamp;
 END IF;
END $catalog$;
""")
        stream.write('COMMIT;\n')
    command, env, _ = connection
    with path.open('r', encoding='utf-8') as stream:
        result = subprocess.run([*command, '--quiet'], stdin=stream, env=env, capture_output=True, text=True, encoding='utf-8')
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    print('Published source registry; questions and learner history preserved.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', choices=['ivme', 'ivme_test'], default='ivme')
    parser.add_argument('--publish', action='store_true')
    parser.add_argument('--reuse', action='store_true')
    args = parser.parse_args()
    connection = db_connection(args.database)
    data = load(OUT / 'reconciliation.json') if args.reuse else reconcile(connection)
    if args.publish:
        publish(connection, data)
