"""Source inventory tests run exclusively on small temporary archive fixtures."""
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from yks_stages import stage_02 as inventory
from yks_birlestirme import read_json


class InventoryTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.source = self.root / 'source'
        self.source.mkdir()
        self.output = self.root / 'output'
        self.output.mkdir()

    def tearDown(self):
        self.temp.cleanup()

    def test_same_bytes_and_zip_member_share_content_identity_without_deleting_sources(self):
        original = b'%PDF-1.4\noriginal fixture'
        (self.source / 'one.pdf').write_bytes(original)
        (self.source / 'two.pdf').write_bytes(original)
        with zipfile.ZipFile(self.source / 'book.zip', 'w') as archive:
            archive.writestr('book.pdf', original)
        report = inventory.inventory([self.source], self.output, lambda _: None)
        self.assertEqual(report['status'], 'PASS')
        self.assertEqual(report['physicalPaths'], 3)
        self.assertEqual(report['zipPdfMembers'], 1)
        self.assertEqual(report['uniqueContentHashes'], 2)
        self.assertEqual((self.source / 'one.pdf').read_bytes(), original)

    def test_nested_pdf_is_inventoried_without_extracting_archive_files(self):
        nested = io.BytesIO()
        with zipfile.ZipFile(nested, 'w') as archive:
            archive.writestr('inner.pdf', b'fixture PDF bytes')
        path = self.source / 'outer.zip'
        with zipfile.ZipFile(path, 'w') as archive:
            archive.writestr('inner.zip', nested.getvalue())
        members, errors = inventory.zip_pdf_members(path, 'parent')
        self.assertEqual(errors, [])
        self.assertEqual(members[0]['member'], 'inner.zip!/inner.pdf')
        self.assertFalse((self.source / 'inner.zip').exists())

    def test_zip_slip_absolute_drive_and_expansion_limit_fail_explicitly(self):
        for name in ['../bad.pdf', '/bad.pdf', 'C:\\bad.pdf']:
            with self.assertRaises(ValueError): inventory.safe_member(name)
        path = self.source / 'bad.zip'
        with zipfile.ZipFile(path, 'w') as archive:
            archive.writestr('../outside.pdf', b'bad')
            archive.writestr('large.pdf', b'x' * 100)
        members, errors = inventory.zip_pdf_members(path, 'parent', max_member=50)
        self.assertEqual(members, [])
        self.assertEqual(len(errors), 2)
        self.assertFalse((self.root / 'outside.pdf').exists())

    def test_corrupt_zip_is_not_silently_declared_complete(self):
        (self.source / 'corrupt.zip').write_bytes(b'not a zip')
        report = inventory.inventory([self.source], self.output, lambda _: None)
        self.assertEqual(report['status'], 'FAIL')
        self.assertTrue(report['errors'])

    def test_generated_views_and_control_files_are_preserved_but_not_new_teaching_sources(self):
        self.assertEqual(inventory.role({'path':'TYT/Math/konu.html'}), 'CATALOG_OR_OPERATIONAL')
        self.assertEqual(inventory.role({'path':'TYT/Math/resource.pdf'}), 'SOURCE_RESOURCE')
        self.assertEqual(inventory.role({'path':'video.mp4.part'}), 'INCOMPLETE_OR_CONTROL')
        self.assertEqual(inventory.role({'path':'references/unknown.bin'}), 'OTHER_PRESERVED')

    def test_changed_file_during_hashing_fails_and_records_reason(self):
        path = self.source / 'one.pdf'
        path.write_bytes(b'first')
        original = inventory.digest
        def changed(p):
            sha = original(p)
            p.write_bytes(b'changed during read')
            return sha
        with patch.object(inventory, 'digest', side_effect=changed):
            result = inventory.inventory([self.source], self.output, lambda _: None)
        self.assertEqual(result['status'], 'FAIL')
        self.assertTrue(any('changed' in e['error'] for e in result['errors']))

    def test_valid_resume_cache_reuses_hash_but_new_mtime_does_not(self):
        path = self.source / 'one.pdf'
        path.write_bytes(b'first')
        inventory.inventory([self.source], self.output, lambda _: None)
        cache = read_json(self.output / 'hash-cache.json')
        with patch.object(inventory, 'digest', side_effect=AssertionError('hash repeated')):
            self.assertEqual(inventory.inventory([self.source], self.output, lambda _: None, cache)['status'], 'PASS')
        path.write_bytes(b'changed content')
        with patch.object(inventory, 'digest', wraps=inventory.digest) as hash_file:
            inventory.inventory([self.source], self.output, lambda _: None, cache)
            self.assertEqual(hash_file.call_count, 1)

    def test_missing_root_fails_before_silently_omitting_source(self):
        with self.assertRaisesRegex(ValueError, 'Missing source'):
            inventory.tree_snapshot([self.source / 'missing'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
