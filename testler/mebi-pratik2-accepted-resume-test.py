"""Later batches must not invalidate a previously accepted immutable delta."""
import sys
import json
import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import mebi_pratik2_arsiv_partisi as batch


class AcceptedResume(unittest.TestCase):
    def fixture(self,base):
        proof=base/'source.json';proof.write_text(json.dumps({'accepted':[{'code':'q1'}]}),encoding='utf8')
        folder=base/'verified-source-batch-019';folder.mkdir()
        (folder/'bank-acceptance.json').write_text(json.dumps({'status':'PASS','scope':'NEW_SOURCE_VERIFIED_ARCHIVE_BATCH',
            'sourceAcceptanceSha256':hashlib.sha256(proof.read_bytes()).hexdigest()}),encoding='utf8')
        return proof

    def test_accepted_batch_does_not_reimport_or_compare_against_later_bank_counts(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);self.fixture(base)
            with patch.object(batch,'BASE',base),patch.object(batch,'db_connection') as db,patch.object(batch.subprocess,'run') as command:
                batch.run('source.json','verified-source-batch-019')
                db.assert_not_called();command.assert_not_called()

    def test_a_changed_source_manifest_cannot_use_the_old_acceptance(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);proof=self.fixture(base);proof.write_text(json.dumps({'accepted':[{'code':'changed'}]}),encoding='utf8')
            with patch.object(batch,'BASE',base),self.assertRaises(ValueError):batch.run('source.json','verified-source-batch-019')


if __name__=='__main__':unittest.main()
