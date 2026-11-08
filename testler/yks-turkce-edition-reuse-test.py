from pathlib import Path
import sys
import unittest
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_turkce_nusha import old_occurrence_state,outside_change_proof,BODY_CODE,KEY_CODE
from yks_birlestirme import Store,read_json,digest


class IncrementalEditionTest(unittest.TestCase):
    def setUp(self):
        self.raw={'id':'old-id','sayfa':3,'nolar':[1]}
        self.link={'status':'LINKED','page_number':3,'printed_numbers':[1],
            'evidence':{'sourceStamp':'7','sourceCode':'old-id','answers':['A'],'answersA':['A'],'answersB':['A']}}
        self.bank={'stamp':'7','correct_answer':'A'}

    def test_pending_original_work_does_not_become_a_new_or_accepted_question(self):
        self.link['status']='CANDIDATE'
        self.assertEqual(old_occurrence_state(self.raw,self.link,self.bank,True),'REUSE_OLD_PENDING_WORK_NO_SECOND_QUESTION_QUEUE')

    def test_current_id_requires_stamp_image_key_and_locator(self):
        self.assertTrue(old_occurrence_state(self.raw,self.link,self.bank,True).startswith('CURRENT_LINKED'))
        self.assertIn('REVIEW_REQUIRED',old_occurrence_state(self.raw,self.link,self.bank,False))
        self.bank['correct_answer']='B'
        self.assertIn('REVIEW_REQUIRED',old_occurrence_state(self.raw,self.link,self.bank,True))
        self.bank.update(stamp='8',correct_answer='A')
        self.assertIn('VERSION_REVIEW_REQUIRED',old_occurrence_state(self.raw,self.link,self.bank,True))

    def test_changes_outside_declared_question_rectangle_are_not_reusable(self):
        with pymupdf.open() as a,pymupdf.open() as b:
            x=a.new_page();y=b.new_page()
            for p in [x,y]:p.insert_text((40,100),'A source question')
            y.draw_rect((300,400,340,440),fill=(0,0,0))
            r=outside_change_proof(x,y,[30,70,250,150])
            self.assertEqual(r['status'],'ADDITIONAL_SOURCE_DIFFERENCE_REVIEW_REQUIRED')
            self.assertTrue(all(v['outsideChangedRegionPixels']>0 for v in r['resolutions']))

    def test_actual_source_reuses_both_old_ids_and_pending_work_without_answer_overwrite(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'source-page-equivalence/3adim-turkce/incremental-reuse.json')
        self.assertEqual(report['status'],'PASS');self.assertEqual(report['rawCards'],1397)
        self.assertEqual(report['oldOccurrenceStates'],{'LINKED':1309,'CANDIDATE':86,'NEEDS_REVIEW':2})
        self.assertEqual(report['states']['REUSE_OLD_PENDING_WORK_NO_SECOND_QUESTION_QUEUE'],88)
        rows={r['sourceCode']:r for r in report['results']}
        self.assertEqual(rows[BODY_CODE]['editionReuseState'],'CHANGED_QUESTION_BODY_KEEP_SEPARATE_SOURCE_EDITION')
        self.assertEqual(rows[KEY_CODE]['currentCanonicalQuestion']['correct_answer'],'E')
        self.assertEqual([k['answers'][0]['answer'] for k in report['changedKeyReadings']],['E','D'])
        for k in report['changedKeyReadings']:
            self.assertEqual(k['answers'],k['independentAnswers']);self.assertEqual(digest(k['cropPath']),k['cropSha256'])
        for r in report['sourceRegionProofs']:
            self.assertTrue(all(x['outsideChangedRegionPixels']==0 for x in r['resolutions']))
        self.assertEqual(report['questionBankWrites'],0);self.assertFalse(report['sourceFullyAccepted'])


if __name__=='__main__':unittest.main()
