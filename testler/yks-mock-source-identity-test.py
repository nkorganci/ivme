from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json,digest


class MockSourceIdentityTest(unittest.TestCase):
    def test_different_mock_boundaries_are_not_accepted_when_union_intersects_other_content(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'mock-union-canonical-reuse/report.json')
        self.assertEqual(report['status'],'COMPLETE');self.assertEqual(report['sourceQuestions'],74)
        self.assertTrue(all(not r['canonicalCodes'] for r in report['results']))
        for row in report['results']:
            self.assertEqual(digest(row['evidencePath']),row['evidenceSha256'])
            self.assertFalse(row['originalPreparedCropContentAccepted']);self.assertFalse(row['newQuestionAdmissionAccepted'])
        self.assertEqual(report['newModelCalls'],0);self.assertEqual(report['newOcrCalls'],0)

    def test_all_forty_actual_images_override_a_wrong_header_without_guessing_a_cross_subject_question(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'mock-actual-subject-review/333642091490/report.json')
        self.assertEqual(report['questions'],40);self.assertEqual(report['actuallyReadOriginalQuestionImages'],40)
        self.assertEqual(report['subjectCounts'],{'fizik':13,'kimya':13,'biyoloji':13})
        self.assertEqual(report['ambiguousCrossSubjectQuestions'],[13])
        for row in report['results']:
            self.assertEqual(digest(row['sourceImagePath']),row['sourceImageSha256'])
            self.assertEqual(digest(row['viewedBoardPath']),row['viewedBoardSha256'])
            self.assertFalse(row['categoryAssignmentWritten']);self.assertFalse(row['newQuestionAdmissionAccepted'])
            self.assertTrue(row['wrongPrintedTytHeaderPreserved']);self.assertFalse(row['teacherApproved'])
        ambiguous=report['results'][12]
        self.assertIsNone(ambiguous['subjectId']);self.assertFalse(ambiguous['sourceSubjectAcceptedForPreparation'])
        self.assertEqual(ambiguous['allowedSubjectIds'],['fizik','kimya'])
    def test_source_scope_exceptions_never_fix_printed_answers_or_invent_the_missing_forty_old_matches(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'mock-source-exception-identities/report.json')
        self.assertEqual(report['status'],'COMPLETE');self.assertEqual(report['sourceQuestions'],103)
        self.assertEqual(sum(len(r['canonicalCodes'])>1 for r in report['results']),46)
        absent=[r for r in report['results'] if 'NO_EXACT_OLD_OFFICIAL_BOOK_CANDIDATE_IDENTITY_REMAINS_UNRESOLVED' in r['issues']]
        self.assertEqual(len(absent),49);self.assertTrue(all(not r['canonicalCodes'] for r in absent))
        copied_header=[r for r in report['results'] if r['sourceCode'].startswith('mebi-mock-333642091490-s4-')]
        self.assertEqual(len(copied_header),40)
        self.assertTrue(all(not r['canonicalCodes'] and r in absent for r in copied_header))
        for row in report['results']:
            self.assertTrue(row['sourceSubjectReviewRequired']);self.assertFalse(row['newQuestionAdmissionAccepted'])
        self.assertEqual(report['questionBankWrites'],0)
    def test_combined_subject_identity_proof_cannot_be_used_as_automatic_branch_classification(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'mock-combined-canonical-reuse/report.json')
        self.assertEqual(report['status'],'COMPLETE');self.assertEqual(report['sourceQuestions'],447)
        self.assertTrue(report['results'])
        for row in report['results']:
            self.assertTrue(row['sourceSubjectReviewRequired'])
            self.assertFalse(row['fineTopicAccepted']);self.assertFalse(row['newQuestionAdmissionAccepted'])
            self.assertFalse(row['teacherApproved'])

    def test_actual_old_single_and_multiple_bank_ids_keep_all_original_identities(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'mock-official-canonical-reuse/report.json')
        self.assertEqual(report['status'],'COMPLETE');self.assertEqual(report['sourceQuestions'],1458);self.assertEqual(report['completed'],1458)
        singles=[r for r in report['results'] if r['canonicalCode']]
        multiples=[r for r in report['results'] if len(r['canonicalCodes'])>1]
        self.assertTrue(singles);self.assertTrue(multiples)
        for row in singles:
            self.assertEqual(row['canonicalCodes'],[row['canonicalCode']])
        for row in multiples:
            self.assertIsNone(row['canonicalCode'])
            self.assertEqual(row['status'],'MULTIPLE_PROVEN_EXISTING_CANONICAL_IDS_KEEP_ALL_AND_REVIEW_MERGE')
            self.assertEqual(set(row['canonicalCodes']),{p['canonicalCode'] for p in row['sourceIdentityProofs']})
        for row in report['results']:
            self.assertEqual(digest(row['evidencePath']),row['evidenceSha256'])
            self.assertFalse(row['fineTopicAccepted']);self.assertFalse(row['newQuestionAdmissionAccepted'])
            self.assertFalse(row['teacherApproved'])
            for proof in row['sourceIdentityProofs']:
                self.assertEqual([p['dpi'] for p in proof['questionBodyProof']['pixels']],[180,330])
                self.assertTrue(all(p['equal'] and p['sourceRgbSha256']==p['bookRgbSha256'] for p in proof['questionBodyProof']['pixels']))


if __name__=='__main__':unittest.main()
