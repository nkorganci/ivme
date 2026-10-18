"""Compare preserved account/learning records without exporting private fields."""
import argparse
import json
from pathlib import Path
import sys
APP = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(APP/'scripts'))
from kaynakli_arastirma_db import db_connection, query
parser=argparse.ArgumentParser()
parser.add_argument('stage',choices=['before','after'])
args=parser.parse_args()
connection=db_connection()
connection[1]['PGOPTIONS']+=' -c default_transaction_read_only=on'
tables=['questions','exams','question_attempts','study_sessions','session_questions','curriculum_topic_progress','tutor_sessions','tutor_events','tutor_skill_states']
data={}
for table in tables:
    data[table]=json.loads(query(connection,f"SELECT json_build_object('count',count(*),'digest',md5(coalesce(string_agg(md5(row_to_json(t)::text),'' ORDER BY row_to_json(t)::text),''))) FROM {table} t"))
# Explicit projections ignore only the authorized nazile role change and newly added columns.
for name,sql in {
    'users':"SELECT id,username,email,phone,password_hash,enabled,password_change_required,created_at,CASE WHEN lower(username)='nazile' THEN 'AUTHORIZED_ADMIN' ELSE role END AS role FROM users",
    'exam_questions':"SELECT id,exam_id,question_id,question_order,question_code,subject,topic,selected_answer,correct_answer,is_correct,learning_label_snapshot FROM exam_questions"
}.items():
    data[name]=json.loads(query(connection,f"SELECT json_build_object('count',count(*),'digest',md5(coalesce(string_agg(md5(row_to_json(t)::text),'' ORDER BY row_to_json(t)::text),''))) FROM ({sql})t"))
output=APP/'veri/content-labels/integration/account-management-20261018'
output.mkdir(parents=True,exist_ok=True)
(output/f'{args.stage}.json').write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
if args.stage=='after':
    before=json.loads((output/'before.json').read_text(encoding='utf-8'))
    assert data==before, 'Existing records changed: '+str([key for key in data if data[key]!=before[key]])
    (output/'protected-data-report.json').write_text(json.dumps({'status':'PASS','tables':list(data),'existingRowsPreserved':True,'authorizedChange':'nazile administrator role only'},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'stage':args.stage,'counts':{k:v['count'] for k,v in data.items()}}))
