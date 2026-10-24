"""Build a conservative, reproducible PDF → live question-bank audit.

Only an exact source file and a live question code count as bank evidence.
Run from this worktree; the source PDFs are never modified.
"""
import collections
import csv
import datetime as dt
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT.parent / 'Kaynaklar'
PDF_LABELS = ROOT / 'backend/src/main/resources/pdf-review-labels.json'
QUESTION_INVENTORY = ROOT / 'veri/content-labels/source-inventory.json'
OUTPUT = ROOT / 'backend/src/main/resources/pdf-bank-audit.json.gz'
PSQL = Path('C:/Program Files/PostgreSQL/18/bin/psql.exe')


def canonical(value):
    value = (value or '').replace('\\', '/').strip().lower()
    for prefix in ('kaynaklar/ogm-materyal/', 'kaynaklar/'):
        if value.startswith(prefix):
            return value[len(prefix):]
    return value


def category(item):
    title = item.get('title', '').casefold()
    source = item.get('source', '').casefold()
    label = ' '.join([source, title, item.get('relativePath', '')]).casefold()
    if 'cevap anahtar' in title:
        return 'Cevap anahtarı'
    if any(word in label for word in ('soru bank', 'soru kitap', 'tarama testi', 'pekiştirme', 'pekistirme', 'yks kampı test', 'yks kampi test')):
        return 'Soru'
    if any(word in title for word in ('çıkmış soru', 'cikmis soru')):
        return 'Soru'
    if 'deneme' in source or 'genel denemeler/' in label:
        return 'Deneme / çıkmış soru'
    if any(word in label for word in ('konu özeti', 'konu ozeti', 'konu özetleri', 'konu ozetleri')):
        return 'Konu özeti'
    if any(word in label for word in ('sunum', 'sunu')):
        return 'Sunu'
    if any(word in label for word in ('konu anlatım', 'konu anlatim')):
        return 'Konu anlatımı'
    return 'Diğer / incele'


def live_questions():
    env = os.environ.copy()
    env['PGPASSWORD'] = os.environ.get('IVME_DB_PASSWORD', 'root')
    command = [str(PSQL), '-h', 'localhost', '-U', os.environ.get('IVME_DB_USER', 'root'),
               '-d', 'ivme', '-X', '-q', '-A', '-F', '\t', '-c',
               "COPY (SELECT code, active, extract(epoch from updated_at)::text AS source_stamp FROM questions) TO STDOUT WITH CSV HEADER"]
    result = subprocess.run(command, env=env, check=True, capture_output=True, text=True, encoding='utf-8')
    return {row['code']: row for row in csv.DictReader(io.StringIO(result.stdout))}


def main():
    labels = json.loads(PDF_LABELS.read_text(encoding='utf-8'))['items']
    inventory = json.loads(QUESTION_INVENTORY.read_text(encoding='utf-8'))
    current = live_questions()
    by_path = collections.defaultdict(dict)
    for question in inventory['questions']:
        code = question['code']
        live = current.get(code)
        if not live or live['active'] != 't' or live['source_stamp'] != question.get('updated_at'):
            continue
        original = question.get('original') or {}
        archive = question.get('archive') or {}
        path = canonical(original.get('file') or archive.get('source_file'))
        if not path.endswith('.pdf'):
            continue
        page = original.get('page') or archive.get('source_page')
        try:
            page = int(page) if page else None
        except (TypeError, ValueError):
            page = None
        by_path[path][code] = {'code': code, 'page': page, 'bank': question.get('bank', ''),
                                'sourceRef': original.get('rawRef') or archive.get('evidence_ref') or ''}

    rows = []
    catalog_paths = set()
    for item in labels:
        path = item.get('relativePath', '')
        scope = item.get('sourceScope', 'OGM')
        key = canonical(('kaynaklar/' if scope == 'RESOURCES' else 'kaynaklar/ogm-materyal/') + path)
        # Supplementary paths retain their root (e.g. yks-cikmis-sorular/...).
        proofs = sorted(by_path.get(key, {}).values(), key=lambda x: x['code'])
        physical = ARCHIVE / (path if scope == 'RESOURCES' else 'ogm-materyal/' + path)
        catalog_paths.add(physical.relative_to(ARCHIVE).as_posix().casefold())
        kind = category(item)
        hash_verified = None
        if proofs and physical.is_file():
            digest = hashlib.sha256()
            with physical.open('rb') as stream:
                for block in iter(lambda: stream.read(1024 * 1024), b''):
                    digest.update(block)
            hash_verified = digest.hexdigest() == item.get('sourceSha256', '')
        rows.append({'id': item['catalogId'], 'title': item['title'], 'exam': item.get('exam', ''),
                     'subject': item.get('subject', ''), 'category': kind, 'source': item.get('source', ''),
                     'pages': item.get('pageCount'), 'available': physical.is_file(),
                     'hashVerified': hash_verified,
                     'questionCount': len(proofs), 'proof': proofs,
                     'status': ('Kanıtlı banka sorusu var' if hash_verified else 'PDF hash kontrolü gerekli') if proofs else
                               ('PDF–soru bağı doğrulanmadı' if kind in ('Soru', 'Deneme / çıkmış soru')
                                else 'Soru bağı yok'),
                     'sha256': item.get('sourceSha256', ''), 'relativePath': path, 'sourceScope': scope})

    physical_paths = {path.relative_to(ARCHIVE).as_posix().casefold() for path in ARCHIVE.rglob('*.pdf')}
    unlisted = physical_paths - catalog_paths
    if unlisted:
        raise RuntimeError(f'{len(unlisted)} physical PDFs are missing from the catalog: {sorted(unlisted)[:5]}')
    # The PDF inventory is the identity source; the live questions table proves membership.
    result = {'version': 1, 'auditedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
              'questionInventorySha256': hashlib.sha256(QUESTION_INVENTORY.read_bytes()).hexdigest(),
              'pdfLabelsSha256': hashlib.sha256(PDF_LABELS.read_bytes()).hexdigest(),
              'liveQuestionCount': sum(row['active'] == 't' for row in current.values()),
              'physicalPdfCount': len(physical_paths),
              'bankMaxUpdatedAt': max(row['source_stamp'] for row in current.values()), 'pdfs': rows}
    with gzip.open(OUTPUT, 'wt', encoding='utf-8', compresslevel=9) as stream:
        json.dump(result, stream, ensure_ascii=False, separators=(',', ':'))
    counts = collections.Counter(row['status'] for row in rows)
    print(f"PDF kayıtları: {len(rows)}; canlı sorular: {result['liveQuestionCount']}; "
          + ', '.join(f'{name}: {count}' for name, count in counts.items()))
    print(f"Kanıt dosyası: {OUTPUT}")


if __name__ == '__main__':
    main()
