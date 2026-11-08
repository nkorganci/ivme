"""Rank registered MEBI leaf topics from source question content; never auto-assign."""
import argparse
from pathlib import Path
import sys

import numpy as np
from yks_birlestirme import Store,digest,read_json,write_json,signature,process_lock
from yks_konu_adaylari import source_documents,vectors,MODEL
from yks_anahtar_pilotu import api

APP=Path(__file__).resolve().parents[1]


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--subject');args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    record=state['stages']['YKS-04:full'];path=next(root/a['path'] for a in record['artifacts'] if a['path'].endswith('navigation-candidate.json'))
    candidate=read_json(path);crosswalk=read_json(path.parent/'taxonomy-crosswalk.json')
    snapshot=read_json(path.parent/'published-category-snapshot.json')
    documents,_=source_documents(crosswalk['providerNodes'],snapshot['categories'],[])
    documents=[d for d in documents if d['kind']=='PROVIDER_LEAF' and (not args.subject or d['subjectId']==args.subject)]
    node_ids={t['providerNodeId']:t['categoryId'] for c in candidate['navigation'] for u in c['units'] for t in u['topics']}
    cards=[];proofs={}
    for item in read_json(root/'question-cohort/source-crop-report.json')['results']:
        if item['status']!='PREPARED':continue
        file=Path(item['package'])
        if digest(file)!=item['packageSha256']:raise ValueError('Question package changed')
        package=read_json(file)
        selected=[c for c in package['cards'] if not args.subject or c['subjectId']==args.subject]
        if not selected:continue
        proofs[str(file)]=item['packageSha256']
        for card in selected:
            if '\ufffd' in card['text'] or any(__import__('unicodedata').category(c)=='Co' for c in card['text']):continue
            cards.append({**card,'retrievalText':card['subject']+' | '+card['text']})
    if not cards or not documents:raise ValueError('No supported question text or registered topic candidates')
    folder=root/'question-topics'/('all' if not args.subject else args.subject)
    folder.mkdir(parents=True,exist_ok=True)
    model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
    with process_lock(folder/'.writer.lock'):
        array,reused,created=vectors([d['text'] for d in documents]+[c['retrievalText'] for c in cards],model,folder)
        source_vectors=array[:len(documents)];questions=array[len(documents):];rows=[]
        for card,vector in zip(cards,questions):
            scores=source_vectors@vector
            allowed=[i for i,d in enumerate(documents) if d['subjectId']==card['subjectId']
                and d['exam'] in card['printedExamScopes']]
            best=sorted(allowed,key=lambda i:float(scores[i]),reverse=True)[:8]
            choices=[{'categoryId':node_ids[documents[i]['providerNodeIds'][0]],'sourceExam':documents[i]['exam'],
                'subjectId':documents[i]['subjectId'],'unit':documents[i]['unit'],'title':documents[i]['title'],
                'cosine':round(float(scores[i]),6),'providerNodeId':documents[i]['providerNodeIds'][0]} for i in best]
            rows.append({'sourceCode':card['code'],'sourceSha256':card['sourceSha256'],'sourceTextSha256':card['textSha256'],
                'sourceImageSha256':card['imageSha256'],'exam':card['exam'],'subjectId':card['subjectId'],
                'candidates':choices,'decision':'CONTENT_REVIEW_REQUIRED','requiresVisualReading':card['containsGraphics'],
                'teacherApproved':False,'categoryAssignmentWritten':False})
        if any(digest(file)!=sha for file,sha in proofs.items()):raise ValueError('Question text changed during topic retrieval')
        report={'status':'PASS','scope':'REGISTERED_SOURCE_TOPIC_RETRIEVAL_ONLY','subject':args.subject,'questions':len(cards),
            'providerTreeSha256':digest(path),'questionPackages':proofs,'model':MODEL,'modelDigest':model['digest'],
            'cachedEmbeddings':reused,'newEmbeddings':created,'questionBankWrites':0,'categoryAssignmentsWritten':0,
            'teacherApproved':False,'toolSha256':digest(Path(__file__)),'results':rows}
        write_json(folder/'topic-candidates.json',report)
    print(__import__('json').dumps({k:v for k,v in report.items() if k not in ('results','questionPackages')}))


if __name__=='__main__':main()
