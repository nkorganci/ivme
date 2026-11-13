"""Discover 3 Adım chapter/step-scoped printed keys and question anchors.

Repeated question numbers in different chapters/steps are independent. No
source is rejected just because it needs this different layout adapter.
Discovery is not crop, independent answer-reading, topic or publication proof.
"""
import json
import re
import time
from collections import Counter,defaultdict
from mebi_pratik2_tam_pdf_tarama import BASE
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json

CELL=re.compile(r'^\s*(\d{1,3})\s*[-–—.:]\s*([ABCDE])\s*$')
STEP=re.compile(r'^\s*([123])\s*[.]\s*ADIM(?:\s*[-–]?\s*([AB]))?\s*$')
HEADER_STEP=re.compile(r'([123])\s*[.]\s*ADIM(?:\s*[-–]?\s*([AB])\b)?')
BODY=re.compile(r'^\s*(\d{1,3})\s*[.)]\s*')


def discover(doc):
    pages=doc['pages'];groups={};issues=[];key_pages=set();headings={}
    for page in pages:
        lines=page['lines'];steps=[];cells=[]
        for line in lines:
            if m:=STEP.fullmatch(line['text'].strip().upper().replace('İ','I')):
                steps.append({'step':int(m[1]),'stepVariant':m[2] or '', 'stepToken':m[1]+(m[2] or ''),**line})
            if m:=CELL.fullmatch(line['text']):cells.append({'number':int(m[1]),'answer':m[2],**line})
        if len(cells)<6 or {r['step'] for r in steps}!={1,2,3}:continue
        key_pages.add(page['physicalPage'])
        title_for={}
        for step in steps:
            if step['step']!=1:continue
            candidates=[l for l in lines if l['text'].strip() and
                step['bbox'][1]-65<l['bbox'][1]<step['bbox'][1]-3 and
                step['bbox'][0]-8<=l['bbox'][0]<=step['bbox'][0]+100 and
                not CELL.fullmatch(l['text']) and not STEP.fullmatch(l['text'].strip().upper().replace('İ','I')) and
                normalize(l['text']) not in {'tyt','ayt','cevap anahtari','turkce','matematik','fizik','kimya','biyoloji','tarih','cografya','felsefe'} and
                not l['text'].strip().isdigit()]
            if not candidates:continue
            title=max(candidates,key=lambda l:l['bbox'][1]);chapter=normalize(title['text'])
            title_for[id(step)]=(chapter,title)
            headings.setdefault(chapter,title['text'].strip())
        for step in steps:
            previous=[s for s in steps if s['step']==1 and s['bbox'][1]<=step['bbox'][1]+2 and abs(s['bbox'][0]-step['bbox'][0])<10 and id(s) in title_for]
            if not previous:continue
            first=max(previous,key=lambda s:s['bbox'][1]);chapter,title=title_for[id(first)]
            key=(chapter,step['stepToken']);group=groups.setdefault(key,{'chapter':headings[chapter],'chapterKey':chapter,'step':step['step'],'stepVariant':step['stepVariant'],'stepToken':step['stepToken'],'keys':[],'bodies':[],'bodyPages':[]})
            cy=(step['bbox'][1]+step['bbox'][3])/2
            row_cells=[cell for cell in cells if cell['bbox'][0]>step['bbox'][2]-2 and abs((cell['bbox'][1]+cell['bbox'][3])/2-cy)<9]
            # Keep only the table starting at this row label when a second
            # same-height table appears to its right.
            right_labels=[s['bbox'][0] for s in steps if s['bbox'][0]>step['bbox'][0]+20 and abs((s['bbox'][1]+s['bbox'][3])/2-cy)<9]
            if right_labels:row_cells=[c for c in row_cells if c['bbox'][0]<min(right_labels)]
            for cell in row_cells:group['keys'].append({'printedNumber':cell['number'],'answer':cell['answer'],'page':page['physicalPage'],'bbox':cell['bbox']})
            group.setdefault('keyRows',[]).append({'page':page['physicalPage'],'chapterBBox':title['bbox'],'stepBBox':step['bbox']})
    active=None
    for page in pages:
        if page['physicalPage'] in key_pages:continue
        lines=page['lines'];header=' '.join(l['text'] for l in lines if l['bbox'][1]<80 and l['bbox'][0]>page['rect'][2]*.65)
        values={m[1]+(m[2] or '') for m in HEADER_STEP.finditer(header.upper().replace('İ','I'))}
        if len(values)!=1:continue
        step=next(iter(values))
        title_lines=sorted([l for l in lines if 35<l['bbox'][1]<95 and 40<l['bbox'][0]<page['rect'][2]-80],key=lambda l:(l['bbox'][1],l['bbox'][0]))
        titles=set()
        for start in range(len(title_lines)):
            for length in (1,2,3):
                chunk=title_lines[start:start+length]
                if len(chunk)!=length:continue
                if any(b['bbox'][1]-a['bbox'][1]>20 for a,b in zip(chunk,chunk[1:])):continue
                text=normalize(' '.join(l['text'] for l in chunk));variant=''
                if text not in headings and text.endswith((' a',' b')):text,variant=text[:-2],text[-1].upper()
                if text in headings:titles.add((text,variant))
        if len(titles)==1:
            chapter,variant=next(iter(titles));active=(chapter,step[0]+variant if variant else step)
        elif len(titles)>1:active=None
        elif active and (active[1][0]!=step[0] or len(step)>1 and active[1]!=step):active=None
        if not active or active not in groups:
            issues.append({'page':page['physicalPage'],'reason':'PRINTED_CHAPTER_STEP_NOT_BOUND','studentVisible':False});continue
        group=groups[active];group['bodyPages'].append(page['physicalPage'])
        # Number anchors occupy the left edge of either printed column.
        for line in lines:
            box=line['bbox']
            if not 48<box[1]<page['rect'][3]-40:continue
            if not (25<=box[0]<=48 or 295<=box[0]<=325):continue
            if m:=BODY.match(line['text']):group['bodies'].append({'printedNumber':int(m[1]),'page':page['physicalPage'],'bbox':box,'text':line['text']})
    rows=[]
    for key,group in groups.items():
        keys=[r['printedNumber'] for r in group['keys']];bodies=[r['printedNumber'] for r in group['bodies']]
        reasons=[]
        if len(keys)!=len(set(keys)):reasons.append('REPEATED_KEY_IN_SAME_CHAPTER_STEP')
        if len(bodies)!=len(set(bodies)):reasons.append('REPEATED_BODY_IN_SAME_CHAPTER_STEP')
        if not keys or set(keys)!=set(bodies):reasons.append('BODY_KEY_SETS_DIFFER_IN_CHAPTER_STEP')
        if keys and set(keys)!=set(range(1,max(keys)+1)):reasons.append('KEY_SEQUENCE_NOT_CONTIGUOUS')
        rows.append({**group,'status':'NATIVE_CHAPTER_STEP_BINDING_CANDIDATE' if not reasons else 'REVIEW_REQUIRED',
            'reasons':reasons,'studentVisible':False,'verifiedAnswers':False})
    return rows,issues


