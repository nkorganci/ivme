from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts/pipeline-adapters'))
from yks_katalog_kontrol import validate_catalog
from source_archive import pdf_paths
from yks_birlestirme import write_json


class MaintenanceTest(unittest.TestCase):
    def setUp(self):
        self.old={'id':'saved','topic':'Saved title'}
        self.navigation={'version':1,'authority':'MEBI_PROVIDER','courses':[]}
        self.maintenance={'curriculumAuthority':'MEBI_PROVIDER','categories':[self.old], 'curriculumNavigation':self.navigation}
        self.questions={'total':1,'missing':0,'stale':0}

    def test_unchanged_publication_reuses_every_source(self):
        result=validate_catalog(self.maintenance,[self.old],self.navigation,self.questions)
        self.assertTrue(result['sourceExtractionReused']);self.assertFalse(result['publicationRequired'])

    def test_changed_review_definition_is_refused(self):
        with self.assertRaisesRegex(ValueError,'definitions differ'):
            validate_catalog(self.maintenance,[{**self.old,'topic':'changed'}],self.navigation,self.questions)

    def test_new_or_stale_questions_cannot_be_hidden_by_snapshot_reuse(self):
        for field in ('missing','stale'):
            with self.assertRaisesRegex(ValueError,'source intake'):
                validate_catalog(self.maintenance,[self.old],self.navigation,{**self.questions,field:1})

    def test_mixed_navigation_version_is_refused(self):
        with self.assertRaisesRegex(ValueError,'navigation differs'):
            validate_catalog(self.maintenance,[self.old],{},self.questions)

    def test_active_inventory_deduplicates_assets_and_keeps_prior_pipeline_paths(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);archive=root/'YKS';legacy=root/'ogm-materyal';legacy.mkdir()
            (archive/'Katalog').mkdir(parents=True);(archive/'Kitaplar').mkdir()
            (legacy/'old.pdf').write_bytes(b'source');(archive/'Kitaplar/same.pdf').write_bytes(b'source')
            (archive/'Kitaplar/new.pdf').write_bytes(b'new')
            rows=[{'originalPath':str(root/'mebi-yks/also.pdf'),'target':'Kitaplar/same.pdf','sha256':'a'*64},
                {'originalPath':str(legacy/'old.pdf'),'target':'Kitaplar/same.pdf','sha256':'a'*64},
                {'originalPath':str(root/'mebi-yks/new.pdf'),'target':'Kitaplar/new.pdf','sha256':'b'*64}]
            manifest=archive/'Katalog/etkin-yollar.json'
            write_json(manifest,{'version':1,'status':'PREPARED','locations':rows})
            self.assertEqual(pdf_paths(legacy,archive),[legacy/'old.pdf'])
            write_json(manifest,{'version':1,'status':'ACTIVE','locations':rows})
            self.assertEqual(set(pdf_paths(legacy,archive)),{legacy/'old.pdf',archive/'Kitaplar/new.pdf'})
            rows[0]['target']='../../outside.pdf';write_json(manifest,{'version':1,'status':'ACTIVE','locations':rows})
            with self.assertRaisesRegex(ValueError,'Unsafe'):pdf_paths(legacy,archive)


if __name__=='__main__':unittest.main()
