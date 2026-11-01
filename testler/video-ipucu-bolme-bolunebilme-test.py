"""Bölünebilme video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/bolme-bolunebilme-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_composite_remainder_split(self):
        pairs = [(a, b) for a in range(10) for b in range(10) if int(f'31{a}{b}') % 30 == 5]
        self.assertTrue(all(b == 5 for _, b in pairs))
        self.assertEqual(sorted(a for a, _ in pairs), [2, 5, 8])
        self.assertEqual(max(a + b for a, b in pairs), 13)
        for n in range(1000, 5000):
            if n % 30 == 5:
                self.assertEqual(n % 10, 5)
                self.assertEqual(n % 3, 2)
        self.assertIn('A + B en çok 13', HINTS['bilesik-bolende-kalani-paylastir']['example'])

    def test_rule_order_same_result(self):
        four_first = [b for b in range(10) if (550 + b) % 4 == 0]
        self.assertEqual(four_first, [2, 6])
        self.assertTrue(all((550 + b) % 9 for b in four_first))
        nine_first = [b for b in range(10) if (550 + b) % 9 == 0]
        self.assertEqual(nine_first, [8])
        self.assertNotEqual(558 % 4, 0)

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith('Claude'))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
