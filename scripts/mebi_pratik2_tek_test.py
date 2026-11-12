"""Bind only single-test PDFs whose unique body numbers equal their printed key.

Uses cached native geometry. Multi-test books never match through a shared
question number; every record retains its own source/test identity.
"""
import json
import re
from collections import Counter
from mebi_pratik2_tam_pdf_tarama import BASE
from yks_birlestirme import write_json

KEY = re.compile(r'^\s*(\d{1,3})\s*[.):-]\s*([ABCDE])\s*$')
BODY = re.compile(r'^\s*(\d{1,3})\s*[.)]\s*(.*)$')
TEST = re.compile(r'TARAMA\s+TEST[İIıi]\s*[-–]?\s*(\d+)', re.I)


def bind(document):
    tests=set(); keys={}; bodies={}; invalid=False
    for page in document['pages']:
        for line in page['lines']:
            tests.update(TEST.findall(line['text']))
            match=KEY.fullmatch(line['text'])
            if match:
                number=int(match[1]); value={'answer':match[2],'page':page['physicalPage'],'bbox':line['bbox']}
                if number in keys: invalid=True
                keys[number]=value
            else:
                match=BODY.match(line['text'])
                if match:
                    number=int(match[1])
                    if number in bodies: invalid=True
                    bodies[number]={'page':page['physicalPage'],'bbox':line['bbox'],'startText':line['text']}
    if len(tests)!=1: return None,'TEST_ID_NOT_UNIQUE'
    if invalid:return None,'REPEATED_BODY_OR_KEY_NUMBER'
    if not keys or set(keys)!=set(bodies):return None,'BODY_KEY_NUMBER_SETS_DIFFER'
    if set(keys)!=set(range(1,len(keys)+1)):return None,'NUMBER_SEQUENCE_NOT_CONTIGUOUS'
    if any(keys[n]['page']<=bodies[n]['page'] for n in keys):return None,'KEY_NOT_SEPARATE_AFTER_BODY'
    return {'testNumber':next(iter(tests)), 'questions':[
        {'printedNumber':n,'body':bodies[n],'key':keys[n],
         'status':'SINGLE_TEST_NATIVE_BINDING_REQUIRES_PIXEL_AND_TOPIC_REVIEW','studentVisible':False}
        for n in sorted(keys)]},None


def run():
    coverage=json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))
    selected=[]; review=[];counts=Counter()
    for row in coverage['documents']:
        if 'Deneme-Tarama' not in row['relativePath']:continue
        doc=json.loads((BASE/row['cache']).read_text(encoding='utf8'))
        result,reason=bind(doc)
        identity={'relativePath':row['relativePath'],'sourceSha256':row['sourceSha256'],'cache':row['cache']}
        if result:selected.append({**identity,**result})
        else:
            counts[reason]+=1
            review.append({**identity,'queue':'MEBI_PRACTICE_2_REVIEW_QUEUE','reason':reason,
                'reviewStatus':'TEST_BODY_KEY_BINDING_REVIEW','studentVisible':False})
    output={'status':'SINGLE_TEST_DISCOVERY_COMPLETE','documents':selected,
        'documentCount':len(selected),'questionCandidates':sum(len(r['questions']) for r in selected),
        'reviewQueueAdditions':review,'reviewReasons':dict(counts),'acceptedQuestions':0}
    write_json(BASE/'single-test-bindings.json',output)
    print(json.dumps({k:v for k,v in output.items() if k not in ('documents','reviewQueueAdditions')}))


if __name__=='__main__':run()
