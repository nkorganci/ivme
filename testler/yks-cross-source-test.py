from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_partiler_arasi_tekrar import body_identity,cluster


class CrossSourceTest(unittest.TestCase):
    text='1. Hangisi a - b ifadesini verir? A) a + b B) a - b C) 2a D) 3b E) a/b'

    def test_numbered_question_option_permutation_has_one_identity(self):
        changed=self.text.replace('1.','26.').replace('A) a + b B) a - b','A) a - b B) a + b')
        self.assertEqual(body_identity(self.text)['identity'],body_identity(changed)['identity'])

    def test_case_number_operator_and_negation_never_disappear(self):
        original=body_identity(self.text)['identity']
        for text in [self.text.replace('a - b','a + b',1),self.text.replace('ifadesini','ifadesini vermez'),
            self.text.replace('2a','3a'),self.text.replace('a - b','A - b',1)]:
            self.assertNotEqual(original,body_identity(text)['identity'])

    def test_repeated_option_content_cannot_create_ambiguous_permutation(self):
        self.assertIsNone(body_identity(self.text.replace('D) 3b','D) 2a')))

    def test_same_letter_different_option_meaning_remains_answer_conflict(self):
        rows=[{'sourceCode':str(i),'sourceSha256':str(i),'printedAnswer':'A','answerContentSha256':str(i),'imageSha256':str(i)} for i in range(2)]
        result=cluster(rows);self.assertIn('CONFLICT',result['status']);self.assertFalse(result['automaticNewQuestionAdmissionAllowed'])
        rows[1].update(printedAnswer='B',answerContentSha256='0')
        result=cluster(rows);self.assertTrue(result['sameCorrectOptionContent']);self.assertIn('GRAPHICS_REVIEW_REQUIRED',result['status'])
        self.assertFalse(result['automaticNewQuestionAdmissionAllowed'])


if __name__=='__main__':unittest.main()
