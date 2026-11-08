from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_konu_icerik_incele import validate_choice,validate_line_choice,stem_lines,validate_document_choice
from yks_soru_konu_adaylari import retrieve_registered


class SourceTopicContentTest(unittest.TestCase):
    def setUp(self):
        self.card={'text':'1. Tasavvuf tarihi üç dönemde gelişmiştir. A) Tasavvuf B) Madde C) Madde D) Madde E) Madde',
            'exam':'AYT','subjectId':'din','containsGraphics':False,'reviewConcerns':[]}
        self.allowed=[{'categoryId':'registered','sourceExam':'AYT','subjectId':'din'}]
        self.value={'categoryId':'registered','evidenceQuote':'Tasavvuf tarihi üç dönemde gelişmiştir.',
            'reason':'Soru tasavvufun dönemsel oluşumunu ölçüyor.','needsReview':False}

    def test_source_quote_is_bound_but_never_becomes_teacher_approval(self):
        self.assertEqual(validate_choice(self.value,self.card,self.allowed),'MACHINE_TOPIC_CANDIDATE_SOURCE_QUOTE_BOUND')

    def test_unknown_id_wrong_exam_and_option_only_quote_are_refused(self):
        for value,allowed in [({**self.value,'categoryId':'invented'},self.allowed),
                (self.value,[{**self.allowed[0],'sourceExam':'TYT'}]),
                ({**self.value,'evidenceQuote':'Tasavvuf B) Madde C) Madde'},self.allowed)]:
            with self.assertRaises(ValueError):validate_choice(value,self.card,allowed)

    def test_ambiguous_or_graphical_source_stays_under_review(self):
        self.assertEqual(validate_choice(self.value,{**self.card,'containsGraphics':True},self.allowed),
            'MACHINE_TOPIC_CANDIDATE_WITH_OPEN_SOURCE_REVIEW')
        with self.assertRaises(ValueError):validate_choice({**self.value,'categoryId':None},self.card,self.allowed)

    def test_line_id_resolves_to_exact_native_text_and_refuses_unknown_or_option_lines(self):
        lines=stem_lines(self.card)
        value={'categoryId':'registered','evidenceLineIds':[1],'reason':'Kaynak kökünde konu kapsamı var.','needsReview':False}
        status,resolved=validate_line_choice(value,self.card,self.allowed,lines)
        self.assertEqual(resolved['evidenceQuote'],lines[0])
        self.assertNotIn('A)',resolved['evidenceQuote'])
        with self.assertRaises(ValueError):validate_line_choice({**value,'evidenceLineIds':[99]},self.card,self.allowed,lines)

    def test_topic_document_evidence_must_belong_to_selected_registered_topic(self):
        proof={'id':1,'sourceSha256':'source','page':1,'quote':'Tasavvuf üç dönemde oluşmuştur.'}
        contexts=[{'categoryId':'registered','sourceSnippets':[proof]}]
        value={'categoryId':'registered','questionEvidenceLineId':1,'topicEvidenceSnippetId':1,
            'reason':'Soru ve konu PDF aynı tarihsel oluşumu kapsıyor.','needsReview':False}
        status,resolved=validate_document_choice(value,self.card,self.allowed,stem_lines(self.card),contexts)
        self.assertEqual(resolved['topicEvidence'],proof)
        for change in [{'categoryId':'other'},{'topicEvidenceSnippetId':2},{'questionEvidenceLineId':0},
                {'categoryId':None},{'topicEvidenceSnippetId':True}]:
            with self.assertRaises(ValueError):
                validate_document_choice({**value,**change},self.card,self.allowed,stem_lines(self.card),contexts)

    def test_pdf_content_recovers_leaf_outside_title_top_eight_without_crossing_exam_or_subject(self):
        docs=[{'subjectId':'din','exam':'AYT'} for i in range(10)]+[
            {'subjectId':'din','exam':'TYT'},{'subjectId':'tarih','exam':'AYT'}]
        ids=retrieve_registered(list(range(12,0,-1)),[0]*9+[1,99,99],docs,self.card)
        self.assertIn(9,ids)
        self.assertNotIn(10,ids)
        self.assertNotIn(11,ids)


if __name__=='__main__':unittest.main()
