"""Check cached native lines against crop boundaries and five option labels.

Geometric checks cannot establish diagram completeness or topic correctness;
they create explicit review reasons and never publish a question.
"""
import json
import re
from collections import Counter
from mebi_pratik2_tam_pdf_tarama import BASE
from yks_birlestirme import write_json


def check(lines, clip):
    x0,y0,x1,y1=clip; contained=[];cut=[]
    for line in lines:
        a,b,c,d=line['bbox']
        if min(c,x1)<=max(a,x0) or min(d,y1)<=max(b,y0):continue
        if a<x0-0.5 or c>x1+0.5 or b<y0-0.5 or d>y1+0.5:cut.append(line)
        else:contained.append(line)
    choices=Counter()
    for line in contained:
        for label in re.findall(r'(?:^|\s)([ABCDE])\)',line['text']): choices[label]+=1
    reasons=[]
    if cut:reasons.append('NATIVE_LINE_INTERSECTS_CROP_BORDER')
    if any(choices[c]!=1 for c in 'ABCDE'):reasons.append('FIVE_UNIQUE_OPTIONS_NOT_PROVEN')
    return {'nativeLinesCut':len(cut),'optionCounts':dict(choices),'reasons':reasons}


def run():
    manifest=BASE/'single-test-crops/manifest.json'
    crops=json.loads(manifest.read_text(encoding='utf8'))['crops'];cache={};rows=[]
    for row in crops:
        sha=row['sourceSha256']
        if sha not in cache:cache[sha]=json.loads((BASE/'full-pdf-native'/(sha+'.json')).read_text(encoding='utf8'))
        page=cache[sha]['pages'][row['bodyPage']-1]
        result=check(page['lines'],row['bodyClip'])
        rows.append({'sourceSha256':sha,'printedNumber':row['printedNumber'],**result,
            'status':'REVIEW_REQUIRED' if result['reasons'] else 'NATIVE_GEOMETRY_ONLY_PASS',
            'studentVisible':False,'diagramAndTopicReviewStillRequired':True})
    result={'status':'GEOMETRY_DISCOVERY_COMPLETE','rows':rows,
        'counts':dict(Counter(r['status'] for r in rows)),'questionWrites':0}
    write_json(BASE/'single-test-crops/geometry-report.json',result)
    print(json.dumps({'status':result['status'],'counts':result['counts']}))


if __name__=='__main__':run()
