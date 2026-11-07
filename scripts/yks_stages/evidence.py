"""Preserve bank image/content files once by content hash without modifying them."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import zipfile

from yks_birlestirme import APP, Store, digest, write_json

SUFFIXES = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.pdf', '.json', '.js', '.mjs', '.csv', '.md', '.txt'}


def backup_files(project, roots, folder):
    project, folder = Path(project).resolve(), Path(folder).resolve()
    folder.mkdir(parents=True, exist_ok=True)
    archive = folder / 'bank-images-content.zip'
    manifest = folder / 'bank-images-content.json'
    partial = folder / 'bank-images-content.zip.part'
    entries, links, objects, identities = [], [], {}, {}
    with zipfile.ZipFile(partial, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=1) as output:
        for root in roots:
            root = Path(root).resolve()
            if not root.is_relative_to(project):
                raise ValueError('Source root escapes project')
            if not root.exists():
                continue
            for current, directories, files in os.walk(root, followlinks=False):
                for name in list(directories):
                    p = Path(current) / name
                    if p.is_symlink() or (hasattr(p, 'is_junction') and p.is_junction()):
                        links.append({'path': str(p.relative_to(project)), 'target': str(p.resolve())})
                        directories.remove(name)
                for name in files:
                    path = Path(current) / name
                    if path.suffix.lower() not in SUFFIXES:
                        continue
                    if path.is_symlink():
                        links.append({'path': str(path.relative_to(project)), 'target': str(path.resolve())})
                        continue
                    if not path.resolve().is_relative_to(project):
                        raise ValueError('Source file escapes project')
                    before = path.stat()
                    identity = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)
                    sha = identities.get(identity)
                    if sha is None:
                        sha = digest(path)
                        identities[identity] = sha
                    if sha not in objects:
                        if shutil.disk_usage(folder).free < 20 * 1024**3 + before.st_size:
                            raise RuntimeError('Disk reserve reached while preserving evidence')
                        member = 'objects/' + sha
                        output.write(path, member)
                        objects[sha] = before.st_size
                    after = path.stat()
                    if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
                        raise ValueError('Source changed while being backed up')
                    entries.append({'path': path.relative_to(project).as_posix(), 'sha256': sha, 'bytes': before.st_size})
                    if len(entries) % 10000 == 0:
                        print(f'Evidence: {len(entries)} paths, {len(objects)} unique objects', flush=True)
    print('Evidence: validating archived bytes', flush=True)
    with zipfile.ZipFile(partial) as check:
        for info in check.infolist():
            with check.open(info) as stream:
                sha = hashlib.file_digest(stream, 'sha256').hexdigest()
            if info.filename != 'objects/' + sha:
                raise ValueError('Evidence object checksum mismatch')
    os.replace(partial, archive)
    report = {'status': 'PASS', 'archiveSha256': digest(archive), 'archiveBytes': archive.stat().st_size,
              'files': entries, 'links': links, 'uniqueObjects': len(objects),
              'uniqueBytes': sum(objects.values()), 'restoredObjectHashesVerified': True,
              'originalFilesChanged': 0}
    write_json(manifest, report)
    return report


def main():
    store = Store(APP / 'veri/yks-birlestirme')
    state = store.current()
    record = state['stages']['YKS-01:full']
    if record['status'] != 'RUNNING':
        raise ValueError('Evidence backup must join the active YKS-01 attempt')
    folder = store.child(state['runId'] + f'/yks-01/full/attempt-{record["attempt"]:04}')
    report = backup_files(APP.parent, [APP / 'veri/resimler-pilot', APP.parent / 'icerik'], folder)
    print(json.dumps({'status': report['status'], 'paths': len(report['files']),
                      'objects': report['uniqueObjects'], 'bytes': report['archiveBytes']}), flush=True)


if __name__ == '__main__':
    main()
