"""Reuse actual source transcriptions, not just their cached status summary."""
import sys
import json
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_deneme_kanit_uyarlama import pairs,validate_independent_section


class FullMockReuse(unittest.TestCase):
    def test_empty_duplicate_or_invalid_answers_are_not_a_key(self):
        self.assertIsNone(pairs([]))
        self.assertIsNone(pairs([{'number':1,'answer':'A'},{'number':1,'answer':'B'}]))
        self.assertIsNone(pairs([{'number':1,'answer':'X'}]))

    def test_actual_ocr_transcript_must_agree_with_both_saved_readings(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'proof.json';answers=[{'number':i,'answer':c} for i,c in enumerate('ABCD',1)]
            section={'evidencePath':str(path),'cropSha256':'pixels','readingMethod':'NATIVE_PLUS_INDEPENDENT_OCR',
                     'answers':answers,'independentAnswers':answers}
            path.write_text(json.dumps({'cropSha256':'pixels','text':'1-A\n2-B\n3-C\n4-D'}),encoding='utf8')
            validate_independent_section(section)
            path.write_text(json.dumps({'cropSha256':'pixels','text':'1-A\n2-C\n3-C\n4-D'}),encoding='utf8')
            with self.assertRaises(ValueError):validate_independent_section(section)

    def test_transcription_of_another_image_cannot_be_reused(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'proof.json';answers=[{'number':1,'answer':'A'}]
            path.write_text(json.dumps({'cropSha256':'different','text':'1-A'}),encoding='utf8')
            section={'evidencePath':str(path),'cropSha256':'pixels','readingMethod':'NATIVE_PLUS_INDEPENDENT_OCR',
                     'answers':answers,'independentAnswers':answers}
            with self.assertRaises(ValueError):validate_independent_section(section)

    def test_incomplete_vision_response_does_not_inherit_a_success_summary(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'proof.json';answers=[{'number':1,'answer':'A'}]
            proof={'identity':{'cropSha256':'pixels'},'response':{'done':True,'response':json.dumps({'incomplete':True,'answers':answers})}}
            path.write_text(json.dumps(proof),encoding='utf8')
            section={'evidencePath':str(path),'cropSha256':'pixels','readingMethod':'NATIVE_PLUS_INDEPENDENT_QWEN_SECTION_IMAGE',
                     'answers':answers,'independentAnswers':answers}
            with self.assertRaises(ValueError):validate_independent_section(section)


if __name__=='__main__':unittest.main()
