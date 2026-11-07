"""Legacy and archive paths must share content identity and preserve root guards."""
from pathlib import Path
import os
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_kaynak import SourceResolver, iter_resource_paths
from yks_birlestirme import digest, write_json


class ResolverTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.root=Path(self.temp.name)
        self.old=self.root/'old'; self.old.mkdir()
        self.pdf=self.old/'book.pdf'; self.pdf.write_bytes(b'original resource')
        self.sha=digest(self.pdf)
        self.archive=self.root/'YKS'; (self.archive/'Katalog').mkdir(parents=True)
        (self.archive/'Kitaplar').mkdir()
        self.target=self.archive/'Kitaplar/book.pdf'; self.target.write_bytes(self.pdf.read_bytes())
        self.manifest=self.archive/'Katalog/locations.json'
        self.value={'version':1,'status':'ACTIVE','locations':[{'originalPath':str(self.pdf),'target':'Kitaplar/book.pdf','sha256':self.sha}]}
        write_json(self.manifest,self.value)

    def tearDown(self):self.temp.cleanup()

    def test_disabled_keeps_legacy_and_active_mapping_works_after_legacy_file_removed(self):
        self.assertEqual(SourceResolver().resolve(self.old,'book.pdf',self.sha),self.pdf.resolve())
        self.pdf.unlink()
        resolver=SourceResolver(self.archive,self.manifest)
        self.assertEqual(resolver.resolve(self.old,'book.pdf',self.sha),self.target.resolve())

    def test_missing_or_changed_mapped_target_never_falls_back_to_legacy(self):
        resolver=SourceResolver(self.archive,self.manifest)
        self.target.write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError,'changed'):resolver.resolve(self.old,'book.pdf',self.sha)
        self.target.unlink()
        with self.assertRaisesRegex(ValueError,'Missing'):resolver.resolve(self.old,'book.pdf',self.sha)

    def test_traversal_and_projection_identity_mismatch_are_refused(self):
        resolver=SourceResolver(self.archive,self.manifest)
        for part in ['../book.pdf','/book.pdf','C:/book.pdf']:
            with self.assertRaises(ValueError):resolver.resolve(self.old,part,self.sha)
        with self.assertRaisesRegex(ValueError,'identity'):resolver.resolve(self.old,'book.pdf','0'*64)

    def test_prepared_projection_cannot_be_enabled_by_accident(self):
        self.value['status']='PREPARED';write_json(self.manifest,self.value)
        with self.assertRaisesRegex(ValueError,'Inactive'):SourceResolver(self.archive,self.manifest)
        self.assertEqual(SourceResolver(self.archive,self.manifest,prepared=True).resolve(self.old,'book.pdf',self.sha),self.target.resolve())

    def test_duplicate_alias_is_rejected(self):
        self.value['locations']*=2;write_json(self.manifest,self.value)
        with self.assertRaisesRegex(ValueError,'Duplicate'):SourceResolver(self.archive,self.manifest)

    def test_directory_reparse_point_cannot_escape_archive_root(self):
        outside=self.root/'outside';outside.mkdir();(outside/'book.pdf').write_bytes(b'original resource')
        link=self.archive/'escape'
        if os.name=='nt':
            env=os.environ.copy();env.update(IVME_TEST_LINK=str(link),IVME_TEST_DEST=str(outside))
            subprocess.run(['powershell','-NoProfile','-Command',
                            'New-Item -ItemType Junction -Path $env:IVME_TEST_LINK -Target $env:IVME_TEST_DEST | Out-Null'],
                           env=env,capture_output=True,check=True,timeout=20)
        else:link.symlink_to(outside,target_is_directory=True)
        self.value['locations'][0]['target']='escape/book.pdf';write_json(self.manifest,self.value)
        resolver=SourceResolver(self.archive,self.manifest)
        with self.assertRaisesRegex(ValueError,'unsafe'):resolver.resolve(self.old,'book.pdf',self.sha)

    def test_prepared_archive_does_not_reenter_legacy_source_enumeration(self):
        resources=self.root/'Kaynaklar';(resources/'ogm-materyal').mkdir(parents=True)
        (resources/'YKS/Dersler').mkdir(parents=True)
        (resources/'ogm-materyal/original.pdf').write_bytes(b'one source')
        (resources/'YKS/Dersler/prepared.pdf').write_bytes(b'one source')
        (resources/'mufredat').mkdir();(resources/'mufredat/guide.pdf').write_bytes(b'another source')
        names={p.relative_to(resources).as_posix() for p in iter_resource_paths(resources,'*.pdf')}
        self.assertEqual(names,{'ogm-materyal/original.pdf','mufredat/guide.pdf'})

    def test_only_exact_active_managed_root_can_be_scanned(self):
        resources=self.root/'Kaynaklar';resources.mkdir()
        archive=resources/'YKS';(archive/'Katalog/EskiYollar/ogm').mkdir(parents=True)
        dest=archive/'Katalog/EskiYollar/ogm';(dest/'book.pdf').write_bytes(b'same source')
        link=resources/'ogm-materyal'
        if os.name=='nt':
            env=os.environ.copy();env.update(IVME_TEST_LINK=str(link),IVME_TEST_DEST=str(dest))
            subprocess.run(['powershell','-NoProfile','-Command','New-Item -ItemType Junction -Path $env:IVME_TEST_LINK -Target $env:IVME_TEST_DEST | Out-Null'],env=env,capture_output=True,check=True,timeout=20)
        else:link.symlink_to(dest,target_is_directory=True)
        manifest=archive/'Katalog/etkin-yollar.json'
        value={'status':'PREPARED','legacyRoots':[{'originalRoot':str(link),'target':'Katalog/EskiYollar/ogm'}]}
        write_json(manifest,value)
        self.assertEqual(list(iter_resource_paths(resources,'*.pdf',manifest)),[])
        value['status']='ACTIVE';write_json(manifest,value)
        self.assertEqual([p.relative_to(resources).as_posix() for p in iter_resource_paths(resources,'*.pdf',manifest)],['ogm-materyal/book.pdf'])
        value['legacyRoots'][0]['target']='../outside';write_json(manifest,value)
        with self.assertRaises(ValueError):list(iter_resource_paths(resources,'*.pdf',manifest))


if __name__=='__main__':unittest.main(verbosity=2)
