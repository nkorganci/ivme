"""Read-only source inspection used to reconcile the shared label inventory."""
import json
from collections import Counter
from pathlib import Path
import pymupdf

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent

def main():
    payload = json.loads((APP / 'veri/content-labels/labels.json').read_text(encoding='utf8'))
    cats = {c['id']: c for c in payload['categories']}
    print('BASIS', Counter(i['automaticLabels']['basis'] for i in payload['items']))
    print('REASONS', Counter(r for i in payload['items'] for r in i['automaticLabels']['reviewReasons']))
    generic = [i['key'] for i in payload['items'] if all(cats[a['categoryId']]['topic'] == 'Dersin genel kapsamı'
        for a in i['automaticLabels']['assignments'])]
    print('GENERIC', len(generic), generic[:30])
    inv = json.loads((APP / 'veri/content-labels/source-inventory.json').read_text(encoding='utf8'))
    known = {q['code'] for q in inv['questions']}
    raw_codes = set()
    for path in (ROOT / 'veri-hatti/ogm-sorular/kayit').glob('*.json'):
        data = json.loads(path.read_text(encoding='utf8'))
        raw_codes.update(str(r['id']) for r in (data if isinstance(data,list) else data.get('kayitlar',data.get('sorular',[]))) if r.get('id'))
    print('RAW_ONLY', len(raw_codes-known), sorted(raw_codes-known)[:20])
    for path in sorted((ROOT / 'Kaynaklar').rglob('*.pdf')):
        if 'ogm-materyal' in path.parts:
            continue
        with pymupdf.open(path) as doc:
            print('\nPDF', path.relative_to(ROOT).as_posix(), 'PAGES', len(doc))
            print('TOC', doc.get_toc()[:35])
            for n in range(min(3, len(doc))):
                print('PAGE', n+1, doc[n].get_text()[:4000])

if __name__ == '__main__':
    main()
