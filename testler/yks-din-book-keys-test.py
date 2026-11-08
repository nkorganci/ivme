from pathlib import Path
import sys
import unittest
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json
from yks_din_kitap_anahtar import page_sections,validate_section


class DinBookKeyTest(unittest.TestCase):
    def test_test10_and_restarted_past_exam_numbers_are_separate_even_in_reversed_pdf_draw_order(self):
        with pymupdf.open() as doc:
            page=doc.new_page()
            page.insert_text((30,220),'YKS CIKMIS SORULAR AYT DIN KULTURU VE AHLAK BILGISI',fontsize=9)
            for n,c in enumerate('EDCB',1):page.insert_text((30,220+n*15),f'{n}. {c}',fontsize=9)
            page.insert_text((30,40),'AYT TARAMA TESTI-10',fontsize=9)
            for n,c in enumerate('ABCD',1):page.insert_text((30,40+n*15),f'{n}. {c}',fontsize=9)
            sections=page_sections(page,'AYT')
            self.assertEqual([s['sectionName'] for s in sections],['10','past-exams'])
            self.assertEqual([''.join(a['answer'] for a in s['nativePrintedAnswers']) for s in sections],['ABCD','EDCB'])

    def test_missing_native_number_is_never_filled_from_another_section(self):
        with pymupdf.open() as doc:
            page=doc.new_page();page.insert_text((30,40),'AYT TARAMA TESTI-10',fontsize=9)
            for i,n in enumerate([1,2,4,5]):page.insert_text((30,60+i*15),f'{n}. A',fontsize=9)
            with self.assertRaises(ValueError):page_sections(page,'AYT')

    def test_all_actual_22_sections_and_647_readings_still_require_body_binding(self):
        s=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=s.child(s.current()['runId'])
        report=read_json(root/'new-book-keys/din/progress.json');self.assertEqual(report['status'],'COMPLETE')
        self.assertEqual(len(report['results']),22);self.assertEqual(report['verifiedPrintedAnswers'],647)
        for row in report['results']:
            validate_section(row);self.assertFalse(row['sourceQuestionKeysBound']);self.assertFalse(row['teacherApproved'])


if __name__=='__main__':unittest.main()
