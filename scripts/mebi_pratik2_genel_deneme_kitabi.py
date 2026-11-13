"""Discover MEBİ mock-book bodies by printed mock/exam/footer/key section.

Supports two or four printed key columns. Incorrect exam footers and missing
printed identities remain explicit review records, never guessed from a path.
"""
import json
import re
import time
from collections import defaultdict,Counter
from mebi_pratik2_tam_pdf_tarama import BASE
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json,process_lock
from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf

OUT=BASE/'general-mock-book-discovery'
PAIR=re.compile(r'^\s*(\d{1,3})\s*[.)-]\s*([ABCDE])\s*$')
BODY=re.compile(r'^\s*(\d{1,3})\s*[.)](?:\s|$)')
SECTIONS={
 'turkce testi':'TUR','turkce':'TUR','sosyal bilimler testi':'SOS','sosyal bilimler':'SOS',
 'temel matematik testi':'MAT','temel matematik':'MAT','matematik testi':'MAT','matematik':'MAT',
 'fen bilimleri testi':'FEN','fen bilimleri':'FEN',
 'turk dili ve edebiyati sosyal bilimler 1 testi':'TDE-SB1',
 'sosyal bilimler 2 testi':'SB2','sosyal bilimler testi 2':'SB2',
}


def body_scope(page):
    footers=[]
    for line in page['lines']:
        if line['bbox'][1]<page['rect'][3]*.9:continue
        m=re.fullmatch(r'(TYT|AYT)\s*[•·]\s*(.+)',line['text'].strip(),re.I)
        if m and (section:=SECTIONS.get(normalize(m[2]))):footers.append((m[1].upper(),section,line))
    mocks={int(m[1]) for l in page['lines'] if l['bbox'][1]<75
           and (m:=re.fullmatch(r'(\d{1,2})\s*\.\s*DENEME',l['text'].strip(),re.I))}
    ids={(e,s) for e,s,_ in footers}
    if len(ids)!=1 or len(mocks)!=1:return None
    exam,section=next(iter(ids))
    return exam,next(iter(mocks)),section,footers[0][2]


def key_columns(page):
    lines=page['lines'];text=' '.join(normalize(l['text']) for l in lines)
    if 'cevap anahtar' not in text:return [],[]
    exams={m[1].upper() for l in lines if l['bbox'][1]<125
           for m in re.finditer(r'\((TYT|AYT)\)',l['text'],re.I)}
    mocks={int(m[1]) for l in lines if (m:=re.fullmatch(r'(\d{1,2})\s*\.\s*DENEME\s+CEVAP\s+ANAHTARI',l['text'].strip(),re.I))}
    if len(exams)!=1 or len(mocks)!=1:return [],[{'page':page['physicalPage'],'reason':'PRINTED_KEY_EXAM_OR_MOCK_NOT_UNIQUE'}]
    cells=[{**l,'number':int(m[1]),'answer':m[2]} for l in lines if (m:=PAIR.fullmatch(l['text']))]
    columns=[]
    for cell in sorted(cells,key=lambda l:l['bbox'][0]):
        if not columns or cell['bbox'][0]-columns[-1][0]['bbox'][0]>25:columns.append([])
        columns[-1].append(cell)
    if len(columns) not in (2,4):return [],[{'page':page['physicalPage'],'reason':'PRINTED_KEY_COLUMN_LAYOUT_UNSUPPORTED','columns':len(columns)}]
    centers=[sum((l['bbox'][0]+l['bbox'][2])/2 for l in c)/len(c) for c in columns]
    top=min(l['bbox'][1] for l in cells);headers=[l for l in lines if top-55<l['bbox'][1]<top and not PAIR.fullmatch(l['text'])
        and all(x not in normalize(l['text']) for x in ('deneme','yeterlilik','cevap anahtar'))]
    groups=[];issues=[]
    for index,column in enumerate(columns):
        title_lines=sorted([l for l in headers if min(range(len(centers)),key=lambda i:abs(centers[i]-(l['bbox'][0]+l['bbox'][2])/2))==index],key=lambda l:l['bbox'][1])
        title=' '.join(l['text'].strip() for l in title_lines);section=SECTIONS.get(normalize(title))
        numbers=[c['number'] for c in sorted(column,key=lambda l:l['number'])]
        if not section or len(numbers)<10 or numbers!=list(range(1,max(numbers)+1)):
            issues.append({'page':page['physicalPage'],'reason':'PRINTED_KEY_SECTION_OR_NUMBER_SEQUENCE_NOT_BOUND','heading':title});continue
        groups.append({'exam':next(iter(exams)),'mock':next(iter(mocks)),'sectionId':section,
            'sectionHeading':title,'sectionHeadingLines':title_lines,'answers':sorted(column,key=lambda l:l['number']),
            'keyPage':page['physicalPage'],'status':'PRINTED_MOCK_SECTION_KEY_CANDIDATE_NOT_ADMISSION'})
    return groups,issues


