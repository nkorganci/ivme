"""Source content ambiguity remains visible without changing live questions."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_guncel_kuyruk import apply_content_holds
from mebi_pratik2_arsiv_kararlari import review_category


class ContentHoldTests(unittest.TestCase):
    def fixture(self,folder):
        row={'code':'question','imageSha256':'original','reasons':['TOPIC_PENDING']}
        hold={'code':'question','imageSha256':'original','teacherApproved':False,
              'reason':'SOURCE_CONTENT_MULTIPLE_POTENTIALLY_FALSE_OPTIONS','note':'Two potentially false options require review.'}
        path=folder/'holds.json';path.write_text(json.dumps({'heldReviews':[hold]}))
        return {'question':row},path

    def test_ambiguous_content_exports_its_reason_without_teacher_or_visibility(self):
        with tempfile.TemporaryDirectory() as name:
            rows,path=self.fixture(Path(name));apply_content_holds(rows,{},set(),[path])
            row=rows['question']
            self.assertEqual(review_category(row['reasons']),'KAYNAK_ICERIK_TUTARLILIGI')
            self.assertEqual(row['sourceContentReview'],'Two potentially false options require review.')
            self.assertFalse(row['studentVisible']);self.assertFalse(row['teacherApproved'])

    def test_live_or_source_accepted_candidates_cannot_be_silently_reclassified(self):
        with tempfile.TemporaryDirectory() as name:
            for accepted,published in [({'question':{}},set()),({}, {'question'})]:
                rows,path=self.fixture(Path(name))
                with self.assertRaises(ValueError):apply_content_holds(rows,accepted,published,[path])

    def test_different_crop_cannot_inherit_the_hold(self):
        with tempfile.TemporaryDirectory() as name:
            rows,path=self.fixture(Path(name));rows['question']['imageSha256']='changed'
            with self.assertRaises(ValueError):apply_content_holds(rows,{},set(),[path])


if __name__=='__main__':unittest.main()
