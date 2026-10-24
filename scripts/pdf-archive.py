"""Archive a fully reviewed PDF for main, keeping the shared source untouched.

Review JSON: sourceSha256, catalogIds, codes, allQuestionsReviewed=true,
referencesReviewed=true.
All source questions must be listed and already proven in the live bank. This
script also refuses any current PDF content item or published topic PDF link.
"""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

APP = Path(__file__).resolve().parents[1]
SHARED = APP.parent / 'Kaynaklar'
ARCHIVE = APP / 'veri/pdf-arsiv'
AUDIT = APP / 'backend/src/main/resources/pdf-bank-audit.json.gz'
PSQL = Path('C:/Program Files/PostgreSQL/18/bin/psql.exe')


def database(sql, **variables):
    env = os.environ.copy()
    env['PGPASSWORD'] = os.environ.get('IVME_DB_PASSWORD', 'root')
    command = [str(PSQL), '-h', 'localhost', '-U', os.environ.get('IVME_DB_USER', 'root'),
               '-d', 'ivme', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1']
    for key, value in variables.items():
        command.extend(['-v', f'{key}={value}'])
    result = subprocess.run(command + ['-f', '-'], input=sql, env=env, check=True, capture_output=True,
                            text=True, encoding='utf-8')
    return result.stdout.strip()


def digest(path):
    sha = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            sha.update(block)
    return sha.hexdigest()


def archive(review_file, apply=False):
    review = json.loads(review_file.read_text(encoding='utf-8'))
    audit = json.load(gzip.open(AUDIT, 'rt', encoding='utf-8'))
    sha = review.get('sourceSha256', '')
    if not isinstance(sha, str) or len(sha) != 64 or any(c not in '0123456789abcdef' for c in sha):
        raise ValueError('Kaynak SHA-256 geçersiz.')
    rows = [row for row in audit['pdfs'] if row['sha256'] == sha]
    ids = sorted(row['id'] for row in rows)
    codes = sorted({item['code'] for row in rows for item in row['proof']})
    if not rows or ids != sorted(review.get('catalogIds', [])) or not codes:
        raise ValueError('Katalog kimlikleri veya canlı banka soru kanıtı eksik.')
    if (codes != sorted(set(review.get('codes', []))) or review.get('allQuestionsReviewed') is not True
            or review.get('referencesReviewed') is not True):
        raise ValueError('Tam soru dökümü ve sayfa incelemesi onayı gerekli.')
    if any(not row['available'] or row['hashVerified'] is not True or row['candidateCount'] for row in rows):
        raise ValueError('Kaynak dosyası, hash veya henüz aktarılmamış adaylar uygun değil.')
    path = SHARED / (rows[0]['relativePath'] if rows[0]['sourceScope'] == 'RESOURCES'
                     else 'ogm-materyal/' + rows[0]['relativePath'])
    if not path.is_file() or digest(path) != sha:
        raise ValueError('Kaynak PDF SHA-256 eşleşmiyor.')
    count, updated = database("SELECT count(*) FILTER (WHERE active), extract(epoch from max(updated_at))::text FROM questions").split('|')
    if int(count) != audit['liveQuestionCount'] or updated != audit['bankMaxUpdatedAt']:
        raise ValueError('Soru bankası denetimden sonra değişmiş.')
    for row in rows:
        if database("SELECT count(*) FROM learning_catalog.current_items WHERE item_key=:'key'", key=f"pdf:{row['id']}") != '0':
            raise ValueError(f"PDF {row['id']} hâlâ güncel içerik kataloğunda.")
        for file in ('topic-pdf-links.json', 'curriculum-pdf-links.json'):
            linked = json.loads((APP / 'backend/src/main/resources' / file).read_text(encoding='utf-8'))
            if any(link.get('catalogId') == row['id'] for link in linked['links']):
                raise ValueError(f"PDF {row['id']} yayımlanmış konu bağlantısında: {file}")
    if database("SELECT count(*) FROM learning_catalog.current_items WHERE kind <> 'QUESTION' AND data::text LIKE '%' || :'sha' || '%'", sha=sha) != '0':
        raise ValueError('PDF hash kimliği başka güncel içerikte kullanılıyor.')
    result = {'sourceSha256': sha, 'catalogIds': ids, 'questionCount': len(codes),
              'archivePath': str(ARCHIVE / f'{sha}.pdf'), 'status': 'ready'}
    if not apply:
        return result
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    target = ARCHIVE / f'{sha}.pdf'
    if target.exists() and digest(target) != sha:
        raise ValueError('Arşivde aynı isimde farklı içerik var.')
    if not target.exists():
        temporary = target.with_suffix('.pdf.part')
        with path.open('rb') as source, temporary.open('xb') as output:
            shutil.copyfileobj(source, output)
        if digest(temporary) != sha:
            temporary.unlink()
            raise IOError('Arşiv kopyası hash kontrolünden geçmedi.')
        temporary.replace(target)
    database("""INSERT INTO learning_catalog.pdf_archive
             (source_sha256,archive_relative_path,original_relative_path,question_count,proof_codes)
             VALUES (:'sha',:'archive',:'original',:count,:'codes'::jsonb)
             ON CONFLICT (source_sha256) DO NOTHING""",
             sha=sha, archive=target.relative_to(APP).as_posix(),
             original=path.relative_to(SHARED).as_posix(), count=len(codes),
             codes=json.dumps(codes, ensure_ascii=False))
    result['status'] = 'archived'
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('review', type=Path)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    print(json.dumps(archive(args.review, args.apply), ensure_ascii=False))
