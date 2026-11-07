"""Read one printed diagnostic answer key with text and local vision independently."""
import argparse
import base64
import json
from pathlib import Path
import re
import sys
import time
from urllib.request import Request,urlopen

import pymupdf
from yks_birlestirme import Store, digest, read_json, signature, write_json
from yks_cevap_on_tarama import PAIR

APP=Path(__file__).resolve().parents[1]
BASE='http://127.0.0.1:11434'
MODEL='qwen3.5:9b'
SOURCE='008ffec26b7803aa0f8c612c0c8d2f9cec5ee2d8fd2149778813e17373d61418'
PROMPT='Görsel yalnız basılı bir testin cevap listesidir. Soruları çözme veya cevap tahmin etme. Görselde açıkça görünen soru numarası ve karşısındaki A/B/C/D/E harfini aynen kopyala. Okunamayan satırı uydurma; incomplete=true yaz. JSON: {"incomplete":false,"answers":[{"number":1,"answer":"A"}]}.'
SCHEMA={'type':'object','properties':{'incomplete':{'type':'boolean'},'answers':{'type':'array','items':{'type':'object','properties':{'number':{'type':'integer','minimum':1},'answer':{'type':'string','enum':list('ABCDE')}},'required':['number','answer'],'additionalProperties':False}}},'required':['incomplete','answers'],'additionalProperties':False}


def api(path,payload=None,timeout=600):
    body=json.dumps(payload).encode() if payload is not None else None
    with urlopen(Request(BASE+path,data=body,headers={'Content-Type':'application/json'}),timeout=timeout) as response:
        return json.load(response)


def validate_text_pairs(text):
    rows=[(int(m[1]),m[2]) for m in PAIR.finditer(text)]
    if len(rows)!=12 or [n for n,a in rows]!=list(range(1,13)):
        raise ValueError('Pilot must have exactly twelve sequential printed source answers')
    return [{'number':n,'answer':a} for n,a in rows]


def validate_model(value,expected):
    if value.get('incomplete') is not False:
        raise ValueError('Visual source reading incomplete')
    rows=value['answers']
    if len(rows)!=12 or len({r['number'] for r in rows})!=12:
        raise ValueError('Visual source question-number sequence incomplete/duplicated')
    if sorted(rows,key=lambda r:r['number'])!=expected:
        raise ValueError('Source text and visual answer readings disagree')


def main(prepare_only=False):
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    record=state['stages']['YKS-03:full']
    groups=next(store.child(state['runId']+'/'+a['path']) for a in record['artifacts'] if a['path'].replace('\\','/').endswith('/pdf-groups.jsonl'))
    group=next(g for g in map(json.loads,groups.read_text(encoding='utf-8').splitlines()) if g['sha256']==SOURCE)
    row=group['canonicalCandidate'];source=Path(row['root'])/row['path']
    if row['kind']!='FILE' or digest(source)!=SOURCE:raise ValueError('Pilot source changed')
    folder=store.child(state['runId']+'/pdf-on-tarama/key-pilot/'+SOURCE);folder.mkdir(parents=True,exist_ok=True)
    crop=folder/'printed-key.png'
    with pymupdf.open(source) as document:
        page=document[-1];text=page.get_text()
        expected=validate_text_pairs(text)
        words=page.get_text('words')
        clip=pymupdf.Rect(min(w[0] for w in words)-8,min(w[1] for w in words)-8,
                          max(w[2] for w in words)+8,max(w[3] for w in words)+8)&page.rect
        pixmap=page.get_pixmap(dpi=180,clip=clip,alpha=False)
        pixmap.save(crop)
        physical_page=len(document)
    source_evidence={'sourceSha256':SOURCE,'sourcePath':str(source),'page':physical_page,
                     'cropSha256':digest(crop),'clipPt':list(clip),'textSha256':__import__('hashlib').sha256(text.encode()).hexdigest(),
                     'nativeTextReading':expected,'answerOrigin':'PRINTED_SOURCE_KEY','teacherApproved':False}
    write_json(folder/'source-key.json',source_evidence)
    if prepare_only:
        print(json.dumps({'status':'PREPARED','crop':str(crop),'sourcePage':physical_page}));return
    tags=api('/api/tags')['models'];model=next(m for m in tags if m['name']==MODEL)
    show=api('/api/show',{'model':MODEL})
    if 'vision' not in show.get('capabilities',[]):raise ValueError('Local model has no visual input capability')
    payload={'model':MODEL,'prompt':PROMPT,'images':[base64.b64encode(crop.read_bytes()).decode()],
             'format':SCHEMA,'stream':False,'think':False,'keep_alive':0,
             'options':{'num_ctx':4096,'num_predict':700,'temperature':0}}
    key=signature([model['digest'],PROMPT,SCHEMA,digest(crop),payload['options']])
    cache=folder/(key+'.json')
    if cache.is_file():
        result=read_json(cache);response=result['rawResponse'];cached=True
    else:
        sys.path.insert(0,str(APP.parent/'pipeline'))
        from model_runtime import ModelLease
        with ModelLease(role='yks-key-pilot',model=MODEL):
            for active in api('/api/ps').get('models',[]):
                if active['name']!=MODEL:api('/api/generate',{'model':active['name'],'keep_alive':0})
            start=time.monotonic();response=api('/api/generate',payload)
        result={'model':MODEL,'modelDigest':model['digest'],'cropSha256':digest(crop),
                'prompt':PROMPT,'schema':SCHEMA,'options':payload['options'],
                'wallSeconds':round(time.monotonic()-start,2),'rawResponse':response}
        write_json(cache,result);cached=False
    if response.get('done_reason')=='length':raise ValueError('Visual answer output truncated')
    reading=json.loads(response['response']);validate_model(reading,expected)
    report={'status':'PASS','sourceSha256':SOURCE,'sourcePage':physical_page,'answers':12,
            'methodA':'NATIVE_PRINTED_KEY_TEXT','methodB':'LOCAL_QWEN_PRINTED_KEY_IMAGE',
            'agreement':'TWO_SOURCE_READINGS_AGREE','model':MODEL,'modelDigest':model['digest'],
            'cacheHit':cached,'modelEvidenceSha256':digest(cache),'sourceEvidenceSha256':digest(folder/'source-key.json'),
            'questionsImported':0,'teacherApproved':False,'scope':'ONE_DIAGNOSTIC_KEY_ONLY',
            'nextAction':'Question crops, bank-wide duplicate comparison and controlled topic acceptance are still required'}
    write_json(folder/'key-pilot-report.json',report);print(json.dumps(report))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--prepare-only',action='store_true')
    main(parser.parse_args().prepare_only)
