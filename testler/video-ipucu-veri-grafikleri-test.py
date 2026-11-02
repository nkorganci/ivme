"""veri-grafikleri video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/veri-grafikleri-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_median_from_bars(self):
        vals=[50,60,70,80]; freq=[3,6,4,5]
        data=[v for v,f in zip(vals,freq) for _ in range(f)]
        n=len(data)
        self.assertEqual(n,18)
        self.assertEqual(Fraction(data[n//2-1]+data[n//2],2),65)
        self.assertEqual(max(zip(freq,vals))[1],60)

    def test_equal_bars(self):
        each=22//2
        self.assertEqual(each,11)
        mid=24-each
        self.assertEqual(mid,13)
        self.assertEqual(40-each-mid-each,5)
        self.assertEqual(50-3-14-12-14,7)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith(('Claude', 'Codex')))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
