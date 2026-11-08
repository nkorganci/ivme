from pathlib import Path
import hashlib
import json
import sys
import tempfile
import unittest
from unittest.mock import patch,MagicMock

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_kanit_db import safe_json,selected_run_file,stable_read,restore_destination,records,raw_sha,archive_connection,verify_checkpoint


class EvidenceArchiveTest(unittest.TestCase):
    def test_raw_bytes_keep_nul_formula_and_invalid_model_response(self):
        data=b'{"text":"a\\u0000b \xe2\x88\x9a","response":"incomplete ["}'
        readable=safe_json(json.loads(data));self.assertEqual(readable['text'],'a\ufffdb √')
        self.assertEqual(raw_sha(data),hashlib.sha256(data).hexdigest());self.assertEqual(json.loads(data)['text'],'a\0b √')

    def test_credentials_checkout_backups_and_archive_self_are_not_ingested(self):
        root=Path('D:/run')
        for name in ['isolated-pilot/source-abcd/.codex/local-environment.json','isolated-pilot/source-abcd/.git/config',
            'database-archive/archive-report.json','yks-01/full/a/ivme.dump','yks-01/full/a/content.zip','x/.git/config']:
            self.assertFalse(selected_run_file(root/name,root),name)
        for name in ['question-topics/din/evidence.json','full-question-crops/a/question.webp','state.json']:
            self.assertTrue(selected_run_file(root/name,root),name)

    def test_raw_capture_and_restore_never_overwrite_original_evidence(self):
        with tempfile.TemporaryDirectory() as temporary:
            app=Path(temporary);source=app/'source.json';source.write_bytes(b'original\0bytes')
            self.assertEqual(stable_read(source),b'original\0bytes')
            with patch('yks_kanit_db.APP',app):
                with self.assertRaises(ValueError):restore_destination(source)
                target=app/'veri/yks-restored/new.json';self.assertEqual(restore_destination(target),target.resolve())
                target.parent.mkdir(parents=True);target.write_bytes(b'existing')
                with self.assertRaises(ValueError):restore_destination(target)

    def test_query_records_do_not_change_pending_or_conflicting_status(self):
        file='run/pdf-on-tarama/full-key-scan/verified-source-keys.json'
        data=json.dumps({'results':[{'sourceSha256':'a'*64,'status':'REVIEW_REQUIRED','sourceAnswers':None,'teacherApproved':False}]}).encode()
        with tempfile.TemporaryDirectory() as tmp:
            found=records({'files':[{'logicalPath':file,'sha256':raw_sha(data),'role':'RUN_PREPARATION_EVIDENCE'}]}, {file:data},Path(tmp))
        self.assertEqual(found[0][4],'REVIEW_REQUIRED');self.assertIsNone(found[0][-1]['sourceAnswers']);self.assertFalse(found[0][-1]['teacherApproved'])

    def test_app_database_is_not_a_valid_production_archive_target(self):
        with self.assertRaises(ValueError):archive_connection('ivme')

    def test_large_binary_readback_fetches_one_artifact_at_a_time(self):
        conn=MagicMock();cursor=MagicMock();conn.cursor.return_value.__enter__.return_value=cursor
        content=b'large raw archive bytes\0';sha=raw_sha(content)
        conn.execute.return_value.fetchone.side_effect=[{'summary':{'files':1,'sourceDocuments':1,'records':1}}, {'files':1,'sources':1,'records':1}]
        def iterate():
            self.assertEqual(cursor.itersize,1);self.assertIs(cursor.execute.call_args.kwargs.get('binary'),True)
            yield {'content':content,'byte_count':len(content),'sha256':sha}
        cursor.__iter__.side_effect=iterate
        result=verify_checkpoint(conn,'f'*64);self.assertEqual(result['distinctArtifactHashesReRead'],1)


if __name__=='__main__':unittest.main()
