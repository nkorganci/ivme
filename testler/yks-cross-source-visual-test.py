from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_partiler_gorsel_incele import permutation,select_preferred
from yks_birlestirme import Store,read_json,digest
from yks_mevcut_gorsel_incele import require_pair


class ActualSourcePairTest(unittest.TestCase):
    def test_cross_exam_duplicate_reuses_identity_without_changing_exam_and_rejects_wrong_key(self):
        text='Bir davranış hangisidir? A) Bir B) İki C) Üç D) Dört E) Beş'
        source={'text':text,'answer':'A','exam':'AYT'};bank={'correct_answer':'A','exam_type':'TYT'}
        self.assertTrue(require_pair(source,bank,text)['sameOptionOrder'])
        self.assertEqual(bank['exam_type'],'TYT')
        with self.assertRaises(ValueError):require_pair(source,{**bank,'correct_answer':'C'},text)

    def test_six_source_bank_image_pairs_keep_existing_codes_and_open_cross_exam_associations(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'full-question-topics/din/exact-bank-image-review/report.json')
        self.assertEqual(report['status'],'PASS');self.assertEqual(report['questions'],6)
        self.assertTrue(any(r['examAssociationNeedsReview'] for r in report['results']))
        for row in report['results']:
            self.assertEqual(digest(row['sourceImagePath']),row['sourceImageSha256'])
            self.assertEqual(digest(row['bankImagePath']),row['bankImageSha256'])
            self.assertEqual(row['intakeAction'],'KEEP_EXISTING_CANONICAL_ID_DO_NOT_REIMPORT')
            self.assertFalse(row['examAssociationWritten']);self.assertFalse(row['fineTopicAccepted'])
            self.assertFalse(row['teacherApproved']);self.assertFalse(row['newQuestionAdmissionAccepted'])

    def test_single_missing_bank_text_is_only_an_image_bound_comparison_supplement(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        proof=read_json(root/'full-question-topics/din/bank-image-text-supplement.json')
        self.assertEqual(proof['bankQuestion']['code'],'sb-83612')
        self.assertEqual(digest(proof['bankImagePath']),proof['bankImageSha256'])
        self.assertTrue(proof['actualOriginalImageRead']);self.assertEqual(proof['additionalExactCandidates'],0)
        self.assertEqual(proof['bankQuestionsRepresentedByOriginalTextOrThisImage'],80230)
        self.assertEqual(len(proof['results']),1094);self.assertEqual(len(proof['deferredSourceQuestions']),5)
        self.assertFalse(proof['canonicalTextOrAnswerWritten']);self.assertFalse(proof['teacherApproved'])

    def test_printed_key_is_mapped_by_option_content_and_negation_is_preserved(self):
        a='1. Bu davranış hangisidir? A) Bir B) İki C) Üç D) Dört E) Beş'
        b=a.replace('1.','15.').replace('A) Bir B) İki','A) İki B) Bir')
        self.assertEqual(permutation(a,b),{'A':'B','B':'A','C':'C','D':'D','E':'E'})
        with self.assertRaises(ValueError):permutation(a,b.replace('hangisidir','hangisi değildir'))

    def test_preferred_locator_preserves_the_already_accepted_pilot_code(self):
        self.assertEqual(select_preferred([{'sourceCode':'mebi-din-book-new-q18'},
            {'sourceCode':'mebi-05ed1fe27201-q4'}]),'mebi-05ed1fe27201-q4')

    def test_all_actual_pairs_are_frozen_and_the_answer_conflict_is_not_admitted(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'cross-source-candidates/actual-image-pair-review.json')
        self.assertEqual(report['sourcePairs'],36);self.assertEqual(report['sourceQuestionImagesRead'],72)
        pairs=report['results'];agree=[p for p in pairs if p['printedCorrectOptionAgrees']];self.assertEqual(len(agree),35)
        conflict=[p for p in pairs if not p['printedCorrectOptionAgrees']];self.assertEqual(len(conflict),1)
        self.assertEqual(conflict[0]['maximumCanonicalQuestionsForGroup'],0);self.assertIsNone(conflict[0]['preferredSourceLocator'])
        for p in pairs:
            self.assertEqual(digest(p['viewedBoardPath']),p['viewedBoardSha256'])
            self.assertTrue(p['actualImagePairRead']);self.assertFalse(p['teacherApproved']);self.assertFalse(p['newQuestionAdmissionAccepted'])


if __name__=='__main__':unittest.main()
