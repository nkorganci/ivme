"""grafik-rutin-olmayan video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/grafik-rutin-olmayan-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_linear_changes_proportional(self):
        for m in range(-5, 6):
            for n in range(-20, 21, 5):
                f=lambda x: m*x+n
                for x1,x2,x3 in ((10,25,70),(5,20,50),(0,3,9)):
                    if f(x3)!=f(x1):
                        self.assertEqual(Fraction(f(x3)-f(x2), f(x3)-f(x1)), Fraction(x3-x2, x3-x1))
        self.assertEqual(Fraction(36*45,60), 27)

    def test_cumulative_slope(self):
        for k in range(1, 20):
            for d in range(1, 30):
                self.assertEqual(Fraction(k*d, d), k)
        self.assertEqual(95//5, 19)
        self.assertEqual(5*23, 115)
        self.assertEqual((90-40)//5, 10)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith(('Claude', 'Codex')))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
