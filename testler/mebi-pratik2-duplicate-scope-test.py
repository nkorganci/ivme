"""Keep cross-exam/subject availability while retaining printed answer conflicts."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import mebi_pratik2_kesin_piksel_tekrari as dedupe


class DuplicateScopes(unittest.TestCase):
    def run_case(self,exam,subject,answer='A'):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);assets=root/'veri/resimler-pilot';assets.mkdir(parents=True)
            base=root/'evidence';base.mkdir();folder=base/'batch';folder.mkdir()
            image=Image.new('RGB',(60,50),'white');ImageDraw.Draw(image).rectangle((10,10,40,40),fill='black')
            image.save(assets/'old.png');image.save(base/'new.png')
            existing=[{'code':'old','image':'old.png','exam':'TYT','subject':'Matematik','answer':'A'}]
            row={'code':'new','image':'new.png','exam':exam,'subject':subject,'answer':answer}
            with patch.object(dedupe,'APP',root),patch.object(dedupe,'BASE',base),patch.object(dedupe,'db_connection',return_value=([],{},None)),patch.object(dedupe,'query',return_value=json.dumps(existing)):
                result=dedupe.select_new([row],folder)
            return result,json.loads((folder/'exact-duplicate-evidence.json').read_text(encoding='utf8'))

    def test_same_exam_subject_pixels_and_answer_are_one_source_occurrence(self):
        result,proof=self.run_case('TYT','Matematik')
        self.assertEqual(result,[]);self.assertEqual(proof['additionalSourceOccurrenceCount'],1)
        self.assertEqual(proof['existingIdDeletes'],0)

    def test_same_question_in_another_exam_remains_available_in_that_exam(self):
        result,proof=self.run_case('AYT','Matematik')
        self.assertEqual(len(result),1);self.assertEqual(proof['additionalSourceOccurrenceCount'],0)

    def test_another_verified_subject_is_not_silently_lost(self):
        result,_=self.run_case('TYT','Geometri')
        self.assertEqual(len(result),1)

    def test_a_different_printed_answer_remains_a_conflict_across_exams(self):
        result,proof=self.run_case('AYT','Matematik','B')
        self.assertEqual(result,[]);self.assertEqual(proof['reviewCount'],1)
        self.assertEqual(proof['additionalSourceOccurrenceCount'],0)


if __name__=='__main__':unittest.main()
