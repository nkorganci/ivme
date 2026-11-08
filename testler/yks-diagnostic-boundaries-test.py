from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_pilot_sorular import boundaries,question_sequence


def line(text,x,y):return {'text':text,'bbox':[x,y,x+50,y+14]}


class DiagnosticBoundariesTest(unittest.TestCase):
    def test_indented_year_equation_and_numbered_list_never_cut_a_source_question(self):
        rows=[line('1.',36,80),line('2.',36,380),line('3.',288,80),line('4.',288,380),
            line('16. yüzyılda',308,180),line('1. Dua',308,230),line('2)x',350,110)]
        selected,rejected=boundaries(rows,560,792)
        self.assertEqual([r['number'] for r in selected],[1,2,3,4])
        self.assertEqual({r['number'] for r in rejected},{1,16})
        question_sequence(selected,[{'number':n} for n in range(1,5)])

    def test_printed_bare_number_is_read_without_inventing_a_missing_question(self):
        selected,_=boundaries([line('5',36,80),line('6.',36,380)],560,792)
        self.assertEqual([r['number'] for r in selected],[5,6])
        with self.assertRaises(ValueError):question_sequence(selected,[{'number':n} for n in range(1,7)])

    def test_per_page_shifted_geography_column_keeps_all_real_numbers(self):
        rows=[line('15.',36,80),line('16.',36,380),line('17.',282.38,80),line('18.',282.38,380)]
        selected,_=boundaries(rows,560,792)
        self.assertEqual([r['number'] for r in selected],[15,16,17,18])

    def test_duplicate_missing_and_wrong_order_source_numbers_fail_acceptance(self):
        for values in ([1,1],[1,3],[2,1]):
            with self.assertRaises(ValueError):question_sequence([{'number':n} for n in values],[{'number':1},{'number':2}])

    def test_tall_formula_is_complete_and_does_not_leak_into_previous_question(self):
        rows=[line('1.',36,80),line('E) 3840',180,320),line('2.',36,447),
            line('3x',98,433),line('x < 1',127,433),line('piecewise brace',83,443)]
        selected,_=boundaries(rows,560,792)
        self.assertLess(selected[0]['bboxPt'][3],433)
        self.assertLess(selected[1]['bboxPt'][1],433)
        self.assertEqual(selected[1]['anchor']['contentTopPt'],433)


if __name__=='__main__':unittest.main()
