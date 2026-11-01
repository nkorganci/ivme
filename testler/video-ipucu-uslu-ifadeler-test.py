"""uslu-ifadeler video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/uslu-ifadeler-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_even_odd_power(self):
        a_vals = [Fraction(k, 2) for k in range(-40, 41) if (3 * Fraction(k, 2) - 10) ** 6 == (Fraction(k, 2) + 2) ** 6]
        self.assertEqual(a_vals, [2, 6])
        b_vals = [Fraction(k, 2) for k in range(-40, 41) if (2 * Fraction(k, 2) - 3) ** 5 == (Fraction(k, 2) + 3) ** 5]
        self.assertEqual(b_vals, [6])
        self.assertEqual(sum(a + b for a in a_vals for b in b_vals), 20)
        self.assertNotEqual((-3) ** 5, 3 ** 5)

    def test_equal_ratio_chain(self):
        a, d = 2 ** 30, 2 ** 60
        x = 2 ** 40
        y = x * x // a
        self.assertEqual(Fraction(a, x), Fraction(x, y))
        self.assertEqual(Fraction(x, y), Fraction(y, d))
        self.assertEqual(x * y, 2 ** 90)
        self.assertEqual(32 ** 8, x)
        self.assertNotEqual(2 ** 45, x)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith('Claude'))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
