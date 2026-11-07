"""Local, cached BGE title/context retrieval for unresolved legacy YKS scopes.

Embeddings rank source-backed candidates only. No catalog, progress or teacher
decision changes; no automatic merge, split or curriculum approval.
"""
import json
import math
from pathlib import Path
import sys
import time

import numpy as np
from yks_birlestirme import Store,digest,read_json,signature,write_json
from yks_anahtar_pilotu import api

APP=Path(__file__).resolve().parents[1]
MODEL='bge-m3:latest'
METHOD='yks-source-title-context-v1'


def source_documents(nodes,categories,unresolved):
    documents=[];units={};by_id={c['id']:c for c in categories}
    for node in nodes:
        subject=by_id.get(node.get('legacyCategoryId'),{}).get('subject') or node['course'].split(' (')[0]
        text=' | '.join([subject,node['unit'],node['title']])
        documents.append({'key':'leaf:'+node['providerNodeId'],'kind':'PROVIDER_LEAF',
              'exam':node['exam'],'subjectId':node['subjectId'],'unit':node['unit'],'title':node['title'],
              'providerNodeIds':[node['providerNodeId']],'sourceUrls':[node['sourceUrl']],'text':text})
        unit_key=(node['exam'],node['subjectId'],node['unit'])
        units.setdefault(unit_key,[]).append(node)
    for (exam,subject,unit),members in sorted(units.items()):
        text=' | '.join([members[0]['course'].split(' (')[0],unit,*[n['title'] for n in members[:14]]])
        documents.append({'key':'unit:'+signature([exam,subject,unit])[:20],'kind':'PROVIDER_UNIT',
              'exam':exam,'subjectId':subject,'unit':unit,'title':unit,
              'providerNodeIds':[n['providerNodeId'] for n in members],
              'sourceUrls':[n['sourceUrl'] for n in members],'text':text})
    legacy=[]
    for identity in unresolved:
        c=by_id[identity['id']]
        text=' | '.join([c['subject'],c.get('unit') or '',c['topic'],*c.get('aliases',[])])
        exams={c['exam']}
        if c.get('excelRowId'):
            exams.update(x['exam'] for x in categories if x.get('excelRowId')==c['excelRowId']
                         and x.get('subjectId')==c['subjectId'] and x.get('canonicalUnit'))
        legacy.append({'id':c['id'],'exam':c['exam'],'subjectId':c['subjectId'],
                       'unit':c.get('unit'),'topic':c['topic'],'text':text,'allowedSourceExams':sorted(exams)})
    return documents,legacy


