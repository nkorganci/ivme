import copy
from pathlib import Path
import sys
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_raster_anahtar_incele import validate_key,viewed_answers,READINGS
from yks_birlestirme import Store,read_json,digest


class RasterKeyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app=Path(__file__).resolve().parents[1];store=Store(app/'veri/yks-birlestirme');cls.root=store.child(store.current()['runId'])
        cls.rows=read_json(cls.root/'pdf-on-tarama/full-key-scan/raster-keys/report.json')['results']

    def test_two_actual_viewed_raster_tables_match_independent_local_readings(self):
        self.assertEqual({r['sourceSha256'] for r in self.rows},set(READINGS))
        for row in self.rows:
            self.assertEqual(validate_key(row)['sourceAnswers'],viewed_answers(row['sourceSha256']))
            self.assertFalse(row['teacherApproved']);self.assertEqual(row['questionBankWrites'],0)

    def test_changed_letter_or_body_test_cannot_pass(self):
        for row in self.rows:
            changed=copy.deepcopy(row);changed['sourceAnswers'][0]['answer']='E'
            with self.assertRaises(ValueError):validate_key(changed)
            with self.assertRaises(ValueError):validate_key({**row,'testNumber':row['testNumber']+1})

    def test_expected_answers_are_not_part_of_the_local_model_prompt(self):
        for row in self.rows:
            raw=read_json(row['evidencePath']);identity=raw['identity']
            self.assertNotIn('sourceAnswers',identity);self.assertNotIn('agentSourceImageReading',identity)
            self.assertEqual(identity['cropSha256'],digest(row['cropPath']))
            self.assertEqual(raw['response']['done'],True)

    def test_actual_forty_crops_have_complete_source_line_and_pixel_proofs(self):
        report=read_json(self.root/'full-question-raster-crops/progress.json')
        self.assertEqual(report['questionsPrepared'],40);self.assertEqual(report['uncoveredNativeBodyLines'],0)
        for row in report['results']:
            self.assertEqual(row['status'],'PREPARED');self.assertEqual(digest(row['package']),row['packageSha256'])
            for proof in row['pixelProofs']:
                self.assertEqual(digest(proof['path']),proof['sha256']);actual=read_json(proof['path'])
                self.assertEqual(actual['sourcePixelSha256'],actual['preparedPixelSha256'])


if __name__=='__main__':unittest.main()
