import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_incelenen_konu_paketi import validate_review,REVIEWER


class ReviewedTopics(unittest.TestCase):
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
