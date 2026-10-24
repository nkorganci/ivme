"""Copy a downloaded PDF into main's intake only if its bytes are new.

The shared Kaynaklar tree is read-only here. Archived PDFs remain deduplication
sources even when they are hidden from the normal PDF inventory.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

APP = Path(__file__).resolve().parents[1]
SHARED = APP.parent / 'Kaynaklar'
ARCHIVE = APP / 'veri/pdf-arsiv'
INTAKE = APP / 'veri/pdf-gelen'
CATALOG = APP / 'backend/src/main/resources/pdf-review-labels.json'


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def known_files():
    for item in json.loads(CATALOG.read_text(encoding='utf-8'))['items']:
        root = SHARED if item.get('sourceScope') == 'RESOURCES' else SHARED / 'ogm-materyal'
        path = root / item['relativePath']
        if path.is_file():
            yield path, item.get('sourceSha256', '')
    for root in (ARCHIVE, INTAKE):
        if root.exists():
            for path in root.rglob('*.pdf'):
                if path.is_file():
                    yield path, ''


def copy_pdf(source, name):
    source = source.resolve(strict=True)
    if not source.is_file() or source.suffix.casefold() != '.pdf':
        raise ValueError('Geçerli bir PDF dosyası gerekli.')
    with source.open('rb') as stream:
        if stream.read(5) != b'%PDF-':
            raise ValueError('Geçerli bir PDF dosyası gerekli.')
    digest = sha256(source)
    for existing, recorded_hash in known_files():
        if existing.stat().st_size == source.stat().st_size and (not recorded_hash or recorded_hash == digest) and sha256(existing) == digest:
            return {'status': 'duplicate', 'sha256': digest, 'existing': str(existing)}
    safe_name = Path(name or source.name).name
    if safe_name != (name or source.name) or not safe_name.lower().endswith('.pdf'):
        raise ValueError('Dosya adı yalnız PDF adı olabilir.')
    INTAKE.mkdir(parents=True, exist_ok=True)
    target = INTAKE / f'{digest[:16]}-{safe_name}'
    if target.exists():
        if sha256(target) == digest:
            return {'status': 'duplicate', 'sha256': digest, 'existing': str(target)}
        raise FileExistsError(target)
    temporary = target.with_suffix('.pdf.part')
    with source.open('rb') as input_file, temporary.open('xb') as output_file:
        shutil.copyfileobj(input_file, output_file)
    if sha256(temporary) != digest:
        temporary.unlink()
        raise IOError('Kopya hash kontrolü başarısız.')
    temporary.replace(target)
    return {'status': 'copied', 'sha256': digest, 'target': str(target)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--name')
    args = parser.parse_args()
    print(json.dumps(copy_pdf(args.source, args.name), ensure_ascii=False))
