"""rasyonel-sayilar video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/rasyonel-sayilar-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_telescoping(self):
        prod = Fraction(1)
        for k in range(2, 10):
            prod *= (1 - Fraction(1, k)) ** 2
        self.assertEqual(prod, Fraction(1, 81))
        up = Fraction(1)
        for k in range(2, 10):
            up *= 1 + Fraction(1, k)
        self.assertEqual(up, 5)
        for n in range(2, 40):
            p = Fraction(1)
            for k in range(2, n + 1):
                p *= 1 - Fraction(1, k)
            self.assertEqual(p, Fraction(1, n))

    def test_remaining_fraction(self):
        for x in range(1, 50):
            y = Fraction(4 * x) * Fraction(3, 4) * Fraction(3, 4)
            self.assertEqual(y / x, Fraction(9, 4))
            self.assertEqual(4 * x - x - x, 2 * x)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith('Claude'))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
