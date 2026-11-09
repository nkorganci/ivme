"""Current source/bank/variant contracts for the five-body continuation batch."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from yks_birlestirme import Store, read_json, digest
from yks_fizik_bes_soru_tekrar import TEXTS
from yks_partiler_arasi_tekrar import body_identity
from yks_secenek_degisimi import choices


class FiveSummaryComparisonTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        store = Store(Path(__file__).resolve().parents[1] / 'veri/yks-birlestirme')
        cls.root = store.child(store.current()['runId'])
        cls.folder = cls.root / 'physics-summary-five-body-comparison'

    def test_full_five_choice_transcripts_do_not_repair_missing_statement_numbers(self):
        self.assertTrue(all(body_identity(t) is not None for t in TEXTS))
        stem, options = choices(TEXTS[3])
        self.assertNotIn('\nI.', stem)
        self.assertNotIn('\nII.', stem)
        self.assertEqual(set(options), set('ABCDE'))

    def test_scaled_values_and_option_permutation_stay_in_original_source_transcript(self):
        self.assertIn('80 m', TEXTS[4])
        self.assertIn('40 saniye', TEXTS[4])
        _, options = choices(TEXTS[4])
        self.assertEqual(options['D'].strip(), '6 / 4')
        self.assertEqual(options['B'].strip(), '6 / 6')

    def test_unparsed_bank_and_pending_bodies_never_turn_absence_into_new(self):
        r = read_json(self.folder / 'report.json')
        self.assertEqual(r['bankQuestionsCompared'], 80230)
        self.assertEqual(r['preparedSourcesCompared'], 12052)
        self.assertEqual(r['originalPendingCompared'], 5303)
        self.assertEqual(r['preparedCompleteFiveOptionBodies'], 11950)
        self.assertEqual(r['pendingCompleteFiveOptionBodies'], 4428)
        self.assertFalse(r['noveltyAccepted'])
        self.assertFalse(r['newQuestionAdmissionAccepted'])
        self.assertEqual(r['newModelCalls'] + r['newOcrCalls'] + r['newSourceRenders'], 0)
        self.assertEqual(digest(r['bankComparisonPath']), r['bankComparisonSha256'])

    def test_all_retrieved_images_read_two_variants_keep_both_canonical_ids(self):
        r = read_json(self.folder / 'actual-bank-image-review.json')
        self.assertEqual(r['sourceCandidateRelationsActuallyRead'], 34)
        self.assertEqual(r['distinctCanonicalImagesActuallyRead'], 24)
        variants = [x for x in r['results'] if x['status'] == 'SOURCE_NUMBER_AND_OPTION_VARIANT_KEEP_SEPARATE']
        self.assertEqual({x['canonicalCandidateCode'] for x in variants}, {'sb-88250', '3d-tyt-08-02'})
        self.assertTrue(all(x['sourcePrintedAnswer'] == 'D' and x['canonicalAnswerPreserved'] == 'B' for x in variants))
        self.assertTrue(all(not x['sameQuestionAccepted'] and not x['oldIdsMerged'] for x in r['results']))
        for path, sha in r['externalEvidenceFiles'].items():
            self.assertEqual(digest(path), sha)

    def test_fine_topic_support_cannot_clear_source_marker_or_novelty_holds(self):
        r = read_json(self.root / 'physics-summary-five-topic-review/report.json')
        self.assertEqual(r['questions'], 5)
        self.assertEqual(r['actualTopicPdfPagesRead'], 4)
        self.assertEqual(r['registeredTopicPdfPages'], 6)
        self.assertFalse(r['categoryPublished'])
        self.assertFalse(r['newQuestionAdmissionAccepted'])
        self.assertEqual(sum(x['sourceStatementMarkerReviewRequired'] for x in r['results']), 1)
        self.assertEqual(len(r['results'][4]['variantCanonicalCodesKeptSeparate']), 2)
        for item in r['results']:
            self.assertEqual(item['categoryId'], 'mebi.tyt.fizik.62ac11b7-314c-435d-9cc6-08dc086eb842')
            self.assertTrue(item['topicSourceQuotes'])
            self.assertFalse(item['newQuestionAdmissionAccepted'])


if __name__ == '__main__':
    unittest.main()
