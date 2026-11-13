"""Prove all small previews precede writes and a later invalid part writes zero."""
import csv
import hashlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import mebi_pratik2_pilot_import as importer


class Response:
    def __init__(self,value):self.value=value
    def read(self,*args):return json.dumps(self.value).encode()
    def __enter__(self):return self
    def __exit__(self,*args):return False


class Client:
    def __init__(self,fail_preview=None,repeated=False):self.events=[];self.fail_preview=fail_preview;self.repeated=repeated
    def open(self,request,timeout):
        if '/api/operator/import?' not in request.full_url:return Response({'role':'OPERATOR'})
        raw=request.data.split(b'\r\n\r\n',1)[1].rsplit(b'\r\n--',1)[0]
        rows=list(csv.reader(io.StringIO(raw.decode('utf8'))));count=len(rows)-1
        live='dryRun=false' in request.full_url;self.events.append((live,count))
        preview_number=sum(not event[0] for event in self.events)
        failed=not live and preview_number==self.fail_preview
        return Response({'inserted':0 if self.repeated else count,'updated':0,'skipped':count if self.repeated else 0,'errorCount':1 if failed else 0})


class BoundedImportTests(unittest.TestCase):
    def fixture(self,base):
        folder=base/'verified-source-batch-test';folder.mkdir()
        stream=io.StringIO(newline='');writer=csv.writer(stream);writer.writerow(['code','correct_answer'])
        writer.writerows([[f'q{index}','C'] for index in range(205)])
        raw=stream.getvalue().encode();(folder/'insert-only.csv').write_bytes(raw)
        before={'questions':10,'fingerprint':'stable','catalogRun':'fixed'}
        (folder/'report.json').write_text(json.dumps({'sourceRows':205,'databaseBackup':{'sha':'backup'},'csvSha256':hashlib.sha256(raw).hexdigest(),'before':before}),encoding='utf8')
        return folder,before

    def execute(self,base,before,client,apply=False,repeat=False):
        with patch.object(importer,'BASE',base),patch.object(importer,'db_connection',return_value=([],{},None)),patch.object(importer,'query',return_value=json.dumps(before)),patch.object(importer.urllib.request,'build_opener',return_value=client):
            importer.run(apply=apply,repeat_check=repeat,batch_dir='verified-source-batch-test')

    def test_every_bounded_preview_finishes_before_the_first_insert_request(self):
        with tempfile.TemporaryDirectory() as name:
            base=Path(name);folder,before=self.fixture(base);client=Client();self.execute(base,before,client,apply=True)
            self.assertEqual(client.events,[(False,100),(False,100),(False,5),(True,100),(True,100),(True,5)])
            self.assertEqual(json.loads((folder/'import-result.json').read_text())['inserted'],205)

    def test_failure_in_second_preview_sends_no_insert_request(self):
        with tempfile.TemporaryDirectory() as name:
            base=Path(name);folder,before=self.fixture(base);client=Client(fail_preview=2)
            with self.assertRaises(ValueError):self.execute(base,before,client,apply=True)
            self.assertEqual(client.events,[(False,100),(False,100)]);self.assertFalse((folder/'import-result.json').exists())

    def test_repeat_check_is_bounded_and_never_sends_a_write(self):
        with tempfile.TemporaryDirectory() as name:
            base=Path(name);folder,before=self.fixture(base);client=Client(repeated=True);self.execute(base,before,client,repeat=True)
            self.assertEqual(client.events,[(False,100),(False,100),(False,5)])
            proof=json.loads((folder/'repeat-check-result.json').read_text());self.assertEqual(proof['inserted'],0);self.assertEqual(proof['skipped'],205)


if __name__=='__main__':unittest.main()
