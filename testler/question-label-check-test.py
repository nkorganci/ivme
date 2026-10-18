import hashlib
import importlib.util
from pathlib import Path
import sys
import unittest

APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP / 'scripts'))


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, APP / 'scripts' / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


check = module('question_check', 'question-label-check.py')
inventory = module('question_inventory', 'content-label-inventory.py')


class QuestionCheckTest(unittest.TestCase):
    def test_imported_replacement_does_not_reuse_old_research_as_current(self):
        saved={'text_sha256':check.text_hash('same')}
        self.assertEqual(check.research_state(saved,{'original':{'text':'same'},'intake':{'kind':'QUESTION'}}),'RESEARCH_REQUIRES_REBINDING')
    def test_changed_research_text_is_stale_even_with_same_question_code(self):
        saved = {'code':'q1', 'text_sha256':check.text_hash('old')}
        self.assertEqual(check.research_state(saved, {'original':{'text':'new'}}), 'STALE_RESEARCH_TEXT')

    def test_image_review_requires_the_same_bytes(self):
        saved = {'text_sha256':check.text_hash('same'), 'inspection_status':'ASSISTANT_IMAGE_REVIEWED', 'image_sha256':'old-image'}
        current = {'original':{'text':'same'}}
        self.assertEqual(check.research_state(saved, current, 'new-image'), 'STALE_RESEARCH_IMAGE')
        self.assertEqual(check.research_state(saved, current, 'old-image'), 'CURRENT_SOURCE_EVIDENCE')

    def test_missing_original_text_is_not_a_current_review(self):
        saved = {'text_sha256':check.text_hash('')}
        self.assertEqual(check.research_state(saved, None), 'RESEARCH_SOURCE_REMOVED')
        self.assertEqual(check.research_state(saved, {}), 'RESEARCH_SOURCE_UNAVAILABLE')

    def test_recorded_book_page_does_not_invent_a_pdf_or_expose_answers(self):
        raw = {'id':'q1', 'sayfa':13, 'kitap_nolar':[1,1,False,-2], 'gorsel':'q1.webp',
               'cevaplar':['A'], 'kopyalar':[{'kitap':'TYT','sayfa':13,'cevap':'A'}]}
        record = inventory.source_record(raw, 'raw#q1')
        self.assertIsNone(record['file'])
        self.assertEqual(record['questionNumbers'], [1])
        self.assertNotIn('cevaplar', record)
        self.assertNotIn('cevap', record['bookReferences'][0])


if __name__=='__main__':
    unittest.main()