def vectors(texts,model,folder):
    cache_root=APP/'veri/yks-birlestirme/embedding-cache'/model['digest'][:16]
    cache_root.mkdir(parents=True,exist_ok=True)
    unique=list(dict.fromkeys(texts));found={};pending=[]
    for text in unique:
        key=signature([METHOD,model['digest'],text]);path=cache_root/(key[:32]+'.json')
        if path.is_file():
            record=read_json(path)
            if record['key']!=key or record['modelDigest']!=model['digest'] or record['text']!=text:
                raise ValueError('Embedding cache identity mismatch')
            vector=record['vector']
            if len(vector)!=1024 or not all(math.isfinite(v) for v in vector):
                raise ValueError('Embedding cache values invalid')
            found[text]=vector
        else:pending.append((text,key,path))
    print(f'Topic retrieval: {len(found)} valid cached embeddings, {len(pending)} missing title contexts',flush=True)
    reused=len(found)
    if pending:
        sys.path.insert(0,str(APP.parent/'pipeline'))
        from model_runtime import ModelLease
        with ModelLease(role='yks-topic-retrieval',model=MODEL):
            try:
                for active in api('/api/ps').get('models',[]):
                    if active['name']!=MODEL:api('/api/generate',{'model':active['name'],'keep_alive':0})
                for start in range(0,len(pending),8):
                    batch=pending[start:start+8]
                    response=api('/api/embed',{'model':MODEL,'input':[text for text,key,path in batch],
                                'truncate':False,'keep_alive':'5m'},timeout=180)
                    raw=response['embeddings']
                    if len(raw)!=len(batch) or any(len(v)!=1024 or not all(math.isfinite(x) for x in v) for v in raw):
                        raise ValueError('Local BGE output dimensions/values differ')
                    for (text,key,path),vector in zip(batch,raw):
                        write_json(path,{'key':key,'method':METHOD,'modelDigest':model['digest'],'text':text,'vector':vector})
                        found[text]=vector
                    if (start//8)%10==0 or start+8>=len(pending):
                        write_json(folder/'embedding-progress.json',{'status':'RUNNING','cachedAtStart':reused,
                                   'processedNew':min(start+8,len(pending)),'missingAtStart':len(pending),'modelDigest':model['digest']})
                        print(f'Topic retrieval: {min(start+8,len(pending))}/{len(pending)} new contexts embedded',flush=True)
            finally:
                api('/api/generate',{'model':MODEL,'keep_alive':0},timeout=60)
    array=np.asarray([found[text] for text in texts],dtype=np.float32)
    array/=np.maximum(np.linalg.norm(array,axis=1,keepdims=True),1e-12)
    write_json(folder/'embedding-progress.json',{'status':'PASS','cachedAtStart':reused,
                'processedNew':len(pending),'missingAtStart':len(pending),'modelDigest':model['digest']})
    return array,reused,len(pending)


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    record=state['stages']['YKS-04:full']
    folder0=store.child(state['runId']+'/'+record['artifacts'][0]['path']).parent
    crosswalk=read_json(folder0/'taxonomy-crosswalk.json');snapshot=read_json(folder0/'published-category-snapshot.json')
    unresolved=[r for r in crosswalk['legacyIdentities'] if r['currentlySelectable'] and r['exam'] in ('TYT','AYT')
                and not r['newProviderNodes'] and not r['providerScopeCandidates']]
    documents,legacy=source_documents(crosswalk['providerNodes'],snapshot['categories'],unresolved)
    folder=store.child(state['runId']+'/konu-esleme-adaylari');folder.mkdir(exist_ok=True)
    input_sha=signature([documents,legacy]);model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
    capabilities=api('/api/show',{'model':MODEL}).get('capabilities',[])
    if 'embedding' not in capabilities:raise ValueError('Local BGE model cannot create embeddings')
    all_vectors,reused,created=vectors([r['text'] for r in [*documents,*legacy]],model,folder)
    source_vectors=all_vectors[:len(documents)];old_vectors=all_vectors[len(documents):]
    results=[]
    for category,vector in zip(legacy,old_vectors):
        similarities=source_vectors@vector
        allowed=[i for i,d in enumerate(documents) if d['subjectId']==category['subjectId'] and d['exam'] in category['allowedSourceExams']]
        order=sorted(allowed,key=lambda i:float(similarities[i]),reverse=True)[:8]
        candidates=[]
        for index in order:
            d=documents[index]
            candidates.append({k:v for k,v in d.items() if k!='text'}|{'cosine':round(float(similarities[index]),6)})
        results.append({'legacy':category,'candidates':candidates,'decision':'REVIEW_REQUIRED',
                        'progressTransferAllowed':False,'teacherApproved':False})
    report={'status':'PASS','scope':'SOURCE_BACKED_TITLE_RETRIEVAL_CANDIDATES_ONLY','method':METHOD,
            'model':MODEL,'modelDigest':model['digest'],'inputSha256':input_sha,'sourceCrosswalkSha256':digest(folder0/'taxonomy-crosswalk.json'),
            'legacyScopes':len(legacy),'providerLeavesAndUnits':len(documents),'cachedEmbeddings':reused,'newEmbeddings':created,
            'catalogPublished':False,'studentRowsWritten':0,'automaticMergeDecisions':0,
            'note':'Cosine is a retrieval score, not an approval or correctness probability. Read actual source context before mapping.',
            'results':results}
    write_json(folder/'topic-candidates.json',report)
    print(json.dumps({k:v for k,v in report.items() if k!='results'}),flush=True)


if __name__=='__main__':main()
