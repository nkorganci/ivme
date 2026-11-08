from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json
from yks_ozet_belge_incele import review


class SummaryDocumentTest(unittest.TestCase):
    def test_complete_actual_summary_read_excludes_only_unkeyed_new_intake(self):
        s=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=s.child(s.current()['runId']);row=review(root)
        self.assertEqual(row,read_json(root/'new-source-discovery/explicit-document-review.json')['results'][0])
        self.assertEqual(len(row['pagesRead']),2);self.assertEqual(row['detectedQuestions'],1);self.assertEqual(row['newIntakeQuestionsEligible'],0)
        self.assertTrue(row['archiveDocumentPreserved']);self.assertFalse(row['globalKeyAbsenceClaimed']);self.assertFalse(row['documentFolderTopicCopiedToQuestion'])
        self.assertFalse(row['teacherApproved']);self.assertEqual(row['questionBankWrites'],0)


if __name__=='__main__':unittest.main()
