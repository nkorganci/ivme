from copy import deepcopy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_konu_agaci import compile_tree

class NavigationCandidateTest(unittest.TestCase):
    def fixtures(self):
        old={'id':'old','exam':'TYT','subjectId':'biyoloji','subject':'Biyoloji','topic':'Hücre',
             'canonicalUnit':True,'canonicalTopic':True,'selectable':True,'origin':'CURRICULUM','order':4}
        node={'providerNodeId':'node','exam':'TYT','subjectId':'biyoloji','course':'Biyoloji (TYT)',
              'unit':'Hücre','title':'Hücre Zarı','proposedCategoryId':'new-fine-id','sourceUrl':'/subject/node',
              'sourcePath':['TYT','Biyoloji (TYT)','Hücre','Hücre Zarı'],
              'assets':[{'url':'https://source/pdf','storage_path':'test.pdf'}]}
        source={'kind':'FILE','root':'D:/workspace/mebi-yks','path':'test.pdf','sha256':'a'*64}
        # Root names use the host's Path grammar; use a native folder path in fixtures.
        source['root']=str(Path('mebi-yks').absolute())
        return {'issues':[],'providerNodes':[node]},[old],[source]
    def test_every_old_definition_and_review_fingerprint_is_preserved(self):
        crosswalk,categories,files=self.fixtures();before=deepcopy(categories)
        result=compile_tree(crosswalk,categories,files)
        self.assertEqual(result['categoryDefinitions'][0],before[0]);self.assertEqual(categories,before)
        self.assertFalse(result['readyForPublication']);self.assertEqual(result['studentProgressWritten'],0)
        self.assertEqual(result['newCategoryIds'],['new-fine-id'])
        self.assertFalse(result['categoryDefinitions'][1]['canonicalUnit'])
    def test_existing_identity_is_not_duplicated_or_redefined(self):
        crosswalk,categories,files=self.fixtures();crosswalk['providerNodes'][0]['proposedCategoryId']='old'
        value=compile_tree(crosswalk,categories,files)
        self.assertFalse(value['newCategoryIds']);self.assertEqual(len(value['categoryDefinitions']),1)
    def test_missing_assets_and_subject_scope_changes_fail_closed(self):
        crosswalk,categories,files=self.fixtures()
        with self.assertRaisesRegex(ValueError,'not present'):compile_tree(crosswalk,categories,[])
        crosswalk['providerNodes'][0]['proposedCategoryId']='old';crosswalk['providerNodes'][0]['exam']='AYT'
        with self.assertRaisesRegex(ValueError,'scope'):compile_tree(crosswalk,categories,files)
    def test_shared_course_name_alone_does_not_expand_all_topic_exam_scopes(self):
        crosswalk,categories,files=self.fixtures();crosswalk['providerNodes'][0]['course']='Biyoloji (TYT/AYT)'
        value=compile_tree(crosswalk,categories,files)
        self.assertEqual(value['navigation'][0]['units'][0]['topics'][0]['examScopes'],['TYT'])

    def test_explicit_counterpart_keeps_both_saved_ids_on_one_content_group(self):
        crosswalk,categories,files=self.fixtures()
        counterpart={**categories[0],'id':'ayt-kept','exam':'AYT'};categories.append(counterpart)
        node=crosswalk['providerNodes'][0];node['proposedCategoryId']='old'
        node.update(sharedContentKey='excel-row:explicit',existingCounterpartIds=['ayt-kept'])
        value=compile_tree(crosswalk,categories,files);topic=value['navigation'][0]['units'][0]['topics'][0]
        self.assertEqual(topic['examScopes'],['AYT','TYT'])
        self.assertEqual(topic['examCategoryIds'],{'TYT':['old'],'AYT':['ayt-kept']})
        self.assertEqual(value['categoryDefinitions'],categories)
        self.assertFalse(topic['savedProgressCopied'])

if __name__=='__main__':unittest.main(verbosity=2)
