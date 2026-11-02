"""kume-islemleri video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/kume-islemleri-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_percent_overflow(self):
        for a in range(0, 101, 5):
            for b in range(0, 101, 5):
                if a + b >= 100:
                    self.assertEqual(a + b - 100, a + b - min(100, a + b))
        self.assertEqual(70 + 45 - 100, 15)
        self.assertEqual(9 * 100 // 15, 60)
        self.assertEqual(70 + 45 - 90, 25)

    def test_at_least_two(self):
        total = 3 * 20
        triple = 4
        exactly_two = 15 - triple
        only_one = total - 2 * exactly_two - 3 * triple
        self.assertEqual(only_one, 26)
        self.assertEqual(108 - 2 * 27 - 3 * 12, 18)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith(('Claude', 'Codex')))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
