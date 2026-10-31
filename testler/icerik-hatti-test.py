"""TAS-09 içerik hattı: kaldığı yerden devam, kesinti, kilit, değişen girdi ve insan kararı sınırı.

Gerçek bölme pilotunun görev tanımı ve yerel kaynakları kullanılır; kontrol noktası, çıktı, karar ve yayın
dosyaları geçici dizine yönlendirilir (depodaki kanıt, karar ve `veri/icerik-hatti` değişmez). Node doğrulaması
yerine sabit sonuç verilir; o aşama `ivme.py icerik calistir` ile ayrıca gerçek testleri çalıştırır.
Yerel ana kaynak/görseller yoksa test atlanır. Çalıştırma:
  ..\\.venv\\Scripts\\python.exe -X utf8 testler/icerik-hatti-test.py
"""
import contextlib
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP / 'scripts'))
import icerik_hatti as hat

CONCEPT = 'bolme-bolunebilme'
SPEC = json.loads((APP / f'icerik-hatti/gorevler/{CONCEPT}.json').read_text(encoding='utf-8'))
READY = (APP / SPEC['primarySource']['local']).is_file() and hat.ARCHIVE.is_file()
FAKE_VALIDATION = {'tests': ['sahte'], 'pass': 1, 'fail': 0}
CHILD = f"""
import sys
sys.path.insert(0, {str(APP / 'scripts')!r})
import icerik_hatti as h
h.STAGE_IMPL['dogrula'] = (h.dogrula_inputs, lambda ctx: ({FAKE_VALIDATION!r}, {{}}), None)
sys.exit(h.main(['calistir', {CONCEPT!r}]))
"""


def configure(root, state):
    hat.ROOT, hat.STATE = root, state
    hat.TASKS, hat.DECISIONS, hat.RELEASES = (root / 'icerik-hatti' / name for name in ('gorevler', 'kararlar', 'yayin'))


SAVED = {}


def setUpModule():
    SAVED.update(paths=(hat.ROOT, hat.STATE, hat.TASKS, hat.DECISIONS, hat.RELEASES), dogrula=hat.STAGE_IMPL['dogrula'],
                 base=Path(tempfile.mkdtemp(prefix='icerik-hatti-test-')))
    hat.STAGE_IMPL['dogrula'] = (hat.dogrula_inputs, lambda ctx: (dict(FAKE_VALIDATION), {}), None)


def tearDownModule():
    hat.ROOT, hat.STATE, hat.TASKS, hat.DECISIONS, hat.RELEASES = SAVED['paths']
    hat.STAGE_IMPL['dogrula'] = SAVED['dogrula']
    shutil.rmtree(SAVED['base'], ignore_errors=True)


@unittest.skipUnless(READY, 'yerel ana kaynak veya çıkmış soru arşivi yok')
class PipelineCase(unittest.TestCase):
    baseline = None  # ilk tam çalıştırmanın kontrol noktası; diğer testler PDF paketini yeniden kurmaz

    def setUp(self):
        self.base = SAVED['base']
        self.root = Path(tempfile.mkdtemp(dir=self.base))
        self.state = self.root / '_durum'
        (self.root / 'icerik-hatti/gorevler').mkdir(parents=True)
        self.write_spec(SPEC)
        configure(self.root, self.state)

    def write_spec(self, spec):
        hat.write_json(self.root / f'icerik-hatti/gorevler/{CONCEPT}.json', spec)

    def output(self):
        return self.root / SPEC['output']

    def run_quiet(self, **kwargs):
        with contextlib.redirect_stdout(io.StringIO()):
            code, summary, _ = hat.run_task(CONCEPT, **kwargs)
        return code, {name: state for name, state, _ in summary['stages']}, summary

    def from_baseline(self):
        """Paylaşılan ilk çalıştırmanın kontrol noktasını kopyalar (kaynak aşaması tekrar kurulmaz)."""
        if PipelineCase.baseline is None:
            baseline = self.base / 'ilk-calistirma'
            (baseline / 'icerik-hatti/gorevler').mkdir(parents=True)
            hat.write_json(baseline / f'icerik-hatti/gorevler/{CONCEPT}.json', SPEC)
            configure(baseline, baseline / '_durum')
            code, states, _ = self.run_quiet()
            self.assertEqual(code, 0, states)
            self.assertEqual(set(states.values()), {'CALISTI'}, 'boş kontrol noktasında bütün aşamalar çalışır')
            PipelineCase.baseline = baseline
        shutil.copytree(PipelineCase.baseline / '_durum', self.state, dirs_exist_ok=True)
        for relative in (SPEC['output'], hat.REGISTRY, f'icerik-hatti/yayin/{CONCEPT}.json'):
            (self.root / relative).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(PipelineCase.baseline / relative, self.root / relative)
        # Kopyalanan kontrol noktası mutlak yolları değil, yalnız hash'leri taşır.
        configure(self.root, self.state)

    def child(self, kill=None):
        env = {**os.environ, 'IVME_ICERIK_KOK': str(self.root), 'IVME_ICERIK_DURUM': str(self.state)}
        if kill:
            env['IVME_ICERIK_TEST_KES'] = kill
        return subprocess.run([sys.executable, '-X', 'utf8', '-c', CHILD], cwd=APP, env=env, capture_output=True,
                              encoding='utf-8', errors='replace')


