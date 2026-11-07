"""Private restore lifecycle guards; no PostgreSQL process is started by tests."""
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_stages import restore_cluster as restore


class PrivateRestoreTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)
        self.evidence=self.root/'evidence';self.evidence.mkdir()
        self.environment=patch.dict(os.environ,{'LOCALAPPDATA':str(self.root/'local')})
        self.environment.start()
        self.calls=[]

    def tearDown(self):
        self.environment.stop();self.temp.cleanup()

    def fake_process(self, arguments, env, log, **kwargs):
        self.calls.append(arguments)
        log.write_text('fixture process')
        if 'initdb.exe' in str(arguments[0]):
            self.data=Path(arguments[arguments.index('--pgdata')+1]);self.data.mkdir()
        elif arguments[-1]=='start':
            (self.data/'postmaster.pid').write_text('123\n')
        elif arguments[-1]=='stop':
            (self.data/'postmaster.pid').unlink()

    def test_private_authenticated_loopback_instance_stops_and_removes_only_its_own_directory(self):
        with patch.object(restore,'run_logged',side_effect=self.fake_process):
            with restore.PrivateRestoreCluster(self.root/'bin',self.evidence) as cluster:
                directory=cluster.directory
                self.assertEqual(cluster.connection[0][cluster.connection[0].index('--host')+1],'127.0.0.1')
                self.assertEqual(cluster.connection[0][-1],'ivme_test')
                self.assertFalse((directory/'init-password.tmp').exists())
                self.assertTrue(cluster.connection[1]['PGPASSWORD'])
                self.assertNotIn(cluster.password,(self.evidence/'private-cluster.json').read_text())
            self.assertFalse(directory.exists())
        self.assertIn('--auth-host=scram-sha-256',self.calls[0])
        self.assertTrue(any(args[-1]=='stop' for args in self.calls))
        self.assertTrue(json.loads((self.evidence/'private-cluster-cleanup.json').read_text())['serverStopped'])

    def test_error_preserves_forensic_directory_but_stops_test_server(self):
        with patch.object(restore,'run_logged',side_effect=self.fake_process):
            with self.assertRaisesRegex(RuntimeError,'restore fixture error'):
                with restore.PrivateRestoreCluster(self.root/'bin',self.evidence) as cluster:
                    directory=cluster.directory
                    raise RuntimeError('restore fixture error')
        self.assertTrue(directory.exists())
        self.assertFalse((directory/'data/postmaster.pid').exists())

    def test_init_failure_removes_transient_password(self):
        with patch.object(restore,'run_logged',side_effect=RuntimeError('init error')):
            cluster=restore.PrivateRestoreCluster(self.root/'bin',self.evidence)
            with self.assertRaises(RuntimeError):cluster.__enter__()
        self.assertFalse((cluster.directory/'init-password.tmp').exists())

    def test_changed_server_identity_refuses_stop(self):
        with patch.object(restore,'run_logged',side_effect=self.fake_process) as run:
            cluster=restore.PrivateRestoreCluster(self.root/'bin',self.evidence).__enter__()
            (cluster.data/'postmaster.pid').write_text('999\n')
            before=run.call_count
            with self.assertRaisesRegex(RuntimeError,'identity changed'):cluster.stop()
            self.assertEqual(run.call_count,before)

    def test_cleanup_target_outside_explicit_base_is_not_deleted(self):
        cluster=restore.PrivateRestoreCluster(self.root/'bin',self.evidence)
        outside=self.root/'must-keep';outside.mkdir();(outside/'sentinel').write_text('keep')
        cluster.directory=outside
        with self.assertRaises(ValueError):cluster.__exit__(None,None,None)
        self.assertTrue((outside/'sentinel').is_file())


if __name__=='__main__':unittest.main(verbosity=2)
