"""YKS consolidation control: inspect, resume and verify one explicit stage.

This module alone never moves sources, connects to a database or calls a model.
Stage implementations are separate, allowlisted modules with verified prerequisites.
"""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import importlib
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid

APP = Path(__file__).resolve().parents[1]
VERSION = 1
STAGES = tuple(f'YKS-{i:02}' for i in range(14))
SOURCE_ROOTS = [r'D:\workspace\mebi-yks', r'D:\workspace\ivme\Kaynaklar\mufredat', r'D:\workspace\ivme\Kaynaklar\ogm-materyal', r'D:\workspace\ivme\Kaynaklar\yks-cikmis-sorular']
IMPLEMENTATIONS = {'YKS-00': None, **{
    f'YKS-{i:02}': f'yks_stages.stage_{i:02}' for i in range(1, 14)
    if (Path(__file__).parent / 'yks_stages' / f'stage_{i:02}.py').is_file()
}}


def now():
    return datetime.now(timezone.utc).isoformat()


def digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def signature(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + '.' + uuid.uuid4().hex + '.tmp')
    try:
        with temporary.open('w', encoding='utf-8', newline='\n') as output:
            json.dump(value, output, ensure_ascii=False, indent=2)
            output.write('\n')
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def input_errors(inputs):
    errors = []
    if 'fileBase' not in inputs:
        return errors
    base = Path(inputs['fileBase']).resolve()
    for relative, expected in inputs.get('files', {}).items():
        path = (base / relative).resolve()
        if not path.is_relative_to(base) or not path.is_file() or digest(path) != expected:
            errors.append('Input file changed: ' + relative)
    return errors


