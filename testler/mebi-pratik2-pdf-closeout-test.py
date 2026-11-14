import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_pdf_kapanis import document_kind,category_binding,source_path


class PdfMetadataCloseout(unittest.TestCase):
    def test_screening_folder_is_not_a_mock_exam(self):
        self.assertEqual(document_kind(r'Deneme-Tarama\Taramalar\AYT\Fizik AYT Tarama Testi-5.pdf'),'SCREENING_TEST')
        self.assertEqual(document_kind(r'Deneme-Tarama\Denemeler\AYT\AYT Deneme Sınavı-5.pdf'),'MOCK_EXAM')

    def test_topic_summary_and_workbook_keep_document_role(self):
        self.assertEqual(document_kind(r'AYT\Biyoloji\Konu Özeti--abc.pdf'),'TOPIC_SUMMARY')
        self.assertEqual(document_kind(r'AYT\3 Adım Soru Bankası\Fizik.pdf'),'WORKBOOK')
        self.assertEqual(document_kind(r'AYT\Denemeler\Cevap Anahtarı.pdf'),'ANSWER_KEY')
        self.assertEqual(document_kind(r'AYT\Kitap ve Denemeler\Konu Pekiştirme Testleri\AYT Fizik PDF.pdf'),'TOPIC_PRACTICE_TESTS')

    def test_binding_needs_verified_pdf_and_matching_live_exam_course_topic(self):
        category={'id':'test','selectable':True,'exam':'TYT','subject':'Biyoloji','topic':'Hücre','unit':'Canlılık'}
        label={'categoryId':'test','canonicalExam':'TYT','canonicalSubject':'Biyoloji','canonicalTopic':'Hücre'}
        self.assertEqual(category_binding(label,{'test':category},True)['unit'],'Canlılık')
        self.assertIsNone(category_binding(label,{'test':category},False))
        for change in [{'exam':'AYT'},{'subject':'Fizik'},{'topic':'Genetik'},{'selectable':False}]:
            self.assertIsNone(category_binding(label,{'test':{**category,**change}},True))

    def test_source_archive_boundary(self):
        with self.assertRaises(ValueError):source_path(r'..\uygulama\outside.pdf')

    def test_retired_plan_writers_cannot_recreate_deleted_plan(self):
        from mebi_pratik2_plan_sonuc import run
        from mebi_pratik2_arsiv_izle import sync_docs
        from mebi_pratik2_zincir_gozetmeni import write_step_status
        with self.assertRaises(ValueError):run()
        with self.assertRaises(ValueError):sync_docs({})
        with self.assertRaises(ValueError):write_step_status({})


if __name__=='__main__':unittest.main()
