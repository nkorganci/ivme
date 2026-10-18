"""Read-only archive/served-version acceptance for the running local application."""
import argparse
from datetime import datetime, timezone
from http.cookiejar import CookieJar
import json
from pathlib import Path
import re
import sys
from time import perf_counter
from urllib.parse import unquote, urlencode
from urllib.request import build_opener, HTTPCookieProcessor, Request

APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP / 'scripts'))
from kaynakli_arastirma_db import db_connection, query


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    base = 'http://127.0.0.1:9090'
    cookies = CookieJar()
    client = build_opener(HTTPCookieProcessor(cookies))
    try:
        client.open(base+'/api/auth/me', timeout=20).close()
    except Exception as error:
        if getattr(error, 'code', None) != 401:
            raise
    token = next(unquote(cookie.value) for cookie in cookies if cookie.name == 'XSRF-TOKEN')
    client.open(Request(base+'/api/auth/dev-login', data=b'', headers={'X-XSRF-TOKEN': token}, method='POST'), timeout=20).close()

    def get(path):
        with client.open(base+path, timeout=60) as response:
            return response.read().decode('utf-8')

    records = []
    for exam, track in [('TYT','SAYISAL'),('AYT','SAYISAL'),('AYT','ESIT_AGIRLIK'),('AYT','SOZEL')]:
        start = perf_counter()
        archive = json.loads(get('/api/exams/archive?'+urlencode({'examType':exam,'track':track})))
        assert archive and all(p['examType']==exam and p['track']==track for p in archive)
        assert all(p['ready']==all(q['available']==q['target'] for q in p['subjects']) for p in archive)
        records.append({'exam':exam,'track':track,'milliseconds':round((perf_counter()-start)*1000,2),
                        'readyYears':[p['year'] for p in archive if p['ready']],
                        'incompleteYears':[{'year':p['year'],'shortages':[q for q in p['subjects'] if q['available']!=q['target']]}
                                           for p in archive if not p['ready']]})
    html = get('/calisma/yeni?mode=sinav&examSource=year')
    expected = (APP/'frontend/dist/index.html').read_text(encoding='utf-8')
    asset = re.search(r'/assets/index-[^" ]+\.js', html)[0]
    assert asset == re.search(r'/assets/index-[^" ]+\.js', expected)[0]
    assert 'Yıla ait tam sınav' in get(asset)
    version = get('/app-version.txt').strip()
    assert version == (APP/'frontend/dist/app-version.txt').read_text().strip()
    connection = db_connection()
    connection[1]['PGOPTIONS'] += ' -c default_transaction_read_only=on'
    state = json.loads(query(connection,"""SELECT json_build_object(
      'positions',(SELECT count(*) FROM exam_archive_positions),
      'catalogRun',(SELECT run_key FROM learning_catalog.current_run),
      'migrations',(SELECT json_agg(t) FROM (SELECT version,success FROM flyway_schema_history WHERE version IN ('57','58'))t),
      'exams',(SELECT count(*) FROM exams), 'examQuestions',(SELECT count(*) FROM exam_questions))"""))
    assert len(state['migrations'])==2 and all(m['success'] for m in state['migrations'])
    report = {'status':'PASS','checkedAtUtc':datetime.now(timezone.utc).isoformat(),'site':base,
              'asset':asset,'appVersion':version,'archive':records,'database':state,
              'examOrAnswerWrites':0,'authentication':'Local development login only'}
    output = Path(args.output); output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'PASS','asset':asset,'positions':state['positions'],
                      'readyYears':[{k:r[k] for k in ('exam','track','readyYears')} for r in records]},ensure_ascii=False))


if __name__ == '__main__':
    main()
