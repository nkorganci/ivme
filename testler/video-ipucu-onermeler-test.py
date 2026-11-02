"""onermeler video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/onermeler-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_and_or_exceptions(self):
        rows=[(p,q) for p in (0,1) for q in (0,1)]
        self.assertEqual([r for r in rows if (r[0] and r[1])], [(1,1)])
        self.assertEqual([r for r in rows if not (r[0] or r[1])], [(0,0)])
        self.assertEqual(len([r for r in rows if not (r[0] and r[1])]), 3)

    def test_xor_identities(self):
        for p in (0,1):
            self.assertEqual(p ^ 1, 1-p)
            self.assertEqual(p ^ 0, p)
            self.assertEqual(p ^ p, 0)
            self.assertEqual(p ^ (1-p), 1)
        self.assertEqual(1 ^ 0 ^ 1 ^ 1, 1)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith(('Claude', 'Codex')))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
