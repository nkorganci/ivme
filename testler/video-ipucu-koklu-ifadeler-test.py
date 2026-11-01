"""koklu-ifadeler video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/koklu-ifadeler-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_squarefree_split(self):
        def split(n):
            k = max(d for d in range(1, n + 1) if n % (d * d) == 0)
            return k, n // (k * k)
        self.assertEqual(split(54), (3, 6))
        self.assertEqual(split(12), (2, 3))
        self.assertEqual(split(125), (5, 5))
        self.assertEqual(split(72), (6, 2))
        self.assertEqual(3 + 2 + 5, 10)

    def test_root_equations(self):
        self.assertEqual(1 - (-7), 8)
        cands = [x for x in range(-3, 50) if x + 3 == (x - 3) ** 2]
        self.assertEqual(cands, [1, 6])
        valid = [x for x in cands if x - 3 >= 0]
        self.assertEqual(valid, [6])

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith('Claude'))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
