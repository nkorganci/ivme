"""fonksiyon-grafikleri video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/fonksiyon-grafikleri-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_parity_of_polynomials(self):
        f = lambda x: 2*x*x + 1
        g = lambda x: x
        for x in range(-5, 6):
            self.assertEqual(f(-x)*g(-x), -(f(x)*g(x)))
            self.assertEqual(f(-x)-1, f(x)-1)
        self.assertNotEqual(f(-1)+g(-1), f(1)+g(1))
        self.assertNotEqual(f(-1)+g(-1), -(f(1)+g(1)))

    def test_denominator_excluded(self):
        sols=[x for x in range(-10, 11) if x != 4 and (x+2)/(x-4) <= 0]
        self.assertEqual(sols, [-2, -1, 0, 1, 2, 3])

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith(('Claude', 'Codex')))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
