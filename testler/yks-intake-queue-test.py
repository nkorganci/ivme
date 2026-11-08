from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_soru_kabul_kuyrugu import disposition
from yks_birlestirme import Store,read_json


class IntakeQueueTest(unittest.TestCase):
    def test_source_answer_exception_wins_over_pilot_existing_and_model_suggestions(self):
        self.assertEqual(disposition(['KEY_CONFLICT'],{'old'},None,True,True),'BLOCKED_SOURCE_OR_PRINTED_ANSWER_EXCEPTION')

    def test_existing_ids_and_duplicate_groups_cannot_create_a_second_new_question(self):
        self.assertEqual(disposition([],{'old'},None,True,True),'KEEP_EXISTING_CANONICAL_ID_DO_NOT_REIMPORT')
        self.assertEqual(disposition([],set(),{'preferred':False},True,False),'SAME_SOURCE_QUESTION_GROUP_USE_PREFERRED_LOCATOR')
        self.assertEqual(disposition([],{'old','other'},None,False,False),'MULTIPLE_CANONICAL_IDENTITIES_REVIEW_REQUIRED')

    def test_low_similarity_or_missing_candidate_is_never_new_admission(self):
        self.assertEqual(disposition([],set(),None,False,False),'ORIGINAL_CONTENT_GRAPHICS_AND_FINE_TOPIC_REVIEW_REQUIRED')
        self.assertEqual(disposition([],set(),None,True,False),'THREE_QUESTION_ISOLATED_PILOT_ONLY_NOT_PRODUCTION')

    def test_actual_queue_has_every_current_version_no_production_admissions_and_keeps_all_542_chemistry_ids(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'source-intake-queue/report.json');self.assertEqual(report['status'],'PASS')
        self.assertEqual(report['questions'],12052);rows={r['sourceCode']:r for r in report['results']}
        self.assertEqual(len(rows),12052);self.assertGreaterEqual(report['states']['KEEP_EXISTING_CANONICAL_ID_DO_NOT_REIMPORT'],2327)
        unions=read_json(root/'diagnostic-union-canonical-reuse/report.json')
        proven=[r for r in unions['results'] if r['canonicalCode']]
        self.assertEqual(len(proven),103)
        for row in proven:
            queued=rows[row['sourceCode']]
            self.assertEqual(queued['existingCanonicalCodes'],[row['canonicalCode']])
            self.assertIn('diagnostic-union-canonical-reuse/report.json',queued['existingIdentityEvidence'])
        self.assertGreater(report['states']['MULTIPLE_CANONICAL_IDENTITIES_REVIEW_REQUIRED'],0)
        self.assertEqual(report['provenExistingCanonicalIds'],len({c for r in rows.values() for c in r['existingCanonicalCodes']}))
        for row in rows.values():
            if row['status']=='MULTIPLE_CANONICAL_IDENTITIES_REVIEW_REQUIRED':self.assertGreater(len(row['existingCanonicalCodes']),1)
        self.assertEqual(report['states']['BLOCKED_SOURCE_OR_PRINTED_ANSWER_EXCEPTION'],4)
        self.assertTrue(all(not r['productionImportAllowed'] and not r['teacherApproved'] and not r['categoryAssociationAccepted'] for r in rows.values()))
        old=rows['mebi-din-book-3294337d6b62-t1-q24']
        self.assertNotEqual(old['supersededVersion']['imageSha256'],old['sourceImageSha256'])
        self.assertTrue(rows['mebi-mock-05fbeafee7bc-s2-q37']['examAssociationReviewRequired'])
        combined=[r for r in rows.values() if r['sourceSubjectReviewRequired']]
        self.assertEqual(len(combined),511)
        self.assertTrue(all(r['sourceTopicReviewRequired'] and not r['categoryAssociationAccepted'] for r in combined))
        actual=[r for r in rows.values() if r['actualSourceSubjectReview']]
        self.assertEqual(len(actual),40)
        self.assertEqual(sum(not r['sourceSubjectReviewRequired'] for r in actual),39)
        self.assertTrue(rows['mebi-mock-333642091490-s4-q13']['sourceSubjectReviewRequired'])


if __name__=='__main__':unittest.main()
