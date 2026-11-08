import copy
from pathlib import Path
import sys
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_mevcut_aktarim_kontrol import validate_link,provider_answers


class ExistingTransferTest(unittest.TestCase):
    def setUp(self):
        self.question={'code':'old-question','image':'old.webp','stamp':'17.1','correct_answer':'C'}
        self.link={'question_code':'old-question','page_number':2,'printed_numbers':[5],
            'evidence':{'sourceStamp':'17.1','image':'old.webp','answers':['C'],'answersA':['C'],'answersB':['C']}}
        self.image={'fileSha256':'actual'}

    def test_unchanged_saved_evidence_reuses_existing_id(self):
        before=copy.deepcopy(self.question)
        self.assertEqual(validate_link(self.link,self.question,self.image,'actual'),[])
        self.assertEqual(self.question,before)

    def test_legacy_image_reference_requires_actual_equal_source_and_bank_bytes(self):
        self.link['evidence']['image']='data/ogm/img/legacy/old.webp'
        self.assertEqual(validate_link(self.link,self.question,self.image,'actual','actual'),[])
        self.assertIn('SOURCE_AND_CURRENT_QUESTION_IMAGE_BYTES_NOT_PROVEN_EQUAL',validate_link(self.link,self.question,self.image,'actual','different'))

    def test_stale_question_and_changed_actual_image_require_review(self):
        self.question['stamp']='18.2'
        result=validate_link(self.link,self.question,self.image,'changed')
        self.assertIn('CURRENT_QUESTION_VERSION_DIFFERS',result);self.assertIn('CURRENT_QUESTION_IMAGE_BYTES_DIFFER',result)

    def test_missing_second_reading_or_answer_edition_conflict_cannot_pass(self):
        for value in [None,['A'],[],['C','C']]:
            with self.subTest(value=value):
                self.link['evidence']['answersB']=value
                self.assertIn('SAVED_PRINTED_SOURCE_READINGS_OR_CURRENT_ANSWER_DIFFER',validate_link(self.link,self.question,self.image,'actual'))

    def test_inactive_unknown_question_and_missing_source_position_do_not_pass(self):
        self.assertEqual(validate_link(self.link,None,self.image,None),['CURRENT_ACTIVE_YKS_QUESTION_MISSING'])
        self.link['printed_numbers']=[];self.link['page_number']=None
        result=validate_link(self.link,self.question,self.image,'actual')
        self.assertIn('PRINTED_QUESTION_NUMBER_EVIDENCE_MISSING',result);self.assertIn('SOURCE_PHYSICAL_PAGE_MISSING',result)

    def test_provider_evidence_requires_actual_printed_answer_page_and_current_api(self):
        self.link['evidence'].update(origin='PROVIDER_ID_PRINTED_SEQUENCE_AND_ANSWER',printedAnswer='C',apiAnswer='C',answers=None,answersA=None,answersB=None)
        proof={'nativePrintedAnswer':'C','currentOfficialApiAnswer':'C','nativePrintedPage':2}
        self.assertEqual(validate_link(self.link,self.question,self.image,'actual',provider_reading=proof),[])
        for key,value in [('nativePrintedAnswer','E'),('currentOfficialApiAnswer','A'),('nativePrintedPage',3)]:
            with self.subTest(key=key):
                changed={**proof,key:value};self.assertTrue(validate_link(self.link,self.question,self.image,'actual',provider_reading=changed))

    def test_official_provider_conflicting_id_never_selects_one_arbitrary_answer(self):
        structure=[{'uniteler':[{'kazanimlar':[{'sorular':{'css':[[20,1],[20,2],[21,5]]}}]}]}]
        self.assertEqual(provider_answers(structure),{'sb-20':None,'sb-21':'E'})


if __name__=='__main__':unittest.main()
