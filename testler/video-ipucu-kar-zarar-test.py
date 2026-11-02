"""kar-zarar video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/kar-zarar-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_successive_raises_multiply(self):
        for a in range(5, 101, 5):
            for b in range(5, 101, 5):
                total=Fraction((100+a)*(100+b),100)-100
                self.assertEqual(total, a+b+Fraction(a*b,100))
                self.assertGreater(total, a+b)
        self.assertEqual(Fraction(120*130,100),156)
        self.assertEqual(Fraction(120*80,100),96)

    def test_ratio_only_scale_free(self):
        for k in range(1, 30):
            cost=10*k
            revenue=Fraction(2*cost*130+4*cost*120+4*cost*80,100)
            self.assertEqual(100*(revenue-10*cost)/(10*cost),6)
        self.assertEqual(2*13+4*12+4*8,106)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith(('Claude', 'Codex')))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
