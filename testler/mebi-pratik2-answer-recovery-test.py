"""Keep alternative OCR scoped to the exact printed step and source pixels."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from mebi_pratik2_cevap_kurtarma import CELL, ocr, step_token


class RecoveryBoundaries(unittest.TestCase):
    def test_step_variants_remain_distinct(self):
        self.assertEqual(step_token('1. ADIM - A'), '1A')
        self.assertEqual(step_token('1. ADIM - B'), '1B')
        self.assertNotEqual(step_token('1. ADIM'), step_token('2. ADIM'))

    def test_ambiguous_step_labels_are_not_accepted(self):
        for value in ['1. ADIM 2. ADIM', 'ADIM', '4. ADIM', '1. ADIM cevaplar']:
            self.assertIsNone(step_token(value))

    def test_duplicate_answer_numbers_are_detectable_before_dictionary_merge(self):
        matches = CELL.findall('1-A 2-B 2-C')
        answers = {str(int(number)): answer for number, answer in matches}
        self.assertNotEqual(len(matches), len(answers))

    def test_cached_ocr_cannot_survive_modified_source_image(self):
        with tempfile.TemporaryDirectory() as name:
            folder = Path(name)
            original = b'original source image'
            (folder / 'heading.png').write_bytes(original)
            (folder / 'heading.json').write_text(json.dumps({
                'status': 'OCR_READ', 'text': 'source heading',
                'imageSha256': hashlib.sha256(original).hexdigest(),
            }), encoding='utf8')
            self.assertEqual(ocr(None, 1, [], folder, 'heading')['text'], 'source heading')
            (folder / 'heading.png').write_bytes(b'changed pixels')
            with self.assertRaisesRegex(ValueError, 'source pixels changed'):
                ocr(None, 1, [], folder, 'heading')


if __name__ == '__main__':
    unittest.main()
