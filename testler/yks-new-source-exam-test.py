from pathlib import Path
import sys
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_yeni_pdf_sinav_kapsami import outside_exam


class NewSourceExamTest(unittest.TestCase):
    def scan(self,body,key):
        return {'pages':[{'page':3,'text':body,'textSha256':'body-sha'},{'page':29,'text':key,'textSha256':'key-sha'}]}

    def test_explicit_body_and_key_headers_preserve_ydt_scope(self):
        proof=outside_exam(self.scan('YDT • İNGİLİZCE\n1. Real question','YABANCI DİL TESTİ (YDT) İNGİLİZCE\nCEVAP ANAHTARI'))
        self.assertEqual(proof['printedExam'],'YDT');self.assertTrue(proof['catalogScopeCorrectionRequired']);self.assertFalse(proof['sourceDeleted'])

    def test_key_header_alone_does_not_reclassify_a_mixed_book(self):
        self.assertIsNone(outside_exam(self.scan('TYT • FİZİK','YABANCI DİL TESTİ (YDT) İNGİLİZCE')))

    def test_mention_inside_question_is_not_a_printed_exam_header(self):
        self.assertIsNone(outside_exam(self.scan('1. YDT • İNGİLİZCE ifadesi hangi sınava aittir?','TYT CEVAP ANAHTARI')))


if __name__=='__main__':unittest.main()
