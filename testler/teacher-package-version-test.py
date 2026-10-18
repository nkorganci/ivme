"""Teacher decision validity follows the reviewed sources, not unrelated publications."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

APP=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('package',APP/'scripts/ogretmen-inceleme-paketi.py')
package=importlib.util.module_from_spec(spec);spec.loader.exec_module(package)

class PackageVersionTest(unittest.TestCase):
    rows=[{'question_code':'TYT-0001','image_sha256':'image-1','taxonomy_version':'types-1'}]
    resources={'TYT-0001':{'sourceVersion':'source-1','sourceUpdatedAt':'123','taxonomyVersion':'taxonomy-1','assignments':[{'categoryId':'tyt.turkce.paragraf'}]}}
    def test_unrelated_run_does_not_change_package_identity(self):
        with patch.object(package,'shared_context',return_value={'catalogRunKey':'run-1','resources':self.resources}):first=package.package_id(self.rows)
        with patch.object(package,'shared_context',return_value={'catalogRunKey':'run-2','resources':self.resources}):
            self.assertEqual(first,package.package_id(self.rows))
    def test_old_export_remains_valid_when_reviewed_sources_match(self):
        old={'catalogRunKey':'old','resources':self.resources}
        identifier=package.legacy_package_id(self.rows,old)
        with tempfile.TemporaryDirectory() as directory,patch.object(package,'APP',Path(directory)),patch.object(package,'DEFAULT_OUTPUT',Path(directory)/'absent.zip'),patch.object(package,'shared_context',return_value={'catalogRunKey':'new','resources':self.resources}):
            self.assertTrue(package.valid_package_id(identifier,self.rows,old))
    def test_changed_source_or_taxonomy_invalidates_old_decision(self):
        old={'catalogRunKey':'old','resources':self.resources}
        identifier=package.legacy_package_id(self.rows,old)
        for field in ['sourceVersion','sourceUpdatedAt','taxonomyVersion','assignments']:
            changed={'TYT-0001':{**self.resources['TYT-0001'],field: 'changed' if field!='assignments' else []}}
            with tempfile.TemporaryDirectory() as directory,patch.object(package,'APP',Path(directory)),patch.object(package,'DEFAULT_OUTPUT',Path(directory)/'absent.zip'),patch.object(package,'shared_context',return_value={'catalogRunKey':'new','resources':changed}):
                self.assertFalse(package.valid_package_id(identifier,self.rows,old))

if __name__=='__main__':unittest.main()
