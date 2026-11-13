import sys
import unittest
from pathlib import Path
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_bos_sayfa_kaniti import prove_empty


class EmptyPages(unittest.TestCase):
    def test_original_blank_page_is_proved_without_whole_pdf_absence_claim(self):
        with pymupdf.open() as pdf:
            result=prove_empty(pdf.new_page())
            self.assertEqual(result['status'],'PROVED_EMPTY_ORIGINAL_PAGE')
            self.assertFalse(result['wholePdfQuestionAbsenceClaimed']);self.assertEqual(result['ocrCalls'],0)

    def test_small_mark_text_and_annotation_each_prevent_blank_proof(self):
        for kind in ['text','drawing','annotation','white-image']:
            with self.subTest(kind=kind),pymupdf.open() as pdf:
                page=pdf.new_page()
                if kind=='text':page.insert_text((50,50),'1. A question')
                elif kind=='drawing':page.draw_line((50,50),(51,51))
                elif kind=='annotation':page.add_text_annot((50,50),'Note')
                else:
                    image=pymupdf.Pixmap(pymupdf.csRGB,pymupdf.Rect(0,0,4,4),False);image.clear_with(255)
                    page.insert_image(pymupdf.Rect(50,50,60,60),pixmap=image)
                self.assertIsNone(prove_empty(page))


if __name__=='__main__':unittest.main()
