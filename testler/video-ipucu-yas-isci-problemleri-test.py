"""yas-isci-problemleri video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/yas-isci-problemleri-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_age_difference(self):
        for a in range(1, 80):
            for b in range(a):
                for t in range(10):
                    self.assertEqual((a+t)-(b+t), a-b)
        self.assertEqual([d for d in range(1, 30) if 6*d+4 == 7*d-1], [5])

    def test_team_rates(self):
        rate = 3*Fraction(1, 24) + 2*Fraction(1, 48)
        self.assertEqual(1/rate, 6)
        for n in range(1, 20):
            for days in range(1, 30):
                self.assertEqual(n*Fraction(1, n*days)*days, 1)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith(('Claude', 'Codex')))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
