"""mutlak-deger video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/mutlak-deger-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_combine_reverse_difference(self):
        sols = [x for x in range(-50, 51) if abs(3 * x - 6) + abs(8 - 4 * x) == 14]
        self.assertEqual(sols, [0, 4])
        self.assertEqual(sum(sols), 4)

    def test_check_right_side(self):
        sols = [Fraction(k, 3) for k in range(-150, 151) if abs(Fraction(k, 3) + 1) == 2 * Fraction(k, 3) + 5]
        self.assertEqual(sols, [-2])
        both = [Fraction(k, 3) for k in range(-150, 151) if abs(2 * Fraction(k, 3) - 1) == abs(Fraction(k, 3) + 11)]
        self.assertEqual(both, [Fraction(-10, 3), 12])

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith('Claude'))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
