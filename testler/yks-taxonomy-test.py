"""MEBI structural crosswalk must preserve IDs and refuse unsafe scope guesses."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_taxonomy import crosswalk, normalise, subject_options, scope_candidates
from yks_stages.stage_04 import assess


class TaxonomyCrosswalkTest(unittest.TestCase):
    def page(self, title='Hücre', course='Biyoloji (TYT)', unit='Hücre', node='one'):
        return {'url':'/student/section/subject-details/'+node,'path':['TYT',course,unit,title],'title':title,'assets':[]}

    def old(self, **kwargs):
        return {'id':'existing-topic','exam':'TYT','subjectId':'biyoloji','unit':'Hücre','topic':'Hücre',
                'canonicalUnit':True,'selectable':True,**kwargs}

    def test_exact_candidate_preserves_saved_id(self):
        value=crosswalk([self.page()],[self.old()])
        self.assertEqual(value['providerNodes'][0]['proposedCategoryId'],'existing-topic')
        self.assertEqual(value['legacyIdentities'][0]['id'],'existing-topic')
        self.assertFalse(value['published'])
        self.assertFalse(value['readyForPublication'])
        self.assertFalse(value['providerNodes'][0]['teacherApproved'])

    def test_same_named_other_subject_does_not_supply_identity(self):
        value=crosswalk([self.page()],[self.old(subjectId='kimya')])
        self.assertNotEqual(value['providerNodes'][0].get('proposedCategoryId'),'existing-topic')
        self.assertIn('existing-topic',value['unmatchedSelectableLegacyIds'])

    def test_ambiguous_old_name_does_not_pick_arbitrarily(self):
        value=crosswalk([self.page()],[self.old(),self.old(id='second')])
        self.assertEqual(value['providerNodes'][0]['action'],'REVIEW_AMBIGUOUS')
        self.assertFalse(value['readyForPublication'])

    def test_shared_course_name_alone_does_not_duplicate_ayt_topic(self):
        value=crosswalk([self.page(course='Felsefe (TYT/AYT)',title='Bilgi Felsefesi')],[self.old(subjectId='felsefe',topic='Bilgi Felsefesi')])
        self.assertEqual(len(value['providerNodes']),1)
        self.assertTrue(value['providerNodes'][0]['courseSuggestsBothExams'])
        self.assertNotIn('sharedContentKey',value['providerNodes'][0])

    def test_explicit_counterpart_row_supports_shared_content_without_merging_ids(self):
        a=self.old(excelRowId='same-row');b=self.old(id='ayt-id',exam='AYT',excelRowId='same-row')
        value=crosswalk([self.page()],[a,b])
        self.assertEqual(value['providerNodes'][0]['sharedContentKey'],'excel-row:same-row')
        self.assertEqual({r['id'] for r in value['legacyIdentities']},{'existing-topic','ayt-id'})

    def test_math_geometry_scope_requires_evidence(self):
        self.assertEqual(subject_options('Matematik (TYT)','Üçgenler',[self.old(subjectId='geometri',unit='Üçgenler')]),['geometri'])
        self.assertEqual(subject_options('Matematik (TYT)','Bilinmeyen',[]),['matematik','geometri'])
        self.assertEqual(subject_options('Matematik (TYT)','Üçgenin Alanı',[]),['geometri'])
        self.assertEqual(subject_options('Matematik (AYT)','Trigonometrik Fonksiyonlar',[]),['matematik'])

    def test_unit_scope_is_retained_without_copying_mastery_to_all_leaves(self):
        page=self.page(title='Hücre Zarı',unit='Hücre')
        value=assess([page],[self.old()])
        row=value['legacyIdentities'][0]
        self.assertEqual(row['mappingStatus'],'WIDER_OR_COUNTERPART_SCOPE_CANDIDATE')
        self.assertEqual(row['providerScopeCandidates'][0]['reason'],'EXACT_UNIT_TITLE_LEGACY_WIDER_THAN_LEAF')
        self.assertFalse(row['providerScopeCandidates'][0]['progressTransferAllowed'])

    def test_numbers_are_preserved_and_unknown_old_ids_are_not_deleted(self):
        self.assertNotEqual(normalise('1. Dereceden'),normalise('2. Dereceden'))
        value=crosswalk([self.page()],[self.old(),self.old(id='kpss-kept',exam='KPSS_OO_GY')])
        self.assertIn('kpss-kept',{r['id'] for r in value['legacyIdentities']})
        self.assertEqual(value['studentProgressChanged'],0)

    def test_every_unmatched_legacy_scope_is_explained_and_not_published(self):
        value=assess([self.page()],[self.old(), self.old(id='old-wide-scope',topic='Geniş kapsam'),
                                     self.old(id='kpss-kept',exam='KPSS_OO_GY')])
        rows={r['id']:r for r in value['legacyIdentities']}
        self.assertEqual(rows['old-wide-scope']['mappingStatus'],'RETAIN_LEGACY_SCOPE_FOR_REVIEW')
        self.assertEqual(rows['kpss-kept']['mappingStatus'],'OUT_OF_SCOPE_UNCHANGED')
        self.assertTrue(all(r['definitionSha256'] and r['explanation'] for r in rows.values()))
        self.assertTrue(value['identityPreservationVerified'])
        self.assertFalse(value['readyForPublication'])


if __name__=='__main__':unittest.main(verbosity=2)
