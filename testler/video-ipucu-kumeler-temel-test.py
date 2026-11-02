"""kumeler-temel video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/kumeler-temel-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_subsets_with_element(self):
        from itertools import combinations
        U=['a','b','c','d','e']
        subs=[set(c) for r in range(6) for c in combinations(U,r)]
        self.assertEqual(len([s for s in subs if 'a' in s and 'd' not in s]), 2**3)
        self.assertEqual(len([s for s in subs if 'a' in s]), 2**4)

    def test_nested_set(self):
        K=['a', frozenset(['b']), frozenset(['c','d']), frozenset()]
        self.assertEqual(len(K), 4)
        self.assertIn(frozenset(['b']), K)
        self.assertNotIn('b', K)
        self.assertNotIn('d', K)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith(('Claude', 'Codex')))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
