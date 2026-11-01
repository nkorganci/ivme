"""oran-oranti video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/oran-oranti-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_lcm_chain(self):
        sols = [(x, y, z) for x in range(1, 94) for y in range(1, 94) for z in range(1, 94) if 3 * x == 2 * y == 5 * z and x + y + z == 93]
        self.assertEqual(sols, [(30, 45, 18)])
        self.assertEqual(30 - 18, 12)

    def test_box_integer(self):
        weights = [12, 6, 4, 3]
        totals = set()
        for w in weights:
            x = Fraction(8, w)
            boxes = [x * v for v in weights]
            if all(b.denominator == 1 for b in boxes):
                totals.add(sum(boxes))
        self.assertEqual(totals, {50})

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith('Claude'))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
