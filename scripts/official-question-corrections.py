"""Exclude documented cancelled questions from future selection; never change keys or scores."""
import argparse, hashlib, html, json, re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from kaynakli_arastirma_db import db_connection, query

APP=Path(__file__).resolve().parents[1]

def literal(value):
    return "'"+str(value).replace("'","''")+"'"

def evidence_records():
    data=json.loads((APP/'ornek-veri/resmi-soru-durumlari.json').read_text(encoding='utf-8'))
    if data['version']!=1:raise ValueError('Unknown official status version')
    records=[];seen=set()
    for row in data['records']:
        identity=row['identity'];expected=f"{identity['year']}-{identity['exam']}-{identity['test']}-{identity['number']:02}"
        if row['code']!=expected or row['code'] in seen or row['officialStatus']!='cancelled' or row['bank']!='CIKMIS':
            raise ValueError('Invalid/duplicate official question identity')
        seen.add(row['code'])
        if urlparse(row['officialNoticeUrl']).hostname!='www.osym.gov.tr':raise ValueError('Non-primary notice')
        path=(APP/row['noticeCache']).resolve()
        if not path.is_relative_to((APP/'veri/content-labels/official-archive').resolve()):raise ValueError('Invalid notice cache path')
        raw=path.read_bytes();text=html.unescape(re.sub('<[^>]+>',' ',raw.decode('utf-8')))
        text=re.sub(r'\s+',' ',text).casefold()
        if not row.get('noticeAnchors') or any(anchor.casefold() not in text for anchor in row['noticeAnchors']):
            raise ValueError('Official notice anchor missing: '+row['code'])
        records.append({**row,'noticeSha256':hashlib.sha256(raw).hexdigest()})
    return records

def apply(connection,records):
    codes=','.join(literal(r['code']) for r in records)
    sql='BEGIN;\nSELECT id FROM questions WHERE code IN ('+codes+') ORDER BY id FOR UPDATE;\n'
    for r in records:
        code=literal(r['code']);key=literal('official-cancellation:'+r['code'])
        sql+=f"""
DO $check$ BEGIN
 IF (SELECT count(*) FROM questions WHERE code={code} AND bank='CIKMIS')<>1 THEN
  RAISE EXCEPTION 'Official correction identity not found or wrong bank'; END IF;
END $check$;
INSERT INTO learning_catalog.official_question_corrections
 (correction_key,question_id,question_code,official_status,source_url,source_sha256,identity,
  before_active,before_source_stamp,answer_events,exam_references)
 SELECT {key},q.id,q.code,'cancelled',{literal(r['officialNoticeUrl'])},{literal(r['noticeSha256'])},
  {literal(json.dumps(r['identity']))}::jsonb,q.active,extract(epoch from q.updated_at)::text,
  (SELECT count(*) FROM question_attempts a WHERE a.question_id=q.id AND a.event_type='ANSWER'),
  (SELECT count(*) FROM exam_questions e WHERE e.question_id=q.id)
 FROM questions q WHERE q.code={code} ON CONFLICT(correction_key) DO NOTHING;
UPDATE questions SET active=false,updated_at=now() WHERE code={code} AND bank='CIKMIS' AND active;
"""
    query(connection,sql+'COMMIT;')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database',choices=['ivme','ivme_test'],default='ivme')
    parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    rows=evidence_records();connection=db_connection(args.database)
    if not args.apply:connection[1]['PGOPTIONS']+=' -c default_transaction_read_only=on'
    codes=','.join(literal(r['code']) for r in rows)
    select="SELECT coalesce(json_agg(x),'[]') FROM (SELECT id,code,active,correct_answer,extract(epoch from updated_at)::text AS source_stamp FROM questions WHERE bank='CIKMIS' AND code IN ("+codes+'))x'
    before=json.loads(query(connection,select))
    if len(before)!=len(rows):raise ValueError('All official identities must exist before applying')
    if args.apply:apply(connection,rows)
    after=json.loads(query(connection,select))
    if {r['code']:r['correct_answer'] for r in before}!={r['code']:r['correct_answer'] for r in after}:
        raise ValueError('Unexpected answer change')
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    result={'version':1,'database':args.database,'status':'APPLIED_FUTURE_SELECTION_EXCLUSION' if args.apply else 'PREVIEW',
        'before':before,'after':after,'evidence':rows,'createdAt':stamp,'answerKeyWrites':0,'learnerHistoryWrites':0,'rescoring':False}
    output=APP/'veri/content-labels/official-corrections'/f'{args.database}-{stamp}.json'
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'output':output.relative_to(APP).as_posix(),'status':result['status'],'records':len(rows),'changed':sum(r['active'] for r in before) if args.apply else 0}))

if __name__=='__main__':main()
