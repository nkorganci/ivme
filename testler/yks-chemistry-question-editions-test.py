from pathlib import Path
import sys
import unittest
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_kimya_soru_nushasi import compare_question


class ChemistryIndividualEditionTest(unittest.TestCase):
    def pages(self):
        a=pymupdf.open();b=pymupdf.open()
        for doc in [a,b]:doc.new_page().insert_text((40,80),'1. Which atom?\nA) one B) two C) three D) four E) five')
        return a,b

    def test_identical_question_requires_both_original_resolutions(self):
        a,b=self.pages()
        try:
            r=compare_question(a[0],b[0],[30,50,400,200]);self.assertEqual(r['status'],'INDIVIDUAL_ORIGINAL_NATIVE_AND_TWO_DPI_PIXELS_IDENTICAL')
            self.assertEqual([p['dpi'] for p in r['pixels']],[180,330])
        finally:a.close();b.close()

    def test_equal_native_text_with_different_atom_or_bond_diagram_is_rejected(self):
        a,b=self.pages()
        try:
            b[0].draw_line((100,130),(170,150))
            self.assertEqual(compare_question(a[0],b[0],[30,50,400,200])['status'],'ORIGINAL_QUESTION_PIXELS_DIFFER')
        finally:a.close();b.close()

    def test_changed_number_or_negation_is_never_recovered_by_pixel_similarity(self):
        a,b=self.pages()
        try:
            b[0].insert_text((40,160),'not 3 atoms')
            self.assertEqual(compare_question(a[0],b[0],[30,50,400,200])['status'],'NATIVE_QUESTION_CONTENT_DIFFERS')
        finally:a.close();b.close()


if __name__=='__main__':unittest.main()
