"""Printed section/range evidence must not become guessed course/topic labels."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_deneme_ders_kaniti import printed_course


class PrintedCourseTests(unittest.TestCase):
    def text(self,ranges,title='SOSYAL BİLİMLER TESTİ'):
        return title+'\n1. Bu testte sırasıyla '+ranges+' alanlarına ait toplam 25 soru vardır. 2. Cevaplarınızı, cevap kâğıdına işaretleyiniz.'

    def test_printed_ranges_override_conventional_boundaries(self):
        text=self.text('Tarih (1-4), Coğrafya (5-10), Felsefe (11-15)')
        self.assertEqual(printed_course(text,'TYT:2',5)[0],'Coğrafya')
        self.assertIsNone(printed_course(text,'TYT:4',5))
        self.assertIsNone(printed_course(text,'TYT:2',16))

    def test_missing_or_conflicting_ranges_are_not_guessed(self):
        self.assertIsNone(printed_course(self.text('Tarih soruları'),'TYT:2',1))
        self.assertIsNone(printed_course(self.text('Tarih (1-5), Felsefe (4-10)'),'TYT:2',4))
        self.assertIsNone(printed_course(self.text('Felsefe Grubu (23-34)','SOSYAL BİLİMLER-2 TESTİ'),'AYT:2',24))

    def test_single_course_requires_explicit_total_and_title(self):
        text='AYT • MATEMATİK TESTİ\n1. Bu testte 40 soru vardır. 2. Cevaplarınızı, kâğıda işaretleyiniz.'
        self.assertEqual(printed_course(text,'AYT:3',40)[0],'Matematik')
        self.assertIsNone(printed_course(text,'AYT:3',41))
        self.assertIsNone(printed_course(text.replace('40 soru vardır.','sorular vardır.'),'AYT:3',1))

    def test_combined_pdf_other_exam_or_overlapping_title_is_not_matched(self):
        text='TYT • TEMEL MATEMATİK TESTİ\n1. Bu testte 40 soru vardır. 2. Cevaplarınızı kâğıda işaretleyiniz.'
        self.assertIsNone(printed_course(text,'AYT:3',1))
        self.assertEqual(printed_course(text,'TYT:3',1)[0],'Matematik')


if __name__=='__main__':unittest.main()
