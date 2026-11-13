"""A topic-pending source-evidence pass must not repeat a frozen publisher job."""
import sys
import unittest
import tempfile
import json
import hashlib
import pymupdf
from unittest.mock import patch,MagicMock
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from mebi_pratik2_konu_bekleyen_kanit import select_rows
import mebi_pratik2_konu_bekleyen_kanit as worker


class PendingEvidence(unittest.TestCase):
    def test_verified_answer_body_stays_offline_and_failed_body_keeps_its_reason(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);original=base/'original.pdf'
            with pymupdf.open() as pdf:pdf.new_page();pdf.save(original)
            sha=hashlib.sha256(original.read_bytes()).hexdigest()
            image=base/'body.png';image.write_bytes(b'original-crop');image_sha=hashlib.sha256(image.read_bytes()).hexdigest()
            rows=[{'code':code,'sourceSha256':sha,'relativePath':'original.pdf','image':'body.png','imageSha256':image_sha,
                   'keyImage':'body.png','keyImageSha256':image_sha,'groupId':'g1','printedNumber':n,'answer':answer}
                  for code,n,answer in [('q1',1,'A'),('q2',2,'B')]]
            package={'items':rows,'keyGroups':[{'groupId':'g1','keyIdentityType':'EXPLICIT_TEST','answers':{'1':'A','2':'B'}}]}
            out=base/'evidence';out.mkdir();module=MagicMock()
            with patch.object(worker,'BASE',base),patch.object(worker,'SOURCE',base),patch.object(worker,'OUT',out),\
                 patch.object(worker,'prepare',return_value=package),patch.object(worker,'vision',return_value=module),\
                 patch.object(worker,'read_key',return_value={'status':'AGREES'}) as key,\
                 patch.object(worker.admission,'OUT',out),\
                 patch.object(worker.admission,'body_read',side_effect=[{'status':'MODEL_NO_VISIBLE_ISSUE'},{'status':'REVIEW_REQUIRED'}]):
                worker.run();self.assertEqual(key.call_count,1)
            first=json.loads((out/'candidate-evidence/q1.json').read_text(encoding='utf8'))
            second=json.loads((out/'candidate-evidence/q2.json').read_text(encoding='utf8'))
            self.assertEqual(first['status'],'ANSWER_BODY_VERIFIED_FINE_TOPIC_REVIEW_REQUIRED')
            self.assertIn('BODY_COMPLETENESS_NOT_CONFIRMED',second['reasons'])
            for row in (first,second):
                self.assertFalse(row['productionImportAllowed']);self.assertFalse(row['studentVisible']);self.assertEqual(row['questionWrites'],0)
            self.assertFalse(json.loads((out/'pass-result.json').read_text(encoding='utf8'))['publishedThroughExistingGuardedPipeline'])

    def test_corrected_physical_evidence_preserves_the_candidate_code(self):
        old={'code':'q1','image':'old.png','keyImage':'key.png'}
        new={'code':'q1','image':'corrected.png','keyImage':'key.png'}
        self.assertEqual(select_rows([old,new],set()),[new])

    def test_frozen_publisher_and_already_admitted_codes_are_not_repeated(self):
        row={'code':'q1','image':'body.png','keyImage':'key.png'}
        self.assertEqual(select_rows([row],{'q1'}),[])

    def test_missing_body_pixels_are_not_called_evidence_ready(self):
        self.assertEqual(select_rows([{'code':'q1','keyImage':'key.png'}],set()),[])


if __name__=='__main__':unittest.main()
