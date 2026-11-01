"""carpanlara-ayirma video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/carpanlara-ayirma-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_difference_of_squares(self):
        self.assertEqual(25 ** 2 - 15 ** 2, 400)
        self.assertEqual(2 ** 8 - 1, 15 * 17)
        for a in range(-6, 7):
            for b in range(-6, 7):
                self.assertEqual(a * a - 9 * b * b, (a - 3 * b) * (a + 3 * b))
        self.assertNotEqual(1 - 9, (1 - 9) * (1 + 9))

    def test_complete_square(self):
        for x in range(-8, 9):
            self.assertEqual(x ** 4 + 8 * x ** 2 + 36, (x * x + 4) ** 2 + 20)
            self.assertEqual(x ** 4 - 2 * x ** 3 + 1, (x * x - x) ** 2 + 1 - x * x)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith('Claude'))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
