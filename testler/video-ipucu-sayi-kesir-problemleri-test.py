"""sayi-kesir-problemleri video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/sayi-kesir-problemleri-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_fraction_family(self):
        xs = [x for x in range(1, 100) if 3 * x - 20 != 0 and Fraction(2 * x + 5, 3 * x - 20) == Fraction(3, 2)]
        self.assertEqual(xs, [14])
        self.assertEqual(Fraction(28, 42), Fraction(2, 3))

    def test_wire_midpoint(self):
        for L in range(5, 200, 5):
            cut = Fraction(2, 5) * L
            self.assertEqual(Fraction(L, 2) - (L - cut) / 2, cut / 2)
        self.assertEqual([L for L in range(5, 200, 5) if Fraction(2, 5) * L / 2 == 8], [40])

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith('Claude'))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