def run():
    out=BASE/'three-step-discovery-v3';out.mkdir(exist_ok=True)
    documents=json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents']
    selected=[r for r in documents if '3 Adım Soru Bankası' in r['relativePath']]
    sources=[];started=time.monotonic()
    for index,source in enumerate(selected,1):
        target=out/(source['sourceSha256']+'.json')
        if target.exists():result=json.loads(target.read_text(encoding='utf8'))
        else:
            native=json.loads((BASE/source['cache']).read_text(encoding='utf8'));groups,issues=discover(native)
            result={**source,'groups':groups,'reviewQueueAdditions':issues,
                'candidateQuestions':sum(len(g['keys']) for g in groups if g['status']=='NATIVE_CHAPTER_STEP_BINDING_CANDIDATE'),
                'candidateGroups':sum(g['status']=='NATIVE_CHAPTER_STEP_BINDING_CANDIDATE' for g in groups),
                'reviewGroups':sum(g['status']=='REVIEW_REQUIRED' for g in groups),'questionWrites':0}
            write_json(target,result)
        sources.append({k:v for k,v in result.items() if k not in ('groups','reviewQueueAdditions')})
        print(json.dumps({'completed':index,'total':len(selected),'percent':round(100*index/len(selected),2),
            'candidateQuestions':result['candidateQuestions'],'candidateGroups':result['candidateGroups'],'reviewGroups':result['reviewGroups'],
            'elapsedSeconds':round(time.monotonic()-started,2)}),flush=True)
    report={'status':'CHAPTER_STEP_DISCOVERY_COMPLETE_NOT_QUESTION_ACCEPTANCE','sources':sources,
        'books':len(sources),'candidateQuestions':sum(s['candidateQuestions'] for s in sources),
        'candidateGroups':sum(s['candidateGroups'] for s in sources),'questionWrites':0}
    write_json(out/'report.json',report);print(json.dumps({k:v for k,v in report.items() if k!='sources'}))


if __name__=='__main__':run()
