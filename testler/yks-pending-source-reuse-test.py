from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_bekleyen_tekrar_kontrol import classify_relation,old_location_id
from yks_birlestirme import Store,read_json,digest


class PendingSourceReuseTest(unittest.TestCase):
    def test_actual_old_pending_math_answer_conflict_and_contaminated_crop_stay_excluded(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        result=read_json(root/'pending-source-reuse/actual-pending-image-review.json')
        self.assertFalse(result['newQuestionAdmissionAllowed']);self.assertFalse(result['printedAnswerConflictResolved'])
        self.assertTrue(result['oldCropRequiresRecropBeforeAnyFutureAdmission'])
        for reading in result['sourceImageReadings']:self.assertEqual(digest(reading['path']),reading['sha256'])
        self.assertEqual(sorted(x['oldSourceAnswer'] for x in result['originalPendingRelations']),['A','C'])

    def setUp(self):
        self.text='1. Bu paragraf hangi düşünceyi savunur? A) Bir B) İki C) Üç D) Dört E) Beş'
        self.card={'sourceSha256':'new','pdfPage':1,'printedNumber':1,'text':self.text,'answer':'B'}
        self.old={'sourceSha256':'old','sourceLocator':'raw:old-id','sourceCode':'old-id','physicalPage':12,
            'printedNumbers':[7],'text':self.text,'sourceAnswer':'B','oldOccurrenceStatus':'CANDIDATE','existingCanonicalCode':None}

    def test_older_pending_question_is_not_new_even_in_another_source_pdf(self):
        result=classify_relation(self.card,self.old);self.assertIn('RESUME_OLD_LOCATOR',result['status']);self.assertFalse(result['newIntakeAllowed'])

    def test_ambiguous_same_locator_and_disagreeing_answer_remain_excluded(self):
        self.old['sourceAnswer']='C';result=classify_relation(self.card,self.old);self.assertIn('CONFLICT',result['status'])
        self.old.update(sourceSha256='new',physicalPage=1,printedNumbers=[1],text='incomplete')
        result=classify_relation(self.card,self.old);self.assertIn('BODY_CONFLICT_OR_INCOMPLETE',result['status']);self.assertFalse(result['newIntakeAllowed'])

    def test_answerless_pending_region_never_inherits_an_automatic_answer(self):
        self.old['sourceAnswer']=None;result=classify_relation(self.card,self.old)
        self.assertIn('ANSWER_NOT_VERIFIED',result['status']);self.assertIsNone(result['oldSourceAnswer'])
        self.old['sourceSha256']='second';self.assertNotEqual(old_location_id(self.old),'old:raw:old-id')


if __name__=='__main__':unittest.main()
