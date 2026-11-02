"""fonksiyon-kavrami video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/fonksiyon-kavrami-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_function_count(self):
        from itertools import product
        for a in range(1, 5):
            for b in range(1, 5):
                self.assertEqual(len(list(product(range(b), repeat=a))), b**a)
        self.assertEqual(3**(6-2), 81)
        self.assertEqual(4**3, 64)

    def test_bracket_substitution(self):
        f = lambda t: 2*(t+3)+1
        g = lambda t: f(t+3)
        for x in range(-5, 6):
            self.assertEqual(f(x+2), g(x-1))
        self.assertEqual(g(4), 21)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith(('Claude', 'Codex')))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
