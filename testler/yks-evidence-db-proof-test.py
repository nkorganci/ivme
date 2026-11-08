from pathlib import Path
import sys
import unittest
import xml.etree.ElementTree as ET

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json,digest


class ActualArchiveDatabaseProof(unittest.TestCase):
    def test_actual_three_postgres_cases_and_cleanup_match_current_schema(self):
        app=Path(__file__).resolve().parents[1];store=Store(app/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'database-archive/database-test-report.json')
        self.assertEqual(report['status'],'PASS');self.assertEqual(report['database'],'ivme_test');self.assertEqual(report['actualPostgresTests'],3)
        self.assertEqual(report['identity']['schemaSha256'],digest(app/'scripts/yks-evidence-schema.sql'))
        self.assertEqual(report['identity']['testTemplateSha256'],digest(app/'scripts/yks-pilot-fixtures/YksEvidenceArchiveTest.java'))
        self.assertEqual(report['identity']['runnerSha256'],digest(app/'scripts/yks_kanit_db_prova.py'))
        for name in ['xml','log']:
            path=Path(report[name+'Path']).resolve();self.assertTrue(path.is_relative_to(root.resolve()));self.assertEqual(digest(path),report[name+'Sha256'])
        suite=ET.parse(report['xmlPath']).getroot();self.assertEqual(int(suite.get('tests')),3)
        self.assertEqual(int(suite.get('failures')),0);self.assertEqual(int(suite.get('errors')),0)
        self.assertIn('IVME_TEST_RESULT=0',(root/'database-archive/database-test-raw.log').read_text(encoding='utf-8'))
        self.assertTrue(report['temporaryDatabaseCleanupVerified']);self.assertEqual(report['productionQuestionWrites'],0)
        self.assertEqual(report['productionBankStampBefore'],report['productionBankStampAfter'])


if __name__=='__main__':unittest.main()
