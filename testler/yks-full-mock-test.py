import copy
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_tam_deneme_anahtar import mock_identity,validate_saved
from yks_birlestirme import digest,write_json


class FullMockTest(unittest.TestCase):
    def test_body_key_and_exam_identity_must_agree(self):
        with pymupdf.open() as doc:
            doc.new_page().insert_text((35,40),'3. DENEME')
            page=doc.new_page();page.insert_text((35,40),'TYT 3. DENEME CEVAP ANAHTARI')
            self.assertEqual(mock_identity(doc,'TYT'),3)
            with self.assertRaises(ValueError):mock_identity(doc,'AYT')
        for header in ['TYT 2. DENEME CEVAP ANAHTARI','TYT CEVAP ANAHTARI']:
            with self.subTest(header=header),pymupdf.open() as doc:
                doc.new_page().insert_text((35,40),'3. DENEME');doc.new_page().insert_text((35,40),header)
                with self.assertRaises(ValueError):mock_identity(doc,'TYT')

    def test_saved_answers_and_actual_ocr_bytes_must_agree(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);source=root/'source.pdf';source.write_bytes(b'source');crop=root/'crop.png';crop.write_bytes(b'crop')
            file=root/'ocr.json';write_json(file,{'text':'1. A\n2. B\n3. C\n4. D','cropSha256':digest(crop),'modelSha256':'ocr-model'})
            answers=[{'number':n,'answer':a} for n,a in enumerate('ABCD',1)]
            section={'cropPath':str(crop),'cropSha256':digest(crop),'evidencePath':str(file),'keyEvidenceSha256':digest(file),
                'readingMethod':'NATIVE_PLUS_INDEPENDENT_RENDERED_SECTION_OCR','independentAnswers':copy.deepcopy(answers),
                'answers':answers,'status':'TWO_PRINTED_SOURCE_READINGS_AGREE'}
            row={'sourcePath':str(source),'sourceSha256':digest(source),'sections':[section]}
            with patch('yks_tam_deneme_anahtar.model_hash',return_value='ocr-model'):
                self.assertEqual(validate_saved(row,{}),row)
                row['sections'][0]['answers'][0]['answer']='E'
                with self.assertRaises(ValueError):validate_saved(row,{})
                row['sections'][0]['answers'][0]['answer']='A';crop.write_bytes(b'other crop')
                with self.assertRaises(ValueError):validate_saved(row,{})


if __name__=='__main__':unittest.main()
