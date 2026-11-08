from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_secenek_degisimi import option_mapping


class OptionPermutationTest(unittest.TestCase):
    def setUp(self):
        self.left='1. Hangi yardımcı bilim dalına ait bilgi verilmemiştir? A) Kronoloji B) Antropoloji C) Diplomasi D) Heraldik E) Nümismatik'
        self.right='9. Hangi yardımcı bilim dalına ait bilgi verilmemiştir? A) Kronoloji B) Nümismatik C) Diplomasi D) Heraldik E) Antropoloji'

    def test_answer_follows_option_content_instead_of_copying_letter(self):
        result=option_mapping(self.left,self.right,'E','B')
        self.assertEqual(result['letterMapping']['E'],'B');self.assertTrue(result['answerContentAgrees'])
        self.assertFalse(result['sameLetterCanBeCopied'])

    def test_copied_answer_letter_is_an_explicit_conflict(self):
        self.assertFalse(option_mapping(self.left,self.right,'E','E')['answerContentAgrees'])

    def test_negative_stem_or_option_change_is_not_a_permutation(self):
        for text in (self.right.replace('verilmemiştir','verilmiştir'),self.right.replace('Kronoloji','Arkeoloji')):
            with self.assertRaises(ValueError):option_mapping(self.left,text,'E','B')

    def test_numeric_token_boundaries_are_preserved(self):
        with self.assertRaises(ValueError):option_mapping(self.left+' 1 2',self.right+' 12','E','B')


if __name__=='__main__':unittest.main()
