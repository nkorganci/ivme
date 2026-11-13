"""Keep live writers intact and resume only completed dependency boundaries."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import mebi_pratik2_zincir_gozetmeni as supervisor


class ChainSupervisor(unittest.TestCase):
    def test_existing_writer_is_never_restarted_even_after_three_attempts(self):
        self.assertEqual(supervisor.decide(False,True,True,3),'EXISTING_WRITER_RUNNING')

    def test_unmet_dependency_cannot_start_a_publisher(self):
        self.assertEqual(supervisor.decide(False,False,False,0),'WAITING_FOR_DEPENDENCY')

    def test_restarts_are_bounded_and_completed_receipts_are_preserved(self):
        self.assertEqual(supervisor.decide(False,False,True,2),'READY_TO_RESUME')
        self.assertEqual(supervisor.decide(False,False,True,3),'RESTART_LIMIT_REQUIRES_REVIEW')
        self.assertEqual(supervisor.decide(True,False,True,3),'COMPLETE')

    def test_evidence_completion_cannot_authorize_a_publisher_dependency(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);folder=base/'example';folder.mkdir()
            (folder/'pass-result.json').write_text(json.dumps({'status':'PREPARED_TOPIC_PENDING_EVIDENCE_PASS_COMPLETE_NOT_ARCHIVE_ACCEPTANCE',
                'publishedThroughExistingGuardedPipeline':False,'candidateBodies':1}),encoding='utf8')
            (folder/'chapter-packages.json').write_text(json.dumps({'items':[{}]}),encoding='utf8')
            with patch.object(supervisor,'BASE',base):
                with self.assertRaises(ValueError):supervisor.checkpoint('example','publisher')
                self.assertTrue(supervisor.checkpoint('example','evidence'))


if __name__=='__main__':unittest.main()
