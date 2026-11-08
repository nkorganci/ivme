import copy
from pathlib import Path
import sys
import tempfile
import unittest

import pymupdf
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json,digest
from yks_istisna_anahtar import validate_key,validate_reading
from yks_istisna_kirpim import verify_image,original_image


class BodyKeyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');cls.root=store.child(store.current()['runId'])
        cls.rows=read_json(cls.root/'pdf-on-tarama/full-key-scan/body-exception-keys/report.json')['results']

    def test_six_real_keys_and_explicit_body_proofs(self):
        self.assertEqual(len(self.rows),6)
        self.assertEqual(sum(len(validate_key(r)['sourceAnswers']) for r in self.rows),94)
        for row in self.rows:self.assertFalse(row['teacherApproved']);self.assertEqual(row['questionBankWrites'],0)

    def test_disagreement_missing_and_reordered_answers_rejected(self):
        expected=[{'number':1,'answer':'A'},{'number':2,'answer':'B'}]
        for wrong in [expected[:-1],list(reversed(expected)),[{'number':1,'answer':'C'},expected[1]]]:
            with self.assertRaises(ValueError):validate_reading(expected,wrong)
        with self.assertRaises(ValueError):validate_reading(list(reversed(expected)),list(reversed(expected)))
        row=copy.deepcopy(self.rows[0]);row['sourceAnswers'][0]['answer']='A'
        with self.assertRaises(ValueError):validate_key(row)
        row=copy.deepcopy(self.rows[0]);row['bodyProofSignature']='0'*64
        with self.assertRaises(ValueError):validate_key(row)

    def test_real_continuations_keep_all_source_pixels_and_exclude_next_question(self):
        report=read_json(self.root/'full-question-exception-crops/progress.json')
        self.assertEqual(report['questionsPrepared'],94);self.assertEqual(report['uncoveredNativeBodyLines'],0)
        found=[]
        for item in report['results']:
            self.assertEqual(digest(item['package']),item['packageSha256']);package=read_json(item['package'])
            with pymupdf.open(package['sourcePath']) as doc:
                for card in package['cards']:
                    self.assertEqual(digest(card['image']),card['imageSha256'])
                    for proof in item['pixelProofs']:self.assertEqual(digest(proof['path']),proof['sha256'])
                    if len(card['sourceRegions'])>1:
                        found.append((card['sourceSha256'][:9],card['printedNumber']))
                        verify_image(doc,card['sourceRegions'],card['image'])
                        # Independent source text excludes the following body.
                        following=next(c for c in package['cards'] if c['printedNumber']==card['printedNumber']+1)
                        self.assertLess(card['sourceRegions'][1]['bboxPt'][3],following['bboxPt'][1])
        self.assertEqual(found,[('23faac230',15),('50020846f',1)])

    def test_modified_source_pixels_are_rejected(self):
        report=read_json(self.root/'full-question-exception-crops/progress.json')
        package=read_json(report['results'][0]['package']);card=next(c for c in package['cards'] if len(c['sourceRegions'])>1)
        with tempfile.TemporaryDirectory() as folder,pymupdf.open(package['sourcePath']) as doc:
            actual,_=original_image(doc,card['sourceRegions']);actual.putpixel((0,0),(1,2,3));path=Path(folder)/'changed.png';actual.save(path)
            with self.assertRaises(ValueError):verify_image(doc,card['sourceRegions'],path)


if __name__=='__main__':unittest.main()
