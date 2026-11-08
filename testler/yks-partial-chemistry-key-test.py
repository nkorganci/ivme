from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_kimya_kismi_anahtar import answer_for_question
from yks_birlestirme import Store,read_json,digest


class IndividualQuestionKeyTest(unittest.TestCase):
    def test_actual_preparation_binds_only_150_identical_questions_not_the_changed_test(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        proof=read_json(root/'partial-chemistry-preparation/current-source-verification.json')
        self.assertEqual(proof['status'],'PASS');self.assertEqual(proof['questions'],150)
        progress=read_json(root/'partial-chemistry-preparation/progress.json');self.assertEqual(digest(root/'partial-chemistry-preparation/progress.json'),proof['sourcePreparationSha256'])
        codes=[]
        for source in progress['results']:
            if source['status']!='PREPARED':continue
            self.assertFalse(source['fullTestAccepted']);key=source['keyReading'];answers={r['number']:r['answer'] for r in key['nativeAnswers']}
            self.assertEqual(key['nativeAnswers'],key['independentAnswers'])
            for card in read_json(source['package'])['cards']:
                self.assertEqual(card['answer'],answers[card['printedNumber']]);self.assertFalse(card['importAccepted'])
                self.assertEqual(card['individualEditionProof']['status'],'INDIVIDUAL_ORIGINAL_NATIVE_AND_TWO_DPI_PIXELS_IDENTICAL')
                codes.append(card['code'])
        self.assertEqual(len(codes),150);self.assertEqual(len(set(codes)),150)

    def setUp(self):
        self.question={'status':'INDIVIDUAL_ORIGINAL_NATIVE_AND_TWO_DPI_PIXELS_IDENTICAL','printedNumber':2,
            'pixels':[{'dpi':d,'sourceRgbSha256':'same','bookRgbSha256':'same'} for d in [180,330]]}
        answers=[{'number':1,'answer':'A'},{'number':2,'answer':'C'}]
        self.key={'status':'NATIVE_AND_INDEPENDENT_RENDERED_SECTION_KEY_AGREE','nativeAnswers':answers,'independentAnswers':answers}

    def test_changed_question_in_same_test_never_receives_the_old_book_key(self):
        self.assertEqual(answer_for_question(self.question,self.key),'C')
        self.question['status']='NATIVE_QUESTION_CONTENT_DIFFERS';self.assertIsNone(answer_for_question(self.question,self.key))

    def test_key_disagreement_or_one_pixel_proof_cannot_bind_an_answer(self):
        self.key['status']='PRINTED_SECTION_KEY_READINGS_DISAGREE_NO_INTAKE';self.assertIsNone(answer_for_question(self.question,self.key))
        self.key['status']='NATIVE_AND_INDEPENDENT_RENDERED_SECTION_KEY_AGREE';self.question['pixels'].pop()
        with self.assertRaises(ValueError):answer_for_question(self.question,self.key)

    def test_whole_section_two_readings_must_agree_before_any_answer_is_used(self):
        self.key['independentAnswers']=[{'number':1,'answer':'B'},{'number':2,'answer':'C'}]
        with self.assertRaises(ValueError):answer_for_question(self.question,self.key)


if __name__=='__main__':unittest.main()
