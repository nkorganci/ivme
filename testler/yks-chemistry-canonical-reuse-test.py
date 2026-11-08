from copy import deepcopy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json
from yks_kimya_eski_kimlik import link_identity


class ChemistryCanonicalIdentityTest(unittest.TestCase):
    def setUp(self):
        self.card={'code':'new-q5','sourceSha256':'new','printedNumber':5,'answer':'C','individualEditionProof':{
            'sourceCode':'new-q5','sourceSha256':'new','printedNumber':5,'bookPage':86,'status':'INDIVIDUAL_ORIGINAL_NATIVE_AND_TWO_DPI_PIXELS_IDENTICAL',
            'pixels':[{'dpi':dpi,'equal':True,'sourceRgbSha256':'same','bookRgbSha256':'same'} for dpi in [180,330]]}}
        self.edition={'officialBookSha256':'book','questions':[deepcopy(self.card['individualEditionProof'])]};self.current={'code':'old-id','stamp':'v1','correct_answer':'C'}
        self.prior={'status':'EXISTING_VALID_SOURCE_PROOF_REUSED','issues':[],'sourceLocator':'raw:old-id',
            'currentQuestionStamp':'v1','originalSourceImageSha256':'image','currentImageSha256':'image',
            'originalOccurrence':{'source_sha256':'book','page_number':86,'printed_numbers':[5],'question_code':'old-id',
                'evidence':dict.fromkeys(['answers','answersA','answersB'],['C'])}}

    def test_exact_source_identity_keeps_the_original_code(self):
        result=link_identity(self.card,self.edition,self.prior,self.current)
        self.assertEqual(result['currentCanonicalCode'],'old-id');self.assertEqual(result['officialBookPage'],86)

    def test_same_test_number_or_same_text_on_a_different_physical_page_is_insufficient(self):
        for key,value in [('page_number',85),('printed_numbers',[6]),('source_sha256','other')]:
            prior=deepcopy(self.prior);prior['originalOccurrence'][key]=value
            with self.assertRaises(ValueError):link_identity(self.card,self.edition,prior,self.current)

    def test_changed_pixels_answers_or_canonical_version_cannot_reuse_an_old_proof(self):
        card=deepcopy(self.card);card['individualEditionProof']['pixels'][1]['equal']=False
        with self.assertRaises(ValueError):link_identity(card,self.edition,self.prior,self.current)
        with self.assertRaises(ValueError):link_identity(self.card,self.edition,self.prior,{**self.current,'correct_answer':'A'})
        with self.assertRaises(ValueError):link_identity(self.card,self.edition,self.prior,{**self.current,'stamp':'v2'})

    def test_actual_376_reused_ids_remain_disjoint_from_166_unaccepted_content_reviews(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        proof=read_json(root/'partial-chemistry-canonical-reuse/report.json')
        self.assertEqual(proof['status'],'PASS');self.assertEqual(proof['questions'],542)
        self.assertEqual(proof['existingCanonicalIdsReused'],376)
        self.assertEqual(sum(r['canonicalCode'] is None for r in proof['results']),166)
        self.assertTrue(all(not r['newQuestionAdmissionAccepted'] and not r['fineTopicAccepted'] for r in proof['results']))
        self.assertEqual(proof['questionBankWrites'],0);self.assertFalse(proof['teacherApproved'])

    def test_remaining_166_are_resolved_by_exact_book_locator_and_current_controlled_scope(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        first=read_json(root/'partial-chemistry-canonical-reuse/report.json')
        extra=read_json(root/'partial-chemistry-locator-reuse/report.json')
        initial={r['sourceCode'] for r in first['results'] if r['canonicalCode']}
        self.assertEqual(extra['questions'],166);self.assertEqual(extra['existingCanonicalIdsReused'],166)
        self.assertFalse(initial&{r['sourceCode'] for r in extra['results']})
        for row in extra['results']:
            self.assertIn('kimya',row['currentControlledScope']['subject_ids'])
            self.assertEqual(row['canonicalCode'],row['sourceIdentityProofs'][0]['currentCanonicalCode'])
            self.assertEqual(row['currentControlledScope']['source_stamp'],row['sourceIdentityProofs'][0]['currentCanonicalVersion'])
            self.assertFalse(row['fineTopicAccepted']);self.assertFalse(row['newQuestionAdmissionAccepted'])


if __name__=='__main__':unittest.main()
