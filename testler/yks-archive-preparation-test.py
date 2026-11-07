"""Archive preparation preserves originals and deduplicates actual file storage."""
import os
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_arsiv_hazirla import build_plan, prepare, segment
from yks_birlestirme import digest, read_json

class ArchivePreparationTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        self.a=self.root/'mebi-yks';self.b=self.root/'ogm-materyal';self.a.mkdir();self.b.mkdir()
        self.target=self.root/'YKS';self.target.mkdir();self.report=self.root/'report';self.report.mkdir()
    def tearDown(self):self.tmp.cleanup()
    def row(self,root,name,data=b'original PDF',role='SOURCE_RESOURCE'):
        p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
        return {'kind':'FILE','root':str(root),'path':name,'bytes':len(data),'sha256':digest(p),'role':role}
    def test_identical_origins_have_one_target_inode_and_original_paths_survive(self):
        a=self.row(self.a,'AYT/book.pdf');b=self.row(self.b,'Biyoloji/AYT/old.pdf')
        resources,locations,exceptions=build_plan([a,b],{})
        result=prepare(resources,locations,exceptions,self.target,self.report)
        destination=self.target/resources[0]['target']
        self.assertEqual(result['resources'],1);self.assertEqual(result['legacyLocations'],2)
        self.assertTrue(os.path.samefile(destination,self.a/a['path']))
        self.assertEqual((self.b/b['path']).read_bytes(),b'original PDF')
        self.assertEqual(read_json(self.target/'Katalog/hazirlanan-yollar.json')['status'],'PREPARED')
    def test_mutable_metadata_is_copied_and_idempotent_retry_verifies_content(self):
        a=self.row(self.a,'catalog.json',b'{}','CATALOG_OR_OPERATIONAL')
        data=build_plan([a],{});prepare(*data,self.target,self.report)
        destination=self.target/data[0][0]['target']
        self.assertFalse(os.path.samefile(destination,self.a/a['path']))
        self.assertEqual(prepare(*data,self.target,self.report)['reusedTargets'],1)
        destination.write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError,'different content'):prepare(*data,self.target,self.report)
    def test_traversal_destination_refused_without_touching_outside(self):
        a=self.row(self.a,'one.pdf');resources,locations,exceptions=build_plan([a],{})
        resources[0]['target']='../outside.pdf'
        with self.assertRaisesRegex(ValueError,'Unsafe'):prepare(resources,locations,exceptions,self.target,self.report)
        self.assertFalse((self.root/'outside.pdf').exists())
    def test_long_topic_segments_do_not_merge_and_incomplete_files_are_explained(self):
        self.assertNotEqual(segment('A'*80+'one'),segment('A'*80+'two'))
        self.assertNotIn('..',segment('../outside'))
        row=self.row(self.a,'download.part',b'partial','INCOMPLETE_OR_CONTROL')
        resources,locations,exceptions=build_plan([row],{})
        self.assertFalse(resources);self.assertFalse(locations);self.assertTrue(exceptions[0]['reason'])

if __name__=='__main__':unittest.main(verbosity=2)
