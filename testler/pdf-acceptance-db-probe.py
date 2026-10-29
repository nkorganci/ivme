"""Integration probe invoked only by ivme.py test on its temporary database."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import uuid
from unittest.mock import patch

from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from kaynakli_arastirma_db import db_connection,query
from pdf_question_accept import publish,compact,literal
from pdf_source_scan import APP


def registry_publication_probe(connection):
    import pdf_source_reconcile as registry
    sha='7'*64;catalog_id=900002
    run=query(connection,'SELECT run_key FROM learning_catalog.current_run')
    resource={'key':f'pdf:{catalog_id}','kind':'PDF','exam':'TYT','subjectId':'geometri',
              'canonicalAssetId':'sha256:'+sha,'automaticLabels':{'contentFormat':'TEST'},'sentinel':'preserved-pdf'}
    query(connection,f"""INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data)
      VALUES ({literal(run)},'pdf:{catalog_id}','PDF','TYT','geometri',true,{literal(compact(resource))}::jsonb);
      INSERT INTO learning_catalog.pdf_audit_rows(catalog_id,data) VALUES ({catalog_id},'{{"id":{catalog_id},"subject":"Matematik","proof":[{{"code":"keep"}}]}}');""")
    questions=registry.json_query(connection,"SELECT code,active,extract(epoch FROM updated_at)::text stamp FROM questions WHERE exam_type IN ('TYT','AYT')")
    snapshot=hashlib.sha256(json.dumps(sorted((q['code'],q['active'],q['stamp']) for q in questions),separators=(',',':')).encode()).hexdigest()
    data={'questionSnapshotSha256':snapshot,'files':[],'aliases':[{'id':catalog_id,'sha256':sha}],
          'documents':[{'sha256':sha,'pageCount':1,'format':'CALISMA_REHBERI','coverageState':'NO_QUESTIONS',
                        'expectedQuestions':0,'ocrEvidenceSha256':'test-ocr',
                        'coverageEvidence':{'metadataReview':{'subjectId':'geometri','subject':'Geometri'},'sourceContentIssues':[]}}],
          'occurrences':[],'provenance':[],'fingerprints':[]}
    page={'page':1,'text':'Rehber','textSha256':hashlib.sha256(b'Rehber').hexdigest()}
    before=query(connection,"SELECT md5(string_agg(row_to_json(q)::text,',' ORDER BY code)) FROM questions q")
    with tempfile.TemporaryDirectory(prefix='ivme-registry-publish-') as temporary,patch.object(registry,'OUT',Path(temporary)),patch.object(registry,'read_evidence_scan',return_value={'pages':[page]}):
        registry.publish(connection,data)
        assert query(connection,f"SELECT data->>'subject' FROM learning_catalog.pdf_audit_rows WHERE catalog_id={catalog_id}")=='Geometri'
        assert query(connection,f"SELECT data->>'originalSubject' FROM learning_catalog.pdf_audit_rows WHERE catalog_id={catalog_id}")=='Matematik'
        assert query(connection,f"SELECT data->'proof'->0->>'code' FROM learning_catalog.pdf_audit_rows WHERE catalog_id={catalog_id}")=='keep'
        assert query(connection,f"SELECT content_format FROM learning_catalog.current_items WHERE item_key='pdf:{catalog_id}'")=='CALISMA_REHBERI'
        assert query(connection,"SELECT data->>'sentinel' FROM learning_catalog.current_items WHERE item_key='question:test-kpss'")=='unchanged'
        after_run=query(connection,'SELECT run_key FROM learning_catalog.current_run')
        registry.publish(connection,data)
        assert query(connection,'SELECT run_key FROM learning_catalog.current_run')==after_run
        assert query(connection,"SELECT md5(string_agg(row_to_json(q)::text,',' ORDER BY code)) FROM questions q")==before
    print('Registry publication preserves bank, original labels, proofs and unrelated catalog; repeat is idempotent.')


def main():
    connection=db_connection('ivme_test')
    if query(connection,'SELECT current_database()')!='ivme_test':raise ValueError('Temporary test database required')
    key=uuid.uuid4().hex[:12];old='test-pdf-old-'+key;new='test-pdf-new-'+key;sha='f'*64;review='e'*64
    query(connection,f"""INSERT INTO learning_catalog.runs VALUES ({literal(old)},'TEST','{{}}',now());
      INSERT INTO learning_catalog.current_run VALUES (true,{literal(old)}) ON CONFLICT(singleton) DO UPDATE SET run_key=excluded.run_key;
      INSERT INTO questions(code,exam_type,subject,image,correct_answer) VALUES ('test-canonical','TYT','Türkçe','test.webp','D'),('test-empty','TYT','Türkçe','empty.webp','A'),('test-kpss','KPSS_OO_GY','Türkçe','kpss.webp','B');
      INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data)
      VALUES ({literal(old)},'question:test-kpss','QUESTION','KPSS_OO_GY','turkce',true,'{{"""+'"sentinel":"unchanged"'+f"""}}'),
      ({literal(old)},'question:test-empty','QUESTION','TYT','turkce',true,'{{"""+'"sentinel":"preserved-empty-record"'+f"""}}');
      INSERT INTO learning_catalog.pdf_sources(source_sha256,page_count,extractor_version,observations) VALUES ('{sha}',3,'TEST','{{}}'),('{'a'*64}',3,'TEST','{{}}');""")
    metadata=[{'kind':'QUESTION','code':'test-new-pdf','exam':'TYT','subject':'Türkçe','topic':'Sözcükte Anlam',
        'bank':'OGM','active':True,'available':True,'image':'test-new.webp'}]
    result=subprocess.run(['node','scripts/resource-intake.mjs'],cwd=APP,input=compact(metadata),text=True,encoding='utf-8',capture_output=True,check=True)
    resources=json.loads(result.stdout)['resources']
    category_id=resources[0]['automaticLabels']['assignments'][0]['categoryId']
    query(connection,f"INSERT INTO learning_catalog.categories VALUES ({literal(old)},{literal(category_id)},'{{\"id\":\"{category_id}\"}}');")
    guard_sql="SELECT md5(string_agg(code||':'||active::text||':'||extract(epoch FROM updated_at)::text,',' ORDER BY code)) FROM questions WHERE exam_type IN ('TYT','AYT')"
    guard=query(connection,guard_sql)
    with tempfile.TemporaryDirectory(prefix='ivme-pdf-test-') as temporary:
        folder=Path(temporary);image=folder/'source.webp';Image.new('RGB',(100,100),'white').save(image)
        image_sha=hashlib.sha256(image.read_bytes()).hexdigest();backup=folder/'backup.dump';backup.write_bytes(b'fixture'*200000)
        data={'sourceSha256':sha,'reviewSha256':review,'previousRun':old,'run':new,'bankGuard':guard,'resources':resources,
          'newQuestions':[{'code':'test-new-pdf','exam':'TYT','subject':'Türkçe','topic':'Sözcükte Anlam','source':'Test PDF',
                           'image':'test-new.webp','answer':'A','sourceImage':str(image)}],
          'quarantines':[{'code':'test-empty','imageSha256':'b'*64,'evidence':{'test':'THREE_WAY_SOURCE_CHECK'}}],
          'occurrences':[{'sourceCode':'source-new','sourceSha256':'a'*64,'questionCode':'test-new-pdf','page':1,'numbers':[1],'decision':'NEW',
                          'evidence':{'acceptanceReviewSha256':review,'imageSha256':image_sha}},
                         {'sourceCode':'source-match','questionCode':'test-canonical','page':2,'numbers':[2],'decision':'MATCH',
                          'evidence':{'acceptanceReviewSha256':review,'sourceAnswer':'C','answerPermutation':{'C':'D','D':'C'}}}]}
        publish(connection,data,backup,image_root=folder/'images',evidence_dir=folder/'evidence')
        assert query(connection,"SELECT count(*) FROM questions")=='4'
        assert query(connection,"SELECT active FROM questions WHERE code='test-empty'")=='f'
        assert query(connection,"SELECT student_visible FROM learning_catalog.current_items WHERE item_key='question:test-empty'")=='f'
        assert query(connection,"SELECT status FROM learning_catalog.question_source_issues WHERE question_code='test-empty'")=='QUARANTINED'
        assert query(connection,"SELECT correct_answer FROM questions WHERE code='test-canonical'")=='D'
        assert query(connection,'SELECT run_key FROM learning_catalog.current_run')==new
        assert query(connection,"SELECT data->>'sentinel' FROM learning_catalog.current_items WHERE item_key='question:test-kpss'")=='unchanged'
        assert query(connection,"SELECT count(*) FROM learning_catalog.current_assignments WHERE item_key='question:test-new-pdf'")=='1'
        assert query(connection,"SELECT 'TYT'=ANY(exam_ids) AND cardinality(category_ids)>0 FROM learning_catalog.current_items WHERE item_key='question:test-new-pdf'")=='t'
        assert query(connection,"SELECT status FROM learning_catalog.question_intake WHERE question_code='test-new-pdf'")=='PUBLISHED'
        assert query(connection,"SELECT source_sha256 FROM learning_catalog.question_source_registry WHERE question_code='test-new-pdf'")=='a'*64
        try:publish(connection,data,backup,image_root=folder/'images',evidence_dir=folder/'evidence')
        except RuntimeError as error:assert 'Catalog or bank changed' in str(error)
        else:raise AssertionError('Stale batch must not add another question')
        assert query(connection,'SELECT count(*) FROM questions')=='4'
        assert query(connection,"SELECT count(*) FROM learning_catalog.pdf_question_occurrences WHERE status='LINKED'")=='2'
    print('Atomic acceptance, catalog preservation, option permutation and replay guard passed.')
    registry_publication_probe(connection)


if __name__=='__main__':main()
