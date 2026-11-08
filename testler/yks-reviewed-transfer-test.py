import copy
import hashlib
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_incelenmis_aktarim_kontrol import source_path,validate_saved_decision
from yks_birlestirme import digest,Store,read_json


class ReviewedTransferTest(unittest.TestCase):
    def test_actual_partial_source_review_reuses_only_28_existing_admissions(self):
        store=Store(Path(__file__).resolve().parents[1]/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
        report=read_json(root/'partial-reviewed-transfer-reuse/report.json');self.assertEqual(report['sourceLinks'],155)
        valid=[r for r in report['results'] if r['status']=='ORIGINAL_FROZEN_PARTIAL_SOURCE_ADMISSION_REVALIDATED_KEEP_ID']
        self.assertEqual(len(valid),28);self.assertEqual(report['questionBankWrites'],0)
        for row in valid:
            self.assertFalse(row['newQuestionOrTeacherApprovalWritten']);self.assertIsNone(row['issue'])
            self.assertEqual(digest(row['proof']['frozenReviewPath']),row['proof']['frozenReviewSha256'])
    def test_registered_paths_cannot_escape_evidence_roots(self):
        for name in ['veri/../../secret.json','C:/secret.json','unknown/package.json','veri-hatti/../../secret.json']:
            with self.subTest(name=name):
                with self.assertRaises(ValueError):source_path(name)

    def test_original_source_admission_requires_same_image_text_and_canonical_id(self):
        with tempfile.TemporaryDirectory() as temporary:
            file=Path(temporary)/'package.json';file.write_bytes(b'original-package')
            card={'code':'pdf-source-q1','text':'Source question text','answer':'C','answerMethodA':'C','answerMethodB':'C','imageSha256':'same-image'}
            decision={'decision':'NEW','sourceCode':card['code'],'packageSha256':digest(file),
                'sourceTextSha256':hashlib.sha256(card['text'].encode()).hexdigest(),'imageSha256':'same-image',
                'exam':'TYT','categoryIds':['registered-topic'],'teacherApproved':False}
            question={'code':card['code'],'correct_answer':'C','active':True,'exam_type':'TYT'}
            validate_saved_decision(decision,card,file,{'teacherApproved':False},question,'same-image')
            for field,value in [('code','other-code'),('correct_answer','E')]:
                with self.subTest(field=field):
                    with self.assertRaises(ValueError):validate_saved_decision(decision,card,file,{'teacherApproved':False},{**question,field:value},'same-image')
            with self.assertRaises(ValueError):validate_saved_decision(decision,card,file,{'teacherApproved':False},question,'different-image')
            file.write_bytes(b'changed-package')
            with self.assertRaises(ValueError):validate_saved_decision(decision,card,file,{'teacherApproved':False},question,'same-image')

    def test_frozen_review_does_not_authorize_fabricated_teacher_approval(self):
        with self.assertRaises(ValueError):validate_saved_decision({}, {},Path('unused'),{'teacherApproved':True},{},'')


if __name__=='__main__':unittest.main()
