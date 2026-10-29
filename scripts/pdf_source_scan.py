"""Read every YKS PDF page once; cache observations by file hash and extractor version.

Observations identify pages needing question extraction. They never assert that a
numbered paragraph is a question or that a document is fully imported.
"""
import argparse
from collections import Counter
from concurrent.futures import ProcessPoolExecutor, as_completed
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import time
from functools import lru_cache

import pymupdf

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent / 'Kaynaklar'
OUT = APP / 'veri/pdf-source-registry'
VERSION = 'yks-page-observations-v1'
NUMBER = re.compile(r'^\s*(\d{1,3})\s*[.)]\s*(.*)$', re.S)
OPTION = re.compile(r'(?:^|\s)([A-E])\s*\)')
EXAMPLE = re.compile(r'\b(?:örnek|ornek|soru|alıştırma|alistirma|uygulama)\s*[:\-]?\s*(\d{1,3})', re.I)
ANSWER = re.compile(r'(?:cevap|yanıt|yanit)\s*[:\-]?\s*([A-E])\b', re.I)


def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(block)
    return value.hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + f'.tmp.{os.getpid()}')
    if path.suffix == '.gz':
        with gzip.open(temporary, 'wt', encoding='utf-8') as stream:
            json.dump(value, stream, ensure_ascii=False, separators=(',', ':'))
    else:
        temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def cache_path(sha):
    return OUT / 'pages' / sha[:2] / f'{sha}-{VERSION}.json.gz'


def read_scan(sha):
    with gzip.open(cache_path(sha), 'rt', encoding='utf-8') as stream:
        result = json.load(stream)
    if result['sha256'] != sha or result['version'] != VERSION:
        raise ValueError('Page cache identity mismatch')
    return result


@lru_cache(maxsize=1)
def ocr_model():
    from pdf_ocr_cache import model_hash
    return model_hash() if (APP/'veri/tessdata/tur.traineddata').exists() else None


def read_evidence_scan(sha, for_review=False):
    from pdf_ocr_cache import read_page
    result=read_scan(sha)
    model=ocr_model()
    identities=[]
    for page in result['pages']:
        if model and (ocr:=read_page(sha,page['page'],model)):
            page['ocr']=ocr
            identities.append([page['page'],ocr['extractorVersion'],ocr['modelSha256'],ocr['textSha256'],ocr['status']])
            if for_review and ocr['status'] in ('EXTRACTED','BLANK_VERIFIED'):
                page['rawTextSha256']=page['textSha256']
                page['text'],page['textSha256']=ocr['text'],ocr['textSha256']
                page['options']=sorted(set(OPTION.findall(page['text'])))
                page['questionSignal']=len(page['options'])>=3 or bool(EXAMPLE.search(page['text']))
                page['needsOcr']=False
    result['ocrEvidenceSha256']=hashlib.sha256(json.dumps(identities,separators=(',',':')).encode()).hexdigest()
    return result


def scan_one(source):
    path, sha = source
    if cache_path(sha).is_file():
        result = read_scan(sha)
        return {k: v for k, v in result.items() if k != 'pages'}, True
    pages = []
    try:
        with pymupdf.open(path) as document:
            for page in document:
                lines = []
                for block in page.get_text('dict', flags=pymupdf.TEXTFLAGS_TEXT)['blocks']:
                    for line in block.get('lines', []):
                        text = ''.join(s['text'] for s in line['spans']).strip()
                        if text:
                            lines.append({'text': text, 'bbox': [round(n, 2) for n in line['bbox']]})
                text = '\n'.join(line['text'] for line in lines)
                options = sorted(set(OPTION.findall(text)))
                anchors = [{'number': int(m[1]), 'bbox': line['bbox'], 'text': line['text']}
                           for line in lines if (m := NUMBER.match(line['text']))
                           and 0 < int(m[1]) <= 200]
                examples = [{'number': int(m[1]), 'bbox': line['bbox'], 'text': line['text']}
                            for line in lines if (m := EXAMPLE.search(line['text']))]
                pages.append({'page': page.number + 1, 'width': page.rect.width, 'height': page.rect.height,
                              'text': text, 'textSha256': hashlib.sha256(text.encode()).hexdigest(),
                              'chars': len(text.strip()), 'options': options, 'anchors': anchors,
                              'examples': examples, 'answers': ANSWER.findall(text),
                              'needsOcr': len(text.strip()) < 25,
                              'questionSignal': len(options) >= 3 or bool(examples)})
        result = {'sha256': sha, 'version': VERSION, 'pageCount': len(pages),
                  'questionSignalPages': [p['page'] for p in pages if p['questionSignal']],
                  'ocrPages': [p['page'] for p in pages if p['needsOcr']],
                  'numberAnchors': sum(len(p['anchors']) for p in pages),
                  'exampleAnchors': sum(len(p['examples']) for p in pages), 'pages': pages, 'error': None}
    except Exception as error:
        result = {'sha256': sha, 'version': VERSION, 'pageCount': 0, 'questionSignalPages': [],
                  'ocrPages': [], 'pages': [], 'error': f'{type(error).__name__}: {error}'}
    write_json(cache_path(sha), result)
    return {k: v for k, v in result.items() if k != 'pages'}, False


def scan(workers=4):
    # KPSS has a separate track and is deliberately outside this YKS operation.
    paths = sorted(p for folder in ('ogm-materyal', 'yks-cikmis-sorular', 'mufredat')
                   for p in (ROOT / folder).rglob('*.pdf'))
    previous_path = OUT / 'manifest.json'
    previous = {r['path']: r for r in json.loads(previous_path.read_text(encoding='utf-8'))['files']} if previous_path.exists() else {}
    files, unique = [], {}
    for path in paths:
        relative = path.relative_to(ROOT).as_posix()
        stat = path.stat()
        old = previous.get(relative, {})
        sha = old.get('sha256') if (old.get('size'), old.get('mtimeNs')) == (stat.st_size, stat.st_mtime_ns) else digest(path)
        files.append({'path': relative, 'sha256': sha, 'size': stat.st_size, 'mtimeNs': stat.st_mtime_ns})
        unique.setdefault(sha, str(path))
    write_json(previous_path, {'version': VERSION, 'files': files})
    results, cached = [], 0
    started = time.monotonic()
    with ProcessPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(scan_one, (path, sha)) for sha, path in unique.items()]
        for future in as_completed(futures):
            row, hit = future.result()
            results.append(row)
            cached += hit
            if len(results) % 100 == 0:
                print(f'Scanned {len(results)}/{len(unique)} unique PDFs ({cached} cache hits)', flush=True)
    results.sort(key=lambda r: r['sha256'])
    summary = {'version': VERSION, 'files': len(files), 'uniqueFiles': len(unique),
               'pages': sum(r['pageCount'] for r in results), 'cached': cached,
               'questionSignalPdfs': sum(bool(r['questionSignalPages']) for r in results),
               'questionSignalPages': sum(len(r['questionSignalPages']) for r in results),
               'ocrPages': sum(len(r['ocrPages']) for r in results),
               'errors': [r for r in results if r['error']], 'elapsedSeconds': round(time.monotonic() - started, 1),
               'documents': results}
    write_json(OUT / 'scan.json', summary)
    print(json.dumps({k: v for k, v in summary.items() if k != 'documents'}, ensure_ascii=False), flush=True)
    return summary


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workers', type=int, default=4)
    args = parser.parse_args()
    scan(args.workers)
