"""Read the four explicit source roots; hash files and bounded ZIP PDF members."""
from collections import Counter
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import tempfile
import zipfile

from yks_birlestirme import SOURCE_ROOTS, digest, signature, write_json, read_json

MAX_MEMBER = 2 * 1024**3
MAX_ZIP_PDF_BYTES = 20 * 1024**3
VERSION = 1


def tree_snapshot(roots):
    files, links = [], []
    for source in roots:
        root = Path(source).resolve()
        if not root.is_dir():
            raise ValueError('Missing source root: ' + str(root))
        for current, directories, names in os.walk(root, followlinks=False):
            for name in list(directories):
                path = Path(current) / name
                if path.is_symlink() or (hasattr(path, 'is_junction') and path.is_junction()):
                    links.append({'root': str(root), 'path': path.relative_to(root).as_posix(), 'target': str(path.resolve())})
                    directories.remove(name)
            for name in names:
                path = Path(current) / name
                if path.is_symlink():
                    links.append({'root': str(root), 'path': path.relative_to(root).as_posix(), 'target': str(path.resolve())})
                    continue
                if not path.resolve().is_relative_to(root):
                    raise ValueError('Source path escapes root')
                stat = path.stat()
                files.append({'root': str(root), 'path': path.relative_to(root).as_posix(), 'bytes': stat.st_size,
                              'mtimeNs': stat.st_mtime_ns, 'device': stat.st_dev, 'inode': stat.st_ino})
    return sorted(files, key=lambda r: (r['root'], r['path'])), sorted(links, key=lambda r: (r['root'], r['path']))


def role(row):
    path = PurePosixPath(row['path'])
    if path.suffix.lower() in ('.part', '.tmp', '.lock', '.pyc'):
        return 'INCOMPLETE_OR_CONTROL'
    if '_araclar' in path.parts or path.name in {'konu.html', 'index.html', 'ICINDEKILER.md'} or len(path.parts) == 1 and path.suffix.lower() in {'.json', '.jsonl', '.txt', '.md'}:
        return 'CATALOG_OR_OPERATIONAL'
    if path.suffix.lower() in {'.pdf', '.zip', '.mp4', '.mp3', '.m3u8', '.xlsx', '.xls', '.docx', '.html'}:
        return 'SOURCE_RESOURCE'
    return 'OTHER_PRESERVED'


def safe_member(name):
    normalized = name.replace('\\', '/')
    path = PurePosixPath(normalized)
    if not normalized or '\x00' in normalized or path.is_absolute() or '..' in path.parts or ':' in normalized:
        raise ValueError('Unsafe ZIP member path')
    return path.as_posix()


def zip_pdf_members(source, source_sha, max_member=MAX_MEMBER, max_total=MAX_ZIP_PDF_BYTES):
    result, errors = [], []
    total = 0
    def visit(archive, prefix='', depth=0):
        nonlocal total
        if depth > 3:
            raise ValueError('Nested ZIP depth exceeded')
        for info in archive.infolist():
            if info.is_dir():
                continue
            try:
                name = safe_member(info.filename)
                if info.flag_bits & 1:
                    raise ValueError('Encrypted ZIP member')
                if PurePosixPath(name).suffix.lower() not in ('.pdf', '.zip'):
                    continue
                if info.file_size > max_member or info.file_size > max(1, info.compress_size) * 1000:
                    raise ValueError('ZIP member expansion limit exceeded')
                total += info.file_size
                if total > max_total:
                    raise ValueError('Archive expansion budget exceeded')
                locator = prefix + name
                with archive.open(info) as stream:
                    if name.lower().endswith('.pdf'):
                        sha = hashlib.file_digest(stream, 'sha256').hexdigest()
                        result.append({'kind': 'ZIP_PDF', 'containerSha256': source_sha, 'member': locator,
                                       'sha256': sha, 'bytes': info.file_size, 'crc32': info.CRC})
                    else:
                        with tempfile.SpooledTemporaryFile(max_size=16 * 1024**2) as nested:
                            while chunk := stream.read(1024**2):
                                nested.write(chunk)
                            nested.seek(0)
                            with zipfile.ZipFile(nested) as child:
                                visit(child, locator + '!/', depth + 1)
            except (ValueError, OSError, zipfile.BadZipFile, RuntimeError) as exc:
                errors.append({'member': prefix + info.filename, 'error': str(exc)})
    try:
        with zipfile.ZipFile(source) as archive:
            visit(archive)
    except (OSError, zipfile.BadZipFile) as exc:
        errors.append({'member': None, 'error': str(exc)})
    return result, errors


