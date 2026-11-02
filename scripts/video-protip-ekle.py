"""Bir dersin video protiplerini tek tanımdan yazar ve hattı çalıştırır (MAT-TYT).

    python scripts/video-protip-ekle.py <tanim.json>

Tanım: {"ders": "...", "kareler": {"<video-id>": [sn, ...]}, "ipuclari": [...],
        "yerlesim": {"<ipucu-id>": ["başlık", ["s2"]]}, "test": "<Python unittest gövdesi>"}
Yalnız incelenen videolar görevde kalır; ipucu alanları video-kanit-hatti.md'deki şemadır.
Test gövdesi `HintMathTest` sınıfının yöntemleridir (girintisiz yazılır); kaynak/onay denetimi eklenir.
Sonra: video calistir, video paket, protips.json yerleşimi ve video protips.
"""
import json
import subprocess
import sys
import textwrap
from pathlib import Path

APP = Path(__file__).resolve().parents[1]


def run(*args):
    result = subprocess.run([sys.executable, '-X', 'utf8', 'scripts/ivme.py', 'video', *args], cwd=APP, capture_output=True,
                            text=True, encoding='utf-8')
    print(result.stdout.strip()[-400:], result.stderr.strip()[-400:])
    return result.returncode


def main(path):
    spec = json.loads(Path(path).read_text(encoding='utf-8'))
    lesson, task_id = spec['ders'], spec['ders'] + '-video'
    task_path = APP / f'video-hatti/gorevler/{task_id}.json'
    task = json.loads(task_path.read_text(encoding='utf-8'))
    frames = {'youtube:' + k: v for k, v in spec['kareler'].items()}
    task['sources'] = [s for s in task['sources'] if s['providerId'] in frames]
    for source in task['sources']:
        source['frameSeconds'] = frames[source['providerId']]
    task_path.write_text(json.dumps(task, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    hints = spec['ipuclari']
    (APP / f'video-hatti/ipuclari/{task_id}.json').write_text(json.dumps(hints, ensure_ascii=False, indent=2) + '\n',
                                                               encoding='utf-8', newline='\n')
    body = textwrap.indent(spec['test'].strip('\n'), '    ')
    test = f'''"""{lesson} video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {{h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/{task_id}.json').read_text(encoding='utf-8'))}}


class HintMathTest(unittest.TestCase):
{body}

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith(('Claude', 'Codex')))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
'''
    (APP / f'testler/video-ipucu-{lesson}-test.py').write_text(test, encoding='utf-8', newline='\n')
    check = subprocess.run([sys.executable, '-X', 'utf8', f'testler/video-ipucu-{lesson}-test.py'], cwd=APP,
                           capture_output=True, text=True, encoding='utf-8')
    if check.returncode:
        print(check.stderr[-2000:])
        return 1
    protips_path = APP / 'video-hatti/protips.json'
    protips = json.loads(protips_path.read_text(encoding='utf-8'))
    protips['placements'] = [p for p in protips['placements'] if p['taskId'] != task_id]
    protips['placements'].append({'taskId': task_id, 'conceptId': lesson, 'hints': [
        {'id': hid, 'title': title, 'sectionIds': sections} for hid, (title, sections) in spec['yerlesim'].items()]})
    protips_path.write_text(json.dumps(protips, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    for args in (('calistir', task_id), ('paket', task_id), ('protips',)):
        if run(*args):
            return 1
    return 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main(sys.argv[1]) if len(sys.argv) == 2 else (print(__doc__) or 2))
