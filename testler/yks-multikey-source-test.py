import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json,digest
from yks_coklu_test_anahtar import validate_key


class MultiKeyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        s=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');cls.root=s.child(s.current()['runId'])
        cls.row=read_json(cls.root/'pdf-on-tarama/full-key-scan/multi-test-key/report.json')['results'][0]

    def test_actual_printed_section_and_independent_reading(self):
        row=validate_key(self.row);self.assertEqual(len(row['sourceAnswers']),41)
        self.assertFalse(row['teacherApproved']);self.assertEqual(row['questionBankWrites'],0)

    def test_other_test_answer_or_crop_cannot_be_substituted(self):
        for key,value in [('testNumber',1),('exam','AYT'),('sourceKeyBboxPt',[0,0,1,1])]:
            row=copy.deepcopy(self.row);row[key]=value
            with self.assertRaises(ValueError):validate_key(row)
        row=copy.deepcopy(self.row);row['sourceAnswers'][0]['answer']='E'
        with self.assertRaises(ValueError):validate_key(row)

    def test_41_source_crops_have_complete_coverage_and_bound_pixel_proofs(self):
        report=read_json(self.root/'full-question-multikey-crops/progress.json')
        self.assertEqual(report['questionsPrepared'],41);self.assertEqual(report['uncoveredNativeBodyLines'],0)
        for item in report['results']:
            self.assertEqual(digest(item['package']),item['packageSha256'])
            for card in read_json(item['package'])['cards']:self.assertEqual(digest(card['image']),card['imageSha256'])
            for proof in item['pixelProofs']:
                self.assertEqual(digest(proof['path']),proof['sha256']);p=read_json(proof['path'])
                self.assertEqual(p['sourcePixelSha256'],p['preparedPixelSha256'])


if __name__=='__main__':unittest.main()