def inventory(roots, folder, checkpoint, cache=None):
    before, links = tree_snapshot(roots)
    observations, errors = [], []
    cache = dict(cache or {})
    total = len(before)
    for index, entry in enumerate(before, 1):
        path = Path(entry['root']) / entry['path']
        identity = signature([entry['device'], entry['inode'] or str(path), entry['bytes'], entry['mtimeNs']])
        observation = {**entry, 'kind': 'FILE', 'role': role(entry)}
        try:
            if identity not in cache:
                cache[identity] = digest(path)
            observation['sha256'] = cache[identity]
            after = path.stat()
            if (after.st_size, after.st_mtime_ns) != (entry['bytes'], entry['mtimeNs']):
                raise ValueError('Source changed during hashing')
            observations.append(observation)
            if path.suffix.lower() == '.zip':
                members, archive_errors = zip_pdf_members(path, observation['sha256'])
                observations.extend({**m, 'root': entry['root'], 'path': entry['path'], 'role': 'SOURCE_RESOURCE'} for m in members)
                errors.extend({'path': str(path), **e} for e in archive_errors)
        except (OSError, ValueError) as exc:
            errors.append({'path': str(path), 'error': str(exc)})
        if index % 100 == 0 or index == total:
            write_json(folder / 'hash-cache.json', cache)
            checkpoint({'processed': index, 'total': total, 'cache': str(folder / 'hash-cache.json')})
            print(f'Inventory: {index}/{total} paths', flush=True)
    after, after_links = tree_snapshot(roots)
    if signature([before, links]) != signature([after, after_links]):
        errors.append({'error': 'Source tree changed during inventory'})
    path = folder / 'inventory.jsonl'
    with path.open('w', encoding='utf-8') as output:
        for item in observations:
            output.write(json.dumps(item, ensure_ascii=False) + '\n')
    write_json(folder / 'source-links.json', links)
    report = {'status': 'FAIL' if errors else 'PASS', 'version': VERSION, 'physicalPaths': total,
              'observations': len(observations), 'zipPdfMembers': sum(r['kind'] == 'ZIP_PDF' for r in observations),
              'uniqueContentHashes': len({r['sha256'] for r in observations if r.get('sha256')}),
              'physicalBytesIncludingAliases': sum(r['bytes'] for r in before),
              'roles': dict(Counter(r['role'] for r in observations)), 'errors': errors,
              'sourceTreeSignature': signature([before, links]), 'originalFilesChangedByStage': 0}
    write_json(folder / 'inventory-report.json', report)
    return report


def inputs(app, store, state):
    files, links = tree_snapshot(state['sourceRoots'])
    return {'version': VERSION, 'fileBase': str(app), 'files': {'scripts/yks_stages/stage_02.py': digest(Path(__file__))},
            'sourceTreeSignature': signature([files, links]), 'physicalPaths': len(files)}


def operation(app, store, state):
    expected = inputs(app, store, state)['sourceTreeSignature']
    def perform(folder, cursor, checkpoint):
        files, links = tree_snapshot(state['sourceRoots'])
        if signature([files, links]) != expected:
            raise ValueError('Source snapshot changed before inventory')
        cache = None
        if cursor and cursor.get('cache'):
            previous = Path(cursor['cache']).resolve()
            if not previous.is_relative_to(store.child(state['runId'])):
                raise ValueError('Resume cache escapes run')
            if previous.is_file():
                cache = read_json(previous)
        report = inventory(state['sourceRoots'], folder, checkpoint, cache)
        return {'status': report['status'], 'artifacts': [folder / p for p in ['inventory.jsonl', 'inventory-report.json', 'source-links.json', 'hash-cache.json']],
                'summary': {k: report[k] for k in ['physicalPaths', 'zipPdfMembers', 'uniqueContentHashes']},
                'nextAction': 'YKS-03 exact duplicates and existing processing coverage'}
    return perform
