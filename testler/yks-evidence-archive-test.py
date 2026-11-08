from pathlib import Path
import hashlib
import json
import sys
import tempfile
import unittest
from unittest.mock import patch,MagicMock

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from yks_kanit_db import safe_json,selected_run_file,stable_read,restore_destination,records,raw_sha,archive_connection,verify_checkpoint,validate_topic_embedding,signature


class EvidenceArchiveTest(unittest.TestCase):
    def test_image_only_source_cards_keep_identity_and_are_not_admitted(self):
        name='run/physics-summary-five-body-preparation-v2/candidates.json'
        card={'sourceCode':'physics-source-q1','sourceSha256':'a'*64,
              'newQuestionAdmissionAccepted':False,'teacherApproved':False}
        def collect(value):
            data=json.dumps({'cards':[value]}).encode()
            with tempfile.TemporaryDirectory() as tmp:
                return records({'files':[{'logicalPath':name,'sha256':raw_sha(data),'role':'RUN_PREPARATION_EVIDENCE'}]},
                               {name:data},Path(tmp))
        rows=[r for r in collect(card) if r[0]=='question-card']
        self.assertEqual(rows[0][1],name+'#physics-source-q1')
        self.assertEqual(rows[0][3],'physics-source-q1')
        self.assertFalse(rows[0][-1]['newQuestionAdmissionAccepted'])
        with self.assertRaises(ValueError):collect({**card,'code':'different-source'})
        with self.assertRaises(ValueError):collect({'newQuestionAdmissionAccepted':False})

    def test_topic_vectors_keep_their_original_text_model_and_finite_dimensions(self):
        model='a'*64;value={'method':'yks-source-title-context-v1','modelDigest':model,'text':'registered source topic','vector':[0.1]*1024}
        value['key']=signature([value['method'],model,value['text']]);path=Path(model[:16])/(value['key'][:32]+'.json')
        validate_topic_embedding(path,value)
        value['vector'][0]=float('nan')
        with self.assertRaises(ValueError):validate_topic_embedding(path,value)
        value['vector'][0]=0.1;value['text']='different source question'
        with self.assertRaises(ValueError):validate_topic_embedding(path,value)

    def test_same_raw_locator_in_two_sources_does_not_collide_and_pending_is_preserved(self):
        cache={};files=[]
        for source in ['a'*64,'b'*64]:
            name='run/all-prior-occurrences/'+source+'.json'
            data=json.dumps({'results':[{'sourceSha256':source,'sourceLocator':'raw:same-code','status':'ORIGINAL_PENDING_OCCURRENCE_PRESERVED_NOT_ADMITTED'}]}).encode()
            cache[name]=data;files.append({'logicalPath':name,'sha256':raw_sha(data),'role':'RUN_PREPARATION_EVIDENCE'})
        with tempfile.TemporaryDirectory() as tmp:found=records({'files':files},cache,Path(tmp))
        self.assertEqual(len(found),2);self.assertNotEqual(found[0][1],found[1][1])
        self.assertTrue(all(r[4]=='ORIGINAL_PENDING_OCCURRENCE_PRESERVED_NOT_ADMITTED' for r in found))

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
