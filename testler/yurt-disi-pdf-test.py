"""Regressions for real intake failures: false headings, answer identity and option count."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
import pymupdf

APP=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('yurt_disi',APP/'scripts/yurt-disi-sorular.py')
pipeline=importlib.util.module_from_spec(spec)
spec.loader.exec_module(pipeline)


class SourceIntake(unittest.TestCase):
    def test_question_about_answer_keys_is_not_an_answer_key_page(self):
        doc=pymupdf.open();doc.new_page();page=doc.new_page(width=595,height=842)
        page.insert_text((50,90),'70. CEVAP ANAHTARI hakkindaki soru')
        page.insert_text((70,120),'A) Bir B) Iki C) Uc D) Dort')
        self.assertEqual([n for _,rows in pipeline.question_pages(doc) for n,_ in rows],[70])

    def test_century_inside_stem_does_not_replace_the_printed_question(self):
        doc=pymupdf.open();doc.new_page();page=doc.new_page(width=595,height=842)
        page.insert_text((50,90),'9. Eserin yazari sorusu')
        page.insert_text((70,110),'12. yuzyilda yazilmistir.')
        page.insert_text((50,300),'12. Gercek on ikinci soru')
        found=dict(pipeline.question_pages(doc))[1]
        self.assertEqual([n for n,_ in found],[9,12])
        self.assertGreater(found[1][1][1],280)

    def test_randomized_e_exam_ids_match_answers_directly_and_keep_five_choices(self):
        with tempfile.TemporaryDirectory() as folder:
            doc=pymupdf.open();doc.new_page();page=doc.new_page(width=595,height=842)
            page.insert_text((70,90),'133652')
            page.insert_text((70,110),'Ilk soru\nA) Bir\nB) Iki\nC) Uc\nD) Dort\nE) Bes')
            page.insert_text((70,350),'133651')
            page.insert_text((70,370),'Ikinci soru\nA) Bir\nB) Iki\nC) Uc\nD) Dort\nE) Bes')
            page=doc.new_page(width=595,height=842)
            page.insert_text((50,60),'CEVAP ANAHTARI\n(133651) E\n(133652) B\n'+
                '\n'.join(f'({140000+i}) A' for i in range(18)))
            path=Path(folder)/'2030-01-01_e-Sinav.pdf';doc.save(path);doc.close()
            original=pipeline.OUT;pipeline.OUT=Path(folder)/'output'
            try:
                rows,answers,_=pipeline.extract_file(path)
                self.assertEqual(answers,20)
                self.assertEqual([(q['pdfNumber'],q['answer'],q['choiceCount']) for q in rows],[(133652,'B',5),(133651,'E',5)])
            finally:pipeline.OUT=original


if __name__=='__main__':unittest.main()
