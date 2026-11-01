"""TAS-12: kanıtın kaynağa bağlanması, başarısız/eksik kabul ve devir sınırı."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import kalite as q


class QualityTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'testler').mkdir()
        (self.root / 'source.py').write_text('value = 1\n', encoding='utf-8')
        config = dict(checks={'one': dict(kind='python', args=['one.py'], inputs=['source.py'])},
                      profiles={'TAS-12': dict(checks=['one'], remainingAcceptance=['İnsan incelemesi'], nextAction='İncele.')})
        (self.root / q.CONFIG).write_text(json.dumps(config), encoding='utf-8')

    def run_fixture(self, output='Ran 2 tests in 0.01s\n\nOK\n', code=0):
        def run(command, **kwargs):
            return subprocess.CompletedProcess(command, 0, 'abc123\n', '') if command[0] == 'git' else \
                subprocess.CompletedProcess(command, code, output, '')
        with patch.object(q.subprocess, 'run', side_effect=run):
            return q.run_profile(self.root, 'TAS-12')

    def test_real_report_preserves_commands_and_does_not_approve_task(self):
        self.assertEqual(0, self.run_fixture())
        result = q.inspect_report(self.root, 'TAS-12')
        self.assertEqual('PASS', result['status'])
        self.assertEqual('NOT_EVALUATED', result['acceptance'])
        self.assertEqual(['İnsan incelemesi'], result['remainingAcceptance'])
        report = json.loads(Path(result['report']).read_text(encoding='utf-8'))
        self.assertEqual('one.py', report['checks'][0]['command'][-1])

    def test_changed_source_invalidates_report(self):
        self.run_fixture()
        (self.root / 'source.py').write_text('value = 2', encoding='utf-8')
        self.assertEqual('STALE', q.inspect_report(self.root, 'TAS-12')['status'])

    def test_changed_test_profile_invalidates_report(self):
        self.run_fixture()
        path = self.root / q.CONFIG
        path.write_text(path.read_text(encoding='utf-8') + '\n', encoding='utf-8')
        self.assertEqual('STALE', q.inspect_report(self.root, 'TAS-12')['status'])

    def test_missing_log_invalidates_report(self):
        self.run_fixture()
        result = q.inspect_report(self.root, 'TAS-12')
        (Path(result['report']).parent / 'one.log').unlink()
        self.assertEqual('STALE', q.inspect_report(self.root, 'TAS-12')['status'])

    def test_failed_run_cannot_reuse_previous_success(self):
        self.run_fixture()
        self.assertEqual(1, self.run_fixture('failure', 1))
        self.assertEqual('FAIL', q.inspect_report(self.root, 'TAS-12')['status'])
        self.assertEqual(2, len(list((self.root / 'veri/kalite/TAS-12').glob('*/rapor.json'))))

    def test_zero_tests_fails(self):
        for kind, output in [('python', 'Ran 0 tests in 0.1s\nOK\n'), ('node', '# tests 0\n# pass 0\n')]:
            self.assertEqual('FAIL', q.assess_output(kind, 0, output)['status'])

    def test_skipped_is_incomplete(self):
        result = q.assess_output('python', 0, 'Ran 2 tests in 0.1s\nOK (skipped=1)\n')
        self.assertEqual('INCOMPLETE', result['status'])
        self.assertEqual('FAIL', q.assess_output('python', 0, 'Ran 2 tests in 0.1s\nOK (skipped=2)\n')['status'])

    def test_node_success_and_cancelled(self):
        self.assertEqual('PASS', q.assess_output('node', 0,
                         '# tests 2\n# pass 2\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n')['status'])
        self.assertEqual('FAIL', q.assess_output('node', 0, '# tests 2\n# pass 1\n# cancelled 1\n')['status'])

    def test_interrupted_run_does_not_leave_previous_success_current(self):
        self.run_fixture()
        def run(command, **kwargs):
            if command[0] == 'git':
                return subprocess.CompletedProcess(command, 0, 'abc123\n', '')
            raise KeyboardInterrupt()
        with patch.object(q.subprocess, 'run', side_effect=run), self.assertRaises(KeyboardInterrupt):
            q.run_profile(self.root, 'TAS-12')
        self.assertEqual('INCOMPLETE', q.inspect_report(self.root, 'TAS-12')['status'])

    def test_source_changed_during_test_is_stale(self):
        def run(command, **kwargs):
            if command[0] == 'git':
                return subprocess.CompletedProcess(command, 0, 'abc123\n', '')
            (self.root / 'source.py').write_text('value = 2', encoding='utf-8')
            return subprocess.CompletedProcess(command, 0, 'Ran 1 test in 0.1s\nOK\n', '')
        with patch.object(q.subprocess, 'run', side_effect=run):
            self.assertEqual(1, q.run_profile(self.root, 'TAS-12'))
        self.assertEqual('STALE', q.inspect_report(self.root, 'TAS-12')['status'])

    def test_missing_backend_evidence_fails(self):
        self.assertEqual('FAIL', q.assess_output('backend', 0, 'success')['status'])

    def test_plan_is_not_test_output(self):
        self.assertEqual('PASS', q.assess_output('plan', 0, '{"status":"PASS","errors":[]}')['status'])
        self.assertEqual('FAIL', q.assess_output('python', 0, '{"status":"PASS","errors":[]}')['status'])

    def test_all_task_profiles_reference_existing_scripts_and_scoped_inputs(self):
        config = json.loads((q.APP / q.CONFIG).read_text(encoding='utf-8'))
        self.assertEqual({f'TAS-{n:02}' for n in range(1, 13)}, set(config['profiles']))
        for task in config['profiles']:
            profile, checks = q.load_profile(q.APP, task)
            self.assertTrue(profile['nextAction'])
            for check in checks:
                self.assertTrue(check['inputs'])
                if check['kind'] != 'backend':
                    for arg in check['args']:
                        self.assertTrue((q.APP / arg).is_file(), arg)


if __name__ == '__main__':
    unittest.main()
