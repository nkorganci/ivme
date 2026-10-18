"""Preview a candidate catalog against the published run with read-only SQL."""
from collections import Counter
import json
from pathlib import Path

from kaynakli_arastirma_db import db_connection, query

APP = Path(__file__).resolve().parents[1]
STATE = APP / 'veri/content-labels'


def projection(item):
    labels = item['automaticLabels']
    return {'key':item['key'],'kind':item['kind'],'sourceVersion':item.get('sourceVersion'),
            'displayTitle':item.get('displayTitle'),'availability':item.get('availability'),
            'relations':[{key:a.get(key) for key in ('categoryId','relation','confidence','scopeStatus','locatorStatus','locators')}
                         for a in labels['assignments']]}


def main():
    data = json.loads((STATE / 'labels.json').read_text(encoding='utf-8'))
    summary = json.loads((STATE / 'report.json').read_text(encoding='utf-8'))
    connection = db_connection()
    # Session default: even a later accidental write on this connection fails.
    connection[1]['PGOPTIONS'] += ' -c default_transaction_read_only=on'
    previous = query(connection, 'SELECT run_key FROM learning_catalog.current_run')
    rows = json.loads(query(connection, """SELECT coalesce(json_agg(x),'[]') FROM (
        SELECT item_key AS key,kind,data->>'sourceVersion' AS "sourceVersion",
          data->>'displayTitle' AS "displayTitle",data->>'availability' AS availability,
          (SELECT json_agg(json_build_object('categoryId',a->'categoryId','relation',a->'relation',
            'confidence',a->'confidence','scopeStatus',a->'scopeStatus','locatorStatus',a->'locatorStatus','locators',a->'locators'))
           FROM jsonb_array_elements(data->'automaticLabels'->'assignments') a) AS relations
        FROM learning_catalog.current_items) x"""))
    old = {r['key']:r for r in rows}
    current = {i['key']:projection(i) for i in data['items']}
    added, removed = sorted(current.keys()-old.keys()), sorted(old.keys()-current.keys())
    changed = sorted(key for key in current.keys() & old.keys() if current[key]!=old[key])
    fields = Counter(field for key in changed for field in current[key] if current[key][field]!=old[key].get(field))
    approvals = int(query(connection, 'SELECT count(*) FROM content_reviews'))
    report = {'version':1,'candidateRunKey':summary['runKey'],'publishedRunKey':previous,
              'resources':len(current),'added':len(added),'removed':len(removed),'changed':len(changed),
              'unchanged':len(current)-len(added)-len(changed),'changedFields':dict(fields),
              'humanDecisionsPreserved':approvals,'candidateReviewRequired':summary['resources']-summary['teacherApproved'],
              'questionsOrLearnerWrites':0,'publishes':False,
              'sample':{'added':added[:10],'removed':removed[:10],'changed':changed[:10]}}
    directory = STATE / 'previews'
    directory.mkdir(exist_ok=True)
    path = directory / f"{summary['runKey']}-from-{previous or 'empty'}.json"
    path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))


if __name__=='__main__':
    main()
