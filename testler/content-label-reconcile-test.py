"""Regression checks for reconciliation; no real database or login writes."""
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP / 'scripts'))
spec = importlib.util.spec_from_file_location('reconcile', APP / 'scripts/content-label-reconcile.py')
reconcile = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reconcile)


class Response(io.BytesIO):
    status = 200


class ReconcileTest(unittest.TestCase):
    def test_direction_preserves_new_changed_removed_and_unchanged_identities(self):
        self.assertEqual(reconcile.differences(
            {'same': 'a', 'changed': 'old', 'removed': 'r'},
            {'same': 'a', 'changed': 'new', 'added': 'n'}),
            {'added': ['added'], 'removed': ['removed'], 'changed': ['changed'], 'unchanged': 1})

    def test_same_counts_do_not_hide_replaced_identity(self):
        delta = reconcile.differences({'old': 1}, {'new': 1})
        self.assertTrue(reconcile.has_delta(delta))
        self.assertEqual(delta['unchanged'], 0)

    def test_duplicate_identity_fails_instead_of_silently_overwriting(self):
        with self.assertRaisesRegex(ValueError, 'Duplicate identity'):
            reconcile.keyed([{'key': 'x'}, {'key': 'x'}], 'key')

    def test_migrations_distinguish_pending_checksum_drift_and_already_applied(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            first = root / 'V1__first.sql'
            first.write_text('\ufeffSELECT 1;\n', encoding='utf-8')
            (root / 'V2__next.sql').write_text('SELECT 2;\n', encoding='utf-8')
            checksum = reconcile.migration_checksum(first)
            applied = [{'version': '1', 'script': first.name, 'checksum': checksum, 'success': True}]
            result = reconcile.migrations(applied, root)
            self.assertEqual(result['pendingRequired'], [{'version': '2', 'script': 'V2__next.sql'}])
            self.assertEqual(result['checksumMismatches'], [])
            first.write_bytes(b'SELECT 1;\r\n')
            self.assertEqual(reconcile.migration_checksum(first), checksum)
            first.write_text('SELECT 3;', encoding='utf-8')
            self.assertEqual(reconcile.migrations(applied, root)['checksumMismatches'][0]['version'], '1')

    def test_database_options_enforce_read_only_without_exposing_password(self):
        connection = (['psql'], {'PGOPTIONS': '-c standard_conforming_strings=on', 'PGPASSWORD': 'secret'}, 'ivme')
        with patch.object(reconcile, 'db_connection', return_value=connection):
            _, env, _ = reconcile.readonly_connection('ivme')
        self.assertIn('default_transaction_read_only=on', env['PGOPTIONS'])
        self.assertNotIn('secret', env['PGOPTIONS'])

    def test_known_missing_pdf_is_preserved_without_fabricating_a_new_deletion(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / 'Kaynaklar'
            root.mkdir()
            result, unavailable = reconcile.pdf_snapshot([{'key': 'pdf:2088', 'relativePath': 'missing.pdf',
                'sourceScope': 'RESOURCES', 'sourceSha256': '', 'availability': 'missing_file'}], root)
            self.assertEqual(result, {'hashedUniqueFiles': 0, 'changedOrRemoved': [], 'added': []})
            self.assertEqual(unavailable[0]['keys'], ['pdf:2088'])

    def test_pdf_aliases_count_once_and_new_changed_deleted_files_remain_visible(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / 'Kaynaklar'
            root.mkdir()
            (root / 'same.pdf').write_bytes(b'unchanged')
            (root / 'new.pdf').write_bytes(b'new source')
            sha = reconcile.file_hash(root / 'same.pdf')
            rows = [{'key': key, 'relativePath': name, 'sourceScope': 'RESOURCES',
                     'sourceSha256': digest, 'availability': 'available'} for key, name, digest in [
                        ('alias1', 'same.pdf', sha), ('alias2', 'same.pdf', sha), ('deleted', 'deleted.pdf', sha)]]
            result, _ = reconcile.pdf_snapshot(rows, root)
            self.assertEqual(result['hashedUniqueFiles'], 1)
            self.assertEqual(result['added'], ['Kaynaklar/new.pdf'])
            self.assertEqual(result['changedOrRemoved'][0]['keys'], ['deleted'])
            (root / 'same.pdf').write_bytes(b'changed')
            result, _ = reconcile.pdf_snapshot(rows, root)
            self.assertEqual(len(result['changedOrRemoved']), 2)

    def test_api_rejects_external_origins_credentials_and_paths(self):
        for base in ['https://example.com', 'http://localhost.evil:9090',
                     'http://user:pass@localhost:9090', 'http://localhost:9090/private',
                     'http://localhost:9090?token=secret', 'http://localhost:9090#fragment']:
            with self.subTest(base=base), self.assertRaises(ValueError):
                reconcile.local_base(base)

    def read_api(self, value):
        response = Response(json.dumps(value).encode())
        opener = unittest.mock.Mock()
        opener.open.return_value = response
        with patch.object(reconcile, 'build_opener', return_value=opener), patch.dict(os.environ, {}, clear=True):
            result = reconcile.api_snapshot('http://127.0.0.1:9090', {'runKey': 'run1'}, {'c': {'id': 'c'}})
        self.assertEqual(opener.open.call_args.args[0].method, 'GET')
        return result

    def test_dynamic_api_categories_do_not_hide_missing_or_changed_published_category(self):
        result = self.read_api({'summary': {'runKey': 'run1'}, 'categories': [{'id': 'c'}, {'id': 'taxonomy:1'}]})
        self.assertEqual(result['status'], 'MATCH')
        self.assertEqual(result['additionalDynamicCategories'], ['taxonomy:1'])
        result = self.read_api({'summary': {'runKey': 'run1'}, 'categories': [{'id': 'other'}]})
        self.assertEqual(result['status'], 'DIFFERS')
        self.assertEqual(result['missingPublishedCategories'], ['c'])
        result = self.read_api({'summary': {'runKey': 'run1'}, 'categories': [{'id': 'c', 'topic': 'Changed'}]})
        self.assertEqual(result['changedPublishedCategories'], ['c'])

    def test_api_stale_run_is_a_difference_even_when_categories_match(self):
        result = self.read_api({'summary': {'runKey': 'old'}, 'categories': [{'id': 'c'}]})
        self.assertEqual(result['status'], 'DIFFERS')

    def test_api_duplicate_identity_is_not_reported_as_a_match(self):
        result = self.read_api({'summary': {'runKey': 'run1'}, 'categories': [{'id': 'c'}, {'id': 'c'}]})
        self.assertEqual(result['status'], 'INVALID_METADATA')

    def test_unauthenticated_api_is_unverified_and_report_contains_no_cookie(self):
        opener = unittest.mock.Mock()
        opener.open.side_effect = HTTPError('http://127.0.0.1:9090', 401, 'Unauthorized', {}, None)
        with patch.object(reconcile, 'build_opener', return_value=opener), patch.dict(os.environ, {'IVME_AUDIT_COOKIE': 'SESSION=secret'}):
            result = reconcile.api_snapshot('http://127.0.0.1:9090', {}, {})
        self.assertEqual(result['status'], 'AUTHENTICATION_REQUIRED')
        self.assertNotIn('secret', json.dumps(result))
        self.assertEqual(opener.open.call_count, 1)


if __name__ == '__main__':
    unittest.main()
