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

    def test_current_selected_set_omits_every_final_summary_exclusion(self):
        report = read_json(self.root / 'verified-source-selection/report.json')
        selected = read_json(report['selectedPackage'])['cards']
        excluded = read_json(report['exclusions'])['results']
        self.assertEqual((report['sourceBodiesAssessed'], len(selected), len(excluded)), (214, 159, 55))
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
        self.assertEqual(report['remainingContiguousSummaryDocuments'], 0)
        self.assertEqual(report['remainingPrintedKeyCells'], 0)
        self.assertTrue(report['summarySourceDispositionComplete'])
        self.assertEqual(report['summarySourceDocumentsDisposed'], 75)
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

    def test_final_single_pass_covers_each_cell_once_and_never_requeues_failures(self):
        report = read_json(self.root / 'physics-summary-final-one-pass/report.json')
        prepared = read_json(self.root / 'physics-summary-final-one-pass/prepared.json')
        self.assertEqual((report['documents'], report['questions']), (35, 99))
        self.assertEqual((report['actualCropImagesRead'], report['actualCropBoardsRead']), (61, 21))
        self.assertEqual(len({c['sourceCode'] for c in report['results']}), 99)
        self.assertEqual(len({c['sourceSha256'] for c in report['results']}), 35)
        source_keys = read_json(self.root / 'physics-summary-effective-key-regions/report.json')
        keys = {c['sourceSha256']: c['printedRegionAnswers'] for c in source_keys['results']}
        selected = read_json(self.root / 'verified-source-selection/source-evidence-candidates.json')['cards']
        selected_codes = {c['sourceCode'] for c in selected}
        for c in report['results']:
            self.assertIn({'number': c['printedNumber'], 'answer': c['printedAnswer']}, keys[c['sourceSha256']])
            if c['sourceConcerns']:
                self.assertEqual(c['action'], 'EXCLUDE_NO_RETRY')
                self.assertNotIn(c['sourceCode'], selected_codes)
                self.assertFalse(c['preparedCropActuallyRead'])
            else:
                self.assertTrue(c['preparedCropActuallyRead'])
                self.assertTrue(c['originalSourcePixelsEqual'])
                self.assertEqual(c['visibleBodyOptionCuts'], 0)
                self.assertIn(c['sourceCode'], selected_codes)
        self.assertEqual((prepared['cropsPrepared'], prepared['excludedWithoutRetry']), (61, 38))
        self.assertEqual((report['sourceEvidenceCandidates'], report['excludedWithoutRetry']), (59, 40))
        self.assertEqual(report['sourceRepairAttempts'] + report['newOcrCalls'] + report['newModelCalls'], 0)

    def test_preparation_refuses_an_existing_attempt_before_reading_any_source(self):
        import tempfile
        from yks_fizik_ozet_son_gecis import prepare
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            (folder / 'attempt-started.json').write_text('{}', encoding='utf-8')
            # An absent root would fail differently if the source were reopened.
            with self.assertRaisesRegex(ValueError, 'already been attempted'):
                prepare(folder / 'nonexistent-source-root', folder)


if __name__ == '__main__':
    unittest.main()
