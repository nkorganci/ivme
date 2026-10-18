"""Measure existing note coverage against controlled identities; no synthetic notes or approvals."""
import json
from pathlib import Path
APP=Path(__file__).resolve().parents[1];STATE=APP/'veri/content-labels'
def main():
    catalog=json.loads((STATE/'labels.json').read_text(encoding='utf-8'))
    report=json.loads((STATE/'report.json').read_text(encoding='utf-8'))
    categories={c['id']:c for c in json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf-8'))['categories']}
    references={};notes=[i for i in catalog['items'] if i['kind']=='NOTE']
    for note in notes:
        for a in note['automaticLabels']['assignments']:references.setdefault(a['categoryId'],set()).add(note['key'])
    rows=[]
    for c in categories.values():
        if c.get('origin')!='CURRICULUM':continue
        keys=sorted(references.get(c['id'],set()))
        rows.append({'categoryId':c['id'],'exam':c['exam'],'subjectId':c['subjectId'],'parentId':c.get('parentId'),
            'noteKeys':keys,'coverage':'DRAFT_REQUIRES_TEACHER_REVIEW' if keys else 'NO_NOTE',
            'contentApproved':False})
    value={'version':1,'runKey':report['runKey'],'notes':len(notes),'controlledTopics':len(rows),
        'withDraftNote':sum(bool(r['noteKeys']) for r in rows),'withoutNote':sum(not r['noteKeys'] for r in rows),
        'teacherApproved':0,'categories':rows,'scope':'Identity coverage only; a broad introduction does not cover every narrow subtopic.'}
    (STATE/'note-coverage.json').write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in value.items() if k!='categories'},ensure_ascii=False))
if __name__=='__main__':main()
