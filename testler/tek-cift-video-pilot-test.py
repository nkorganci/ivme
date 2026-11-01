"""İki gerçek video ipucunun dar matematik kapsamı; öğretmen onayı değildir."""
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = json.loads((ROOT / 'video-hatti/ipuclari/mert-hoca-tek-cift.json').read_text(encoding='utf-8'))


class HintMathTest(unittest.TestCase):
    def test_zero_and_negative_even_definition(self):
        self.assertEqual(HINTS[0]['id'], 'sifir-ve-negatiflerde-ciftlik')
        for k in range(-1000, 1001):
            n = 2 * k
            self.assertEqual(n % 2, 0)
            self.assertEqual(n // 2, k)
        self.assertEqual(0 % 2, 0)
        self.assertEqual((-6) % 2, 0)
        self.assertEqual(1 % 2, 1)
        self.assertFalse((1 / 2).is_integer())
        self.assertIn('tam sayı', HINTS[0]['condition'])
        self.assertIn('0 = 2 × 0', HINTS[0]['example'])
        self.assertIn('0,5 tam sayı değildir', HINTS[0]['counterexample'])

    def test_counting_equation_every_possible_student_count(self):
        hint = HINTS[1]
        self.assertEqual(hint['id'], 'iki-katli-terimden-kalanin-ciftligi')
        self.assertEqual(50 - 14, 36)
        solutions = [(k, e) for k in range(37) for e in range(19) if k + 2 * e == 36]
        self.assertEqual(len(solutions), 19)
        self.assertTrue(all(k % 2 == 0 for k, _ in solutions))
        self.assertTrue(any(e % 2 == 0 for _, e in solutions))
        self.assertTrue(any(e % 2 == 1 for _, e in solutions))
        self.assertIn((12, 12), solutions)
        self.assertIn((16, 10), solutions)
        for k, e in solutions:
            self.assertEqual(k, 2 * (18 - e))
        self.assertEqual(35 + 2 * 0.5, 36)
        self.assertEqual(35 % 2, 1)
        self.assertIn('K + 2E = 36', hint['rule'])
        self.assertIn('E = 12, K = 12', hint['example'])
        self.assertIn('E = 10, K = 16', hint['counterexample'])

    def test_source_time_and_visual_review_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS:
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith('Codex'))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
