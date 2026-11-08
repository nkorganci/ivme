from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_pilot_tekrar_incele import classify_exact
from pdf_source_reconcile import text_fingerprint
from yks_soru_pilotu import comparable_bank_text


class ControlledRepeatTest(unittest.TestCase):
    def setUp(self):
        text='1. Bir kişinin ruh sağlığını etkileyen durumlarla ilgili aşağıdaki ifadelerden hangisi doğrudur? A) Alfa B) Beta C) Gama D) Delta E) Epsilon'
        self.card={'code':'source-q1','textFingerprint':text_fingerprint(text),'answer':'B','exam':'AYT','subjectId':'psikoloji',
            'containsGraphics':False,'reviewConcerns':[],'imageSha256':'crop-sha'}
        self.question={'code':'bank-q1','stamp':'123','image':'image.webp','subject':'Felsefe','correct_answer':'B'}
        self.original={'updated_at':'123','image':'image.webp','original':{'text':text}}
        self.scope={'source_stamp':'123','subject_ids':['psikoloji'],'exam_ids':['AYT'],'category_ids':['preserved-topic-id']}

    def test_controlled_psychology_scope_is_not_rejected_because_old_display_says_philosophy(self):
        result=classify_exact(self.card,self.question,self.original,self.scope)
        self.assertEqual(result['status'],'EXACT_TEXT_SOURCE_ANSWER_AND_CONTROLLED_SCOPE_AGREE')
        self.assertFalse(result['topicEquivalenceAccepted'])

    def test_wrong_exam_wrong_branch_answer_and_stale_text_are_explicit_conflicts(self):
        for question,original,scope,issue in [
            ({**self.question,'correct_answer':'C'},self.original,self.scope,'PRINTED_SOURCE_AND_BANK_ANSWER_DISAGREE'),
            (self.question,{**self.original,'updated_at':'122'},self.scope,'ORIGINAL_TEXT_OR_IMAGE_VERSION_STALE'),
            (self.question,self.original,{**self.scope,'exam_ids':['TYT']},'CURRENT_CONTROLLED_EXAM_OR_BRANCH_DIFFERS'),
            (self.question,self.original,{**self.scope,'subject_ids':['mantik']},'CURRENT_CONTROLLED_EXAM_OR_BRANCH_DIFFERS')]:
            result=classify_exact(self.card,question,original,scope);self.assertIn(issue,result['issues'])

    def test_resembling_text_is_not_an_exact_match(self):
        modified={**self.original,'original':{'text':self.original['original']['text'].replace('doğrudur','yanlıştır')}}
        self.assertIsNone(classify_exact(self.card,self.question,modified,self.scope))

    def test_whitespace_does_not_make_a_short_unreadable_bank_text_comparable(self):
        self.assertIsNone(comparable_bank_text('','aş yl ha e Aa\nyanan\nargan gar?\n'))
        self.assertIsNone(comparable_bank_text(' '*50,''))
        readable='Özgün soru metninde beş seçenek ve tam bir soru kökü bulunmaktadır.'
        self.assertEqual(comparable_bank_text('',readable),readable)


if __name__=='__main__':unittest.main()
