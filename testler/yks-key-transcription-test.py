from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_anahtar_gorsel import checked_reading
import json


class TranscriptionSafetyTest(unittest.TestCase):
    def response(self,rows,**extra):
        return {'done':True,'done_reason':'stop','response':json.dumps({'incomplete':False,'answers':rows}),**extra}

    def test_does_not_replace_missing_or_incorrect_letters_with_expected_answers(self):
        rows=[{'number':2,'answer':'D'},{'number':1,'answer':'A'}]
        self.assertEqual(checked_reading(self.response(rows)),list(reversed(rows)))
        # A blank source cell never acquires a letter from a sequence/count rule.
        self.assertEqual(len(checked_reading(self.response(rows[:1]))),1)

    def test_duplicate_and_invalid_number_or_letter_are_refused(self):
        for rows in ([{'number':1,'answer':'A'}]*2,[{'number':True,'answer':'A'}],
                     [{'number':0,'answer':'A'}],[{'number':1,'answer':'F'}],
                     [{'number':1,'answer':'a'}],[]):
            with self.assertRaises(ValueError):checked_reading(self.response(rows))

    def test_truncated_or_model_marked_unreadable_output_is_refused(self):
        rows=[{'number':1,'answer':'A'}]
        for reply in (self.response(rows,done=False),self.response(rows,done_reason='length'),
                      {'done':True,'response':'{"incomplete":true,"answers":[]}'}):
            with self.assertRaises(ValueError):checked_reading(reply)


if __name__=='__main__':unittest.main()
