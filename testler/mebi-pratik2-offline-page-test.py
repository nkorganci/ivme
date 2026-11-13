"""Offline page lookup cannot execute JS or treat generic labels as a page."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_cevrimdisi_sayfalar import pages_from_javascript,page_signature,publication_title,token_signature


class OfflinePages(unittest.TestCase):
    def test_only_literal_page_strings_are_read(self):
        self.assertEqual(pages_from_javascript('\ufeffvar textForPages = ["one","two"];'),['one','two'])
        for text in ['var textForPages = ["one"]; alert(1);','var textForPages = eval("[]");','var textForPages = [{"answer":"A"}];']:
            with self.assertRaises(ValueError):pages_from_javascript(text)

    def test_a_blank_cover_or_generic_title_cannot_identify_a_page(self):
        self.assertIsNone(page_signature('CEVAP ANAHTARI 1'))
        self.assertEqual(page_signature('A complete long question. '*8),page_signature('A COMPLETE LONG QUESTION\n'*8))

    def test_book_title_does_not_remove_subject_or_exam(self):
        self.assertEqual(publication_title(r'AYT\book\AYT Kimya çevrim dışı içerik paketi--abc.zip'),'ayt kimya')
        self.assertEqual(publication_title(r'AYT\book\AYT Kimya PDF--xyz.pdf'),'ayt kimya')
        self.assertNotEqual(publication_title('TYT Kimya PDF--xyz.pdf'),publication_title('AYT Kimya PDF--xyz.pdf'))
        self.assertEqual(publication_title('AYT Kimya çevrim dışı içerik paket--abc.zip'),'ayt kimya')

    def test_word_bag_keeps_repetition_and_numbers_and_is_distinct_from_text_order(self):
        a='Alpha beta gamma 21 '*8;b='21 gamma beta Alpha '*8
        self.assertEqual(token_signature(a),token_signature(b))
        self.assertNotEqual(page_signature(a),page_signature(b))
        self.assertNotEqual(token_signature(a),token_signature(b+' Alpha'))
        self.assertNotEqual(token_signature(a),token_signature(b.replace('21','22')))


if __name__=='__main__':unittest.main()
