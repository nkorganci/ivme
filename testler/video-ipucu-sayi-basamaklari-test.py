"""Sayı basamakları video protiplerinin dar matematik kapsamı; öğretmen onayı değildir."""
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HINTS = {h['id']: h for h in json.loads((ROOT / 'video-hatti/ipuclari/sayi-basamaklari-video.json').read_text(encoding='utf-8'))}


class HintMathTest(unittest.TestCase):
    def test_reverse_difference_excludes_zero_tens(self):
        both_two_digit = [10 * a + b for a in range(1, 10) for b in range(1, 10) if (10 * a + b) - (10 * b + a) == 36]
        self.assertEqual(sorted(both_two_digit), [51, 62, 73, 84, 95])
        only_ab = [10 * a + b for a in range(1, 10) for b in range(0, 10) if (10 * a + b) - (10 * b + a) == 36]
        self.assertEqual(len(only_ab), 6)
        self.assertIn(40, only_ab)
        self.assertIn('95, 84, 73, 62, 51', HINTS['iki-basamakli-tersinde-sifir-elemesi']['example'])

    def test_seven_times_digit_sum(self):
        sevens = [10 * a + b for a in range(1, 10) for b in range(10) if 10 * a + b == 7 * (a + b)]
        self.assertEqual(sevens, [21, 42, 63, 84])
        self.assertEqual(max(sevens) - min(sevens), 63)
        eights = [10 * a + b for a in range(1, 10) for b in range(10) if 10 * a + b == 8 * (a + b)]
        self.assertEqual(eights, [72])
        self.assertIn('84 − 21 = 63', HINTS['harf-verilmeyen-sayiyi-cozumle']['example'])

    def test_unshifted_multiplication_rows(self):
        found = [n for n in range(100, 1000) if 8 * n - 3 * n == 3225]
        self.assertEqual(found, [645])
        self.assertEqual(645 * 38, 24510)
        self.assertEqual(8 * 645 + 30 * 645, 645 * 38)
        self.assertIn('24510', HINTS['alt-alta-carpmada-satirlarin-anlami']['example'])

    def test_sources_are_explicit_and_not_teacher_approval(self):
        for hint in HINTS.values():
            self.assertLess(hint['startSeconds'], hint['endSeconds'])
            self.assertTrue(hint['agentSourceReview'].startswith('Claude'))
            self.assertFalse(hint.get('teacherApproved', False))
            for t in hint['frameSeconds']:
                self.assertTrue(hint['startSeconds'] <= t < hint['endSeconds'])


if __name__ == '__main__':
    unittest.main()
