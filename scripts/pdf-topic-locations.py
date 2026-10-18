"""Scan physical PDF text layers once and map only observed heading pages.

Page anchors are ESTIMATED topic coverage, never full-document or teacher approval.
Unreadable pages remain explicit OCR work. Source extraction cache is independent
of dictionary/alias changes. No remote downloads, source writes or automatic OCR.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import time
import unicodedata
import pymupdf
from pdf_ocr_cache import model_hash, read_page

APP = Path(__file__).resolve().parents[1]
STATE = APP / 'veri/content-labels'
EXTRACTOR = 'pdf-page-headings-v1'


def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def normalise(text):
    text = text.replace('I', 'ı').replace('İ', 'i').lower().replace('ı', 'i')
    return re.sub('[^a-z0-9]+', ' ', ''.join(c for c in unicodedata.normalize('NFD', text) if not unicodedata.combining(c))).strip()


def alias(text, rules):
    result = normalise(text)
    for rule in rules:
        replacement = re.sub(r'\$(\d+)', r'\\g<\1>', rule['replacement'])
        result = re.sub(rule['pattern'], replacement, result)
    return re.sub(r'\s+', ' ', result).strip()


def scan(path, expected):
    with path.open('rb') as stream:
        actual = hashlib.file_digest(stream, 'sha256').hexdigest()
    if actual != expected:
        raise ValueError('Source hash changed; rebuild source inventory first')
    pymupdf.TOOLS.mupdf_display_errors(False)
    pymupdf.TOOLS.mupdf_display_warnings(False)
    pymupdf.TOOLS.mupdf_warnings(reset=True)
    pages = []
    with pymupdf.open(path) as doc:
        for index, page in enumerate(doc):
            text = page.get_text()
            headings = []
            blocks = page.get_text('dict', flags=pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_PRESERVE_IMAGES)['blocks']
            for block in blocks:
                if 'lines' not in block:
                    continue
                spans = [s for line in block['lines'] for s in line['spans'] if s['text'].strip()]
                if not spans:
                    continue
                size = max(s['size'] for s in spans)
                bold = any(s['flags'] & 16 for s in spans)
                title = re.sub(r'\s+', ' ', ' '.join(s['text'] for s in spans)).strip()
                if (size >= 17 or bold and size >= 10 and block['bbox'][1] / page.rect.height < .18) and 4 <= len(title) <= 160:
                    headings.append(title)
            readable = sum(c.isalpha() for c in text)
            contents = 'icindekiler' in normalise(text[:1800])
            pages.append({'page': index + 1, 'textSha256': hashlib.sha256(text.encode()).hexdigest(),
                          'readableCharacters': readable, 'needsOcr': readable < 30,
                          'isContents': contents, 'headings': sorted(set(headings)),
                          'format': 'CEVAP_ANAHTARI' if any(normalise(h) == 'cevap anahtari' for h in headings) else 'NOT_CLASSIFIED'})
    return {'sourceSha256': expected, 'extractorVersion': EXTRACTOR, 'pageCount': len(pages), 'pages': pages,
            'parseWarnings': pymupdf.TOOLS.mupdf_warnings(reset=True)}


def match_pages(category, pages, rules):
    if category['topic'] == 'Dersin genel kapsamı':
        return []
    target = alias(category.get('subtopic') or category['topic'], rules)
    return [p for p in pages if not p['needsOcr'] and not p['isContents'] and
            (target in p['normalizedHeadings'] if 'normalizedHeadings' in p else
             any(alias(re.sub(r'^\s*\d+[.\s-]+', '', title), rules) == target for title in p['headings']))]


def with_ocr(page, record):
    if record is None:
        return {**page,'extractionMethod':'PDF_PAGE_HEADING_TEXT'}
    return {**page,'extractionMethod':'PAGE_OCR_HEADING','ocrStatus':record['status'],
            'ocrTextSha256':record['textSha256'],'needsOcr':record['status']!='EXTRACTED',
            'isContents':page['isContents'] or 'icindekiler' in normalise(record['text'][:1800]),
            'headings':sorted(set(page['headings']+record['headings']))}


def bounded_ranges(hits, pages, topic_pages):
    """Candidate section boundaries only; unreadable/contents/answer pages stop a range."""
    result=[]
    for start in sorted({p['page'] for p in hits}):
        next_topic=next((n for n in sorted(topic_pages) if n>start),None)
        end=next_topic-1 if next_topic else start
        for page in pages[start:end]:
            if page['needsOcr'] or page['isContents'] or page.get('format')=='CEVAP_ANAHTARI':
                end=page['page']-1;break
        end=max(start,end)
        if result and start<=result[-1]['end']+1:
            result[-1]['end']=max(result[-1]['end'],end)
        else:result.append({'start':start,'end':end,'nextTopicPage':next_topic})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit', type=int, help='Maximum uncached physical sources this batch')
    parser.add_argument('--check', action='store_true', help='Require extraction caches; do not extract')
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error('--limit must be positive')
    started = time.monotonic()
    ocr_model = model_hash()
    pdf = load(APP / 'backend/src/main/resources/pdf-review-labels.json')
    registry = load(APP / 'backend/src/main/resources/content-taxonomy.json')
    categories = {c['id']: c for c in registry['categories']}
    rules = [r for r in registry['aliasRules'] if 'pdf' in r['profiles']]
    cache = STATE / 'pdf-page-cache'
    cache.mkdir(parents=True, exist_ok=True)
    stats = Counter()
    result = {}
    exceptions = []
    for source in pdf['items']:
        key, sha = source['key'], source.get('sourceSha256')
        if not sha or not source.get('relativePath'):
            exceptions.append({'itemKey': key, 'reason': source['availability']})
            continue
        base = APP.parent / 'Kaynaklar'
        if source.get('sourceScope') != 'RESOURCES':
            base = base / 'ogm-materyal'
        path = (base / source['relativePath']).resolve()
        if not path.is_relative_to((APP.parent / 'Kaynaklar').resolve()):
            raise ValueError('Source path outside resources')
        file = cache / f'{sha}-{EXTRACTOR}.json'
        if file.exists():
            record = load(file)
            if record.get('sourceSha256') != sha or record.get('extractorVersion') != EXTRACTOR:
                raise ValueError('Invalid extraction cache')
            stats['reusedReferences'] += 1
        elif args.check or args.limit is not None and stats['extractedAssets'] >= args.limit:
            exceptions.append({'itemKey': key, 'reason': 'PENDING_TEXT_LAYER_SCAN'})
            continue
        else:
            try:
                record = scan(path, sha)
            except Exception as error:
                exceptions.append({'itemKey': key, 'reason': 'EXTRACTION_FAILED', 'errorType': type(error).__name__})
                continue
            temp = file.with_suffix('.tmp')
            temp.write_text(json.dumps(record, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
            temp.replace(file)
            stats['extractedAssets'] += 1
            if stats['extractedAssets'] % 100 == 0:
                print(json.dumps({'extractedAssets': stats['extractedAssets'], 'currentItem': key}), flush=True)
        if record['pageCount'] != source['pageCount']:
            raise ValueError(f'Page count changed: {key}')
        pages = [with_ocr(p,read_page(sha,p['page'],ocr_model) if p['needsOcr'] else None) for p in record['pages']]
        for page in pages:
            page['normalizedHeadings']={alias(re.sub(r'^\s*\d+[.\s-]+','',h),rules) for h in page['headings']}
        scopes={(categories[a['categoryId']]['exam'],categories[a['categoryId']]['subjectId']) for a in source['automaticLabels']['assignments']}
        observed={}
        # Exact observed page headings, within known exam/branch scopes, can add
        # controlled topics to a broad catalog entry. File names never do this.
        for c in categories.values():
            if c.get('origin')!='CURRICULUM' or c.get('subtopic') or (c['exam'],c['subjectId']) not in scopes:continue
            hits=match_pages(c,pages,rules)
            if hits:observed[c['id']]=hits
        existing={a['categoryId'] for a in source['automaticLabels']['assignments']}
        targets=list(existing|observed.keys())
        topic_pages={p['page'] for hits in observed.values() for p in hits}
        assignments = []
        for category_id in sorted(targets):
            c = categories[category_id]
            hits = match_pages(c, pages, rules)
            if not hits:
                continue
            ranges=bounded_ranges(hits,pages,topic_pages)
            assignments.append({'categoryId': c['id'], 'relation':'PRIMARY', 'locatorStatus': 'ESTIMATED',
                'locatorReason': 'Gözlenen başlıktan sonraki konu başlığına kadar aday aralık; boş/okunamayan sayfada kesilir, içerik onayı değildir.',
                'boundaryEvidence':ranges,
                'locators': [{'type': 'PDF', 'sourceKey': key, 'pdfPageStart': r['start'], 'pdfPageEnd': r['end'], 'pageCount': record['pageCount']} for r in ranges],
                'evidence': [{'association': 'RELATION', 'reference': key, 'sourceVersion': sha, 'method': p['extractionMethod'],
                              'readability': 'NOT_MEASURED', 'page': p['page'], 'text': '; '.join(p['headings']),
                              **({'ocrTextSha256':p['ocrTextSha256'],'ocrModelSha256':ocr_model} if p.get('ocrStatus') else {})} for p in hits]})
        result[key] = {'sourceSha256': sha, 'coverageStatus': 'CANDIDATE_SECTIONS_AND_MANUAL_EXCEPTIONS', 'assignments': assignments,
                       'parseWarnings': record.get('parseWarnings', 'NOT_RECORDED_IN_EARLY_CACHE'),
                       'pagesScanned': record['pageCount'],
                       'textLayerPagesNeedingOcr': [p['page'] for p in record['pages'] if p['needsOcr']],
                       'pagesNeedingOcr': [p['page'] for p in pages if p['needsOcr'] and not p.get('ocrStatus')],
                       'ocrPagesProcessed': [p['page'] for p in pages if p.get('ocrStatus')],
                       'ocrUnreadableOrBlankPages': [p['page'] for p in pages if p.get('ocrStatus') and p['ocrStatus']!='EXTRACTED'],
                       'manualReviewPages': [{'page':p['page'],'status':'NEEDS_MANUAL_REVIEW',
                           'label':'Boş/okunamayan' if p.get('ocrStatus')=='BLANK_CANDIDATE' else 'Görsel/okunamayan',
                           'reason':'Renderda boş sayfa adayı; manuel kontrol gerekli.' if p.get('ocrStatus')=='BLANK_CANDIDATE' else
                                    'Alternatif çıkarımdan sonra içerik kapsamı doğrulanamadı; manuel kontrol gerekli.'}
                           for p in pages if p.get('ocrStatus') and p['ocrStatus']!='EXTRACTED'],
                       'answerKeyPages': [p['page'] for p in record['pages'] if p['format'] == 'CEVAP_ANAHTARI']}
    output = {'version': 1, 'extractorVersion': EXTRACTOR, 'items': result, 'exceptions': exceptions}
    temp = STATE / 'pdf-locations.tmp'
    temp.write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    temp.replace(STATE / 'pdf-locations.json')
    assets = {row['sourceSha256']: row for row in result.values()}
    report = {'version': 1, 'status': 'REQUIRES_REVIEW', 'stats': dict(stats), 'catalogRecords': len(pdf['items']),
        'scannedReferences': len(result), 'scannedAssets': len(assets),
        'textLayerPagesScanned': sum(r['pagesScanned'] for r in assets.values()),
        'pagesNeedingOcr': sum(len(r['pagesNeedingOcr']) for r in assets.values()),
        'ocrPagesProcessed': sum(len(r['ocrPagesProcessed']) for r in assets.values()),
        'ocrUnreadableOrBlankPages': sum(len(r['ocrUnreadableOrBlankPages']) for r in assets.values()),
        'relationsWithHeadingAnchors': sum(len(r['assignments']) for r in result.values()),
        'exceptions': exceptions, 'elapsedSeconds': round(time.monotonic() - started, 2),
        'modelCalls': 0, 'ocrCalls': 0, 'fullTopicRangesVerified': 0}
    (STATE / 'pdf-location-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k != 'exceptions'}, ensure_ascii=False))
    if args.check and any(r['reason'] == 'PENDING_TEXT_LAYER_SCAN' for r in exceptions):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
