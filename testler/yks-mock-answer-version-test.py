from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json,digest
from yks_deneme_cevap_nusha import source_mock_number,READINGS
from yks_anahtar_gorsel import checked_reading


class MockAnswerVersionTest(unittest.TestCase):
    def test_original_printed_mock_number_never_uses_flattened_test_order(self):
        self.assertEqual(source_mock_number({'test':'6. Deneme · Tde-Sb1','testOrder':11}),6)
        with self.assertRaises(ValueError):source_mock_number({'test':'Tde-Sb1','testOrder':11})

    def test_actual_eight_old_book_key_readings_and_six_viewed_pairs(self):
        s=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=s.child(s.current()['runId'])
        report=read_json(root/'full-mock-comparison/old-printed-key-review/report.json')
        self.assertEqual(report['sourceQuestions'],6);self.assertEqual(report['canonicalBankLinks'],8)
        self.assertEqual(report['oldKeyLinksWithTwoAgreeingSourceReadings'],8)
        for row in report['results']:
            self.assertEqual(digest(row['sourceImagePath']),READINGS[row['sourceCode']][0])
            for link in row['bankLinks']:
                self.assertEqual(digest(link['bankImagePath']),READINGS[row['sourceCode']][1])
                self.assertEqual(digest(link['cropPath']),link['cropSha256']);self.assertEqual(digest(link['evidencePath']),link['evidenceSha256'])
                raw=read_json(link['evidencePath']);self.assertEqual(raw['identity']['cropSha256'],link['cropSha256'])
                self.assertEqual(checked_reading(raw['response']),link['oldKeyNativeAnswers']);self.assertTrue(link['oldBodyNativeTextMatchesCanonicalRawSource'])
                self.assertTrue(link['actualImagePairRead']);self.assertFalse(link['canonicalAnswerOverwritten']);self.assertFalse(link['studentHistoryRewritten'])

    def test_own_source_disagreement_is_kept_instead_of_falsely_supporting_bank(self):
        s=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=s.child(s.current()['runId'])
        report=read_json(root/'full-mock-comparison/old-printed-key-review/report.json')
        unresolved=[link for row in report['results'] for link in row['bankLinks'] if link['oldPrintedAnswer']!=link['canonicalAnswerPreserved']]
        self.assertEqual(len(unresolved),1);link=unresolved[0]
        self.assertEqual(link['canonicalQuestionCode'],'md-ayt-sozel-21-39');self.assertEqual(link['canonicalAnswerPreserved'],'D');self.assertEqual(link['oldPrintedAnswer'],'C')
        self.assertEqual(link['status'],'OLD_PRINTED_KEY_OR_CANONICAL_ANSWER_REQUIRES_REVIEW');self.assertFalse(report['teacherApproved'])


if __name__=='__main__':unittest.main()
