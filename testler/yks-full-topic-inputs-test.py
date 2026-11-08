import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_konu_girdileri import mock_binding,full_inputs,load_bound_cards
from yks_birlestirme import Store,read_json


class FullTopicInputsTest(unittest.TestCase):
    def setUp(self):
        self.card={'sourceSha256':'source','printedNumber':36}
        self.scope={'sourceSha256':'source','printedNumber':36,'sectionId':'AYT:2',
            'printedRange':{'first':35,'last':40,'allowedSubjectIds':['din']}}

    def test_single_printed_discipline_binds_only_its_source_and_question_range(self):
        self.assertEqual(mock_binding(self.card,self.scope,Path('proof.json'),'sha')['subjectId'],'din')
        self.scope['sourceSha256']='other'
        self.assertIsNone(mock_binding(self.card,self.scope,Path('proof.json'),'sha'))
        self.scope['sourceSha256']='source';self.scope['printedRange']['last']=35
        self.assertIsNone(mock_binding(self.card,self.scope,Path('proof.json'),'sha'))

    def test_combined_philosophy_and_math_geometry_are_not_assigned_by_exam_defaults(self):
        for subjects in [['matematik','geometri'],['felsefe','psikoloji','sosyoloji','mantik']]:
            self.scope['printedRange']['allowedSubjectIds']=subjects
            self.assertIsNone(mock_binding(self.card,self.scope,Path('proof.json'),'sha'))
        self.assertIsNone(mock_binding(self.card,None,Path('proof.json'),'sha'))

    def test_actual_din_inputs_keep_printed_bindings_and_exclude_unbound_book_sections(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        cards,packages,bindings,inputs,deferred=full_inputs(root,'din')
        self.assertTrue(len(cards)>1000);self.assertTrue(bindings);self.assertTrue(deferred)
        self.assertTrue(all(c['subjectId']=='din' for c in cards))
        self.assertFalse(any('-0d71ed945447-t5-' in c['code'] or '-3294337d6b62-t10-' in c['code'] for c in cards))
        loaded=load_bound_cards({'questionPackages':packages,'sourceCardBindings':bindings})
        self.assertTrue(all(loaded[c['code']]['subjectId']=='din' for c in cards))


if __name__=='__main__':unittest.main()
