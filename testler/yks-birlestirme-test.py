"""Control-plane tests use only temporary fixture folders; no sources/DB/models."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from yks_birlestirme import Store, dependencies, process_lock, write_json, digest


class ConsolidationControlTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.store = Store(self.root / 'control')

    def tearDown(self):
        self.temp.cleanup()

    def operation(self, calls):
        def perform(folder, cursor, checkpoint):
            calls.append(cursor)
            artifact = folder / 'result.json'
            write_json(artifact, {'status': 'PASS'})
            return {'status': 'PASS', 'artifacts': [artifact]}
        return perform

    def test_status_is_read_only_and_initialization_is_idempotent(self):
        self.assertIsNone(self.store.current())
        self.assertFalse(self.store.root.exists())
        first = self.store.initialize()
        self.assertEqual(first, self.store.initialize())
        self.assertEqual(first['stages'], {})

    def test_verified_artifact_is_reused_and_changed_inputs_rerun_only_stage(self):
        self.store.initialize()
        calls = []
        self.store.execute('YKS-00', 'full', {'input': 1}, self.operation(calls))
        reused = self.store.execute('YKS-00', 'full', {'input': 1}, self.operation(calls))
        self.assertTrue(reused['reused'])
        self.assertEqual(len(calls), 1)
        self.store.execute('YKS-00', 'full', {'input': 2}, self.operation(calls))
        self.assertEqual(len(calls), 2)

    def test_missing_or_corrupted_artifact_invalidates_evidence(self):
        self.store.initialize()
        calls = []
        self.store.execute('YKS-00', 'full', {}, self.operation(calls))
        state = self.store.current()
        p = self.store.child(state['runId'] + '/' + state['stages']['YKS-00:full']['artifacts'][0]['path'])
        p.write_text('broken')
        self.assertEqual(self.store.verify(state, 'YKS-00')['status'], 'STALE')
        self.store.execute('YKS-00', 'full', {}, self.operation(calls))
        self.assertEqual(len(calls), 2)

    def test_failed_stage_keeps_checkpoint_and_resumes_without_claiming_success(self):
        self.store.initialize()
        def fail(folder, cursor, checkpoint):
            checkpoint({'page': 3})
            raise RuntimeError('fixture interruption')
        with self.assertRaises(RuntimeError):
            self.store.execute('YKS-00', 'full', {}, fail)
        state = self.store.current()
        self.assertEqual(state['stages']['YKS-00:full']['status'], 'FAILED')
        calls = []
        self.store.execute('YKS-00', 'full', {}, self.operation(calls))
        self.assertEqual(calls, [{'page': 3}])

    def test_unverified_prerequisite_never_calls_operation(self):
        self.store.initialize()
        calls = []
        with self.assertRaisesRegex(ValueError, 'prerequisite'):
            self.store.execute('YKS-01', 'full', {}, self.operation(calls))
        self.assertEqual(calls, [])

    def test_unknown_stage_and_invalid_pilot_scope_are_rejected(self):
        for stage, scope in [('YKS-99', 'full'), ('YKS-01', 'pilot'), ('YKS-07', 'wrong')]:
            with self.assertRaises(ValueError):
                dependencies(stage, scope)

    def test_full_scan_requires_pilot_acceptance_but_initial_pilot_has_no_cycle(self):
        self.assertIn(('YKS-10', 'pilot'), dependencies('YKS-07', 'full'))
        self.assertNotIn(('YKS-10', 'pilot'), dependencies('YKS-07', 'pilot'))
        self.assertIn(('YKS-09', 'pilot'), dependencies('YKS-10', 'pilot'))
        self.assertIn(('YKS-09', 'full'), dependencies('YKS-10', 'full'))

    def test_second_writer_is_rejected_and_lock_is_released(self):
        lock = self.root / 'writer.lock'
        with process_lock(lock):
            with self.assertRaises(RuntimeError):
                with process_lock(lock):
                    self.fail('Two writers entered')
        with process_lock(lock):
            pass

    def test_process_exit_releases_os_lock_without_deleting_a_pid_file(self):
        lock = self.root / 'exit.lock'
        script = 'import sys,os;sys.path.insert(0,sys.argv[1]);from yks_birlestirme import process_lock;from pathlib import Path\nwith process_lock(Path(sys.argv[2])):os._exit(0)'
        result = subprocess.run([sys.executable, '-c', script, str(Path(__file__).resolve().parents[1] / 'scripts'), str(lock)], timeout=10)
        self.assertEqual(result.returncode, 0)
        with process_lock(lock):
            pass

    def test_escape_and_corrupted_pointer_fail_without_replacing_state(self):
        with self.assertRaises(ValueError):
            self.store.child('../outside')
        self.store.initialize()
        write_json(self.store.root / 'current.json', {'runId': '../outside'})
        with self.assertRaises(ValueError):
            self.store.current()

    def test_nonpassing_or_outside_artifact_cannot_complete_stage(self):
        self.store.initialize()
        for operation in [lambda *_: {'status': 'FAIL', 'artifacts': []},
                          lambda *_: {'status': 'PASS', 'artifacts': [self.root / 'outside.json']}]:
            with self.assertRaises(ValueError):
                self.store.execute('YKS-00', 'full', {}, operation)
            self.assertEqual(self.store.current()['stages']['YKS-00:full']['status'], 'FAILED')

    def test_events_and_state_have_matching_revision_and_no_temp_files(self):
        self.store.initialize()
        self.store.execute('YKS-00', 'full', {}, self.operation([]))
        state = self.store.current()
        events = [json.loads(s) for s in self.store.child(state['runId'] + '/events.jsonl').read_text().splitlines()]
        self.assertEqual(events[-1]['revision'], state['revision'])
        self.assertFalse(list(self.store.root.rglob('*.tmp')))

    def test_changed_input_invalidates_prerequisite_and_changed_cursor_is_reset(self):
        source = self.root / 'fixture.txt'
        source.write_text('first')
        inputs = {'fileBase': str(self.root), 'files': {'fixture.txt': digest(source)}}
        self.store.initialize()
        def first(folder, cursor, checkpoint):
            checkpoint({'page': 8})
            return self.operation([])(folder, cursor, checkpoint)
        self.store.execute('YKS-00', 'full', inputs, first)
        source.write_text('second')
        with self.assertRaisesRegex(ValueError, 'prerequisite'):
            self.store.execute('YKS-01', 'full', {}, self.operation([]))
        fresh = {'fileBase': str(self.root), 'files': {'fixture.txt': digest(source)}}
        calls = []
        self.store.execute('YKS-00', 'full', fresh, self.operation(calls))
        self.assertEqual(calls, [None])
        self.assertEqual(len(list(self.store.root.rglob('result.json'))), 2)

    def test_input_changed_during_work_cannot_be_marked_verified(self):
        source = self.root / 'fixture.txt'
        source.write_text('first')
        inputs = {'fileBase': str(self.root), 'files': {'fixture.txt': digest(source)}}
        self.store.initialize()
        def mutate(folder, cursor, checkpoint):
            source.write_text('changed')
            return self.operation([])(folder, cursor, checkpoint)
        with self.assertRaisesRegex(ValueError, 'during execution'):
            self.store.execute('YKS-00', 'full', inputs, mutate)
        self.assertEqual(self.store.current()['stages']['YKS-00:full']['status'], 'FAILED')


if __name__ == '__main__':
    unittest.main(verbosity=2)