def discover(native):
    groups=defaultdict(list);bodies=defaultdict(list);issues=[];intros=[];key_pages=set()
    for page in native['pages']:
        keys,problems=key_columns(page);issues.extend(problems)
        if keys:key_pages.add(page['physicalPage'])
        for group in keys:groups[(group['exam'],group['mock'],group['sectionId'])].append(group)
    known_exams={identity[0] for identity in groups}
    for page in native['pages']:
        if page['physicalPage'] in key_pages:continue
        scope=body_scope(page)
        if scope is None:continue
        exam,mock,section,footer=scope
        if exam not in known_exams:
            issues.append({'page':page['physicalPage'],'reason':'PRINTED_FOOTER_EXAM_DIFFERS_FROM_BOOK_KEYS','printedFooter':footer});continue
        width,height=page['rect'][2:];anchors=[]
        for l in page['lines']:
            x,y=l['bbox'][:2];m=BODY.match(l['text'])
            if m and 65<y<height-45 and (30<x<48 or width/2+3<x<width/2+40):
                anchors.append({'printedNumber':int(m[1]),'page':page['physicalPage'],'bbox':l['bbox'],'column':int(x>width/2)})
        intro=[l for l in page['lines'] if l['bbox'][1]<75 and ('bu testte' in normalize(l['text']) or re.search(r'\(\d{1,2}-\d{1,2}\)',l['text']))]
        if intro:intros.append({'exam':exam,'mock':mock,'sectionId':section,'page':page['physicalPage'],'lines':intro})
        for a in anchors:
            following=[b['bbox'][1] for b in anchors if b['column']==a['column'] and b['bbox'][1]>a['bbox'][1]+1]
            body={**a,'exam':exam,'mock':mock,'sectionId':section,'columnEndY':min(following)-3 if following else footer['bbox'][1]-4}
            bodies[(exam,mock,section)].append(body)
    bound=[];reviews=[]
    for identity,keys in groups.items():
        if len(keys)!=1:
            reviews.append({'identity':identity,'reason':'REPEATED_PRINTED_MOCK_SECTION_KEY'});continue
        group=keys[0];locations=defaultdict(list)
        for body in bodies.get(identity,[]):locations[body['printedNumber']].append(body)
        for answer in group['answers']:
            possible=locations.get(answer['number'],[])
            if len(possible)==1:
                bound.append({'exam':identity[0],'mock':identity[1],'sectionId':identity[2],'printedNumber':answer['number'],
                              'answer':answer['answer'],'body':possible[0],'keyEvidence':group})
            else:reviews.append({'identity':identity,'printedNumber':answer['number'],'reason':'PRINTED_BODY_NUMBER_NOT_ONE_TO_ONE','bodyLocations':possible})
    return {'candidates':bound,'keyGroups':[g[0] for g in groups.values() if len(g)==1],'layoutIssues':issues,
            'unboundIdentities':reviews,'sectionIntroductions':intros,'boundBodies':len(bound),
            'nativeBodyAnchors':sum(len(x) for x in bodies.values()),'printedAnswerCells':sum(len(g['answers']) for gs in groups.values() for g in gs),
            'questionWrites':0,'modelCalls':0,'allPrintedQuestionsExtracted':False}


def run():
    OUT.mkdir(exist_ok=True);started=time.monotonic();sources=[]
    pdf_decisions=load_decisions();skipped=[]
    documents=json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents']
    for source in documents:
        if 'MEBİ YKS Deneme Kitapları' not in source['relativePath']:continue
        if skip_pdf(source['sourceSha256'],pdf_decisions):
            skipped.append(pdf_decisions[source['sourceSha256']]);continue
        target=OUT/(source['sourceSha256']+'.json')
        if target.exists():result=json.loads(target.read_text(encoding='utf8'))
        else:
            native=json.loads((BASE/source['cache']).read_text(encoding='utf8'))
            result={**source,**discover(native)};write_json(target,result)
        sources.append({k:result[k] for k in ('sourceSha256','relativePath','boundBodies','nativeBodyAnchors','printedAnswerCells')})
        print(json.dumps({'sources':len(sources),'boundBodies':sum(s['boundBodies'] for s in sources),'elapsedSeconds':round(time.monotonic()-started,1)}),flush=True)
    write_json(OUT/'report.json',{'sources':sources,'boundBodies':sum(s['boundBodies'] for s in sources),
        'skippedExistingPdfs':skipped,'questionComparisons':0,
        'questionWrites':0,'modelCalls':0,'status':'GENERAL_MOCK_BOOK_NATIVE_DISCOVERY_NOT_ADMISSION','allPrintedQuestionsExtracted':False})


if __name__=='__main__':
    with process_lock(BASE/'.jobs/general-mock-book-discovery.lock'):run()
