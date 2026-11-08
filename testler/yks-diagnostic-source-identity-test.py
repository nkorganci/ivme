from copy import deepcopy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_tarama_eski_kimlik import prove_original_link
from yks_birlestirme import Store,read_json,digest


class DiagnosticSourceIdentityTest(unittest.TestCase):
    def setUp(self):
        self.card={'printedNumber':1,'answer':'B'};self.current={'code':'old','stamp':'v1','correct_answer':'B'}
        self.old={'status':'EXISTING_VALID_SOURCE_PROOF_REUSED','issues':[],'canonicalCode':'old','currentQuestionStamp':'v1',
            'originalSourceImageSha256':'same','currentImageSha256':'same','originalOccurrence':{'printed_numbers':[1],
                'evidence':dict.fromkeys(['answers','answersA','answersB'],['B'])}}

    def test_original_source_answers_and_number_are_required_for_duplicate_identity(self):
        prove_original_link(self.card,self.current,self.old)
        changed=deepcopy(self.old);changed['originalOccurrence']['printed_numbers']=[2]
        with self.assertRaises(ValueError):prove_original_link(self.card,self.current,changed)
        changed=deepcopy(self.old);changed['originalOccurrence']['evidence']['answersB']=['A']
        with self.assertRaises(ValueError):prove_original_link(self.card,self.current,changed)

    def test_current_version_or_image_change_cannot_reuse_a_frozen_source_link(self):
        with self.assertRaises(ValueError):prove_original_link(self.card,{**self.current,'stamp':'v2'},self.old)
        with self.assertRaises(ValueError):prove_original_link(self.card,self.current,{**self.old,'currentImageSha256':'changed'})
        with self.assertRaises(ValueError):prove_original_link(self.card,self.current,{**self.old,'status':'REVIEW_REQUIRED'})

    def test_actual_prepared_identity_proofs_keep_both_dpi_hashes_and_leave_different_regions_unaccepted(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'diagnostic-official-canonical-reuse/report.json')
        self.assertEqual(report['status'],'COMPLETE');self.assertEqual(report['sourceQuestions'],3036);self.assertEqual(report['completed'],3036)
        accepted=[r for r in report['results'] if r['canonicalCode']];held=[r for r in report['results'] if r['canonicalCode'] is None]
        self.assertTrue(accepted);self.assertTrue(held)
        self.assertEqual(len(accepted),1779);self.assertEqual(len(held),1257)
        for row in accepted:
            for source in row['sourceIdentityProofs']:
                proof=source['questionBodyProof'];self.assertEqual([p['dpi'] for p in proof['pixels']],[180,330])
                self.assertTrue(all(p['equal'] and p['sourceRgbSha256']==p['bookRgbSha256'] for p in proof['pixels']))
                self.assertEqual(row['canonicalCode'],source['canonicalCode'])
        for row in report['results']:
            self.assertEqual(digest(row['evidencePath']),row['evidenceSha256'])
            self.assertFalse(row['fineTopicAccepted']);self.assertFalse(row['newQuestionAdmissionAccepted']);self.assertFalse(row['teacherApproved'])


if __name__=='__main__':unittest.main()
