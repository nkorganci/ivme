from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_konu_anlam_kontrol import validate
from yks_konu_icerik_incele import document_schema
from yks_birlestirme import Store,read_json


class SemanticEvidenceTest(unittest.TestCase):
    def test_model_agreement_does_not_override_actual_topic_conflicts_or_missing_quotes(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        proof=read_json(root/'full-question-topics/din/actual-topic-support-challenges.json')
        self.assertEqual(proof['twoModelSupportedQuestionsStillHeld'],3)
        self.assertEqual(proof['actualSamePdfQuoteSupplements'],1)
        for row in proof['results']:
            self.assertEqual(row['originalSemanticStatus'],'INDEPENDENT_TOPIC_SUPPORTED')
            self.assertFalse(row['newQuestionAdmissionAccepted']);self.assertFalse(row['teacherApproved'])
            self.assertEqual(row['categoryAssignmentsWritten'],0)

    def test_actual_image_subset_cannot_be_reported_as_full_semantic_acceptance(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        proof=read_json(root/'full-question-topics/din/semantic-topic-review.json')
        self.assertEqual(proof['inputQuestions'],1099);self.assertEqual(proof['selectedQuestions'],37)
        self.assertFalse(proof['entireInputSelected']);self.assertEqual(len(proof['selectedSourceCodes']),37)
        self.assertFalse(proof['teacherApproved']);self.assertEqual(proof['categoryAssignmentsWritten'],0)
    def test_supported_claim_without_both_source_lines_is_refused(self):
        with self.assertRaises(ValueError):
            validate({'verdict':'SUPPORTED','questionLineId':1,'topicLineId':None,'reason':'İlişkili.'},['Soru'],['PDF'])

    def test_unknown_line_cannot_be_a_conflict_proof(self):
        with self.assertRaises(ValueError):
            validate({'verdict':'CONFLICT','questionLineId':1,'topicLineId':3,'reason':'Farklı kapsam.'},['Soru'],['PDF'])

    def test_actual_source_quotes_are_preserved_without_fabricating_teacher_approval(self):
        value=validate({'verdict':'CONFLICT','questionLineId':1,'topicLineId':1,'reason':'Soru ile PDF farklı kapsamda.'},
            ['Rifailik bir tasavvuf yorumudur.'],['Bilim evrendeki düzeni açıklar.'])
        self.assertEqual(value['questionEvidence'],'Rifailik bir tasavvuf yorumudur.')
        self.assertNotIn('teacherApproved',value)

    def test_topic_generation_schema_constrains_ids_to_the_actual_registered_list(self):
        self.assertEqual(document_schema([{'categoryId':'real'}])['properties']['categoryId']['enum'],[None,'real'])


if __name__=='__main__':unittest.main()
