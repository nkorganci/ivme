"""kosullu-onerme video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/kosullu-onerme-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_false_implication_fixes_values(self):
        imp=lambda a,b: (not a) or b
        rows=[(p,q,r) for p in (0,1) for q in (0,1) for r in (0,1)]
        self.assertEqual([x for x in rows if not imp(x[0] and x[2], not x[1])], [(1,1,1)])
        self.assertEqual(len([x for x in rows if imp(x[0] and x[2], not x[1])]), 7)

    def test_quantifiers(self):
        Z=range(-5,6)
        self.assertTrue(any(x*x>0 for x in Z))
        self.assertFalse(all(x*x-1>=0 for x in Z))
        self.assertTrue(all(x*x-1>=0 for x in range(1,20)))

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith(('Claude', 'Codex')))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
