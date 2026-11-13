import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_taranmis_edebiyat_anahtar import numbered,TEST


class ScannedKeys(unittest.TestCase):
    def test_ocr_cells_keep_their_printed_numbers_and_case(self):
        self.assertEqual(numbered('1.c 2.D\n4. e'),{'1':'C','2':'D','4':'E'})
        self.assertNotIn('3',numbered('1.c 2.D\n4. e'))

    def test_corrupt_cell_is_not_guessed_and_duplicate_number_is_rejected(self):
        self.assertEqual(numbered('4.D S, |= 6.B'),{'4':'D','6':'B'})
        with self.assertRaises(ValueError):numbered('1.C 1.C')

    def test_printed_identity_comes_from_heading_not_question_number(self):
        self.assertEqual(TEST.findall('AYT TARAMA TESTİ-14 ÖĞRETİCİ METİNLER'),['14'])
        self.assertEqual(TEST.findall('14. C'),[])


if __name__=='__main__':unittest.main()