@contextmanager
def process_lock(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    stream = path.open('a+b')
    locked = False
    try:
        stream.seek(0, 2)
        if stream.tell() == 0:
            stream.write(b'0')
            stream.flush()
        stream.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
            locked = True
        except OSError as exc:
            raise RuntimeError('Another YKS writer holds the process lock') from exc
        yield
    finally:
        if locked:
            stream.seek(0)
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(stream, fcntl.LOCK_UN)
        stream.close()


def dependencies(stage, scope='full'):
    if stage not in STAGES or scope not in ('pilot', 'full'):
        raise ValueError('Unknown stage/scope')
    if scope == 'pilot' and stage not in STAGES[7:11]:
        raise ValueError('Pilot scope only exists for YKS-07 through YKS-10')
    deps = {
        'YKS-00': [], 'YKS-01': [('YKS-00', 'full')],
        'YKS-02': [('YKS-01', 'full')], 'YKS-03': [('YKS-02', 'full')],
        'YKS-04': [('YKS-02', 'full')],
        'YKS-05': [('YKS-03', 'full'), ('YKS-04', 'full')],
        'YKS-06': [('YKS-05', 'full')],
        'YKS-07': [('YKS-03', 'full'), ('YKS-06', 'full')],
        'YKS-08': [('YKS-07', scope), ('YKS-04', 'full')],
        'YKS-09': [('YKS-08', scope)],
        'YKS-10': [('YKS-06', 'full'), ('YKS-09', scope)],
        'YKS-11': [('YKS-10', 'full')],
        'YKS-12': [('YKS-11', 'full'), ('YKS-09', 'full')],
        'YKS-13': [('YKS-12', 'full')],
    }[stage]
    if stage in ('YKS-07', 'YKS-10') and scope == 'full':
        deps.append(('YKS-10', 'pilot'))
    return deps


class Store:
    def __init__(self, root):
        self.root = Path(root).resolve()

    def child(self, relative):
        path = (self.root / relative).resolve()
        if not path.is_relative_to(self.root):
            raise ValueError('Control path escapes run directory')
        return path

    def current(self):
        pointer = self.root / 'current.json'
        if not pointer.exists():
            return None
        value = read_json(pointer)
        run_id = value['runId']
        if not isinstance(run_id, str) or not run_id or any(c not in '0123456789abcdefghijklmnopqrstuvwxyz-_' for c in run_id):
            raise ValueError('Invalid run ID')
        state = read_json(self.child(run_id + '/state.json'))
        if state['runId'] != run_id or state['schemaVersion'] != VERSION:
            raise ValueError('State identity/version mismatch')
        return state

    def initialize(self):
        with process_lock(self.root / '.writer.lock'):
            existing = self.current()
            if existing is not None:
                return existing
            run_id = datetime.now(timezone.utc).strftime('%Y%m%dt%H%M%S') + '-' + uuid.uuid4().hex[:8]
            state = {'schemaVersion': VERSION, 'runId': run_id, 'started': now(), 'revision': 0,
                     'sourceRoots': SOURCE_ROOTS, 'stages': {}, 'nextAction': 'Run YKS-00 validation'}
            write_json(self.child(run_id + '/state.json'), state)
            write_json(self.root / 'current.json', {'runId': run_id})
            return state

    def save(self, state, event):
        state['revision'] += 1
        state['updated'] = now()
        write_json(self.child(state['runId'] + '/state.json'), state)
        record = {'at': now(), 'revision': state['revision'], 'runId': state['runId'], **event}
        with self.child(state['runId'] + '/events.jsonl').open('a', encoding='utf-8') as output:
            output.write(json.dumps(record, ensure_ascii=False) + '\n')
            output.flush()
            os.fsync(output.fileno())

    def verify(self, state, stage, scope='full', inputs=None):
        dependencies(stage, scope)
        record = state['stages'].get(stage + ':' + scope)
        errors = []
        if not record or record['status'] != 'VERIFIED':
            return {'status': 'NOT_VERIFIED', 'errors': ['Stage is not verified']}
        if inputs is not None and record['inputSignature'] != signature(inputs):
            errors.append('Input signature changed')
        errors.extend(input_errors(record['inputs']))
        for artifact in record.get('artifacts', []):
            path = self.child(state['runId'] + '/' + artifact['path'])
            if not path.is_file() or digest(path) != artifact['sha256']:
                errors.append('Missing/changed artifact: ' + artifact['path'])
        if not record.get('artifacts'):
            errors.append('No verification artifacts')
        return {'status': 'STALE' if errors else 'VERIFIED', 'errors': errors}

    def execute(self, stage, scope, inputs, operation):
        dependencies(stage, scope)
        with process_lock(self.root / '.writer.lock'):
            state = self.current()
            if state is None:
                raise ValueError('Initialize the run first')
            if input_errors(inputs):
                raise ValueError('Input files do not match their snapshot')
            for prior, prior_scope in dependencies(stage, scope):
                if self.verify(state, prior, prior_scope)['status'] != 'VERIFIED':
                    raise ValueError('Unverified prerequisite: ' + prior + ':' + prior_scope)
            if self.verify(state, stage, scope, inputs)['status'] == 'VERIFIED':
                return {'status': 'VERIFIED', 'reused': True, 'stageId': stage, 'scope': scope}
            key = stage + ':' + scope
            old = state['stages'].get(key, {})
            resume_cursor = old.get('cursor') if old.get('inputSignature') == signature(inputs) else None
            record = {'stageId': stage, 'scope': scope, 'status': 'RUNNING', 'inputSignature': signature(inputs),
                      'inputs': inputs, 'attempt': old.get('attempt', 0) + 1, 'pid': os.getpid(),
                      'cursor': resume_cursor, 'artifacts': [], 'started': now()}
            state['stages'][key] = record
            state['nextAction'] = 'Resume/verify ' + key
            self.save(state, {'event': 'STARTED', 'stage': key})
            folder = self.child(state['runId'] + '/' + stage.lower() + '/' + scope + f'/attempt-{record["attempt"]:04}')
            folder.mkdir(parents=True, exist_ok=True)

            def checkpoint(cursor):
                record['cursor'] = cursor
                self.save(state, {'event': 'CHECKPOINT', 'stage': key})

            try:
                result = operation(folder, resume_cursor, checkpoint)
                if result.get('status') != 'PASS' or not result.get('artifacts'):
                    raise ValueError('Stage did not return passing evidence/artifacts')
                if input_errors(inputs):
                    raise ValueError('Input files changed during execution')
                for value in result['artifacts']:
                    path = Path(value).resolve()
                    if not path.is_relative_to(folder) or not path.is_file():
                        raise ValueError('Artifact is missing or outside the stage folder')
                    record['artifacts'].append({'path': str(path.relative_to(self.child(state['runId']))), 'sha256': digest(path)})
                record.update(status='VERIFIED', finished=now(), summary=result.get('summary', {}))
                state['nextAction'] = result.get('nextAction', 'Select next eligible stage')
                self.save(state, {'event': 'VERIFIED', 'stage': key})
                return {'status': 'VERIFIED', 'reused': False, 'stageId': stage, 'scope': scope, 'summary': record['summary']}
            except BaseException as exc:
                record.update(status='FAILED', error=type(exc).__name__, finished=now())
                self.save(state, {'event': 'FAILED', 'stage': key, 'errorType': type(exc).__name__})
                raise


def framework_inputs(app):
    files = ['scripts/yks_birlestirme.py', 'scripts/ivme.py', 'testler/yks-birlestirme-test.py']
    return {'version': VERSION, 'fileBase': str(app.resolve()), 'files': {p: digest(app / p) for p in files}}


def framework_operation(app):
    def operation(folder, cursor, checkpoint):
        test = app / 'testler/yks-birlestirme-test.py'
        result = subprocess.run([sys.executable, '-X', 'utf8', str(test)], cwd=app,
                                capture_output=True, encoding='utf-8', errors='replace', timeout=120)
        log = folder / 'tests.log'
        log.write_text(result.stdout + result.stderr, encoding='utf-8')
        import re
        count = re.search(r'^Ran (\d+) tests? in ', result.stderr, re.M)
        ok = result.returncode == 0 and count and int(count[1]) > 0 and re.search(r'^OK\s*$', result.stderr, re.M)
        report = folder / 'validation.json'
        write_json(report, {'status': 'PASS' if ok else 'FAIL', 'command': [sys.executable, str(test)],
                            'returncode': result.returncode, 'tests': int(count[1]) if count else 0,
                            'inputs': framework_inputs(app), 'logSha256': digest(log)})
        return {'status': 'PASS' if ok else 'FAIL', 'artifacts': [log, report],
                'summary': {'tests': int(count[1]) if count else 0, 'modelsCalled': 0, 'sourceWrites': 0},
                'nextAction': 'YKS-01 baseline and verified backups'}
    return operation


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['plan', 'durum', 'baslat', 'adim', 'dogrula'])
    parser.add_argument('stage', nargs='?', choices=STAGES)
    parser.add_argument('--scope', choices=['pilot', 'full'], default='full')
    parser.add_argument('--resume', action='store_true')
    args = parser.parse_args(argv)
    store = Store(APP / 'veri/yks-birlestirme')
    if args.command == 'plan':
        print(json.dumps({'plan': 'docs/plan/15-yks-kaynak-birlestirme.md',
                          'stages': [{'id': s, 'implemented': s in IMPLEMENTATIONS} for s in STAGES]}, ensure_ascii=False))
        return 0
    if args.command == 'baslat':
        print(json.dumps(store.initialize(), ensure_ascii=False))
        return 0
    state = store.current()
    if args.command == 'durum':
        print(json.dumps(state or {'status': 'NO_RUN'}, ensure_ascii=False))
        return 0
    if not args.stage or state is None:
        parser.error('Choose a stage and initialize the run first')
    if args.stage not in IMPLEMENTATIONS:
        parser.error('Stage executor is not implemented; inspect its task card')
    if args.stage == 'YKS-00':
        inputs = framework_inputs(APP)
        operation = framework_operation(APP)
    else:
        module = importlib.import_module(IMPLEMENTATIONS[args.stage])
        inputs = module.inputs(APP, store, state)
        operation = module.operation(APP, store, state)
    if args.command == 'dogrula':
        value = store.verify(state, args.stage, args.scope, inputs)
        print(json.dumps(value, ensure_ascii=False))
        return 0 if value['status'] == 'VERIFIED' else 1
    result = store.execute(args.stage, args.scope, inputs, operation)
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, RuntimeError, OSError) as error:
        print(json.dumps({'status': 'FAIL', 'error': str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
