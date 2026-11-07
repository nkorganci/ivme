"""Exact source identity and partial-transfer decisions; no database/model calls."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from yks_stages.stage_03 import coverage_candidate, group_sources


class SourceGroupingTest(unittest.TestCase):
    def row(self, root, path, sha='same', inode=None):
        return {'root':root,'path':path,'kind':'FILE','sha256':sha,'bytes':100,'device':1,'inode':inode}

    def test_exact_copies_choose_mebi_metadata_without_losing_ogm_origin(self):
        groups=group_sources([self.row('/sources/ogm-materyal','other.pdf'),self.row('/sources/mebi-yks','TYT/one.pdf')],{}, {'TYT/one.pdf':{'title':'Topic'}})
        self.assertEqual(len(groups),1)
        self.assertEqual(groups[0]['canonicalCandidate']['root'],'/sources/mebi-yks')
        self.assertEqual(len(groups[0]['occurrences']),2)
        self.assertEqual(groups[0]['removableCopyCandidates'],1)
        self.assertFalse(groups[0]['deletionAuthorizedByStage'])

    def test_different_pdf_bytes_are_not_merged_by_matching_filename(self):
        groups=group_sources([self.row('/sources/one','same.pdf','first'),self.row('/sources/two','same.pdf','second')],{})
        self.assertEqual(len(groups),2)
        self.assertTrue(all(g['removableCopyCandidates']==0 for g in groups))

    def test_zip_and_hardlink_aliases_do_not_inflate_physical_copy_count(self):
        rows=[self.row('/sources/mebi-yks','one.pdf',inode=12),self.row('/sources/mebi-yks','alias.pdf',inode=12),
              {'root':'/sources/ogm','path':'book.zip','member':'book.pdf','kind':'ZIP_PDF','sha256':'same','bytes':100}]
        g=group_sources(rows,{})[0]
        self.assertEqual(g['distinctPhysicalFiles'],1)
        self.assertEqual(g['removableCopyCandidates'],0)
        self.assertEqual(g['alternatePaths'],1)
        self.assertEqual(g['zipOccurrences'],1)

    def test_a_few_existing_questions_do_not_mean_fully_transferred_pdf(self):
        old={'coverageState':'INCOMPLETE','expectedQuestions':40,'linkedQuestions':3,'pendingOccurrences':7}
        self.assertEqual(coverage_candidate(old),'PARTIAL_OR_REVIEW_REQUIRED')
        self.assertEqual(coverage_candidate(None),'NOT_PREVIOUSLY_ASSESSED')

    def test_conflicting_no_question_or_verified_evidence_requires_review(self):
        for old in [{'coverageState':'NO_QUESTIONS','expectedQuestions':0,'linkedQuestions':1},
                    {'coverageState':'VERIFIED','expectedQuestions':40,'linkedQuestions':39},
                    {'coverageState':'VERIFIED','expectedQuestions':40,'linkedQuestions':40,'pendingOccurrences':1}]:
            self.assertEqual(coverage_candidate(old),'PARTIAL_OR_REVIEW_REQUIRED')

    def test_valid_prior_evidence_stays_candidate_not_new_automatic_approval(self):
        old={'coverageState':'VERIFIED','expectedQuestions':40,'linkedQuestions':40,'pendingOccurrences':0}
        g=group_sources([self.row('/sources/ogm','book.pdf')],{'same':old})[0]
        self.assertEqual(g['processingCandidate'],'REUSE_TRANSFER_EVIDENCE_CANDIDATE')
        self.assertEqual(g['contentApproval'],'NOT_CHANGED')


if __name__=='__main__':unittest.main(verbosity=2)
