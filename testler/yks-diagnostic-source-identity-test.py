from copy import deepcopy
from pathlib import Path
import sys
import unittest
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_tarama_eski_kimlik import prove_original_link,isolated_union_region
from yks_kimya_soru_nushasi import compare_question
from yks_birlestirme import Store,read_json,digest


class DiagnosticSourceIdentityTest(unittest.TestCase):
    def test_isolated_union_contains_both_complete_original_regions_and_source_crop(self):
        a=[{'number':1,'bboxPt':[30,40,200,180]},{'number':2,'bboxPt':[30,210,200,400]}]
        b=[{'number':1,'bboxPt':[32,42,200,190]},{'number':2,'bboxPt':[30,210,200,400]}]
        self.assertEqual(isolated_union_region([28,38,200,175],a,b,1),[28,38,200,190])
        b[0]['bboxPt'][3]=220
        with self.assertRaises(ValueError):isolated_union_region([30,40,200,180],a,b,1)

    def test_union_rejects_missing_ambiguous_and_invalid_original_regions(self):
        valid={'number':1,'bboxPt':[30,40,200,180]}
        for left,right in [([],[valid]),([valid,valid],[valid]),([valid],[])]:
            with self.subTest(left=left,right=right):
                with self.assertRaises(ValueError):isolated_union_region(valid['bboxPt'],left,right,1)
        for invalid in [[0,0,float('nan'),80],[30,40,20,80],[0,0,float('inf'),80]]:
            with self.subTest(invalid=invalid):
                with self.assertRaises(ValueError):isolated_union_region(invalid,[valid],[valid],1)

    def test_union_cannot_hide_changed_graphics_outside_the_smaller_original_crop(self):
        left=pymupdf.open();right=pymupdf.open()
        try:
            for doc in [left,right]:doc.new_page().insert_text((40,80),'1. Which atom?\nA) one B) two C) three D) four E) five')
            a=[{'number':1,'bboxPt':[30,50,400,130]}];b=[{'number':1,'bboxPt':[30,50,400,200]}]
            box=isolated_union_region(a[0]['bboxPt'],a,b,1)
            self.assertEqual(compare_question(left[0],right[0],box)['status'],'INDIVIDUAL_ORIGINAL_NATIVE_AND_TWO_DPI_PIXELS_IDENTICAL')
            right[0].draw_line((100,160),(170,180))
            self.assertEqual(compare_question(left[0],right[0],box)['status'],'ORIGINAL_QUESTION_PIXELS_DIFFER')
        finally:left.close();right.close()

    def test_actual_union_proofs_are_additive_identity_only_and_keep_all_differences_open(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        original=read_json(root/'diagnostic-official-canonical-reuse/report.json');report=read_json(root/'diagnostic-union-canonical-reuse/report.json')
        self.assertEqual(report['status'],'COMPLETE');self.assertEqual(report['sourceQuestions'],450)
        selected={r['sourceCode'] for r in original['results'] if r['canonicalCode'] is None and 'Exact original question bounding boxes differ' in r['issues']}
        self.assertEqual(selected,{r['sourceCode'] for r in report['results']})
        self.assertEqual(sum(bool(r['canonicalCode']) for r in report['results']),103)
        for row in report['results']:
            self.assertEqual(digest(row['evidencePath']),row['evidenceSha256'])
            self.assertFalse(row['originalPreparedCropContentAccepted']);self.assertFalse(row['newQuestionAdmissionAccepted'])
            self.assertFalse(row['fineTopicAccepted']);self.assertFalse(row['teacherApproved'])
            for source in row['sourceIdentityProofs']:
                proof=source['questionBodyProof']
                self.assertEqual(proof['comparisonRegionMethod'],'ISOLATED_UNION_CONTAINS_BOTH_COMPLETE_ORIGINAL_BODIES_AND_NO_OTHER_QUESTION')
                self.assertEqual([p['dpi'] for p in proof['pixels']],[180,330]);self.assertTrue(all(p['equal'] for p in proof['pixels']))

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
