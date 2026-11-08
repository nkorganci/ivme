"""Visible-page and damaged-font boundaries for summary body discovery."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from yks_fizik_ozet_govde_kesfi import inspect_lines, number_candidate, visible
from yks_birlestirme import Store, read_json, digest


class SummaryGeometryTest(unittest.TestCase):
    def test_off_page_other_subject_cannot_supply_header_or_question(self):
        result = inspect_lines([
            {'text': 'SORULAR', 'bbox': [740, 950, 830, 970]},
            {'text': '1. Osmanlı Devleti', 'bbox': [750, 980, 890, 995]},
            {'text': 'ÖRNEK SORULAR:', 'bbox': [650, 240, 820, 265]},
            {'text': '1. Üzerinden 2 A akım geçen tel', 'bbox': [665, 275, 890, 290]},
        ], 935, 750)
        self.assertEqual(len(result['visibleHeaders']), 1)
        self.assertEqual(len(result['numberLocationCandidates']), 1)
        self.assertEqual(result['numberLocationCandidates'][0]['text'], '1. Üzerinden 2 A akım geçen tel')
        self.assertEqual(result['offPageNumberPrefixesIgnored'], 1)

    def test_worked_example_to_left_is_not_question_panel(self):
        result = inspect_lines([
            {'text': 'SORULAR', 'bbox': [680, 35, 770, 55]},
            {'text': '1. Örnek çözüm', 'bbox': [100, 80, 300, 100]},
            {'text': '1. Soru', 'bbox': [682, 80, 880, 100]},
        ], 935, 700)
        self.assertEqual([r['text'] for r in result['numberLocationCandidates']], ['1. Soru'])

    def test_damaged_digit_is_only_location_hint(self):
        self.assertEqual(number_candidate('\x15\x11\x03'),
                         (2, 'DAMAGED_TOUNICODE_NUMBER_LOCATION_HINT_ONLY'))
        self.assertEqual(number_candidate('\x16\x0c soru'),
                         (3, 'DAMAGED_TOUNICODE_NUMBER_LOCATION_HINT_ONLY'))
        self.assertIsNone(number_candidate('12 cm'))
        self.assertIsNone(number_candidate('A) 1. seçenek'))

    def test_partly_clipped_line_cannot_be_complete_body_evidence(self):
        self.assertFalse(visible([50, 10, 101, 20], 100, 100))
        self.assertFalse(visible([-1, 10, 50, 20], 100, 100))
        self.assertTrue(visible([0, 0, 100, 100], 100, 100))

    def test_actual_mixed_subject_and_overhanging_figure_remain_separate(self):
        store = Store(Path(__file__).resolve().parents[1] / 'veri/yks-birlestirme')
        root = store.child(store.current()['runId'])
        report = read_json(root / 'physics-summary-layout-actual-review/report.json')
        self.assertEqual(report['actualLayoutBoardsRead'], 13)
        self.assertEqual(report['actualIndividualPagesOpened'], 4)
        self.assertEqual(len(report['results']), 75)
        mixed = next(r for r in report['results'] if r['sourceSha256'].startswith('17cc07ec3ed7'))
        self.assertEqual(mixed['status'], 'MIXED_PHYSICS_HISTORY_SOURCE_REQUIRES_SEPARATE_REGION_SCOPE')
        self.assertTrue(all(not r['sourceQuestionAnswersBound'] for r in report['results']))
        self.assertFalse(report['newQuestionAdmissionAccepted'])

    def test_corrected_five_crops_have_complete_body_lines_and_no_admission(self):
        store = Store(Path(__file__).resolve().parents[1] / 'veri/yks-birlestirme')
        root = store.child(store.current()['runId'])
        report = read_json(root / 'physics-summary-five-body-preparation-v2/report.json')
        self.assertEqual(report['questions'], 5)
        self.assertEqual(report['nativeBodyOptionLineCoverage'], 'ALL_VISIBLE_PANEL_LINES_CONTAINED_WITHOUT_TRUNCATION')
        self.assertTrue(report['originalSourcePixelsEqual'])
        self.assertTrue(report['cropImagesActuallyRead'])
        self.assertEqual(report['sourceStatementMarkerReviewQuestions'], [4])
        self.assertFalse(report['newQuestionAdmissionAccepted'])
        self.assertEqual(report['questionBankWrites'], 0)
        package = read_json(report['package'])
        self.assertEqual(digest(report['package']), report['packageSha256'])
        self.assertEqual([c['printedNumber'] for c in package['cards']], [1, 2, 3, 4, 5])
        self.assertEqual([c['printedAnswer'] for c in package['cards']], list('ECEED'))
        for card in package['cards']:
            self.assertEqual(digest(card['image']), card['imageSha256'])
            self.assertFalse(card['fineTopicAccepted'])


if __name__ == '__main__':
    unittest.main()
