"""Read-only full PDF page preflight. Reuses existing content-addressed scan caches.

This independent preparation does not complete YKS-07, approve answers or import
questions. Its page observations remain reusable after the archive is prepared.
"""
import argparse
from concurrent.futures import ProcessPoolExecutor, as_completed
import json
from pathlib import Path
import shutil
import tempfile
import time
import zipfile

from yks_birlestirme import Store, digest, process_lock, read_json, write_json
from yks_stages.database import RESERVE
from yks_stages.stage_02 import safe_member, MAX_MEMBER
from pdf_source_scan import scan_one

APP = Path(__file__).resolve().parents[1]


def materialize(row, scratch):
    path = Path(row['root']) / row['path']
    if row['kind'] == 'FILE':
        if digest(path) != row['sha256']:
            raise ValueError('PDF bytes differ from source inventory')
        return path
    if digest(path) != row['containerSha256']:
        raise ValueError('ZIP bytes differ from source inventory')
    current = path
    for level, name in enumerate(row['member'].split('!/')):
        safe_member(name)
        with zipfile.ZipFile(current) as archive:
            info = archive.getinfo(name)
            if info.file_size > MAX_MEMBER or info.flag_bits & 1:
                raise ValueError('ZIP member is too large or encrypted')
            target = scratch / ('member-' + str(level) + ('.pdf' if level == len(row['member'].split('!/')) - 1 else '.zip'))
            with archive.open(info) as source, target.open('wb') as destination:
                shutil.copyfileobj(source, destination, length=1024**2)
        current = target
    if digest(current) != row['sha256']:
        raise ValueError('ZIP PDF bytes differ from member inventory')
    return current


def observe(group):
    row = group['canonicalCandidate']
    import pymupdf
    pymupdf.TOOLS.mupdf_warnings(reset=True)
    with tempfile.TemporaryDirectory(prefix='ivme-yks-pdf-') as temporary:
        path = materialize(row, Path(temporary))
        result, cached = scan_one((str(path), group['sha256']))
        if digest(path) != group['sha256']:
            raise ValueError('PDF content changed during page observation')
    return {**result, 'cacheHit': cached, 'libraryWarnings': pymupdf.TOOLS.mupdf_warnings(reset=True)}


def run(workers=3):
    store = Store(APP / 'veri/yks-birlestirme')
    state = store.current()
    if not state or store.verify(state, 'YKS-03')['status'] != 'VERIFIED':
        raise ValueError('Verified source identity groups are required')
    record = state['stages']['YKS-03:full']
    group_file = next(store.child(state['runId'] + '/' + a['path']) for a in record['artifacts']
                      if a['path'].replace('\\', '/').endswith('/pdf-groups.jsonl'))
    groups = [json.loads(line) for line in group_file.read_text(encoding='utf-8').splitlines()]
    folder = store.child(state['runId'] + '/pdf-on-tarama')
    folder.mkdir(exist_ok=True)
    with process_lock(folder / '.writer.lock'):
        progress = folder / 'progress.json'
        results = []
        if progress.is_file():
            prior = read_json(progress)
            if prior['groupsSha256'] == digest(group_file):
                # Verify cached scans again rather than trusting this progress alone.
                from pdf_source_scan import read_scan
                for row in prior['documents']:
                    if not row.get('error'):
                        try:
                            scan = read_scan(row['sha256'])
                            if scan['pageCount'] == row['pageCount'] and len(scan['pages']) == row['pageCount']:
                                results.append(row)
                        except (OSError, ValueError, KeyError):
                            pass
        done = {row['sha256'] for row in results}
        def save(status):
            value = {'status': status, 'scope': 'PAGE_OBSERVATIONS_ONLY',
                       'groupsSha256': digest(group_file), 'totalPdfs': len(groups), 'observedPdfs': len(results),
                       'pages': sum(r['pageCount'] for r in results), 'cacheHits': sum(r['cacheHit'] for r in results),
                       'errors': [r for r in results if r.get('error')],
                       'modelsCalled': 0, 'questionsInserted': 0, 'answersApproved': 0, 'sourceWrites': 0,
                       'documents': sorted(results, key=lambda r: r['sha256'])}
            # Windows antivirus/editor readers can briefly hold the replaced
            # JSON open. Bound retries; never change an original source file.
            for attempt in range(12):
                try:
                    write_json(progress, value)
                    break
                except PermissionError:
                    if attempt == 11:
                        raise
                    time.sleep(min(0.05 * 2**attempt, 0.5))
        save('RUNNING')
        try:
            with ProcessPoolExecutor(max_workers=workers) as pool:
                futures = {pool.submit(observe, group): group['sha256'] for group in groups if group['sha256'] not in done}
                for future in as_completed(futures):
                    if min(shutil.disk_usage(APP).free, shutil.disk_usage(Path.home()).free) < RESERVE:
                        raise RuntimeError('Disk reserve reached')
                    try:
                        row = future.result()
                    except Exception as error:
                        row = {'sha256': futures[future], 'pageCount': 0, 'cacheHit': False,
                               'error': type(error).__name__ + ': ' + str(error)}
                    results.append(row)
                    if len(results) % 25 == 0 or len(results) == len(groups):
                        save('RUNNING')
                        if len(results) % 100 == 0 or len(results) == len(groups):
                            print(f'PDF preflight: {len(results)}/{len(groups)} documents; {sum(r["pageCount"] for r in results)} pages', flush=True)
            save('FAIL' if any(r.get('error') for r in results) else 'PASS')
        except BaseException:
            save('INTERRUPTED')
            raise
        print(json.dumps({k:v for k,v in read_json(progress).items() if k != 'documents'}), flush=True)


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workers',type=int,choices=range(1,5),default=3)
    run(parser.parse_args().workers)
