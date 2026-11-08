from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json
from yks_tam_kaynak_kontrol import verified_keys,key_scope
from yks_tam_ayri_anahtar_gorsel import eligible
from yks_tam_soru_kirpim import key_identity

APP=Path(__file__).resolve().parents[1]


class FullSourceKeyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        store=Store(APP/'veri/yks-birlestirme');cls.root=store.child(store.current()['runId'])
        cls.rows=verified_keys(cls.root)

    def test_all_259_actual_source_key_proofs_revalidate_without_model_calls_or_writes(self):
        self.assertEqual(len(self.rows),259)
        self.assertEqual(sum(len(r['sourceAnswers']) for r in self.rows),4846)
        self.assertTrue(all(r['status']=='SOURCE_KEY_VERIFIED' and not r['teacherApproved'] for r in self.rows))
        self.assertTrue(all(not r['questionBankWrites'] for r in self.rows))

    def test_changed_answer_and_wrong_test_identity_cannot_inherit_a_verified_key(self):
        row=next(r for r in self.rows if r['sourceSha256']!=r['sourceKeyDocumentSha256'] and r.get('fullQuestionBodyTextAndPixelsEqual'))
        changed=[dict(a) for a in row['sourceAnswers']];changed[0]['answer']='E' if changed[0]['answer']!='E' else 'A'
        for altered in [{**row,'sourceAnswers':changed},{**row,'testNumber':row['testNumber']+100},
                {**row,'fullQuestionBodyTextAndPixelsEqual':False}]:
            with self.assertRaises(ValueError):key_scope(altered)

    def test_partial_or_different_body_cannot_become_a_visual_key_candidate(self):
        row={'status':'SEPARATE_KEY_PRINTED_READINGS_DISAGREE_REVIEW_REQUIRED',
            'fullQuestionBodyTextAndPixelsEqual':True,'bodyNumberProof':{'status':'PASS'},'bodyChecks':[{'matches':True}]}
        self.assertTrue(eligible(row))
        self.assertFalse(eligible({**row,'bodyChecks':[{'matches':False}]}))
        self.assertFalse(eligible({**row,'fullQuestionBodyTextAndPixelsEqual':False}))

    def test_crop_cache_ignores_execution_statistics_but_binds_answers_and_key_proof(self):
        row=self.rows[0]
        self.assertEqual(key_identity(row),key_identity({**row,'newOcrCalls':999,'cacheHit':True}))
        self.assertNotEqual(key_identity(row),key_identity({**row,'keyEvidenceSha256':'changed'}))


if __name__=='__main__':unittest.main()
