"""Use the existing local operator INSERT_ONLY API for the reviewed pilot.

Default is dry-run. --apply requires a completed current backup and unchanged
question inventory. Pending catalog publication remains a separate step.
"""
import argparse
import hashlib
import http.cookiejar
import json
import urllib.error
import urllib.parse
import urllib.request
import uuid
from mebi_pratik2_tam_pdf_tarama import BASE
from kaynakli_arastirma_db import db_connection,query
from yks_birlestirme import write_json


def run(apply=False):
    folder=BASE/'publication-preparation'
    data=(folder/'insert-only.csv').read_bytes()
    if apply:
        prepared=json.loads((folder/'report.json').read_text(encoding='utf8'))
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
    boundary='mebi2-'+uuid.uuid4().hex
    body=(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="mebi2-pilot.csv"\r\nContent-Type: text/csv\r\n\r\n'.encode()+data+f'\r\n--{boundary}--\r\n'.encode())
    result=request('/api/operator/import?mode=INSERT_ONLY&dryRun='+('false' if apply else 'true'),
        body,'multipart/form-data; boundary='+boundary)
    write_json(folder/('import-result.json' if apply else 'dry-run-result.json'),result)
    print(json.dumps(result,ensure_ascii=False))
    if result.get('errorCount') or result.get('inserted')!=21:raise ValueError('Pilot delta differs from 21')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');run(parser.parse_args().apply)