class ResumeTest(PipelineCase):
    def test_full_run_reproduces_published_pilot_and_second_run_does_nothing(self):
        self.from_baseline()
        self.assertEqual(self.output().read_bytes(), (APP / SPEC['output']).read_bytes(),
                         'hat, depodaki pilot kanıtıyla bayt bayt aynı çıktıyı üretmeli')
        stamp = self.output().stat().st_mtime_ns
        started = time.monotonic()
        code, states, summary = self.run_quiet()
        self.assertEqual(code, 0)
        self.assertEqual(set(states.values()), {'GUNCEL'})
        self.assertEqual(summary['status'], 'REVIEW_REQUIRED')
        self.assertEqual(self.output().stat().st_mtime_ns, stamp, 'değişmeyen çıktı yeniden yazılmaz')
        self.assertLess(time.monotonic() - started, 10)

    def test_kill_after_checkpoint_resumes_from_next_stage(self):
        self.from_baseline()
        hat.write_json(self.state / CONCEPT / 'durum.json',
                       {**hat.read_json(self.state / CONCEPT / 'durum.json'),
                        'stages': {k: v for k, v in hat.read_json(self.state / CONCEPT / 'durum.json')['stages'].items()
                                   if k in ('kaynak', 'kanit')}})
        self.output().unlink()
        result = self.child(kill='taslak:sonra')
        self.assertEqual(result.returncode, 75, result.stderr)
        self.assertFalse(self.output().exists(), 'kesinti sonraki aşamaya geçmeden oldu')
        result = self.child()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        lines = dict(line.split()[:2] for line in result.stdout.splitlines()[1:8])
        self.assertEqual([lines[s] for s in hat.STAGES],
                         ['GUNCEL', 'GUNCEL', 'GUNCEL', 'CALISTI', 'CALISTI', 'CALISTI', 'CALISTI'])
        self.assertEqual(self.output().read_bytes(), (APP / SPEC['output']).read_bytes())

    def test_kill_inside_stage_reruns_only_that_stage_and_takes_over_dead_lock(self):
        self.from_baseline()
        record = hat.read_json(self.state / CONCEPT / 'durum.json')
        del record['stages']['derle']
        hat.write_json(self.state / CONCEPT / 'durum.json', record)
        result = self.child(kill='derle:once')  # çıktı yazıldı, kontrol noktası yazılmadı; kilit dosyası kaldı
        self.assertEqual(result.returncode, 75, result.stderr)
        self.assertTrue((self.state / CONCEPT / '.kilit').exists())
        result = self.child()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        lines = dict(line.split()[:2] for line in result.stdout.splitlines()[1:8])
        self.assertEqual(lines['kanit'], 'GUNCEL')
        self.assertEqual(lines['derle'], 'CALISTI')
        self.assertEqual(lines['dogrula'], 'GUNCEL', 'aynı çıktı yeniden üretildiğinde sonraki aşamalar atlanır')
        self.assertFalse((self.state / CONCEPT / '.kilit').exists())

    def test_live_lock_blocks_second_runner(self):
        with hat.TaskLock(CONCEPT):
            with self.assertRaises(hat.Busy):
                with hat.TaskLock(CONCEPT):
                    pass

    def test_only_changed_scope_reruns(self):
        self.from_baseline()
        spec = json.loads(json.dumps(SPEC))
        spec['sections']['s2']['note'] += ' Not değişti.'
        self.write_spec(spec)
        code, states, _ = self.run_quiet()
        self.assertEqual(code, 0)
        self.assertEqual(states['kaynak'], 'GUNCEL')
        self.assertEqual(states['kanit'], 'CALISTI')
        self.assertEqual(states['taslak'], 'GUNCEL', 'kanıt çıktısı aynı kaldı; ders taslağı yeniden denetlenmez')
        self.assertEqual(states['derle'], 'CALISTI')
        self.assertIn('Not değişti.', self.output().read_text(encoding='utf-8'))

    def test_dry_check_reports_stale_output_without_writing(self):
        self.from_baseline()
        self.output().write_text(self.output().read_text(encoding='utf-8').replace('"contentVersion": 1', '"contentVersion": 9'),
                                 encoding='utf-8', newline='\n')
        before = self.output().read_bytes()
        code, states, _ = self.run_quiet(dry=True)
        self.assertEqual(code, 1)
        self.assertEqual(states['derle'], 'FAILED')
        self.assertEqual(self.output().read_bytes(), before)


