"""TAS-12: yanlış başarı, eski/bozuk rapor ve bilinen hatayla yeni hatayı gizleme."""
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from test_kaniti import assess_backend, fingerprint


class EvidenceTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def report(self, name='ExampleTest', cases='<testcase classname="com.hedefyks.ExampleTest" name="works"/>',
               tests=1, failures=0, errors=0, skipped=0):
        path = self.root / (name + '.xml')
        path.write_text(f'<testsuite name="com.hedefyks.{name}" tests="{tests}" failures="{failures}" '
                        f'errors="{errors}" skipped="{skipped}">{cases}</testsuite>', encoding='utf-8')
        return path

    def assess(self, paths, known=(), code=0, clean=True, selected=''):
        return assess_backend(paths, set(known), code, clean, selected)

    def test_success_requires_executed_test(self):
        self.assertEqual('PASS', self.assess([self.report()])['status'])
        self.assertEqual('FAIL', self.assess([])['status'])
        self.assertEqual('FAIL', self.assess([self.report(cases='', tests=0)])['status'])

    def test_old_report_is_not_used_by_command(self):
        import ivme
        from unittest.mock import patch
        import subprocess
        directory = self.root / 'backend/target-tests/surefire-reports'
        directory.mkdir(parents=True)
        self.report().replace(directory / 'TEST-ExampleTest.xml')
        with patch.object(ivme, 'APP', self.root), patch.object(ivme, 'known_failures', return_value=set()), \
             patch.object(ivme, 'out', return_value='test-commit'), \
             patch.object(ivme, 'run', return_value=subprocess.CompletedProcess([], 0, 'IVME_TEST_RESULT=0\n', '')):
            self.assertEqual(1, ivme.cmd_test(['ExampleTest']))

    def test_truncated_xml_fails(self):
        path = self.report()
        path.write_text('<testsuite', encoding='utf-8')
        self.assertEqual('FAIL', self.assess([path])['status'])

    def test_summary_mismatch_fails(self):
        self.assertEqual('FAIL', self.assess([self.report(tests=2)])['status'])

    def test_all_skipped_is_not_success(self):
        path = self.report(cases='<testcase name="absent"><skipped/></testcase>', skipped=1)
        self.assertEqual('FAIL', self.assess([path])['status'])

    def test_partial_skip_is_incomplete(self):
        path = self.report(cases='<testcase name="works"/><testcase name="absent"><skipped/></testcase>', tests=2, skipped=1)
        self.assertEqual('INCOMPLETE', self.assess([path])['status'])

    def test_known_failure_is_explicit(self):
        path = self.report(cases='<testcase classname="com.hedefyks.ExampleTest" name="old"><failure/></testcase>', failures=1)
        result = self.assess([path], ['ExampleTest.old'], code=1)
        self.assertEqual('KNOWN_FAILURES', result['status'])
        self.assertEqual(['ExampleTest.old'], result['knownFailures'])

    def test_known_does_not_hide_new_failure(self):
        path = self.report(cases='<testcase classname="ExampleTest" name="old"><failure/></testcase>'
                           '<testcase classname="ExampleTest" name="new"><error/></testcase>', tests=2, failures=1, errors=1)
        result = self.assess([path], ['ExampleTest.old'], code=1)
        self.assertEqual('FAIL', result['status'])
        self.assertEqual(['ExampleTest.new'], result['newFailures'])

    def test_known_does_not_hide_cleanup_failure(self):
        path = self.report(cases='<testcase classname="ExampleTest" name="old"><failure/></testcase>', failures=1)
        self.assertEqual('FAIL', self.assess([path], ['ExampleTest.old'], code=1, clean=False)['status'])

    def test_environment_failure_with_passing_report_fails(self):
        self.assertEqual('FAIL', self.assess([self.report()], code=1)['status'])

    def test_successful_exit_with_failed_xml_fails(self):
        path = self.report(cases='<testcase classname="ExampleTest" name="old"><failure/></testcase>', failures=1)
        self.assertEqual('FAIL', self.assess([path], ['ExampleTest.old'])['status'])

    def test_missing_requested_class_fails_even_when_other_class_passes(self):
        self.assertEqual('FAIL', self.assess([self.report()], selected='ExampleTest,TypoTest')['status'])
        self.assertEqual('PASS', self.assess([self.report(name='learn.ExampleTest')], selected='learn.Example*')['status'])

    def test_content_addition_deletion_changes_fingerprint(self):
        before = fingerprint(self.root, ['*.txt'])
        path = self.root / 'source.txt'
        path.write_text('one', encoding='utf-8')
        added = fingerprint(self.root, ['*.txt'])
        path.write_text('two', encoding='utf-8')
        self.assertNotEqual(added, fingerprint(self.root, ['*.txt']))
        path.unlink()
        self.assertEqual(before, fingerprint(self.root, ['*.txt']))
        self.assertNotEqual(before, added)


if __name__ == '__main__':
    unittest.main()
