"""Bind each compiled Tarama book by its own printed test identity.

Identical repeated key evidence is retained as multiple source occurrences;
conflicting letters or repeated body identities remain explicit review cases.
"""
import hashlib
import json
import re
import time
from collections import defaultdict,Counter
from mebi_pratik2_tam_pdf_tarama import BASE
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json

TEST=re.compile(r'\b(?:tyt|ayt)(?: (?:tyt|ayt))? tarama testi\s*(\d+)\b')
CELL=re.compile(r'^\s*(\d{1,3})\s*[.):-]+\s*([ABCDE])\s*$')
BODY=re.compile(r'^\s*(\d{1,3})\s*[.)]\s*')


def discover(native,exam):
    groups={};issues=[]
    for page in native['pages']:
        lines=page['lines'];height=page['rect'][3];width=page['rect'][2];headers=[];pairs=[];anchors=[]
        for line in lines:
            value=normalize(line['text']);match=TEST.search(value)
            if match:headers.append({'test':int(match[1]),**line})
            if cell:=CELL.fullmatch(line['text']):pairs.append({'printedNumber':int(cell[1]),'answer':cell[2],'page':page['physicalPage'],'bbox':line['bbox']})
            elif (body:=BODY.match(line['text'])) and 65<line['bbox'][1]<height-40 and (
                    25<=line['bbox'][0]<=50 or width/2-5<=line['bbox'][0]<=width/2+38):
                anchors.append({'printedNumber':int(body[1]),'page':page['physicalPage'],'bbox':line['bbox'],'text':line['text']})
        if len(pairs)>=6 and not anchors:
            for cell in pairs:
                before=[h for h in headers if h['bbox'][1]<=cell['bbox'][1]+2]
                if not before:
                    issues.append({'page':page['physicalPage'],'cell':cell,'reason':'KEY_CELL_PRINTED_TEST_UNBOUND','studentVisible':False});continue
                closest=min(before,key=lambda h:(cell['bbox'][1]-h['bbox'][1],abs((cell['bbox'][0]+cell['bbox'][2])/2-(h['bbox'][0]+h['bbox'][2])/2)))
                test=closest['test'];g=groups.setdefault(test,{'testNumber':test,'keys':[],'bodies':[],'bodyPages':[],'printedBodyHeadings':[]})
                g['keys'].append({**cell,'printedTestHeading':closest})
            continue
        if pairs and anchors:
            issues.append({'page':page['physicalPage'],'reason':'MIXED_NATIVE_BODY_KEY_PAGE_REVIEW','studentVisible':False});continue
        body_ids={h['test'] for h in headers if h['bbox'][1]<height*.13}
        if len(body_ids)!=1:
            if anchors:issues.append({'page':page['physicalPage'],'observedAnchors':anchors,'reason':'BODY_PRINTED_TEST_NOT_UNIQUE','studentVisible':False})
            continue
        test=next(iter(body_ids));g=groups.setdefault(test,{'testNumber':test,'keys':[],'bodies':[],'bodyPages':[],'printedBodyHeadings':[]})
        g['bodyPages'].append(page['physicalPage']);g['bodies'].extend(anchors)
        for line in lines:
            if line['bbox'][1]<height*.13 and line['text'].lstrip().startswith(('>','•')):
                g['printedBodyHeadings'].append({'page':page['physicalPage'],**line})
    output=[]
    for test,g in sorted(groups.items()):
        keys=defaultdict(list);bodies=defaultdict(list)
        for key in g['keys']:keys[key['printedNumber']].append(key)
        for body in g['bodies']:bodies[body['printedNumber']].append(body)
        reasons=[]
        if not keys or set(keys)!=set(bodies):reasons.append('TEST_BODY_KEY_NUMBER_SETS_DIFFER')
        if keys and set(keys)!=set(range(1,max(keys)+1)):reasons.append('TEST_KEY_SEQUENCE_NOT_CONTIGUOUS')
        if any(len({k['answer'] for k in observations})!=1 for observations in keys.values()):reasons.append('CONFLICTING_PRINTED_KEY_OCCURRENCES')
        if any(len({(b['page'],tuple(b['bbox']),b['text']) for b in observations})!=1 for observations in bodies.values()):reasons.append('REPEATED_BODY_IDENTITY_IN_SAME_PRINTED_TEST')
        questions=[]
        if not reasons:
            for number in sorted(keys):questions.append({'printedNumber':number,'answer':keys[number][0]['answer'],'body':bodies[number][0],
                'keyOccurrences':keys[number],'status':'NATIVE_TEST_BOUND_CANDIDATE_REQUIRES_CROP_TOPIC_AND_INDEPENDENT_KEY','studentVisible':False})
        output.append({**g,'questions':questions,'reasons':reasons,'status':'NATIVE_PRINTED_TEST_BINDING_CANDIDATE' if not reasons else 'REVIEW_REQUIRED','studentVisible':False})
    return output,issues


def run():
    folder=BASE/'compiled-tarama-discovery';folder.mkdir(exist_ok=True)
    coverage=json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents']
    sources=[r for r in coverage if 'MEBİ Tarama Testi Kitapları' in r['relativePath']]
    records=[];started=time.monotonic()
    for index,source in enumerate(sources,1):
        target=folder/(source['sourceSha256']+'.json')
        if target.exists():report=json.loads(target.read_text(encoding='utf8'))
        else:
            native=json.loads((BASE/source['cache']).read_text(encoding='utf8'));exam=source['relativePath'].split('\\')[0]
            groups,issues=discover(native,exam)
            report={**source,'exam':exam,'groups':groups,'reviewQueueAdditions':issues,
                'boundCandidateQuestions':sum(len(g['questions']) for g in groups),'candidateTests':sum(g['status']=='NATIVE_PRINTED_TEST_BINDING_CANDIDATE' for g in groups),
                'reviewTests':sum(g['status']=='REVIEW_REQUIRED' for g in groups),'questionWrites':0}
            write_json(target,report)
        records.append({k:v for k,v in report.items() if k not in ('groups','reviewQueueAdditions')})
        print(json.dumps({'completedBooks':index,'totalBooks':len(sources),'boundCandidates':report['boundCandidateQuestions'],
            'candidateTests':report['candidateTests'],'reviewTests':report['reviewTests'],'elapsedSeconds':round(time.monotonic()-started,2)}),flush=True)
    result={'status':'COMPILED_TARAMA_BINDING_DISCOVERY_COMPLETE_NOT_PUBLICATION','sources':records,
        'books':len(records),'boundCandidateQuestions':sum(r['boundCandidateQuestions'] for r in records),
        'candidateTests':sum(r['candidateTests'] for r in records),'questionWrites':0,'modelCalls':0}
    write_json(folder/'report.json',result);print(json.dumps({k:v for k,v in result.items() if k!='sources'}))


if __name__=='__main__':run()
