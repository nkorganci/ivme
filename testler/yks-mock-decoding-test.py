from pathlib import Path
import sys
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_birlestirme import Store,read_json


class MockDecodingTest(unittest.TestCase):
    def test_actual_decoding_warnings_stay_open_even_with_a_verified_key(self):
        app=Path(__file__).resolve().parents[1];store=Store(app/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'pdf-on-tarama/mock-decoding/report.json')
        self.assertEqual(report['status'],'COMPLETE');self.assertEqual(report['documents'],46);self.assertEqual(report['pages'],2327)
        self.assertEqual(sum(r['pageCount'] for r in report['results']),2327)
        damaged=[r for r in report['results'] if any('zlib error' in str(i) for i in r['issues'])]
        self.assertEqual(len(damaged),1);self.assertEqual(damaged[0]['sourceSha256'],'f8bbb5b413ae271be2b96baeac1aa309577fe823cd8ad8c960706f3c731f8d58')
        self.assertTrue(any(i['page']==29 for i in damaged[0]['issues']))
        self.assertTrue(all(not r['bodyContentAccepted'] and not r['teacherApproved'] for r in report['results']))
        self.assertTrue(all(r['status']=='SOURCE_DECODING_REVIEW_REQUIRED' for r in report['results'] if r['issues']))


if __name__=='__main__':unittest.main()
