"""Prevent rotated labels and repeated question numbers from crossing tests."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_uc_adim_deneme import key_rows, discover, body_identity
from mebi_pratik2_uc_adim_deneme_anahtar import same_row
from mebi_pratik2_uc_adim_deneme_kirpim import subject_for


def line(t, x, y, w=10, h=10): return {'text': t, 'bbox': [x, y, x+w, y+h]}


def key_page():
    lines = [line('TYT • 1. ADIM • 1. DENEME', 50, 160, 22, 180),
             line('TÜRKÇE', 230, 95, 80)]
    lines += [line(str(i), 80+i*30, 115) for i in range(1, 6)]
    lines += [line(c, 80+i*30, 131) for i, c in enumerate('ABCDE', 1)]
    return {'physicalPage': 3, 'rect': [0, 0, 552, 780], 'lines': lines}


class MockBindings(unittest.TestCase):
    def test_second_twenty_column_row_keeps_its_printed_numbers(self):
        self.assertTrue(same_row('21 22 23', 'A B C', {'21':'A','22':'B','23':'C'}))
        self.assertFalse(same_row('1 2 3', 'A B C', {'21':'A','22':'B','23':'C'}))
        self.assertFalse(same_row('21 23', 'A C', {'21':'A','23':'C'}))

    def test_subject_range_must_come_from_same_printed_mock(self):
        row={'step':1,'mock':2,'sectionId':'FEN','printedNumber':15}
        intro={'identity':[1,1,'FEN'],'page':1,'lines':[line('Bu testte Fizik (1-14), Kimya (15-27)',60,85)]}
        self.assertIsNone(subject_for(row,[intro],'AYT')[0])
        intro['identity'][1]=2
        self.assertEqual(subject_for(row,[intro],'AYT')[0],'Kimya')

    def test_philosophy_group_is_not_guessed_as_one_narrow_subject(self):
        row={'step':1,'mock':1,'sectionId':'SB2','printedNumber':25}
        intro={'identity':[1,1,'SB2'],'page':1,'lines':[line('Bu testte Felsefe Grubu (23-34)',60,85)]}
        self.assertIsNone(subject_for(row,[intro],'AYT')[0])

    def test_rotated_text_box_does_not_cover_the_first_answer_row(self):
        groups, _ = key_rows(key_page(), [(53, 93, 74, 398)])
        self.assertEqual(groups[0]['answers'][0]['answer'], 'A')
        self.assertEqual(groups[0]['sectionId'], 'TUR')

    def test_no_vector_bar_keeps_keys_unbound(self):
        groups, issues = key_rows(key_page(), [])
        self.assertEqual(groups, []); self.assertEqual(len(issues), 1)

    def test_missing_middle_letter_does_not_shift_any_later_letter(self):
        page = key_page(); page['lines'] = [l for l in page['lines'] if l['text'] != 'B']
        groups, _ = key_rows(page, [(53, 93, 74, 398)])
        self.assertEqual(groups[0]['missingNumbers'], [2])
        self.assertEqual(groups[0]['answers'][1]['printedNumber'], 3)
        self.assertEqual(groups[0]['answers'][1]['answer'], 'C')

    def test_step_mock_and_section_all_must_match(self):
        body = {'physicalPage': 1, 'rect': [0, 0, 552, 780], 'lines': [
            line('1. ADIM • 2. DENEME', 400, 56), line('TYT • TÜR', 60, 56), line('1.', 52, 128)]}
        result = discover({'pages': [body, key_page()]}, {3: [(53, 93, 74, 398)]})
        self.assertEqual(result['boundBodies'], 0)
        body['lines'][0]['text'] = '1. ADIM • 1. DENEME'
        result = discover({'pages': [body, key_page()]}, {3: [(53, 93, 74, 398)]})
        self.assertEqual(result['boundBodies'], 1)

    def test_two_section_labels_on_a_body_page_are_ambiguous(self):
        page = {'lines': [line('1. ADIM • 1. DENEME', 400, 56), line('AYT • MAT', 60, 56), line('AYT • FEN', 60, 60)]}
        self.assertIsNone(body_identity(page))

    def test_right_column_science_number_can_be_indented(self):
        body={'physicalPage':1,'rect':[0,0,552,780],'lines':[line('1. ADIM • 1. DENEME',400,56),
            line('TYT • TÜR',60,56),line('1.',293,129)]}
        result=discover({'pages':[body,key_page()]},{3:[(53,93,74,398)]})
        self.assertEqual(result['boundBodies'],1)


if __name__ == '__main__': unittest.main()
