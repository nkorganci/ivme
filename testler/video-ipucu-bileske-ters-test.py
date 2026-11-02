"""bileske-ters video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/bileske-ters-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_inverse_reading(self):
        pts={-1:4, 0:2, 2:-1}
        inv={v:k for k,v in pts.items()}
        self.assertEqual(inv[2], 0)
        self.assertEqual(inv[-1], 2)
        self.assertEqual(pts[2], -1)

    def test_nested_solution(self):
        f=lambda x: (x+4)*(x+1)*(x-3)
        roots=[x for x in range(-20, 21) if f(x-4)==0]
        self.assertEqual(roots, [0, 3, 7])
        self.assertEqual(sum(roots), 10)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith(('Claude', 'Codex')))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
