"""TAS-12: mevcut testleri görev bazında çalıştır, kaynak hash'iyle kanıtla."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import uuid

from test_kaniti import BACKEND_INPUTS, fingerprint, write_json

APP = Path(__file__).resolve().parents[1]
CONFIG = 'testler/kalite-profilleri.json'


def now():
    return datetime.now(timezone.utc).isoformat()


def load_profile(root, task):
    config = json.loads((root / CONFIG).read_text(encoding='utf-8'))
    if task not in config['profiles']:
        raise ValueError('Bilinmeyen görev: ' + task)
    profile = config['profiles'][task]
    checks = [dict(config['checks'][key], id=key) for key in profile['checks']]
    if not checks:
        raise ValueError('Görevde doğrulama yok: ' + task)
    return profile, checks


def inputs_for(root, checks):
    patterns = {CONFIG, 'scripts/kalite.py', 'scripts/test_kaniti.py', 'scripts/ivme.py'}
    for check in checks:
        patterns.update(check['inputs'])
        if check['kind'] == 'backend':
            patterns.update(BACKEND_INPUTS)
        patterns.update(arg for arg in check['args'] if (root / arg).is_file())
    return fingerprint(root, sorted(patterns))


def command_for(root, check):
    venv = root.parent / '.venv/Scripts/python.exe'
    python = str(venv) if venv.exists() else sys.executable
    if check['kind'] == 'node':
        return ['node', '--test', *check['args']]
    if check['kind'] == 'backend':
        return [python, '-X', 'utf8', 'scripts/ivme.py', 'test', *check['args']]
    return [python, '-X', 'utf8', *check['args']]


def assess_output(kind, returncode, output, backend=None):
    if returncode:
        return dict(status='FAIL', reason=f'Süreç çıkış kodu: {returncode}')
    if kind == 'backend':
        if not backend or backend.get('status') not in ('PASS', 'KNOWN_FAILURES'):
            return dict(status='FAIL', reason='Güncel backend kanıtı yok/geçersiz.')
        return {key: backend[key] for key in ('status', 'totals', 'knownFailures', 'newFailures')}
    if kind == 'plan':
        try:
            value = json.loads(output.strip().splitlines()[-1])
            if value['status'] == 'PASS' and value['errors'] == []:
                return dict(status='PASS')
        except (ValueError, KeyError, IndexError):
            pass
        return dict(status='FAIL', reason='Plan raporu geçersiz.')
    if kind == 'node':
        counts = {key: int(value) for key, value in re.findall(
            r'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)\s*$', output, re.M)}
        required = {'tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'}
        complete = required <= counts.keys() and counts['tests'] == sum(counts[k] for k in required - {'tests'})
        if not complete or not counts.get('pass') or counts.get('fail') or counts.get('cancelled'):
            return dict(status='FAIL', reason='Node test özeti eksik/başarısız.', totals=counts)
        incomplete = counts.get('skipped', 0) + counts.get('todo', 0)
    else:
        match = re.search(r'^Ran (\d+) tests? in ', output, re.M)
        success = re.search(r'^OK(?: \(skipped=(\d+)\))?\s*$', output, re.M)
        tests, skipped = int(match[1]) if match else 0, int(success[1] or 0) if success else 0
        counts = dict(tests=tests, skipped=skipped)
        if not success or tests <= skipped:
            return dict(status='FAIL', reason='Python test özeti eksik/başarısız.', totals=counts)
        incomplete = skipped
    return dict(status='INCOMPLETE' if incomplete else 'PASS', totals=counts)


def run_profile(root, task):
    profile, checks = load_profile(root, task)
    inputs = inputs_for(root, checks)
    run_id = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S') + '-' + uuid.uuid4().hex[:8]
    directory = root / 'veri/kalite' / task / run_id
    directory.mkdir(parents=True)
    commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=root, capture_output=True, text=True)
    report = dict(schemaVersion=1, taskId=task, runId=run_id, startedAt=now(),
                  commit=commit.stdout.strip() if commit.returncode == 0 else None,
                  inputs=inputs, checks=[], status='RUNNING', acceptance='NOT_EVALUATED',
                  remainingAcceptance=profile['remainingAcceptance'], nextAction=profile['nextAction'])
    target = directory / 'rapor.json'
    write_json(target, report)
    # Kesilen yeni çalıştırma, önceki başarılı raporun arkasına saklanmasın.
    write_json(directory.parent / 'son.json', {'report': f'{run_id}/rapor.json'})
    for check in checks:
        command = command_for(root, check)
        print('Çalışıyor: ' + ' '.join(command), flush=True)
        started = now()
        backend_path = root / 'backend/target/ivme-test-son.json'
        before = backend_path.read_bytes() if backend_path.exists() and check['kind'] == 'backend' else None
        try:
            process = subprocess.run(command, cwd=root, capture_output=True, text=True,
                                     encoding='utf-8', errors='replace',
                                     timeout=None if check['kind'] == 'backend' else check.get('timeout', 900),
                                     env={**os.environ, 'PYTHONIOENCODING': 'utf-8', 'NO_COLOR': '1'})
            output, code = process.stdout + process.stderr, process.returncode
        except (OSError, subprocess.TimeoutExpired) as error:
            output, code = str(error), 1
        backend = None
        if check['kind'] == 'backend' and backend_path.exists():
            raw = backend_path.read_bytes()
            if raw != before:
                try:
                    backend = json.loads(raw)
                    expected = check['args'][0] if check['args'] else 'ALL'
                    if backend.get('selection') != expected or backend.get('startedAt', '') < started:
                        backend = None
                except ValueError:
                    backend = None
        result = assess_output(check['kind'], code, output, backend)
        log = directory / (check['id'] + '.log')
        log.write_text(output, encoding='utf-8')
        result.update(id=check['id'], command=command, startedAt=started, finishedAt=now(),
                      exitCode=code, log=log.name, logSha256=hashlib.sha256(log.read_bytes()).hexdigest())
        if backend:
            # Sonraki backend çalıştırması son.json'u değiştirse de bu kanıt korunur.
            result['backendEvidence'] = backend
        report['checks'].append(result)
        write_json(target, report)
        print(f"  {result['status']}: {check['id']}", flush=True)
    states = {item['status'] for item in report['checks']}
    report['status'] = next((s for s in ('FAIL', 'INCOMPLETE', 'KNOWN_FAILURES') if s in states), 'PASS')
    if inputs != inputs_for(root, checks):
        report['status'] = 'STALE'
    report['finishedAt'] = now()
    write_json(target, report)
    print(f"{task}: {report['status']} · {target.relative_to(root)}")
    print('Kabul ayrı değerlendirilir. Sonraki: ' + report['nextAction'])
    return 0 if report['status'] in ('PASS', 'KNOWN_FAILURES') else 1


def inspect_report(root, task):
    _, checks = load_profile(root, task)
    directory = root / 'veri/kalite' / task
    pointer = json.loads((directory / 'son.json').read_text(encoding='utf-8'))
    target = (directory / pointer['report']).resolve()
    if not target.is_relative_to(directory.resolve()):
        raise ValueError('Rapor yolu görev dizini dışında.')
    report = json.loads(target.read_text(encoding='utf-8'))
    if report['taskId'] != task or report['inputs'] != inputs_for(root, checks):
        return dict(status='STALE', report=str(target), reason='Girdi/test tanımı değişti.')
    if [c['id'] for c in report['checks']] != [c['id'] for c in checks]:
        return dict(status='INCOMPLETE', report=str(target), reason='Eksik test aşaması.')
    for check in report['checks']:
        log = (target.parent / check['log']).resolve()
        if not log.is_relative_to(target.parent) or not log.is_file() or hashlib.sha256(log.read_bytes()).hexdigest() != check['logSha256']:
            return dict(status='STALE', report=str(target), reason='Test çıktısı eksik/değişmiş.')
    return dict(status=report['status'], report=str(target), acceptance=report['acceptance'],
                remainingAcceptance=report['remainingAcceptance'], nextAction=report['nextAction'])


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['plan', 'calistir', 'durum'])
    parser.add_argument('task', type=str.upper, help='TAS-01 ... TAS-12')
    args = parser.parse_args(argv)
    try:
        profile, checks = load_profile(APP, args.task)
        if args.action == 'calistir':
            return run_profile(APP, args.task)
        if args.action == 'durum':
            result = inspect_report(APP, args.task)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0 if result['status'] in ('PASS', 'KNOWN_FAILURES') else 1
        print(json.dumps(dict(taskId=args.task, commands=[command_for(APP, c) for c in checks],
                              **profile), ensure_ascii=False, indent=2))
        return 0
    except (OSError, ValueError, KeyError) as error:
        print('Kanıt yok/geçersiz: ' + str(error), file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
