"""User exclusions remove repair work without fabricating source acceptance."""
import copy
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from yks_birlestirme import Store, read_json, digest
from yks_dogrulanabilir_secim import partition_source_cards, queue_action, source_exclusion_reasons, POLICY_PATH


class VerifiableOnlyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        store = Store(Path(__file__).resolve().parents[1] / 'veri/yks-birlestirme')
        cls.root = store.child(store.current()['runId'])

    def card(self, **extra):
        return dict(sourceCode='source-q1', sourceSha256='source', printedAnswer='C',
            sourceRegions=[{'pdfPage': 1, 'bboxPt': [0, 0, 10, 10]}], image='original.webp', **extra)

    def test_missing_conflicting_or_malformed_source_is_excluded_no_retry(self):
        for issue in ['SOURCE_FIVE_OPTIONS_NOT_PRINTED_HOLD', 'CONTENT_REVIEW_REQUIRED', 'KEY_CONFLICT_HOLD']:
            selected, excluded = partition_source_cards([self.card(sourceConcerns=[issue])])
            self.assertEqual(selected, [])
            self.assertEqual(excluded[0]['action'], 'EXCLUDE_NO_RETRY')
            self.assertFalse(excluded[0]['learnerVisible'])
        for value in [None, '', 'AB', 'Z']:
            card = self.card()
            card['printedAnswer'] = value
            self.assertIn('NO_EXPLICIT_PRINTED_SOURCE_ANSWER', source_exclusion_reasons(card))

    def test_valid_body_answer_does_not_invent_topic_duplicate_or_teacher_acceptance(self):
        card = self.card(sourceConcerns=['CONTINUES_AT_TOP_OF_RIGHT_COLUMN'])
        selected, excluded = partition_source_cards([card])
        self.assertEqual(excluded, [])
        self.assertFalse(selected[0]['productionImportAllowed'])
        self.assertFalse(selected[0]['teacherApproved'])
        self.assertFalse(selected[0]['newQuestionAdmissionAccepted'])
        self.assertNotIn('teacherApproved', card)

    def test_old_ids_are_preserved_but_ambiguity_does_not_trigger_repair(self):
        for status in ['BLOCKED_SOURCE_OR_PRINTED_ANSWER_EXCEPTION',
                       'MULTIPLE_CANONICAL_IDENTITIES_REVIEW_REQUIRED',
                       'EXISTING_BANK_CANDIDATE_REVIEW_BEFORE_ANY_NEW_INTAKE']:
            row = {'status': status, 'existingCanonicalCodes': ['old-id'], 'blocks': []}
            before = copy.deepcopy(row)
            self.assertEqual(queue_action(row), 'EXCLUDE_NO_RETRY')
            self.assertEqual(row, before)
        self.assertEqual(queue_action({'status': 'KEEP_EXISTING_CANONICAL_ID_DO_NOT_REIMPORT'}),
                         'PRESERVE_EXISTING_ID_NO_NEW_QUESTION')

    def test_current_selected_set_omits_all_known_fifteen_summary_problems(self):
        report = read_json(self.root / 'verified-source-selection/report.json')
        selected = read_json(report['selectedPackage'])['cards']
        excluded = read_json(report['exclusions'])['results']
        self.assertEqual((report['sourceBodiesAssessed'], len(selected), len(excluded)), (115, 100, 15))
        selected_codes = {c['sourceCode'] for c in selected}
        self.assertFalse(selected_codes & {c['sourceCode'] for c in excluded})
        for bad in ['physics-summary-41a5cdf4bf0d-q2', 'physics-summary-4e6ccddfb9c0-q1',
                    'physics-summary-4e6ccddfb9c0-q2', 'physics-summary-66d6cd9275fd-q4']:
            self.assertNotIn(bad, selected_codes)
        self.assertTrue(all(not source_exclusion_reasons(c) for c in selected))
        self.assertTrue(all(not c['learnerVisible'] and not c['productionImportAllowed'] for c in selected + excluded))
        self.assertEqual(report['sourceRepairAttempts'], 0)
        self.assertFalse(report['fullStageAccepted'])

    def test_current_policy_preserves_all_observed_identities_and_has_no_retry_list(self):
        report = read_json(self.root / 'verified-source-selection/report.json')
        original = read_json(self.root / 'source-intake-queue/report.json')
        decisions = read_json(report['queuePolicy'])['results']
        self.assertEqual(len(decisions), len(original['results']))
        self.assertEqual(report['mainQueueActions']['EXCLUDE_NO_RETRY'], 1936)
        by_code = {r['sourceCode']: r for r in original['results']}
        for row in decisions:
            self.assertEqual(row['existingCanonicalCodes'], by_code[row['sourceCode']]['existingCanonicalCodes'])
            self.assertFalse(row['productionImportAllowed'])
        self.assertEqual(report['remainingContiguousSummaryDocuments'], 35)
        self.assertEqual(report['remainingPrintedKeyCells'], 99)
        self.assertFalse(read_json(POLICY_PATH)['retryKnownSourceExceptions'])

    def test_new_batch_keeps_column_context_and_original_source_key(self):
        report = read_json(self.root / 'physics-summary-bound-bodies-02/actual-crop-review.json')
        self.assertEqual(report['questions'], 63)
        cards = {c['sourceCode']: c for c in report['results']}
        hammer = cards['physics-summary-4fce972d10ba-q4']
        self.assertEqual(len(hammer['sourceRegions']), 2)
        self.assertLess(hammer['sourceRegions'][0]['bboxPt'][0], hammer['sourceRegions'][1]['bboxPt'][0])
        collision = cards['physics-summary-318d7ab84e46-q2']
        self.assertGreater(collision['sourceRegions'][0]['bboxPt'][1], collision['sourceRegions'][1]['bboxPt'][1])
        self.assertEqual(cards['physics-summary-41a5cdf4bf0d-q1']['printedAnswer'], 'A')
        self.assertIn('SOURCE_KEY_CONTENT_CONSISTENCY_REVIEW_REQUIRED', cards['physics-summary-41a5cdf4bf0d-q1']['sourceConcerns'])
        for card in cards.values():
            self.assertTrue(card['preparedCropActuallyRead'])
            self.assertEqual(digest(card['image']), card['imageSha256'])


if __name__ == '__main__':
    unittest.main()
