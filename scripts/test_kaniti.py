"""Test sonucu kanıtı: konsol özetinden başarı çıkarmak yerine XML'i doğrula."""
import fnmatch
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

BACKEND_INPUTS = ['backend/src/main/java/**/*', 'backend/src/main/resources/*.*',
                  'backend/src/main/resources/db/**/*', 'backend/src/main/resources/learn/**/*',
                  'backend/src/test/**/*', 'backend/pom.xml', 'testler/backend-test.ps1',
                  'testler/bilinen-hatalar.md', 'scripts/ivme.py', 'scripts/test_kaniti.py', 'yerel-ortam.ps1']


def fingerprint(root, patterns):
    files = {}
    for pattern in patterns:
        for path in sorted(root.glob(pattern)):
            if path.is_file() and '__pycache__' not in path.parts:
                files[path.relative_to(root).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    digest = hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()
    return {'sha256': digest, 'files': files}


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def assess_backend(reports, known, returncode, cleanup_ok, selected=''):
    totals = dict(tests=0, failures=0, errors=0, skipped=0)
    failed, classes, problems = set(), set(), []
    for path in reports:
        try:
            suite = ET.parse(path).getroot()
            if suite.tag != 'testsuite':
                raise ValueError('testsuite bekleniyor')
            counts = {key: int(suite.get(key, '0')) for key in totals}
            cases = suite.findall('testcase')
            actual = dict(tests=len(cases), failures=sum(c.find('failure') is not None for c in cases),
                          errors=sum(c.find('error') is not None for c in cases),
                          skipped=sum(c.find('skipped') is not None for c in cases))
            if counts != actual or any(n < 0 for n in counts.values()):
                raise ValueError('özet ile testcase sayıları farklı')
            classes.add(suite.get('name', ''))
            for case in cases:
                if case.find('failure') is not None or case.find('error') is not None:
                    cls = case.get('classname', suite.get('name', '')).rsplit('.', 1)[-1]
                    method = re.split(r'[\[(]', case.get('name', ''))[0]
                    failed.add(f'{cls}.{method}')
            for key in totals:
                totals[key] += counts[key]
        except (OSError, ET.ParseError, ValueError) as error:
            problems.append(f'{path.name}: {error}')
    if not reports or totals['tests'] == 0:
        problems.append('Bu çalıştırmada test raporu/test yok.')
    elif totals['tests'] == totals['skipped']:
        problems.append('Bütün testler atlandı.')
    for pattern in filter(None, selected.split(',')):
        if not any(fnmatch.fnmatchcase(cls.removeprefix('com.hedefyks.'), pattern)
                   or fnmatch.fnmatchcase(cls.rsplit('.', 1)[-1], pattern) for cls in classes):
            problems.append(f'İstenen test çalışmadı: {pattern}')
    new = sorted(failed - known)
    if new:
        problems.append('Yeni test hatası: ' + ', '.join(new))
    if not cleanup_ok:
        problems.append('Test süreci/geçici DB temizliği doğrulanamadı.')
    if returncode and not failed:
        problems.append(f'Test süreci başarısız: {returncode}')
    if not returncode and failed:
        problems.append('Süreç başarılı diyor fakat XML başarısız test içeriyor.')
    status = 'FAIL' if problems else ('INCOMPLETE' if totals['skipped'] else ('KNOWN_FAILURES' if failed else 'PASS'))
    return dict(status=status, totals=totals, knownFailures=sorted(failed & known),
                newFailures=new, problems=problems, suites=sorted(classes))
