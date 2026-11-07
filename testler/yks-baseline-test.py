"""Baseline failure/identity tests: fake PostgreSQL and temporary source evidence."""
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from yks_stages import database as db
from yks_stages.evidence import backup_files
from yks_birlestirme import read_json, write_json, digest


class BaselineSafetyTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.folder = self.root / 'output'
        self.folder.mkdir()
        self.cmd = ['psql', '--host', '127.0.0.1', '--port', '5432', '--username', 'fixture', '--dbname', 'ivme']

    def tearDown(self):
        self.temp.cleanup()

    def test_existing_test_database_is_never_replaced(self):
        with patch.object(db, 'connection', return_value=(self.cmd, {})), patch.object(db, 'query', return_value='t') as query, patch.object(db, 'run_logged') as run:
            with self.assertRaisesRegex(RuntimeError, 'protected'):
                db.backup_and_restore(self.root, 'ivme', self.folder, lambda _: None)
            run.assert_not_called()
            self.assertEqual(query.call_count, 1)

    def fake_snapshot(self):
        class Snapshot:
            def __init__(self, *_): pass
            def __enter__(self): return self
            def __exit__(self, *_): pass
            def execute(self, sql): return '1024' if 'pg_database_size' in sql else 'fixture-snapshot'
        return Snapshot

    def fake_run(self, arguments, env, log, **kwargs):
        log.write_text('fixture operation')
        if '--file' in arguments:
            Path(arguments[arguments.index('--file') + 1]).write_bytes(b'fixture dump')

    def test_backup_restore_requires_equal_table_counts_and_hashes_and_removes_own_db(self):
        statements = []
        def query(cmd, env, sql, **kwargs):
            statements.append(sql)
            if 'EXISTS' in sql: return 'f'
            if 'SELECT oid' in sql: return '123'
            return ''
        fingerprints = [{'schema': 'public', 'name': 'questions', 'rows': 2, 'rowDigest': 'same'}]
        with patch.object(db, 'connection', return_value=(self.cmd, {})), patch.object(db, 'query', side_effect=query), patch.object(db, 'Snapshot', self.fake_snapshot()), patch.object(db, 'run_logged', side_effect=self.fake_run), patch.object(db, 'table_fingerprints', return_value=fingerprints):
            report = db.backup_and_restore(self.root, 'ivme', self.folder, lambda _: None)
        self.assertTrue(report['restoredRowsAndDigestsEqual'])
        self.assertTrue(report['testDatabaseRemoved'])
        self.assertEqual(statements.count('CREATE DATABASE ivme_test'), 1)
        self.assertEqual(statements.count('DROP DATABASE ivme_test'), 1)
        self.assertFalse(any('FORCE' in s or 'DROP DATABASE ivme ' in s for s in statements))

    def test_restore_mismatch_fails_but_cleans_up_only_owned_test_db(self):
        def query(cmd, env, sql, **kwargs):
            if 'EXISTS' in sql:return 'f'
            if 'SELECT oid' in sql:return '123'
            return ''
        with patch.object(db, 'connection', return_value=(self.cmd, {})), patch.object(db, 'query', side_effect=query) as q, patch.object(db, 'Snapshot', self.fake_snapshot()), patch.object(db, 'run_logged', side_effect=self.fake_run), patch.object(db, 'table_fingerprints', side_effect=[[{'rows': 2}], [{'rows': 1}]]):
            with self.assertRaisesRegex(ValueError, 'differ'):
                db.backup_and_restore(self.root, 'ivme', self.folder, lambda _: None)
        self.assertTrue(any(c.args[2] == 'DROP DATABASE ivme_test' for c in q.call_args_list))
        self.assertFalse((self.folder / 'ivme-restore.json').exists())

    def test_test_db_identity_change_prevents_cleanup(self):
        identities = iter(['123', '999'])
        def query(cmd, env, sql, **kwargs):
            if 'EXISTS' in sql:return 'f'
            if 'SELECT oid' in sql:return next(identities)
            return ''
        with patch.object(db, 'connection', return_value=(self.cmd, {})), patch.object(db, 'query', side_effect=query) as q, patch.object(db, 'Snapshot', self.fake_snapshot()), patch.object(db, 'run_logged', side_effect=self.fake_run), patch.object(db, 'table_fingerprints', return_value=[]):
            with self.assertRaisesRegex(RuntimeError, 'identity changed'):
                db.backup_and_restore(self.root, 'ivme', self.folder, lambda _: None)
        self.assertFalse(any(c.args[2] == 'DROP DATABASE ivme_test' for c in q.call_args_list))

    def test_database_creation_race_does_not_drop_someone_elses_database(self):
        def query(cmd, env, sql, **kwargs):
            if 'EXISTS' in sql:return 'f'
            if 'CREATE DATABASE' in sql:raise RuntimeError('already exists')
            return ''
        with patch.object(db, 'connection', return_value=(self.cmd, {})), patch.object(db, 'query', side_effect=query) as q, patch.object(db, 'Snapshot', self.fake_snapshot()), patch.object(db, 'run_logged', side_effect=self.fake_run), patch.object(db, 'table_fingerprints', return_value=[]):
            with self.assertRaisesRegex(RuntimeError, 'already exists'):
                db.backup_and_restore(self.root, 'ivme', self.folder, lambda _: None)
        self.assertFalse(any('DROP DATABASE' in c.args[2] for c in q.call_args_list))

    def test_duplicate_evidence_bytes_are_saved_once_and_sources_preserved(self):
        source = self.root / 'source'
        source.mkdir()
        (source / 'one.png').write_bytes(b'original pixels')
        (source / 'two.png').write_bytes(b'original pixels')
        report = backup_files(self.root, [source], self.folder)
        self.assertEqual(report['uniqueObjects'], 1)
        self.assertEqual(len(report['files']), 2)
        self.assertEqual((source / 'one.png').read_bytes(), b'original pixels')
        with zipfile.ZipFile(self.folder / 'bank-images-content.zip') as archive:
            self.assertEqual(len(archive.namelist()), 1)
        self.assertTrue(read_json(self.folder / 'bank-images-content.json')['restoredObjectHashesVerified'])

    def test_evidence_root_escape_and_invalid_sql_identifier_fail(self):
        with self.assertRaises(ValueError):
            backup_files(self.root / 'narrow', [self.root], self.folder)
        for value in ['', 'bad\x00name']:
            with self.assertRaises(ValueError):db.identifier(value)
        self.assertEqual(db.identifier('a"b'), '"a""b"')

    def test_verified_restore_proof_is_reused_without_redump_or_restore(self):
        prior = self.root / 'prior'
        prior.mkdir()
        dump = prior / 'ivme.dump'
        dump.write_bytes(b'completed dump')
        write_json(prior / 'ivme-snapshot.json', {'database': 'ivme', 'snapshot': 'old', 'tables': [{'rows': 2}]})
        write_json(prior / 'ivme-restore.json', {'status': 'PASS', 'sourceDatabase': 'ivme',
                   'restoredRowsAndDigestsEqual': True, 'testDatabaseRemoved': True,
                   'tablesVerified': 1, 'dumpSha256': digest(dump)})
        with patch.object(db, 'connection', return_value=(self.cmd, {})), patch.object(db, 'query', return_value='f'), patch.object(db, 'run_logged') as run:
            result = db.backup_and_restore(self.root, 'ivme', self.folder, lambda _: None, reuse_folder=prior)
        run.assert_not_called()
        self.assertEqual(digest(self.folder / 'ivme.dump'), digest(dump))
        self.assertIn('reusedVerificationFrom', result)

    def test_unproven_dump_is_never_reused(self):
        prior = self.root / 'prior'
        prior.mkdir()
        (prior / 'ivme.dump').write_bytes(b'partial dump')
        write_json(prior / 'ivme-snapshot.json', {'database': 'ivme', 'snapshot': 'old', 'tables': [{'rows': 2}]})
        with patch.object(db, 'connection', return_value=(self.cmd, {})), patch.object(db, 'query', return_value='f'), patch.object(db, 'Snapshot', side_effect=RuntimeError('new snapshot required')):
            with self.assertRaisesRegex(RuntimeError, 'new snapshot required'):
                db.backup_and_restore(self.root, 'ivme', self.folder, lambda _: None, reuse_folder=prior)
        self.assertFalse((self.folder / 'ivme.dump').exists())

    def test_record_hash_preserves_values_without_expanding_jsonb_and_casts_external_types(self):
        class Snapshot:
            def execute(self, sql):
                return '[{"position":1,"name":"payload","native":true},{"position":2,"name":"embedding","native":false},{"position":3,"name":"state","native":false}]'
        value = db.record_expression(Snapshot(), {'schema': 'public', 'name': 'fixture'})
        self.assertEqual(value, 'ROW(t."payload",t."embedding"::text,t."state"::text)')


if __name__ == '__main__':
    unittest.main(verbosity=2)
