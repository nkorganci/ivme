from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_kirpim_geometri_kontrol import containments
from yks_birlestirme import Store,read_json


class SourceContainmentTest(unittest.TestCase):
    def test_a_full_next_question_cannot_be_treated_as_a_continuation(self):
        a={'code':'q24','sourceSha256':'source','pdfPage':1,'bboxPt':[0,10,10,20],
            'sourceRegions':[{'pdfPage':1,'bboxPt':[10,0,20,10],'role':'ORIGINAL_LAST_LEFT_QUESTION_CONTINUES_AT_TOP_OF_RIGHT_COLUMN'}]}
        b={'code':'q26','sourceSha256':'source','pdfPage':1,'bboxPt':[10,0,20,10]}
        flags,_=containments([a,b]);self.assertEqual(flags[0]['otherQuestionCode'],'q26')

    def test_unlabelled_shared_figure_does_not_become_a_second_question_body(self):
        cards=[{'code':'q'+str(i),'sourceSha256':'source','bboxPt':[0,i*10,10,i*10+9],
            'sourceRegions':[{'pdfPage':1,'bboxPt':[0,0,10,9]},{'pdfPage':1,'bboxPt':[0,i*10,10,i*10+9]}]} for i in [1,2]]
        self.assertEqual(containments(cards)[0],[])

    def test_actual_old_q24_defect_is_detected_and_the_amended_version_is_clear(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'source-crop-geometry/report.json')
        self.assertEqual(report['status'],'PASS');self.assertEqual(report['currentVersionFlags'],[])
        self.assertTrue(any(q['sourceCode']=='mebi-din-book-3294337d6b62-t1-q24' and q['otherQuestionCode'].endswith('-q26') for q in report['originalVersionFlags']))
        self.assertFalse(report['teacherApproved']);self.assertEqual(report['newRenders'],0)


if __name__=='__main__':unittest.main()
