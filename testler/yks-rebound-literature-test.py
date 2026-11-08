import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json,digest
from yks_edebiyat_ayri_anahtar import validate_key


class ReboundLiteratureTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        s=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');cls.root=s.child(s.current()['runId'])
        cls.rows=read_json(cls.root/'pdf-on-tarama/full-key-scan/rebound-literature-keys/report.json')['results']

    def test_two_actual_sources_bind_only_to_their_identical_official_body_keys(self):
        self.assertEqual(sum(len(validate_key(r)['sourceAnswers']) for r in self.rows),40)
        for row in self.rows:
            self.assertNotEqual(row['sourceSha256'],row['sourceKeyDocumentSha256'])
            self.assertTrue(row['originalConflictingKeyRetained']);self.assertFalse(row['teacherApproved'])
            self.assertNotEqual(row['originalConflictingSourceKeyIdentities'],[['AYT',row['testNumber']]])
            proof=read_json(row['bodyProofPath']);self.assertEqual(len(proof['checks']),row['bodyPageCount'])
            for p in proof['checks']:
                self.assertEqual([v['dpi'] for v in p['pixels']],[180,330])
                for v in p['pixels']:self.assertEqual(v['sourcePixelSha256'],v['bookPixelSha256'])

    def test_other_test_or_answer_cannot_replace_source_bound_official_key(self):
        for key,value in [('testNumber',999),('sourceAnswers',[{'number':1,'answer':'A'}]),('bodyProofSha256','0'*64)]:
            row=copy.deepcopy(self.rows[0]);row[key]=value
            with self.assertRaises(ValueError):validate_key(row)

    def test_all_40_crops_keep_original_source_pixels_and_native_body_lines(self):
        report=read_json(self.root/'full-question-rebound-crops/progress.json')
        self.assertEqual(report['questionsPrepared'],40);self.assertEqual(report['uncoveredNativeBodyLines'],0)
        for row in report['results']:
            self.assertEqual(digest(row['package']),row['packageSha256'])
            for c in read_json(row['package'])['cards']:self.assertEqual(digest(c['image']),c['imageSha256'])
            for p in row['pixelProofs']:
                self.assertEqual(digest(p['path']),p['sha256']);v=read_json(p['path'])
                self.assertEqual(v['sourcePixelSha256'],v['preparedPixelSha256'])


if __name__=='__main__':unittest.main()
