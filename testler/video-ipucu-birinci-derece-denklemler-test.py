"""birinci-derece-denklemler video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/birinci-derece-denklemler-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_tree_gaps(self):
        xs = [x for x in range(0, 200) if sum(x + 4 * k for k in range(1, 8)) == 329]
        self.assertEqual(xs, [31])
        self.assertEqual(sum(31 + 4 * k for k in range(1, 4)), 117)
        self.assertNotEqual((329 - 4 * 36) % 8, 0)

    def test_identity_conditions(self):
        m, n = Fraction(3, 2), 2
        for x in range(-10, 11):
            self.assertEqual(2 * m * x + 5, 3 * (x - 1) + 4 * n)
        self.assertEqual(m + n, Fraction(7, 2))
        self.assertFalse(any(2 * m * x + 5 == 3 * (x - 1) + 4 * 1 for x in range(-50, 51)))

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith('Claude'))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
