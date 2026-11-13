"""A VISUAL_REQUIRED marker is never completeness proof, even in old workers."""
import json
import hashlib
import tempfile
import sys
import unittest
from pathlib import Path
from unittest.mock import patch,MagicMock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import mebi_pratik2_son_piksel_kapisi as gate


class BodyShortcut(unittest.TestCase):
    def fixture(self,base):
        image=base/'body.png';image.write_bytes(b'original pixels')
        return {'code':'source-q1','image':'body.png','imageSha256':hashlib.sha256(image.read_bytes()).hexdigest(),
                'bodyPage':1,'bodyModelReview':{'status':'DETERMINISTIC_NATIVE_BODY_PROVED','basis':{'status':'LOCAL_VISUAL_BODY_REVIEW_REQUIRED'}}}

    def test_invalid_native_marker_requires_actual_visual_review_and_failure_is_retained(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);row=self.fixture(base);module=MagicMock()
            module.ask.return_value=({'one_question':True,'all_five_choices_visible':False,'uncertainty':False},False)
            with patch.object(gate,'BASE',base),patch('mebi_pratik2_native_govde.prove',return_value=None),patch('mebi_pratik2_genisletilmis_kabul.vision',return_value=module):
                fixed,reasons=gate.validate_legacy_shortcut(row,[None],base)
                self.assertTrue(reasons);self.assertEqual(fixed['bodyModelReview']['status'],'REVIEW_REQUIRED')
                gate.validate_legacy_shortcut(row,[None],base)
                self.assertEqual(module.ask.call_count,1)

    def test_complete_native_source_proof_does_not_enter_repair(self):
        row={'bodyModelReview':{'status':'DETERMINISTIC_NATIVE_BODY_PROVED','basis':{'status':'FULL_NATIVE_TEXT_NO_SHARED_CONTEXT_OR_GRAPHICS'}}}
        fixed,reasons=gate.validate_legacy_shortcut(row,None,None)
        self.assertIs(fixed,row);self.assertFalse(reasons)

    def test_strict_native_v2_can_replace_the_invalid_shortcut(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);row=self.fixture(base)
            proof={'status':'DETERMINISTIC_NATIVE_BODY_PROVED','imageSha256':row['imageSha256'],'method':'STRICT_NATIVE_V2'}
            with patch.object(gate,'BASE',base),patch('mebi_pratik2_native_govde.prove',return_value=proof):
                fixed,reasons=gate.validate_legacy_shortcut(row,[None],base)
            self.assertFalse(reasons);self.assertEqual(fixed['bodyModelReview']['method'],'STRICT_NATIVE_V2')
            self.assertEqual(fixed['priorBodyCompletenessEvidence'],row['bodyModelReview'])


if __name__=='__main__':unittest.main()
