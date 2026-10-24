"""Audit a curriculum-only publication against its current, immutable source snapshot.

This does not claim to re-extract/re-audit original PDFs or archived CSV exports.
Every current source identity/version and every learner record remains unchanged.
"""
import hashlib
import importlib.util
import json
from pathlib import Path

from kaynakli_arastirma_db import db_connection, query

APP=Path(__file__).resolve().parents[1]
STATE=APP/'veri/content-labels'
SOURCE_FIELDS=['sourceVersion','sourceUpdatedAt','questionCode','originalTitle','originalFilename','sourceSha256',
    'sourceImage','sourceRecordRef','url','bank','availability','studentVisible','sourceTopic','supportingSources','exampleSources']
STUDENT_TABLES=['users','question_attempts','study_sessions','exams','exam_questions','curriculum_topic_progress']


def student_fingerprint(connection):
    result={}
    for table in STUDENT_TABLES:
        result[table]=json.loads(query(connection,f"SELECT json_build_object('count',count(*),'hash',md5(coalesce(string_agg(row_to_json(t)::text,E'\\n' ORDER BY row_to_json(t)::text),''))) FROM {table} t"))
    return result


def main():
    payload=json.loads((STATE/'labels.json').read_text(encoding='utf-8'))
    summary=json.loads((STATE/'report.json').read_text(encoding='utf-8'))
    connection=db_connection()
    connection[1]['PGOPTIONS']+=' -c default_transaction_read_only=on'
    previous=json.loads(query(connection,"SELECT json_build_object('runKey',r.run_key,'audit',a.inventory_audit) FROM learning_catalog.current_run r JOIN learning_catalog.source_audits a USING(run_key)"))
    spec=importlib.util.spec_from_file_location('excel_import',APP/'scripts/excel-curriculum-import.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    sheet=module.first_sheet()
    if sheet['sha256']!=summary['curriculumReference']['sha256']:
        raise ValueError('Excel first worksheet changed')
    fields=','.join("'"+name+"',data->'"+name+"'" for name in SOURCE_FIELDS)
    original=json.loads(query(connection,"SELECT json_agg(json_build_object('key',item_key,'source',json_build_object("+fields+"))) FROM learning_catalog.current_items"))
    items={item['key']:item for item in payload['items']}
    if len(items)!=len(payload['items']) or set(items)!={row['key'] for row in original}:
        raise ValueError('Source identity set changed during curriculum migration')
    for row in original:
        for name in SOURCE_FIELDS:
            if items[row['key']].get(name)!=row['source'][name]:
                raise ValueError(f'Source field changed: {row["key"]} / {name}')
    categories={c['id']:c for c in payload['categories']}
    selectable=[c for c in categories.values() if c.get('selectable')]
    if len(selectable)!=530 or any(c.get('curriculumSource')!='EXCEL_FIRST_SHEET' for c in selectable):
        raise ValueError('Selectable categories must come exclusively from the first Excel worksheet')
    unlabelled=sum(not item['automaticLabels']['assignments'] for item in items.values())
    if unlabelled or any(a['categoryId'] not in categories for item in items.values() for a in item['automaticLabels']['assignments']):
        raise ValueError('Missing or unknown category')
    audit={'version':1,'type':'CURRICULUM_RECLASSIFICATION','runKey':summary['runKey'],'previousRunKey':previous['runKey'],
        'resources':len(items),'sourcePreserved':True,'sourceFieldsVerified':SOURCE_FIELDS,
        'originalExtractionAuditRunKey':previous['runKey'],'sourceInventoryRechecked':False,
        'unlabelled':unlabelled,'failures':[],'curriculumReferences':1,'curriculumReference':summary['curriculumReference'],
        'classification':summary['excelClassification'],'independentAccuracyMeasured':False,
        'learnerFingerprint':student_fingerprint(connection)}
    reference={'source':sheet['file'],'sha256':sheet['sha256'],'sheet':sheet['sheet'],'sheetIndex':0,
        'hashScope':'FIRST_SHEET_ROWS','kind':'CURRICULUM_REFERENCE','categoryIds':[c['id'] for c in selectable],
        'basis':'EXCEL_FIRST_SHEET_ONLY','teacherApproved':False}
    (STATE/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (STATE/'curriculum-reference-labels.json').write_text(json.dumps([reference],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:audit[k] for k in ['type','runKey','previousRunKey','resources','sourcePreserved','unlabelled','classification']}))


if __name__=='__main__':main()
