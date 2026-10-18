"""Compare preserved labels, current source inputs, PostgreSQL and local API.

Never generates labels, executes migrations or publishes. Database connections
enforce read-only transactions. --dev-login optionally opens a local student
session (the app may record a LOGIN event); all content API requests are GETs.
Cookies and connection credentials are never included in the report.
"""
import argparse
from yerel_ortam import default_database
from collections import Counter
from datetime import datetime, timezone
import hashlib
from http.cookiejar import CookieJar
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlparse
from urllib.request import build_opener, HTTPCookieProcessor, Request, HTTPRedirectHandler
import zlib

from kaynakli_arastirma_db import db_connection, query

APP = Path(__file__).resolve().parents[1]
STATE = APP / 'veri/content-labels'


def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def fingerprint(value):
    # Same UTF-8 JSON encoding as JSON.stringify in content-labels.mjs.
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def file_hash(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def keyed(rows, field):
    result = {}
    for row in rows:
        key = row[field]
        if key in result:
            raise ValueError(f'Duplicate identity: {key}')
        result[key] = row
    return result


def differences(before, after):
    """Direction is explicit: before=published/baseline, after=local/current."""
    shared = before.keys() & after.keys()
    changed = sorted(k for k in shared if before[k] != after[k])
    return {'added': sorted(after.keys() - before.keys()),
            'removed': sorted(before.keys() - after.keys()), 'changed': changed,
            'unchanged': len(shared) - len(changed)}


def migration_checksum(path):
    checksum = 0
    for line in path.read_text(encoding='utf-8-sig').splitlines():
        checksum = zlib.crc32(line.encode('utf-8'), checksum)
    return checksum if checksum < 2**31 else checksum - 2**32


def migrations(applied, directory):
    local = {p.name.split('__', 1)[0][1:]: p for p in directory.glob('V*__*.sql')}
    successful = {r['version']: r for r in applied if r['success']}
    pending = [{'version': v, 'script': p.name} for v, p in local.items() if v not in successful]
    mismatches = []
    for version, row in successful.items():
        path = local.get(version)
        if path and (row['script'] != path.name or row['checksum'] != migration_checksum(path)):
            mismatches.append({'version': version, 'script': path.name,
                               'appliedChecksum': row['checksum'], 'localChecksum': migration_checksum(path)})
    return {'applied': applied, 'pendingRequired': sorted(pending, key=lambda r: int(r['version'])),
            'checksumMismatches': mismatches,
            'appliedWithoutLocalFile': [r for v, r in successful.items() if v not in local],
            'failed': [r for r in applied if not r['success']], 'executed': False}


def readonly_connection(database):
    command, env, name = db_connection(database)
    env['PGOPTIONS'] += ' -c default_transaction_read_only=on -c statement_timeout=120000'
    return command, env, name


def database_snapshot(connection, local):
    """Stream large evidence rows instead of retaining a second full catalog.

    Run, items, categories, assignments and Flyway history share one read-only
    repeatable-read snapshot. A same-run-key comparison alone cannot detect drift.
    """
    sql = """
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT json_build_object('section','run','data',json_build_object(
    'runKey',c.run_key,'summary',r.summary,'database',current_database(),
    'transactionReadOnly',current_setting('transaction_read_only')))
    FROM learning_catalog.current_run c JOIN learning_catalog.runs r USING(run_key);
SELECT json_build_object('section','items','data',data) FROM learning_catalog.current_items;
SELECT json_build_object('section','categories','data',definition) FROM learning_catalog.current_categories;
SELECT json_build_object('section','assignments','data',json_build_object(
    'key',item_key,'categoryId',category_id,'relation',relation)) FROM learning_catalog.current_assignments;
SELECT json_build_object('section','audit','data',json_build_object('runKey',run_key,
    'inventoryAudit',inventory_audit,'references',curriculum_references))
    FROM learning_catalog.source_audits WHERE run_key=(SELECT run_key FROM learning_catalog.current_run);
SELECT json_build_object('section','migrations','data',json_build_object(
    'version',version,'script',script,'checksum',checksum,'success',success))
    FROM flyway_schema_history WHERE version IS NOT NULL ORDER BY installed_rank;
COMMIT;
"""
    local_items = keyed(local['items'], 'key')
    cats, assignments, applied, runs, audits = {}, {}, [], [], []
    seen, changed, only_db = set(), [], []
    command, env, _ = connection
    with tempfile.TemporaryFile() as errors:
        process = subprocess.Popen([*command, '--tuples-only', '--no-align', '--quiet'],
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=errors,
                                   text=True, encoding='utf-8', env=env)
        try:
            process.stdin.write(sql)
            process.stdin.close()
            for line in process.stdout:
                row = json.loads(line)
                section, data = row['section'], row['data']
                if section == 'items':
                    key = data['key']
                    if key in seen:
                        raise ValueError(f'Duplicate database item: {key}')
                    seen.add(key)
                    if key not in local_items:
                        only_db.append(key)
                    elif data != local_items[key]:
                        changed.append({'key': key, 'fields': sorted(k for k in data.keys() | local_items[key].keys()
                                        if data.get(k) != local_items[key].get(k))})
                elif section == 'categories':
                    if data['id'] in cats:
                        raise ValueError(f'Duplicate database category: {data["id"]}')
                    cats[data['id']] = data
                elif section == 'assignments':
                    assignments.setdefault(data['key'], []).append((data['categoryId'], data['relation']))
                elif section == 'migrations':
                    applied.append(data)
                elif section == 'run':
                    runs.append(data)
                elif section == 'audit':
                    audits.append(data)
            if process.wait(timeout=10):
                errors.seek(0)
                raise RuntimeError(errors.read().decode('utf-8', errors='replace')[-2000:])
        finally:
            process.stdout.close()
            if process.poll() is None:
                process.kill()
                process.wait()
    if len(runs) != 1:
        raise ValueError('Expected exactly one published run')
    expected = {i['key']: sorted((a['categoryId'], a['relation']) for a in i['automaticLabels']['assignments'])
                for i in local['items']}
    return {'run': runs[0], 'items': {'added': sorted(local_items.keys() - seen),
            'removed': sorted(only_db), 'changed': sorted(changed, key=lambda r: r['key']),
            'unchanged': len(seen & local_items.keys()) - len(changed)},
            'categories': differences(cats, keyed(local['categories'], 'id')),
            'assignments': differences({k: sorted(v) for k, v in assignments.items()}, expected),
            'audits': audits, 'migrations': applied, '_categories': cats}


def source_snapshot(connection, local):
    spec = importlib.util.spec_from_file_location('content_inventory', APP / 'scripts/content-label-inventory.py')
    inventory = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(inventory)
    current = inventory.collect(connection)
    base = load(APP / 'backend/src/main/resources/content-review-catalog.json')
    pdf = load(APP / 'backend/src/main/resources/pdf-review-labels.json')
    current_fingerprints = {f'question:{q["code"]}': q['inputFingerprint'] for q in current['questions']}
    for row in base['items'] + pdf['items']:
        if row['key'] in current_fingerprints:
            raise ValueError(f'Duplicate source identity: {row["key"]}')
        current_fingerprints[row['key']] = fingerprint(row)
    baseline = {i['key']: i['automaticLabels'].get('inputFingerprint') for i in local['items']}
    delta = differences(baseline, current_fingerprints)
    physical, unavailable = pdf_snapshot(pdf['items'], APP.parent / 'Kaynaklar')
    check = subprocess.run(['node', 'scripts/content-review-catalog.mjs', '--check'], cwd=APP,
                           capture_output=True, text=True, encoding='utf-8', timeout=120)
    return {'direction': 'preserved labels -> current source inputs', 'resources': delta,
            'byKind': dict(Counter(i['kind'] for i in local['items'])),
            'physicalPdfs': physical, 'preservedUnavailable': unavailable,
            'structureProjection': {'matchesCurrentInputs': check.returncode == 0,
                                    'detail': (check.stdout if not check.returncode else check.stderr)[-2000:].strip()},
            'remoteVideoAvailability': 'NOT_CHECKED', 'contentReanalysed': 0}


def pdf_snapshot(rows, source_root):
    # Hash every unique physical PDF once. This reads bytes, never repeats OCR/AI.
    physical, unavailable = {}, []
    for row in rows:
        if not row.get('relativePath'):
            unavailable.append({'key': row['key'], 'status': row['availability']})
            continue
        root = source_root if row.get('sourceScope') == 'RESOURCES' else source_root / 'ogm-materyal'
        path = (root / row['relativePath']).resolve()
        if not path.is_relative_to(source_root.resolve()):
            raise ValueError('PDF path leaves the source root')
        record = physical.setdefault(path, {'keys': [], 'expectedHashes': set()})
        record['keys'].append(row['key'])
        record['expectedHashes'].add(row.get('sourceSha256') or None)
    file_changes, hashed = [], 0
    for path, record in sorted(physical.items()):
        actual = file_hash(path) if path.is_file() else None
        hashed += actual is not None
        expected = record['expectedHashes']
        if actual is None:
            unavailable.append({'keys': record['keys'], 'path': path.relative_to(source_root.parent).as_posix(), 'status': 'missing_file'})
        if expected != {actual}:
            file_changes.append({'path': path.relative_to(source_root.parent).as_posix(), 'keys': record['keys'],
                                 'expectedSha256': sorted(h for h in expected if h), 'actualSha256': actual})
    added_pdfs = sorted(p.resolve().relative_to(source_root.parent).as_posix()
                        for p in source_root.rglob('*.pdf') if p.resolve() not in physical)
    return {'hashedUniqueFiles': hashed, 'changedOrRemoved': file_changes, 'added': added_pdfs}, unavailable


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def local_base(value):
    parsed = urlparse(value)
    if (parsed.scheme != 'http' or parsed.hostname not in {'localhost', '127.0.0.1', '::1'}
            or parsed.username or parsed.password or parsed.path not in {'', '/'} or parsed.query or parsed.fragment):
        raise ValueError('API base must be a loopback HTTP origin')
    return value.rstrip('/')


def api_snapshot(base, summary, categories, dev_login=False):
    base = local_base(base)
    cookies = CookieJar()
    opener = build_opener(HTTPCookieProcessor(cookies), NoRedirect())
    result = {'base': base, 'contentMethod': 'GET', 'authentication': 'EXISTING_COOKIE_ENV' if os.getenv('IVME_AUDIT_COOKIE') else 'NONE',
              'loginEventMayBeRecorded': False}

    def request(path, method='GET', headers=None):
        h = dict(headers or {})
        if os.getenv('IVME_AUDIT_COOKIE'):
            h['Cookie'] = os.environ['IVME_AUDIT_COOKIE']
        return opener.open(Request(base + path, method=method, headers=h), timeout=30)

    try:
        if dev_login:
            try:
                with request('/api/auth/me'):
                    pass
            except HTTPError as error:
                if error.code != 401:
                    raise
            token = next((unquote(c.value) for c in cookies if c.name == 'XSRF-TOKEN'), None)
            if not token:
                return {**result, 'status': 'AUTHENTICATION_UNAVAILABLE'}
            with request('/api/auth/dev-login', 'POST', {'X-XSRF-TOKEN': token}):
                pass
            result.update(authentication='LOOPBACK_DEV_SESSION', loginEventMayBeRecorded=True)
        with request('/api/learning-resources/metadata') as response:
            value = json.load(response)
            result['httpStatus'] = response.status
        actual = keyed(value['categories'], 'id')
        missing = sorted(categories.keys() - actual.keys())
        changed = sorted(k for k in categories.keys() & actual.keys() if categories[k] != actual[k])
        summary_matches = value.get('summary') == summary
        return {**result, 'status': 'MATCH' if summary_matches and not missing and not changed else 'DIFFERS',
                'runKey': value.get('summary', {}).get('runKey'), 'summaryMatchesDatabase': summary_matches,
                'categoryCount': len(actual), 'missingPublishedCategories': missing,
                'changedPublishedCategories': changed,
                'additionalDynamicCategories': sorted(actual.keys() - categories.keys())}
    except HTTPError as error:
        return {**result, 'status': 'AUTHENTICATION_REQUIRED' if error.code in {401, 403} else 'HTTP_ERROR', 'httpStatus': error.code}
    except (URLError, TimeoutError):
        return {**result, 'status': 'UNREACHABLE'}
    except (ValueError, KeyError, TypeError):
        return {**result, 'status': 'INVALID_METADATA'}


def has_delta(value):
    return any(value[k] for k in ('added', 'removed', 'changed'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', choices=['ivme', 'ivme_dev', 'ivme_test'], default=default_database())
    parser.add_argument('--api-base', type=local_base, default='http://127.0.0.1:5173')
    parser.add_argument('--dev-login', action='store_true', help='Local session only; may append an app LOGIN event')
    parser.add_argument('--output', type=Path, help='Default: immutable run/timestamp report under veri/content-labels/reconciliation')
    args = parser.parse_args()
    content = (STATE / 'labels.json').read_bytes()
    local = json.loads(content)
    summary, audit = load(STATE / 'report.json'), load(STATE / 'audit.json')
    run = 'labels-v1-' + hashlib.sha256(content).hexdigest()[:24]
    keyed(local['items'], 'key')
    keyed(local['categories'], 'id')
    connection = readonly_connection(args.database)
    print('Comparing published catalog in a read-only snapshot...', flush=True)
    db = database_snapshot(connection, local)
    categories = db.pop('_categories')
    print('Comparing source fingerprints and physical PDF hashes (no OCR/AI)...', flush=True)
    sources = source_snapshot(connection, local)
    migration_report = migrations(db.pop('migrations'), APP / 'backend/src/main/resources/db/migration')
    api = api_snapshot(args.api_base, db['run']['summary'], categories, args.dev_login)
    final_run = query(connection, 'SELECT run_key FROM learning_catalog.current_run')
    issues = []
    if summary.get('runKey') != run or audit.get('runKey') != run:
        issues.append('LOCAL_RUN_CHECKSUM_MISMATCH')
    if summary.get('resources') != len(local['items']) or summary.get('categories') != len(local['categories']):
        issues.append('LOCAL_SUMMARY_COUNT_MISMATCH')
    if audit.get('failures') or audit.get('unlabelled') != 0 or audit.get('resources') != len(local['items']):
        issues.append('LOCAL_AUDIT_FAILED')
    if db['run']['runKey'] != run or db['run']['summary'] != summary:
        issues.append('PUBLISHED_RUN_DIFFERS')
    if len(db['audits']) != 1 or db['audits'][0]['inventoryAudit'] != audit or db['audits'][0]['references'] != load(STATE / 'curriculum-reference-labels.json'):
        issues.append('PUBLISHED_AUDIT_DIFFERS')
    if any(has_delta(db[k]) for k in ('items', 'categories', 'assignments')):
        issues.append('PUBLISHED_CONTENT_DIFFERS')
    if (has_delta(sources['resources']) or sources['physicalPdfs']['changedOrRemoved'] or sources['physicalPdfs']['added']
            or not sources['structureProjection']['matchesCurrentInputs']):
        issues.append('CURRENT_SOURCES_DIFFER')
    if any(migration_report[k] for k in ('pendingRequired', 'checksumMismatches', 'appliedWithoutLocalFile', 'failed')):
        issues.append('MIGRATION_DIFFERENCE')
    if final_run != db['run']['runKey'] or file_hash(STATE / 'labels.json') != hashlib.sha256(content).hexdigest():
        issues.append('SNAPSHOT_CHANGED_DURING_CHECK')
    if api['status'] != 'MATCH':
        issues.append('API_NOT_VERIFIED' if api['status'] != 'DIFFERS' else 'API_DIFFERS')
    created = datetime.now(timezone.utc)
    git = subprocess.run(['git', 'status', '--porcelain=v1'], cwd=APP, capture_output=True,
                         text=True, encoding='utf-8', check=True)
    head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=APP, capture_output=True,
                          text=True, encoding='utf-8', check=True).stdout.strip()
    # Full audit evidence is already preserved locally; avoid duplicating it.
    db['publishedAuditMatchesLocal'] = 'PUBLISHED_AUDIT_DIFFERS' not in issues
    del db['audits']
    report = {'version': 1, 'task': '01.01', 'createdAt': created.isoformat(),
              'status': 'MATCH' if not issues else 'REQUIRES_FOLLOW_UP', 'issues': issues,
              'local': {'runKey': run, 'labelsSha256': hashlib.sha256(content).hexdigest(), 'summary': summary},
              'database': db, 'sources': sources, 'migrations': migration_report, 'api': api,
              'workspace': {'head': head, 'statusPorcelain': git.stdout.splitlines()},
              'safety': {'databaseReadOnly': True, 'migrationsExecuted': False, 'labelsGenerated': False,
                         'contentReanalysed': 0, 'published': False},
              'limits': ['Version/identity/hash equality does not establish label accuracy.',
                         'Remote playback/content verification is separate; see video-inventory.json and the open video step.']}
    output = args.output or STATE / 'reconciliation' / f'{run}-{created:%Y%m%dT%H%M%S%fZ}.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('x', encoding='utf-8') as destination:
        json.dump(report, destination, ensure_ascii=False, indent=2)
        destination.write('\n')
    print(json.dumps({'status': report['status'], 'issues': issues, 'runKey': run,
                      'sourceChanges': {k: len(v) if isinstance(v, list) else v for k, v in sources['resources'].items()},
                      'report': str(output)}, ensure_ascii=False))
    return 0 if not issues else 1


if __name__ == '__main__':
    raise SystemExit(main())