class GateTest(PipelineCase):
    def test_unreviewed_image_waits_and_missing_lesson_section_writes_packet(self):
        self.from_baseline()
        spec = json.loads(json.dumps(SPEC))
        spec['questions']['TYT-0596'] = {'sectionId': 's4', 'role': 'independent', 'claims': ['bolme']}
        self.write_spec(spec)
        code, states, summary = self.run_quiet()
        self.assertEqual((code, states['kanit']), (hat.WAITING, 'WAITING'))
        self.assertIn('görseli incelenmedi', summary['stages'][-1][2])
        spec = json.loads(json.dumps(SPEC))
        spec['sections']['s9'] = {'claims': ['bolme'], 'note': 'Derste olmayan bölüm'}
        self.write_spec(spec)
        code, states, _ = self.run_quiet()
        self.assertEqual((code, states['taslak']), (hat.WAITING, 'WAITING'))
        packet = (self.state / CONCEPT / 'gorev-taslak.md').read_text(encoding='utf-8')
        self.assertIn('bölüm s9: görev tanımında var, derste yok', packet)
        self.assertIn('Bölme eşitliği', packet)
        self.assertIn('  > ', packet, 'görev paketi kaynak blok metnini taşır; agent PDF’yi yeniden okumaz')
        self.assertIn(f'python scripts/ivme.py icerik calistir {CONCEPT}', packet)

    def test_teacher_decision_is_bound_to_content_and_lapses_when_content_changes(self):
        self.from_baseline()
        self.assertFalse(json.loads(self.output().read_text(encoding='utf-8'))['review']['teacherApproved'])
        args = hat.parser().parse_args(['karar', CONCEPT, '--rol', 'ogretmen', '--inceleyen', 'test', '--karar', 'KABUL',
                                        '--not', 'sentetik test kaydı'])
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(hat.cmd_decide(args), 0)
        code, states, summary = self.run_quiet()
        evidence = json.loads(self.output().read_text(encoding='utf-8'))
        self.assertEqual((code, summary['status']), (0, 'APPROVED'))
        self.assertTrue(evidence['review']['teacherApproved'])
        self.assertTrue(all(q['teacherApproved'] for q in evidence['questions'].values()))
        self.assertFalse(evidence['review']['studentTransferObserved'])
        spec = json.loads(json.dumps(SPEC))
        spec['sections']['s1']['claims'] = ['bolme', 'saat']
        self.write_spec(spec)
        code, states, summary = self.run_quiet()
        evidence = json.loads(self.output().read_text(encoding='utf-8'))
        self.assertEqual(summary['status'], 'REVIEW_REQUIRED')
        self.assertFalse(evidence['review']['teacherApproved'], 'içerik değişince eski onay geçerli sayılmaz')

    def test_partial_or_change_request_does_not_approve(self):
        self.from_baseline()
        for decision, sections in (('KABUL', 's1,s2'), ('DUZELTME', None)):
            argv = ['karar', CONCEPT, '--rol', 'ogretmen', '--inceleyen', 'test', '--karar', decision, '--not', 'test']
            if sections:
                argv += ['--bolumler', sections]
            with contextlib.redirect_stdout(io.StringIO()):
                hat.cmd_decide(hat.parser().parse_args(argv))
            self.run_quiet()
            self.assertFalse(json.loads(self.output().read_text(encoding='utf-8'))['review']['teacherApproved'], decision)


if __name__ == '__main__':
    unittest.main(verbosity=2)
