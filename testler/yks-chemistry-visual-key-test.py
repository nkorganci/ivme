from copy import deepcopy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json
from yks_kimya_gorsel_anahtar import validate_section_reading
from yks_kimya_gorsel_soru import bound_answer,validate_key,validate_prepared_source


class VisualChemistryKeyTest(unittest.TestCase):
    def setUp(self):
        self.question={'status':'INDIVIDUAL_ORIGINAL_NATIVE_AND_TWO_DPI_PIXELS_IDENTICAL','printedNumber':1,
            'pixels':[{'dpi':dpi,'equal':True,'sourceRgbSha256':'same','bookRgbSha256':'same'} for dpi in [180,330]]}
        self.key={'status':'CURRENT_OFFICIAL_NATIVE_AND_INDEPENDENT_QWEN_SECTION_KEY_AGREE',
            'nativePrintedAnswers':[{'number':1,'answer':'C'}],'independentPrintedAnswers':[{'number':1,'answer':'C'}]}

    def test_changed_questions_never_inherit_the_matching_section_key(self):
        self.assertEqual(bound_answer(self.question,self.key),'C')
        self.assertIsNone(bound_answer({**self.question,'status':'ORIGINAL_QUESTION_PIXELS_DIFFER'},self.key))
        self.assertIsNone(bound_answer(self.question,{**self.key,'status':'PRINTED_SOURCE_KEY_VISUAL_REVIEW_STILL_REQUIRED'}))

    def test_one_dpi_or_an_inconsistent_key_blocks_the_entire_binding(self):
        q=deepcopy(self.question);q['pixels'][1]['bookRgbSha256']='different'
        with self.assertRaises(ValueError):bound_answer(q,self.key)
        with self.assertRaises(ValueError):bound_answer({**self.question,'pixels':self.question['pixels'][:1]},self.key)
        with self.assertRaises(ValueError):bound_answer(self.question,{**self.key,'independentPrintedAnswers':[{'number':1,'answer':'A'}]})

    def test_whole_printed_sequence_must_match_without_fixing_ocr_numbers(self):
        native=[{'number':i,'answer':'A'} for i in range(1,16)]
        self.assertTrue(validate_section_reading(native,native))
        changed=deepcopy(native);changed[12]['number']=138
        self.assertFalse(validate_section_reading(native,changed));self.assertFalse(validate_section_reading(native,None))
        self.assertFalse(validate_section_reading([],[]))

    def test_actual_local_raw_image_reading_is_bound_to_the_current_official_section(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'partial-chemistry-visual-keys/progress.json')
        successful=[r for r in report['results'] if r['status']=='CURRENT_OFFICIAL_NATIVE_AND_INDEPENDENT_QWEN_SECTION_KEY_AGREE']
        self.assertTrue(successful);validate_key(successful[0])
        self.assertFalse(report['sourceQuestionAnswersBound']);self.assertFalse(report['fullTestKeyTransferred'])
        self.assertFalse(report['teacherApproved']);self.assertEqual(report['questionBankWrites'],0)

    def test_all_392_additional_bindings_are_current_and_disjoint_from_the_original_150(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        current=read_json(root/'partial-chemistry-visual-preparation/progress.json')
        self.assertEqual(current['status'],'COMPLETE');self.assertEqual(current['questionsPrepared'],392)
        old=read_json(root/'partial-chemistry-preparation/progress.json')
        old_sources={r['sourceSha256'] for r in old['results'] if r['status']=='PREPARED'}
        self.assertFalse(old_sources&{r['sourceSha256'] for r in current['results']})
        self.assertEqual(sum(validate_prepared_source(r) for r in current['results']),392)


if __name__=='__main__':unittest.main()
