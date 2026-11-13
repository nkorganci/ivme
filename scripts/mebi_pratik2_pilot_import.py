"""Use the existing local operator INSERT_ONLY API for the reviewed pilot.

Default is dry-run. --apply requires a completed current backup and unchanged
question inventory. Pending catalog publication remains a separate step.
"""
import argparse
import csv
import hashlib
import http.cookiejar
import io
import json
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from mebi_pratik2_tam_pdf_tarama import BASE
from kaynakli_arastirma_db import db_connection,query
from yks_birlestirme import write_json


def run(apply=False,repeat_check=False,batch=False):
    started=time.monotonic()
    if apply and repeat_check:raise ValueError('Repeat check is a read-only import preview')
    folder=BASE/('verified-source-batch-001' if batch else 'publication-preparation')
    prepared=json.loads((folder/'report.json').read_text(encoding='utf8'))
    count=prepared['sourceRows'] if batch else 21
    data=(folder/'insert-only.csv').read_bytes()
    if apply:
        if not prepared.get('databaseBackup'):raise ValueError('Completed database backup required')
        if hashlib.sha256(data).hexdigest()!=prepared['csvSha256']:raise ValueError('Prepared CSV changed')
        cmd,env,_=db_connection('ivme')
        before=json.loads(query((cmd,env,None),"""SELECT json_build_object('questions',count(*),
            'fingerprint',md5(string_agg(code||':'||extract(epoch from updated_at)::text,'|' ORDER BY code)),
            'catalogRun',(SELECT run_key FROM learning_catalog.current_run)) FROM questions"""))
        if before!=prepared['before']:raise ValueError('Bank changed after backup; rebuild preparation')
    jar=http.cookiejar.CookieJar();client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    base='http://127.0.0.1:1010'
    def request(path,body=None,content_type=None):
        headers={}
        if content_type:headers['Content-Type']=content_type
        if body is not None:
            token=next((c.value for c in jar if c.name=='XSRF-TOKEN'),None)
            if token:headers['X-XSRF-TOKEN']=urllib.parse.unquote(token)
        with client.open(urllib.request.Request(base+path,data=body,headers=headers),timeout=120) as response:
            return json.load(response)
    try:request('/api/auth/me')
    except urllib.error.HTTPError as error:
        if error.code!=401:raise
    operator=request('/api/auth/dev-teacher-review-login',b'')
    if operator.get('role')!='OPERATOR':raise ValueError('Local content operator required')
    def submit(payload,live):
        boundary='mebi2-'+uuid.uuid4().hex
        body=(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="mebi2-source.csv"\r\nContent-Type: text/csv\r\n\r\n'.encode()+payload+f'\r\n--{boundary}--\r\n'.encode())
        return request('/api/operator/import?mode=INSERT_ONLY&dryRun='+('false' if live else 'true'),
            body,'multipart/form-data; boundary='+boundary)
    if batch and apply:
        preview=submit(data,False)
        if preview.get('errorCount') or preview.get('inserted')!=count or preview.get('updated'):
            raise ValueError('Whole-batch preflight rejected; no writes performed')
        parsed=list(csv.reader(io.StringIO(data.decode('utf8'))));parts=[]
        for offset in range(1,len(parsed),100):
            stream=io.StringIO(newline='');writer=csv.writer(stream);writer.writerow(parsed[0]);writer.writerows(parsed[offset:offset+100])
            part=submit(stream.getvalue().encode('utf8'),True);parts.append(part)
            write_json(folder/f'import-part-{len(parts):03d}.json',part)
            if part.get('errorCount') or part.get('inserted')!=len(parsed[offset:offset+100]) or part.get('updated'):
                raise ValueError('Atomic sub-batch delta differs; later sub-batches were not attempted')
            completed=sum(x['inserted'] for x in parts)
            progress={'completed':completed,'total':count,'percent':round(100*completed/count,2),
                'atomicBatch':len(parts),'elapsedSeconds':round(time.monotonic()-started,2),'estimatedRemainingSeconds':None}
            with (folder/'import-progress.jsonl').open('a',encoding='utf8') as stream:stream.write(json.dumps(progress)+'\n')
            print(json.dumps(progress),flush=True)
        result={'inserted':sum(x['inserted'] for x in parts),'updated':0,'errorCount':0,
            'skipped':sum(x.get('skipped',0) for x in parts),'atomicBatches':len(parts),'maxBatchRows':100,
            'elapsedSeconds':round(time.monotonic()-started,2)}
    else:result=submit(data,apply)
    write_json(folder/('repeat-check-result.json' if repeat_check else 'import-result.json' if apply else 'dry-run-result.json'),result)
    print(json.dumps(result,ensure_ascii=True))
    expected=0 if repeat_check else count
    if result.get('errorCount') or result.get('inserted')!=expected or result.get('updated'):
        raise ValueError('Pilot delta differs from expected INSERT_ONLY behavior')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');parser.add_argument('--repeat-check',action='store_true');parser.add_argument('--batch',action='store_true')
    args=parser.parse_args();run(args.apply,args.repeat_check,args.batch)
