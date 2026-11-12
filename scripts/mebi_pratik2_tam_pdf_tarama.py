"""Cache native text/geometry for ALL inventoried PDFs; never accept questions."""
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
import pymupdf
from yks_birlestirme import write_json

APP = Path(__file__).resolve().parents[1]
BASE = APP / 'veri/mebi-pratik-2/20261111-source-inventory'
SOURCE = Path(r'D:\workspace\mebi-yks').resolve()


def discover_page(page):
    lines = []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            lines.append({'text': ''.join(s['text'] for s in line['spans']), 'bbox': list(line['bbox'])})
    text = '\n'.join(line['text'] for line in lines)
    return {'rect': list(page.rect), 'lines': lines,
            'numberSignals': sum(bool(re.match(r'^\s*\d{1,3}\s*[.)]', l['text'])) for l in lines),
            'keyHeadingSignal': bool(re.search(r'cevap\s*anahtar', text, re.I)),
            'readingStatus': 'NATIVE_TEXT_AVAILABLE' if text.strip() else 'VISUAL_REVIEW_REQUIRED'}


def run():
    inventory = BASE / 'inventory.json'
    items = json.loads(inventory.read_text(encoding='utf-8'))['items']
    cache = BASE / 'full-pdf-native'; cache.mkdir(exist_ok=True)
    rows = []; counts = Counter()
    for item in items:
        if item['extension'] != '.pdf': continue
        path = (SOURCE / item['relativePath']).resolve()
        if not path.is_relative_to(SOURCE): raise ValueError('Unsafe source path')
        sha = item['sha256']
        if not sha: raise ValueError('Full inventory hash required')
        target = cache / (sha + '.json')
        if target.is_file():
            data = json.loads(target.read_text(encoding='utf-8'))
            if data['version'] != 1 or data['sourceSha256'] != sha: raise ValueError('Invalid cache')
        else:
            with path.open('rb') as stream: current = hashlib.file_digest(stream, 'sha256').hexdigest()
            data = {'version': 1, 'sourceSha256': sha, 'status': 'SOURCE_CHANGED', 'pages': []}
            if current == sha:
                try:
                    with pymupdf.open(path) as pdf:
                        data['pages'] = [{'physicalPage': n+1, **discover_page(p)} for n,p in enumerate(pdf)]
                    data['status'] = 'SCANNED'
                except Exception as error:
                    data.update(status='SOURCE_UNREADABLE', errorType=type(error).__name__)
            write_json(target, data)
        counts[data['status']] += 1
        counts['pages'] += len(data['pages'])
        counts['visualReviewPages'] += sum(p['readingStatus']=='VISUAL_REVIEW_REQUIRED' for p in data['pages'])
        rows.append({'relativePath': item['relativePath'], 'sourceSha256': sha,
                     'cache': str(target.relative_to(BASE)), 'status': data['status'],
                     'pageCount': len(data['pages']), 'studentVisible': False})
        if len(rows) % 50 == 0:
            progress = {'documents':len(rows), 'counts':dict(counts)}
            write_json(BASE/'full-pdf-progress.json', progress); print(json.dumps(progress), flush=True)
    result = {'version':1, 'status':'DISCOVERY_COMPLETE', 'counts':dict(counts), 'documents':rows,
              'inventorySha256':hashlib.sha256(inventory.read_bytes()).hexdigest(),
              'acceptedQuestions':0, 'stage02Accepted':False,
              'remaining':['ZIP/HTML discovery','test/section identity and key geometry','question boundary validation']}
    write_json(BASE/'full-pdf-coverage.json', result)
    print(json.dumps({'status':result['status'],'documents':len(rows),'counts':dict(counts)}),flush=True)


if __name__ == '__main__': run()
