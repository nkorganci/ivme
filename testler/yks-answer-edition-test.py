from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_cevap_nusha_incele import edition_status,old_printed_number


class PrintedEditionConflictTest(unittest.TestCase):
    def test_two_different_printed_keys_are_a_conflict_not_a_bank_correction(self):
        self.assertEqual(edition_status([{'answer':'E'}],'E','D'),'PRINTED_SOURCE_EDITION_ANSWER_CONFLICT')
        self.assertEqual(edition_status([{'answer':'A'},{'answer':'A'}],'A','C'),'PRINTED_SOURCE_EDITION_ANSWER_CONFLICT')

    def test_missing_or_disagreeing_old_source_does_not_support_the_bank_answer(self):
        for sections in [[],[{'answer':'C'}],[{'answer':'A'},{'answer':'C'}]]:
            with self.assertRaises(ValueError):edition_status(sections,'A','D')

    def test_matching_letters_and_non_source_letters_are_not_recorded_as_conflicts(self):
        with self.assertRaises(ValueError):edition_status([{'answer':'D'}],'D','D')
        for answer in ['F','','AB']:
            with self.assertRaises(ValueError):edition_status([{'answer':'D'}],'D',answer)

    def test_old_question_27_does_not_take_the_new_edition_question_30_key(self):
        self.assertEqual(old_printed_number({'questionNumbers':[27]}),27)
        for source in [{},{'questionNumbers':[27,30]},{'questionNumbers':['27']}]:
            with self.assertRaises(ValueError):old_printed_number(source)


if __name__=='__main__':unittest.main()
