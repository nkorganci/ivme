"""A local visual key reading must exactly match all printed source rows."""
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_anahtar_pilotu import validate_model, validate_text_pairs

class KeyPilotTest(unittest.TestCase):
    def expected(self):return [{'number':n,'answer':'ABCDE'[(n-1)%5]} for n in range(1,13)]
    def test_two_source_readings_agree_without_solving_questions(self):
        rows=self.expected();text='\n'.join(str(r['number'])+'. '+r['answer'] for r in rows)
        self.assertEqual(validate_text_pairs(text),rows)
        validate_model({'incomplete':False,'answers':rows},rows)
    def test_missing_duplicate_or_conflicting_visual_rows_are_rejected(self):
        rows=self.expected()
        for candidate in [rows[:-1],[*rows[:-1],rows[0]],[{**r,'answer':'E'} for r in rows]]:
            with self.assertRaises(ValueError):validate_model({'incomplete':False,'answers':candidate},rows)
        with self.assertRaises(ValueError):validate_model({'incomplete':True,'answers':rows},rows)
    def test_source_key_must_have_complete_unambiguous_number_sequence(self):
        with self.assertRaises(ValueError):validate_text_pairs('1. A\n2. B')

if __name__=='__main__':unittest.main(verbosity=2)
