"""merkezi-egilim video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/merkezi-egilim-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_removed_mean_direction(self):
        for n in range(3, 20):
            for k in range(1, n-1):
                for m in range(10, 60, 5):
                    for y in range(0, 100, 5):
                        T=n*m
                        rest=Fraction(T-k*y, n-k)
                        self.assertEqual(rest>m, y<m)
                        self.assertEqual(rest==m, y==m)
        self.assertEqual(Fraction(70+34,2),52)

    def test_mode_preserved(self):
        from itertools import combinations
        from collections import Counter
        data=[1,1,1,2,2,3,3,4,4,4,5,5]
        best=0
        for idx in combinations(range(len(data)),5):
            rest=[data[i] for i in range(len(data)) if i not in idx]
            c=Counter(rest); mx=max(c.values())
            if sorted(k for k in c if c[k]==mx)==[1,4]:
                best=max(best,sum(data[i] for i in idx))
        self.assertEqual(best,18)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith(('Claude', 'Codex')))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
