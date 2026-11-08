"""Rank registered MEBI leaf topics from source question content; never auto-assign."""
import argparse
from pathlib import Path
import sys

import numpy as np
import pymupdf
from sklearn.feature_extraction.text import TfidfVectorizer
import re
from yks_birlestirme import Store,digest,read_json,write_json,signature,process_lock
from yks_konu_adaylari import source_documents,vectors,MODEL
from yks_anahtar_pilotu import api

APP=Path(__file__).resolve().parents[1]


def question_stem(text):
    return re.split(r'(?:^|\s)A\s*\)',text,maxsplit=1)[0]


def retrieve_registered(embedding_scores,content_scores,documents,card):
    allowed=[i for i,d in enumerate(documents) if d['subjectId']==card['subjectId'] and d['exam']==card['exam']]
    semantic=sorted(allowed,key=lambda i:float(embedding_scores[i]),reverse=True)[:8]
    content=[i for i in sorted(allowed,key=lambda i:float(content_scores[i]),reverse=True)[:4] if content_scores[i]>0]
    return list(dict.fromkeys(semantic+content))


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--subject');args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    record=state['stages']['YKS-04:full'];path=next(root/a['path'] for a in record['artifacts'] if a['path'].endswith('navigation-candidate.json'))
    candidate=read_json(path);crosswalk=read_json(path.parent/'taxonomy-crosswalk.json')
    snapshot=read_json(path.parent/'published-category-snapshot.json')
    documents,_=source_documents(crosswalk['providerNodes'],snapshot['categories'],[])
    documents=[d for d in documents if d['kind']=='PROVIDER_LEAF' and (not args.subject or d['subjectId']==args.subject)]
    node_ids={t['providerNodeId']:t['categoryId'] for c in candidate['navigation'] for u in c['units'] for t in u['topics']}
    nodes={t['providerNodeId']:t for c in candidate['navigation'] for u in c['units'] for t in u['topics']}
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
        texts=[];pdfs={}
        for d in documents:
            node=nodes[d['providerNodeIds'][0]];parts=[d['text']]
            for asset in node['assets']:
                if asset['kind']!='pdf':continue
                source=Path(asset['originalPath']);sha=asset['sourceSha256']
                if sha not in pdfs:
                    if digest(source)!=sha:raise ValueError('MEBI topic PDF changed')
                    with pymupdf.open(source) as document:text='\n'.join(p.get_text(sort=True) for p in document)
                    pdfs[sha]={'path':str(source),'text':text}
                parts.append(pdfs[sha]['text'])
            texts.append('\n'.join(parts))
        lexical=TfidfVectorizer(ngram_range=(1,2),sublinear_tf=True,
            preprocessor=lambda s:s.lower().replace('i\u0307','i'))
        content_matrix=lexical.fit_transform(texts)
        content_scores=(lexical.transform(question_stem(c['text']) for c in cards)@content_matrix.T).toarray()
        array,reused,created=vectors([d['text'] for d in documents]+[c['retrievalText'] for c in cards],model,folder)
        source_vectors=array[:len(documents)];questions=array[len(documents):];rows=[]
        for question_index,(card,vector) in enumerate(zip(cards,questions)):
            scores=source_vectors@vector
            best=retrieve_registered(scores,content_scores[question_index],documents,card)
            choices=[{'categoryId':node_ids[documents[i]['providerNodeIds'][0]],'sourceExam':documents[i]['exam'],
                'subjectId':documents[i]['subjectId'],'unit':documents[i]['unit'],'title':documents[i]['title'],
                'cosine':round(float(scores[i]),6),'topicPdfLexicalScore':round(float(content_scores[question_index,i]),6),
                'providerNodeId':documents[i]['providerNodeIds'][0]} for i in best]
            rows.append({'sourceCode':card['code'],'sourceSha256':card['sourceSha256'],'sourceTextSha256':card['textSha256'],
                'sourceImageSha256':card['imageSha256'],'exam':card['exam'],'subjectId':card['subjectId'],
                'candidates':choices,'decision':'CONTENT_REVIEW_REQUIRED','requiresVisualReading':card['containsGraphics'],
                'teacherApproved':False,'categoryAssignmentWritten':False})
        if any(digest(file)!=sha for file,sha in proofs.items()):raise ValueError('Question text changed during topic retrieval')
        if any(digest(p['path'])!=sha for sha,p in pdfs.items()):raise ValueError('Topic PDF changed during retrieval')
        report={'status':'PASS','scope':'REGISTERED_SOURCE_TOPIC_RETRIEVAL_ONLY','subject':args.subject,'questions':len(cards),
            'providerTreeSha256':digest(path),'questionPackages':proofs,'model':MODEL,'modelDigest':model['digest'],
            'cachedEmbeddings':reused,'newEmbeddings':created,'questionBankWrites':0,'categoryAssignmentsWritten':0,
            'topicPdfSources':{p['path']:sha for sha,p in pdfs.items()},'retrievalPolicy':'TOP_8_BGE_PLUS_TOP_4_NATIVE_TOPIC_PDF_STEM_TFIDF_SAME_EXAM_SUBJECT',
            'teacherApproved':False,'toolSha256':digest(Path(__file__)),'results':rows}
        write_json(folder/'topic-candidates.json',report)
    print(__import__('json').dumps({k:v for k,v in report.items() if k not in ('results','questionPackages','topicPdfSources')}))


if __name__=='__main__':main()
