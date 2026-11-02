"""hareket-problemleri video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from fractions import Fraction
from math import gcd
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/hareket-problemleri-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_meeting_time_geometric_mean(self):
        for va in range(10, 130, 10):
            for vb in range(10, 130, 10):
                for d in range(60, 601, 60):
                    t=Fraction(d, va+vb)
                    ta=Fraction(vb,1)*t/va
                    tb=Fraction(va,1)*t/vb
                    self.assertEqual(t*t, ta*tb)
        self.assertEqual(90*40, 60*60)
        self.assertEqual(9*16, 12*12)

    def test_circular_meetings(self):
        for c in range(100, 1001, 100):
            for v1 in range(10, 101, 10):
                for v2 in range(10, 101, 10):
                    s=v1+v2
                    for start in (c, Fraction(c,2)):
                        times=[(start+k*c)/Fraction(s) for k in range(5)]
                        for a,b in zip(times, times[1:]):
                            self.assertEqual(b-a, Fraction(c, s))
        self.assertEqual(20+4*40, 180)
        self.assertEqual(5+3*30, 95)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith(('Claude', 'Codex')))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
