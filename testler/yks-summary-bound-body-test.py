"""Source-region regressions: continuations, mixed subjects and visual gates."""
import copy
from pathlib import Path
import sys
import unittest

import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from yks_birlestirme import Store, read_json, signature
from yks_fizik_ozet_govde_bagla import page_regions, cut_lines, REVIEWED_NATIVE_GEOMETRY_EXCEPTIONS
from yks_fizik_ozet_kirpim_incele import verify_crop_set


class BoundBodyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        store = Store(Path(__file__).resolve().parents[1] / 'veri/yks-birlestirme')
        cls.root = store.child(store.current()['runId'])
        cls.report = read_json(cls.root / 'physics-summary-bound-bodies/report.json')
        cls.actual = read_json(cls.root / 'physics-summary-bound-bodies/actual-crop-review.json')
        cls.cards = [c for r in cls.report['results'] for c in read_json(r['package'])['cards']]

    def test_outside_canvas_and_reversed_rectangle_are_rejected(self):
        with pymupdf.open() as doc:
            page = doc.new_page(width=500, height=700)
            for box in [[-1, 0, 10, 10], [0, 0, 501, 10], [10, 10, 5, 20]]:
                with self.assertRaises(ValueError):
                    page_regions([box], (500, 700), page)

    def test_cut_detector_rejects_missing_option_tail(self):
        with pymupdf.open() as doc:
            page = doc.new_page(width=300, height=300)
            page.insert_text((20, 30), 'E) complete option text', fontsize=12)
            self.assertEqual(cut_lines(page, [{'pdfPage': 1, 'bboxPt': [0, 0, 300, 60]}]), [])
            self.assertTrue(cut_lines(page, [{'pdfPage': 1, 'bboxPt': [0, 0, 100, 60]}]))

    def test_two_column_continuations_keep_question_specific_regions(self):
        by_code = {c['sourceCode']: c for c in self.cards}
        for prefix in ['04fdf86a4666', '10f0e486b987', '291086f828ca']:
            card = by_code[f'physics-summary-{prefix}-q2']
            first, second = card['sourceRegions']
            self.assertGreater(first['bboxPt'][1], second['bboxPt'][1])
            self.assertGreater(second['bboxPt'][0], first['bboxPt'][0])
            self.assertIn('CONTINUES_AT_TOP_OF_RIGHT_COLUMN', card['sourceConcerns'])
        figure = by_code['physics-summary-1b5fff0a8d3f-q2']
        self.assertIn('FIGURE_EXTENDS_ABOVE_HEADING_AND_PRINTED_NUMBER', figure['sourceConcerns'])

    def test_mixed_history_panels_never_inherit_physics_answers(self):
        mixed = [c for c in self.cards if c['sourceSha256'].startswith('17cc07ec3ed7')]
        self.assertEqual([c['printedAnswer'] for c in mixed], ['C', 'E'])
        self.assertEqual(len(mixed), 2)
        self.assertTrue(all(r['bboxPt'][3] < 900 for c in mixed for r in c['sourceRegions']))
        self.assertEqual(self.actual['mixedPageHistoryInlineQuestionsNotBoundToPhysics'], 3)

    def test_actual_review_does_not_erase_geometry_or_source_defects(self):
        self.assertEqual(self.actual['questions'], 44)
        self.assertEqual(self.actual['visibleBodyOptionCuts'], 0)
        self.assertEqual(self.actual['nativeGeometryIntersectionsRetained'], 6)
        for c in self.cards:
            if c['nativeGeometryExceptions']:
                self.assertTrue(c['sourceSha256'].startswith('116697578de4'))
                self.assertEqual(signature(c['nativeGeometryExceptions']),
                    REVIEWED_NATIVE_GEOMETRY_EXCEPTIONS[(9, c['printedNumber'])])
        self.assertEqual(len(self.actual['sourceContentReviewQuestions']), 4)
        self.assertEqual(self.actual['remainingContiguousSummaryDocuments'], 56)
        self.assertEqual(self.actual['remainingPrintedKeyCells'], 162)
        self.assertFalse(self.actual['fullStageAccepted'])
        self.assertTrue(all(not c['newQuestionAdmissionAccepted'] and not c['teacherApproved']
                            for c in self.actual['results']))

    def test_actually_read_hash_set_rejects_another_question_image(self):
        verify_crop_set(self.cards)
        changed = copy.deepcopy(self.cards)
        changed[0]['image'] = changed[1]['image']
        changed[0]['imageSha256'] = changed[1]['imageSha256']
        with self.assertRaises(ValueError):
            verify_crop_set(changed)


if __name__ == '__main__':
    unittest.main()
