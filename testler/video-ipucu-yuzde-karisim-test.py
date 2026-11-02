"""yuzde-karisim video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/yuzde-karisim-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_weighted_bounds(self):
        for a in range(1, 20):
            for b in range(1, 20):
                for p in range(0, 100, 10):
                    for q in range(p+10, 101, 10):
                        z=Fraction(a*p+b*q,a+b)
                        self.assertTrue(p < z < q)
                        self.assertEqual(z-p < q-z, a>b)
        self.assertEqual(Fraction(100*40+25*80,125),48)

    def test_dilution_and_replacement_differ(self):
        for mass in range(10, 201, 10):
            for pct in range(10, 101, 10):
                sugar=Fraction(mass*pct,100)
                self.assertEqual(100*sugar/(2*mass),Fraction(pct,2))
                self.assertEqual(100*(sugar/2)/mass,Fraction(pct,2))
        self.assertEqual(Fraction(80,400),Fraction(20,100))

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith(('Claude', 'Codex')))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
