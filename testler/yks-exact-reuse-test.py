from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_pilot_tekrar_kabul import exact_reuse

class ExactReuseTest(unittest.TestCase):
    def fixtures(self):
        text='1. Tarih sorusunun bütün metni ve seçenekleri kaynakta aynı kalır. '+('A) Birinci seçenek B) İkinci seçenek C) Üçüncü seçenek D) Dördüncü seçenek E) Beşinci seçenek')
        card={'code':'candidate','printedNumber':1,'text':text,'answer':'B','answerMethodA':'B','answerMethodB':'B'}
        question={'code':'existing','exam_type':'AYT','subject':'Tarih','stamp':'current','image':'old.webp','correct_answer':'B'}
        original={'updated_at':'current','image':'old.webp','original':{'text':text}}
        return card,question,original
    def test_exact_source_uses_existing_identity(self):
        result=exact_reuse(*self.fixtures());self.assertEqual(result['canonicalQuestionCode'],'existing')
        self.assertEqual(result['action'],'REUSE_EXISTING_QUESTION_NOT_IMPORT');self.assertFalse(result['teacherApproved'])
    def test_changed_answer_text_or_question_version_never_becomes_reuse(self):
        for change in ('answer','text','version'):
            card,question,original=self.fixtures()
            if change=='answer':question['correct_answer']='A'
            if change=='text':card['text']=card['text'].replace('Birinci','Farklı')
            if change=='version':original['updated_at']='old'
            with self.assertRaises(ValueError):exact_reuse(card,question,original)

if __name__=='__main__':unittest.main(verbosity=2)
