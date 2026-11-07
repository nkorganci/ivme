"""Answer evidence detection must never claim missing keys or generate an answer."""
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_cevap_on_tarama import inspect

class AnswerObservationTest(unittest.TestCase):
    def scan(self,text,ocr=False):
        return {'sha256':'a'*64,'pageCount':1,'questionSignalPages':[1],
                'pages':[{'page':1,'text':text,'textSha256':'fixture','needsOcr':ocr}]}

    def test_source_key_pairs_are_preserved_without_import_approval(self):
        value=inspect(self.scan('AYT TARAMA TESTİ-15\n1. B\n2. A\n3. E'))
        self.assertEqual(value['candidatePages'],[1])
        self.assertEqual(value['evidence'][0]['numberAnswerPairs'][1]['answer'],'A')
        self.assertFalse(value['answersApproved']);self.assertFalse(value['questionsEligibleForImport'])

    def test_options_do_not_become_answer_keys_and_no_key_is_not_absence(self):
        value=inspect(self.scan('1. Soru\nA) seçenek\nB) seçenek\nC) seçenek'))
        self.assertEqual(value['candidatePages'],[])
        self.assertEqual(value['status'],'NO_TEXT_KEY_VISUAL_REVIEW_REQUIRED')

    def test_turkish_header_and_image_only_page_remain_visible(self):
        self.assertTrue(inspect(self.scan('C E V A P  A N A H T A R I'))['evidence'][0]['explicitKeyHeader'])
        self.assertEqual(inspect(self.scan('',True))['visualReviewPages'],[1])

if __name__=='__main__':unittest.main(verbosity=2)
