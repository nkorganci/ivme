"""esitsizlikler video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/esitsizlikler-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_interval_sum(self):
        import itertools
        xs = [Fraction(k, 10) for k in range(-19, 61)]
        ys = [Fraction(k, 10) for k in range(-50, 41)]
        vals = [3 * x - 2 * y for x in xs for y in ys]
        self.assertTrue(all(-14 < v <= 28 for v in vals))
        self.assertEqual(max(vals), 28)
        self.assertTrue(min(vals) < -13)
        self.assertEqual(3 * Fraction(-19, 10) - 2 * 4, Fraction(-137, 10))

    def test_integer_extremes(self):
        vals = [3 * x - 4 * y for x in range(-3, 5) for y in range(-2, 8)]
        self.assertEqual(max(vals), 20)
        self.assertNotIn(26, vals)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith('Claude'))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
