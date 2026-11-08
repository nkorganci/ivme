import copy
from pathlib import Path
import sys
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_tam_kapsam import reconcile,unique


class FullScopeTest(unittest.TestCase):
    def setUp(self):
        self.groups=[{'sha256':'a','canonicalCandidate':{'root':'X','path':'a.pdf'},'occurrences':[],
            'previousEvidence':{'coverageState':'FULLY_LINKED','linkedQuestions':10},'processingCandidate':'REUSE'}]
        self.observed=[{'sourceSha256':'a','pageCount':2,'observedPages':2,'candidatePages':[],
            'visualReviewPages':[2],'questionSignalPages':[1]}]
        self.pages=[{'sha256':'a','pageCount':2,'error':None}]

    def run_scope(self,**kwargs):
        return reconcile(self.groups,self.observed,self.pages,kwargs.get('keys',{}),kwargs.get('diagnostics',{}),kwargs.get('mocks',{}),{},decoding=kwargs.get('decoding',{}))[0]

    def test_missing_key_signal_never_proves_absence_or_accepts_legacy_import(self):
        row=self.run_scope();self.assertFalse(row['absenceClaimed']);self.assertEqual(row['newQuestionsAccepted'],0)
        self.assertIn('REVIEW_REQUIRED',row['state']);self.assertTrue(row['priorImportEvidence']['requiresCurrentBankAndSourceRevalidation'])

    def test_partial_missing_and_duplicate_document_observations_fail(self):
        self.observed[0]['observedPages']=1
        with self.assertRaises(ValueError):self.run_scope()
        self.observed=[]
        with self.assertRaises(ValueError):self.run_scope()
        with self.assertRaises(ValueError):unique(self.groups+self.groups,'sha256')

    def test_raster_or_key_page_outside_document_is_rejected(self):
        for name in ['candidatePages','visualReviewPages','questionSignalPages']:
            with self.subTest(name=name):
                original=self.observed[0][name];self.observed[0][name]=[3]
                with self.assertRaises(ValueError):self.run_scope()
                self.observed[0][name]=original

    def test_verified_section_keys_do_not_approve_branch_body_or_topics(self):
        row=self.run_scope(mocks={'a':{'status':'SOURCE_MOCK_KEY_VERIFIED','sections':[
            {'status':'TWO_PRINTED_SOURCE_READINGS_AGREE','answers':[{'number':1,'answer':'A'}]}]}})
        self.assertEqual(row['verifiedPrintedAnswers'],1);self.assertIn('BODY_BRANCH_REVIEW_REQUIRED',row['state'])
        self.assertFalse(row['teacherApproved']);self.assertEqual(row['newQuestionsAccepted'],0)

    def test_source_decode_warning_blocks_body_even_with_a_verified_printed_key(self):
        row=self.run_scope(mocks={'a':{'status':'SOURCE_MOCK_KEY_VERIFIED','sections':[]}},
            decoding={'a':{'status':'SOURCE_DECODING_REVIEW_REQUIRED','issues':[{'page':1,'warning':'zlib error'}],'bodyContentAccepted':False}})
        self.assertEqual(row['state'],'MOCK_DECODING_WARNING_SOURCE_BODY_REVIEW_REQUIRED')
        self.assertFalse(row['sourceDecodingCheck']['bodyContentAccepted']);self.assertEqual(row['newQuestionsAccepted'],0)

    def test_printed_identity_conflict_and_decoder_warning_are_both_preserved(self):
        row=self.run_scope(mocks={'a':{'status':'PRINTED_MOCK_IDENTITY_OR_LAYOUT_REVIEW_REQUIRED','sections':[],'issue':'body 1 versus 3'}},
            decoding={'a':{'status':'SOURCE_DECODING_REVIEW_REQUIRED','issues':[{'page':1,'warning':'ActualText'}],'bodyContentAccepted':False}})
        self.assertEqual(row['state'],'MOCK_IDENTITY_OR_KEY_EXCEPTION_REVIEW_REQUIRED')
        self.assertEqual(row['mockKeyCheck']['issue'],'body 1 versus 3');self.assertTrue(row['sourceDecodingCheck']['issues'])


if __name__=='__main__':unittest.main()
