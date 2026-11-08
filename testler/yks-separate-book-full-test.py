from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import pymupdf
from yks_tam_ayri_anahtar import complete_body_numbers,index_book
from yks_buyuk_anahtar_incele import large_pairs


class SeparateFullBookTest(unittest.TestCase):
    def test_large_printed_key_does_not_silently_drop_the_61st_physics_answer(self):
        text='AYT TARAMA TESTI-16\n'+'\n'.join(f'{i}. A' for i in range(1,62))
        answers=large_pairs(text)
        self.assertEqual(len(answers),61)
        self.assertEqual(answers[-1],{'number':61,'answer':'A'})

    def test_duplicate_missing_and_out_of_order_source_numbers_are_not_repaired(self):
        for text in ['1. A\n2. B\n3. C\n3. D\n5. E','1. A\n2. B\n4. C\n5. D',
                '1. A\n3. C\n2. B\n4. D']:
            with self.assertRaises(ValueError):large_pairs(text)

    def test_identical_book_body_still_needs_full_question_numbers_and_options(self):
        with pymupdf.open() as doc:
            page=doc.new_page();page.insert_text((34,100),'1. Actual question')
            for i,letter in enumerate('ABCDE'):page.insert_text((55,130+i*20),letter+') Source option')
            expected=[{'number':1,'answer':'B'}]
            self.assertEqual(complete_body_numbers(doc,expected)['status'],'PASS')
            self.assertEqual(complete_body_numbers(doc,expected+[{'number':2,'answer':'A'}])['status'],'REVIEW_REQUIRED')

    def test_book_index_never_transfers_an_ayt_body_to_a_tyt_number(self):
        with pymupdf.open() as doc:
            page=doc.new_page();page.insert_text((34,30),'AYT TARAMA TESTI-4')
            page.insert_text((34,100),'1. Actual question')
            for i,letter in enumerate('ABCDE'):page.insert_text((55,130+i*20),letter+') Source option')
            self.assertEqual(dict(index_book(doc,'TYT')['bodies']),{})
            self.assertEqual(dict(index_book(doc,'AYT')['bodies']),{4:[0]})


if __name__=='__main__':unittest.main()
