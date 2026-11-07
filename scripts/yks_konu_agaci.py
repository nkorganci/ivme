"""Compile a MEBI navigation candidate while preserving every published definition.

Existing review fingerprints cover whole category definitions. Preferred order
and source navigation therefore stay separate from those immutable definitions.
This candidate does not activate navigation, publish labels or move progress.
"""
from collections import Counter,defaultdict
from copy import deepcopy
import json
from pathlib import Path
import re

from yks_birlestirme import Store,digest,read_json,signature,write_json

APP=Path(__file__).resolve().parents[1]


def compile_tree(crosswalk,categories,source_files):
    if crosswalk['issues']:raise ValueError('Provider structural/subject issues remain')
    by_id={c['id']:deepcopy(c) for c in categories};original_hashes={k:signature(c) for k,c in by_id.items()}
    source_paths={r['path'].replace('\\','/'):r for r in source_files
                  if r.get('kind')=='FILE' and Path(r['root']).name=='mebi-yks'}
    subjects={c['subjectId']:c['subject'] for c in categories if c.get('canonicalUnit') and c.get('subject')}
    courses={};new=[];topics=[];content=defaultdict(list)
    for order,node in enumerate(crosswalk['providerNodes'],1):
        category_id=node.get('proposedCategoryId')
        if not category_id or not node.get('subjectId'):raise ValueError('Provider category/subject unresolved')
        if category_id not in by_id:
            definition={'id':category_id,'exam':node['exam'],'subjectId':node['subjectId'],
                 'subject':subjects[node['subjectId']],'unit':node['unit'],'topic':node['title'],'subtopic':'',
                 'origin':'CURRICULUM','curriculumSource':'MEBI_PROVIDER','canonicalTopic':True,
                 'canonicalUnit':False,'selectable':True,'order':order,'aliases':[],
                 'providerNodeId':node['providerNodeId'],
                 'curriculumReference':{'provider':'MEBI','url':'https://mebi.eba.gov.tr'+node['sourceUrl']}}
            new.append(definition);by_id[category_id]=definition
        else:
            old=by_id[category_id]
            if old['exam']!=node['exam'] or old['subjectId']!=node['subjectId']:
                raise ValueError('Existing topic scope would change')
        assets=[]
        for asset in node['assets']:
            path=asset.get('storage_path','').replace('\\','/')
            actual=source_paths.get(path)
            if actual is None:raise ValueError('Provider asset not present in verified physical inventory: '+path)
            assets.append({'url':asset['url'],'sourceSha256':actual['sha256'],
                           'originalPath':str(Path(actual['root'])/actual['path']),
                           'kind':Path(path).suffix.lower().removeprefix('.'),'title':asset.get('name') or Path(path).suffix.lower().removeprefix('.')})
        if not assets:raise ValueError('Provider topic has no verified source assets')
        bundle=signature([node['subjectId'],sorted(a['sourceSha256'] for a in assets)])
        content_key=node.get('sharedContentKey') or 'mebi-bundle:'+bundle
        topic={'providerNodeId':node['providerNodeId'],'categoryId':category_id,'sourceExam':node['exam'],
               'examScopes':[node['exam']], 'subjectId':node['subjectId'],'unit':node['unit'],'title':node['title'],
               'examCategoryIds':{node['exam']:[category_id]},
               'unitId':'mebi-unit.'+(node.get('providerUnitId') or signature(node['sourcePath'][:3])[:24]),
               'order':order,'orderInUnit':node.get('orderInUnit'),'contentKey':content_key,
               'sourceUrl':node['sourceUrl'],'assets':assets,'savedProgressCopied':False}
        for counterpart_id in node.get('existingCounterpartIds',[]):
            counterpart=by_id[counterpart_id]
            if counterpart['subjectId']!=node['subjectId'] or not node.get('sharedContentKey'):
                raise ValueError('Unproved shared subject/exam counterpart')
            topic['examCategoryIds'].setdefault(counterpart['exam'],[]).append(counterpart_id)
            topic['examScopes']=sorted(topic['examCategoryIds'])
        content[content_key].append(topic);topics.append(topic)
        key=(node['exam'],node['subjectId'],node['course'])
        display_course='Geometri' if node['subjectId']=='geometri' else re.sub(r'\s*\((?:TYT|AYT|TYT/AYT)\)\s*$','',node['course'])
        course=courses.setdefault(key,{'exam':node['exam'],'subjectId':node['subjectId'],
                   'id':'mebi-course.'+(node.get('providerCourseId') or signature(key)[:24])+'.'+node['subjectId'],
                   'title':display_course,'sourceTitle':node['course'],'order':node.get('orderOfCourse'),'units':{}})
        unit=course['units'].setdefault(node['unit'],{'id':topic['unitId'],'title':node['unit'],'order':node.get('orderOfUnit'),'topics':[]})
        unit['topics'].append(topic)
    for key,group in content.items():
        categories_by_exam=defaultdict(list)
        for topic in group:
            for exam,ids in topic['examCategoryIds'].items():categories_by_exam[exam].extend(ids)
        combined={exam:list(dict.fromkeys(ids)) for exam,ids in categories_by_exam.items()}
        for topic in group:
            topic['examScopes']=sorted(combined)
            topic['examCategoryIds']=deepcopy(combined)
    tree=[]
    for course in courses.values():
        course['units']=list(course['units'].values());tree.append(course)
    unit_for_node={t['providerNodeId']:t['unitId'] for t in topics}
    units_by_id={u['id']:u for c in tree for u in c['units']}
    for legacy in crosswalk.get('legacyIdentities',[]):
        contexts=[s for s in legacy.get('providerScopeCandidates',[])
                  if s['reason']=='EXACT_UNIT_TITLE_LEGACY_WIDER_THAN_LEAF']
        unit_ids={unit_for_node[s['providerNodeId']] for s in contexts}
        if len(unit_ids)==1:
            unit=units_by_id[next(iter(unit_ids))]
            unit.setdefault('legacyScopeIds',[]).append(legacy['id'])
    for category_id,before in original_hashes.items():
        if signature(by_id[category_id])!=before:raise ValueError('Published category/review definition changed')
    if len({t['providerNodeId'] for t in topics})!=len(topics):raise ValueError('Duplicate provider topic')
    return {'version':1,'status':'CANDIDATE','curriculumAuthority':'MEBI_PROVIDER',
            'categoryDefinitions':list(by_id.values()),'navigation':tree,
            'newCategoryIds':[c['id'] for c in new],
            'contentGroups':[{'key':key,'providerNodeIds':[t['providerNodeId'] for t in members],
                              'categoryIds':list(dict.fromkeys(t['categoryId'] for t in members)),
                              'exams':sorted({t['sourceExam'] for t in members})} for key,members in content.items()],
            'originalDefinitionHashes':original_hashes,'originalDefinitionsPreserved':True,
            'readyForPublication':False,'studentProgressWritten':0,'teacherDecisionsWritten':0,
            'remainingGates':['Keep unresolved legacy scopes unchanged and accessible through compatibility IDs',
                              'Adapt generators/navigation consumers; preserve old category fingerprints',
                              'Pass pilot and controlled catalog/path cutover acceptance']}


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    def artifact(stage,name):
        return next(store.child(state['runId']+'/'+a['path']) for a in state['stages'][stage+':full']['artifacts']
                    if a['path'].replace('\\','/').endswith('/'+name))
    crosswalk_path=artifact('YKS-04','taxonomy-crosswalk.json')
    snapshot_path=artifact('YKS-04','published-category-snapshot.json')
    inventory_path=artifact('YKS-02','inventory.jsonl')
    sources=[json.loads(line) for line in inventory_path.read_text(encoding='utf-8').splitlines()]
    value=compile_tree(read_json(crosswalk_path),read_json(snapshot_path)['categories'],sources)
    folder=store.child(state['runId']+'/konu-agaci-adayi');folder.mkdir(exist_ok=True)
    write_json(folder/'navigation-candidate.json',value)
    report={'status':'PASS','scope':'UNPUBLISHED_NAVIGATION_AND_CONTROLLED_ID_CANDIDATE',
            'providerTopics':sum(len(u['topics']) for c in value['navigation'] for u in c['units']),
            'courses':len(value['navigation']),'units':sum(len(c['units']) for c in value['navigation']),
            'newCategoryDefinitions':len(value['newCategoryIds']),'legacyDefinitionsPreserved':len(value['originalDefinitionHashes']),
            'sharedContentGroups':sum(len(g['providerNodeIds'])>1 for g in value['contentGroups']),
            'topicsWithExplicitSharedExamScope':sum(len(t['examScopes'])>1 for c in value['navigation'] for u in c['units'] for t in u['topics']),
            'navigationSha256':digest(folder/'navigation-candidate.json'),
            'crosswalkSha256':digest(crosswalk_path),'sourceInventorySha256':digest(inventory_path),
            'published':False,'originalReviewFingerprintsPreserved':True,'studentProgressWritten':0,
            'readyForPublication':False}
    write_json(folder/'navigation-candidate-report.json',report)
    print(json.dumps(report),flush=True)


if __name__=='__main__':main()
