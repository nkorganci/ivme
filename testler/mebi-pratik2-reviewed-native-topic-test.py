import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_incelenen_konu_paketi import validate_review,verified_body,REVIEWER


class ReviewedTopics(unittest.TestCase):
    def test_visual_body_requires_explicit_route_and_all_cached_completeness_flags(self):
        row={'imageSha256':'original'}
        body={'status':'MODEL_NO_VISIBLE_ISSUE','imageSha256':'original','reading':{
            'one_question':True,'all_five_choices_visible':True,'visible_truncation':False,
            'missing_context':False,'uncertainty':False}}
        self.assertFalse(verified_body(body,row))
        self.assertTrue(verified_body(body,row,True))
        for flag in body['reading']:
            wrong={**body,'reading':{**body['reading'],flag:not body['reading'][flag]}}
            self.assertFalse(verified_body(wrong,row,True))
        self.assertFalse(verified_body({**body,'imageSha256':'changed'},row,True))

    def test_native_proof_is_reused_without_inventing_visual_or_teacher_review(self):
        self.assertTrue(verified_body({'status':'DETERMINISTIC_NATIVE_BODY_PROVED','imageSha256':'original'},
                                      {'imageSha256':'original'}))

    def fixture(self):
        row={'imageSha256':'original','exam':'AYT'}
        category={'id':'excel.ayt.tarih.test','exam':'AYT','subject':'Tarih','selectable':True}
        decision={'reviewer':REVIEWER,'status':'REVIEWED_ACCEPT_TOPIC','teacherApproved':False,
            'imageSha256':'original','quote':'Tarih biliminin kaynakları','rationale':'Kaynak türleri ölçülüyor.'}
        return row,category,decision

    def test_explicit_source_review_accepts_an_existing_scoped_topic(self):
        row,category,decision=self.fixture()
        validate_review(decision,row,category,'5. Tarih biliminin kaynakları soruluyor.','Tarih')

    def test_model_proposal_or_teacher_approval_cannot_be_promoted(self):
        for update in [{'reviewer':'qwen3.5:9b'},{'status':'AI_TOPIC_CANDIDATE_REQUIRES_REVIEW'},{'teacherApproved':True}]:
            row,category,decision=self.fixture()
            with self.assertRaises(ValueError):validate_review(decision|update,row,category,decision['quote'],'Tarih')

    def test_changed_image_scope_or_invented_quote_are_rejected(self):
        row,category,decision=self.fixture()
        for d,c,text,subject in [(decision|{'imageSha256':'changed'},category,decision['quote'],'Tarih'),
                                (decision,category|{'exam':'TYT'},decision['quote'],'Tarih'),
                                (decision,category,decision['quote'],'Fizik'),
                                (decision,category,'Something unrelated','Tarih')]:
            with self.assertRaises(ValueError):validate_review(d,row,c,text,subject)

    def test_unicode_spacing_is_accepted_without_stripping_math_signs(self):
        row,category,decision=self.fixture();decision['quote']='x + y matematik ifadesi'
        validate_review(decision,row,category,'x + y\n matematik ifadesi','Tarih')
        with self.assertRaises(ValueError):validate_review(decision,row,category,'x - y matematik ifadesi','Tarih')


if __name__=='__main__':unittest.main()
