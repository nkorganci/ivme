"""EBOB–EKOK video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/ebob-ekok-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_gcd_cofactors_coprime(self):
        for n in range(1, 13):
            for x in range(1, 25):
                for y in range(1, 25):
                    self.assertEqual(gcd(n * x, n * y) == n, gcd(x, y) == 1)
        self.assertEqual(gcd(20, 30), 10)
        best = min(a + b for a in range(1, 200) for b in range(1, 200) if a != b and gcd(a, b) == 8)
        self.assertEqual(best, 24)

    def test_common_shift(self):
        found = [a for a in range(1, 1000) if a % 3 == 1 and a % 5 == 4 and a % 7 == 1]
        self.assertEqual(found[:3], [64, 169, 274])
        self.assertTrue(all((a + 41) % 105 == 0 for a in found))
        self.assertEqual(min(a for a in found if a >= 100), 169)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith('Claude'))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
