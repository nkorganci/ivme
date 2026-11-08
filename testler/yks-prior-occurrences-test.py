from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_kismi_kaynak_aktarimlari import intake_action,evidence_path,compatible_identity


class PriorOccurrenceTest(unittest.TestCase):
    def test_progress_only_code_changes_reuse_cache_but_sources_and_semantics_do_not(self):
        own=str(Path(__file__).resolve().parents[1]/'scripts/yks_kismi_kaynak_aktarimlari.py')
        old={'version':'v1','readerFiles':{own:'old','validator.py':'same'},'bank':'current'}
        current={'version':'v1','readerFiles':{own:'new','validator.py':'same'},'bank':'current'}
        self.assertTrue(compatible_identity(old,current))
        current['version']='v2';self.assertFalse(compatible_identity(old,current))
        current['version']='v1';current['bank']='changed';self.assertFalse(compatible_identity(old,current))
    def test_changed_answers_do_not_create_a_second_canonical_question(self):
        link={'status':'LINKED','question_code':'existing'}
        self.assertEqual(intake_action(link,{'correct_answer':'D'}),'KEEP_EXISTING_CANONICAL_ID_DO_NOT_REIMPORT')
        self.assertEqual(intake_action(link,None),'OLD_LINK_INACTIVE_OR_NON_YKS_KEEP_HISTORY_REVIEW_ONLY')

    def test_original_pending_and_exclusion_are_never_automatically_accepted(self):
        for status in ['CANDIDATE','NEEDS_REVIEW']:
            self.assertEqual(intake_action({'status':status},None),'RESUME_ORIGINAL_PENDING_LOCATOR_NO_SECOND_QUESTION_QUEUE')
        self.assertEqual(intake_action({'status':'EXCLUDED'},None),'KEEP_PRIOR_EXCLUSION_NO_NEW_INTAKE')

    def test_external_reference_cannot_read_credentials_or_escape_source_evidence(self):
        for path in ['veri-hatti/../../pipeline/.env','veri/../../pipeline/.env','veri/config/credentials.json','https://example.com/key.json']:
            with self.assertRaises(ValueError):evidence_path(path)
        path=evidence_path('veri-hatti/ogm-sorular/kayit/3a-tyt-turkce.json#id=old')
        self.assertEqual(path.name,'3a-tyt-turkce.json')


if __name__=='__main__':unittest.main()
