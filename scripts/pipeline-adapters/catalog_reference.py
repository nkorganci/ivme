"""Read the published Ivme catalog in a READ ONLY transaction; never writes Ivme."""
import hashlib
import json
import os
from pathlib import Path
import re
from urllib.parse import urlparse

import psycopg
from psycopg.rows import dict_row
from core import ROOT

APP=ROOT.parent/'uygulama'

def project_categories(categories, navigation=None):
    """Display projection of one published run; never changes saved definitions."""
    if not navigation:
        return [row for row in categories if row.get('canonicalUnit') and row.get('selectable') is not False]
    if navigation.get('version') != 1 or navigation.get('authority') != 'MEBI_PROVIDER':
        raise ValueError('Unsupported published curriculum navigation')
    by_id={row['id']:row for row in categories}; selected={}
    for course in navigation['courses']:
        for unit in course['units']:
            for topic in unit['topics']:
                exams={exam:ids for exam,ids in topic.get('examCategoryIds',{}).items() if len(ids)==1}
                exams[topic['sourceExam']]=[topic['categoryId']]
                for exam,ids in exams.items():
                    for identity in ids:
                        old=by_id.get(identity)
                        if old is None or old.get('exam')!=exam or old.get('subjectId')!=course['subjectId']:
                            raise ValueError('Published curriculum identity/scope mismatch')
                        if selected.get(identity,{}).get('navigationSourceExam')==old['exam']:
                            continue
                        row={**old,'topic':topic['title'],'unit':unit['title'],'unitId':unit['id'],
                            'order':topic.get('order',0),'canonicalUnit':True,'canonicalTopic':True,'selectable':True,
                            'contentKey':topic['contentKey'],'navigationSelected':True,'navigationSourceExam':topic['sourceExam'],
                            'navigationUnitLegacyScopeIds':unit.get('legacyScopeIds',[])}
                        row.pop('canonicalTopicIds',None);selected[identity]=row
    result=sorted(selected.values(),key=lambda row:(row['exam'],row['subjectId'],row['order']))
    numbers={}
    for row in result:
        key=(row['exam'],row['subjectId']);numbers[key]=numbers.get(key,0)+1;row['topicNumber']=numbers[key]
    result.extend(row for row in categories if row.get('exam') not in ('TYT','AYT')
                  and row.get('canonicalUnit') and row.get('selectable') is not False)
    return result


def read_published():
    config=(APP/'backend/src/main/resources/application-dev.yml').read_text(encoding='utf-8')
    def setting(name):
        raw=re.search(rf'(?m)^\s{{4}}{name}:\s*(.+)$',config).group(1).strip()
        match=re.fullmatch(r'\$\{([A-Z0-9_]+)(?::(.*))?\}',raw)
        return os.environ.get(match[1],match[2] or '') if match else raw.strip('\"\'')
    uri=urlparse(setting('url').removeprefix('jdbc:'))
    if uri.hostname not in ('localhost','127.0.0.1','::1'):
        raise ValueError('Ivme reference must come from local PostgreSQL')
    # Intentionally ignore pipeline PG* variables: these are separate databases.
    with psycopg.connect(host=uri.hostname,port=uri.port or 5432,dbname='ivme',
            user=setting('username'),password=setting('password'),connect_timeout=5,
            options='-c default_transaction_read_only=on',row_factory=dict_row) as conn:
        conn.execute('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
        run=conn.execute('SELECT r.run_key,r.summary FROM learning_catalog.runs r JOIN learning_catalog.current_run c USING(run_key)').fetchone()
        categories=[row['definition'] for row in conn.execute('SELECT definition FROM learning_catalog.current_categories ORDER BY category_id')]
    navigation=run['summary'].get('curriculumNavigation')
    chosen=project_categories(categories,navigation)
    if not chosen:
        raise ValueError('Published Ivme catalog has no selectable curriculum topics')
    payload={'provenance':'ivme.learning_catalog.current_categories / READ ONLY REPEATABLE READ',
        'run_key':run['run_key'],'matching_profile':'published_mebi_navigation_v1' if navigation else 'published_distribution_aliases_v2','categories':chosen}
    payload['sha256']=hashlib.sha256(json.dumps(payload,ensure_ascii=False,sort_keys=True).encode('utf-8')).hexdigest()
    return payload

def snapshot():
    payload=read_published()
    folder=ROOT/'data/catalog'; folder.mkdir(parents=True,exist_ok=True)
    path=folder/f'{payload["sha256"]}.json'
    if not path.exists():
        path.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
    return payload

if __name__=='__main__':
    from collections import Counter
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    payload=snapshot()
    print(json.dumps({'run_key':payload['run_key'],'topics':len(payload['categories']),
        'by_exam':dict(Counter(row['exam'] for row in payload['categories'])),
        'by_course':dict(Counter(row['subject'] for row in payload['categories'])),
        'samples':payload['categories'][:2]},ensure_ascii=False,indent=2))
