"""polinom-islemleri video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/polinom-islemleri-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_equal_values(self):
        P = lambda x: x*(x-1)*(x-2) + 5
        self.assertEqual([P(0), P(1), P(2)], [5, 5, 5])
        self.assertEqual(P(3), 11)

    def test_even_odd_sums(self):
        P = lambda x: (x-2)**3 + 4*x*x + 5
        self.assertEqual(P(1), 8)
        self.assertEqual(P(-1), -18)
        self.assertEqual((P(1)+P(-1))//2, -5)
        self.assertEqual((P(1)-P(-1))//2, 13)
        # açılım: x^3 - 6x^2 + 12x - 8 + 4x^2 + 5 = x^3 - 2x^2 + 12x - 3
        self.assertEqual(-2 + -3, -5)
        self.assertEqual(1 + 12, 13)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith(('Claude', 'Codex')))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
