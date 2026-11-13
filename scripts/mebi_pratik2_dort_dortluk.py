"""Bind Dört Dörtlük printed answer matrices and explicit solved answers.

Column number, row/test variant and chapter are separate source identities.
Discovery never admits a question or invents missing answers. Every missing or
ambiguous body/answer remains an explicit record for the next layout pass.
"""
import hashlib
import json
import re
import time
from collections import defaultdict,Counter
from mebi_pratik2_tam_pdf_tarama import BASE
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json

OUT=BASE/'four-square-discovery-v3'
TOKEN=re.compile(r'^([1-4]) test(?: ([a-z]))?$')
BODY=re.compile(r'^\s*(\d{1,3})\s*[.)](?:\s|$)')
ANSWER=re.compile(r'^\s*Cevap\s*:\s*([ABCDE])\s*$',re.I)


def test_token(text):
    found=TOKEN.fullmatch(normalize(text))
    return found[1]+(found[2].upper() if found[2] else '') if found else None


def answer_matrices(page):
    lines=list(page['lines']);height=page['rect'][3];issues=[];groups=[]
    has_heading='cevap anahtar' in ' '.join(normalize(l['text']) for l in lines if l['bbox'][1]<55)
    # Some official books omit the heading on all answer pages. Printed
    # matrix geometry still has to prove numbered columns and test rows.
    dense_matrix=(sum(bool(test_token(l['text'])) for l in lines)>=2
        and sum(bool(re.fullmatch(r'[ABCDE]',l['text'].strip())) for l in lines)>=10)
    if not has_heading and not dense_matrix:return [],[]
    if page.get('ocrWords'):
        # OCR lines may merge all columns. Individual word boxes preserve
        # the printed column coordinates; the original lines retain titles.
        lines=[l for l in lines if not re.fullmatch(r'(?:\d{1,2}|[ABCDE])',l['text'].strip())]
        lines.extend({'text':w[4],'bbox':w[:4]} for w in page['ocrWords'] if re.fullmatch(r'(?:\d{1,2}|[ABCDE])',w[4]))
    integers=[]
    for line in lines:
        text=line['text'].strip()
        if re.fullmatch(r'\d{1,2}',text) and 50<line['bbox'][1]<height-40 and 1<=int(text)<=40:
            integers.append({**line,'number':int(text)})
    integer_rows=[]
    for cell in sorted(integers,key=lambda c:(c['bbox'][1]+c['bbox'][3])/2):
        y=(cell['bbox'][1]+cell['bbox'][3])/2
        if not integer_rows or abs(y-sum((c['bbox'][1]+c['bbox'][3])/2 for c in integer_rows[-1])/len(integer_rows[-1]))>3:
            integer_rows.append([cell])
        else:integer_rows[-1].append(cell)
    headers=[]
    for cells in integer_rows:
        values={c['number'] for c in cells}
        if len(cells)>=5 and len(values)==len(cells) and values==set(range(1,max(values)+1)):
            headers.append({'y':sum((c['bbox'][1]+c['bbox'][3])/2 for c in cells)/len(cells),'columns':cells})
    if page.get('ocrWords'):
        labels=[]
        for h in headers:
            xs=sorted((c['bbox'][0]+c['bbox'][2])/2 for c in h['columns']);cutoff=xs[0]-(xs[1]-xs[0])*.4
            next_y=min((other['y'] for other in headers if other['y']>h['y']),default=height)
            words=[w for w in page['ocrWords'] if h['y']<((w[1]+w[3])/2)<next_y and (w[0]+w[2])/2<cutoff]
            rows=[]
            for word in sorted(words,key=lambda w:(w[1]+w[3])/2):
                y=(word[1]+word[3])/2
                if not rows or abs(y-sum((w[1]+w[3])/2 for w in rows[-1])/len(rows[-1]))>3:rows.append([word])
                else:rows[-1].append(word)
            for row in rows:
                text=' '.join(w[4] for w in sorted(row,key=lambda w:w[0]))
                if test_token(text):labels.append({'text':text,'bbox':[min(w[0] for w in row),min(w[1] for w in row),max(w[2] for w in row),max(w[3] for w in row)]})
        lines=[l for l in lines if not test_token(l['text'])]+labels
    for line in lines:
        token=test_token(line['text'])
        if not token:continue
        y=(line['bbox'][1]+line['bbox'][3])/2
        preceding=[h for h in headers if h['y']<y]
        if not preceding:
            issues.append({'page':page['physicalPage'],'rowLabel':line,'reason':'MATRIX_NUMBER_HEADER_UNBOUND'});continue
        header=max(preceding,key=lambda h:h['y']);columns=header['columns']
        title_candidates=[l for l in lines if header['y']-48<l['bbox'][1]<header['y']-9 and len(normalize(l['text']))>2
            and not all(t.isdigit() for t in l['text'].split()) and not test_token(l['text']) and 'cevap anahtar' not in normalize(l['text'])
            and not re.match(r'^[1-4]\s*[.]?\s*TEST',l['text'].strip(),re.I)
            and not set(normalize(l['text']).split())<=set('abcde')]
        if not title_candidates:
            issues.append({'page':page['physicalPage'],'rowLabel':line,'reason':'MATRIX_CHAPTER_UNBOUND'});continue
        nearest=max(l['bbox'][1] for l in title_candidates)
        title_lines=[l for l in title_candidates if nearest-l['bbox'][1]<16]
        title_lines=sorted(title_lines,key=lambda l:(l['bbox'][1],l['bbox'][0]))
        chapter=' '.join(l['text'].strip() for l in title_lines)
        xs=sorted((c['bbox'][0]+c['bbox'][2])/2 for c in columns)
        spacing=min(b-a for a,b in zip(xs,xs[1:]));answers=defaultdict(list)
        for cell in lines:
            if not re.fullmatch(r'[ABCDE]',cell['text'].strip()):continue
            cy=(cell['bbox'][1]+cell['bbox'][3])/2
            if abs(cy-y)>3.5:continue
            cx=(cell['bbox'][0]+cell['bbox'][2])/2
            column=min(columns,key=lambda c:abs((c['bbox'][0]+c['bbox'][2])/2-cx))
            if abs((column['bbox'][0]+column['bbox'][2])/2-cx)>spacing*.35:continue
            answers[column['number']].append({'answer':cell['text'].strip(),'bbox':cell['bbox'],
                'numberBBox':column['bbox'],'page':page['physicalPage']})
        bound=[];conflicts=[]
        for number,occurrences in sorted(answers.items()):
            letters={r['answer'] for r in occurrences}
            if len(occurrences)!=1 or len(letters)!=1:conflicts.append(number);continue
            bound.append({'printedNumber':number,**occurrences[0]})
        if not bound:
            issues.append({'page':page['physicalPage'],'rowLabel':line,'reason':'MATRIX_HAS_NO_UNIQUE_ANSWER_CELLS'});continue
        groups.append({'chapter':chapter,'chapterKey':normalize(chapter),'testToken':token,'keyPage':page['physicalPage'],
            'rowLabelBBox':line['bbox'],'chapterLines':title_lines,'numberHeader':columns,'answers':bound,
            'conflictingNumbers':conflicts,'status':'NATIVE_PRINTED_MATRIX_ROW_BOUND_NOT_ADMISSION'})
    return groups,issues


def body_header(page):
    width=page['rect'][2];top=[l for l in page['lines'] if l['bbox'][1]<65 and l['text'].strip()]
    titles={normalize(l['text']):l for l in top if 15<l['bbox'][1]<56
        and width*.25<(l['bbox'][0]+l['bbox'][2])/2<width*.75
        and not re.fullmatch(r'\d+',l['text'].strip()) and len(normalize(l['text']))>2
        and 'test' not in normalize(l['text']) and 'sorular' not in normalize(l['text'])}
    if not titles:return None
    ordered=sorted(titles.values(),key=lambda l:(l['bbox'][1],l['bbox'][0]))
    chapter=' '.join(l['text'].strip() for l in ordered)
    if any('cozumlu' in normalize(l['text']) for l in top):return chapter,'SOLVED'
    tokens={token for l in top if (token:=test_token(l['text']))}
    if not tokens:
        # Opening pages print a large numeral and the word TEST separately;
        # the variant letter is another printed object at the far right.
        test_present=any(normalize(l['text'])=='test' and l['bbox'][0]>width*.8 for l in top)
        numbers={l['text'].strip() for l in top if re.fullmatch(r'[1-4]',l['text'].strip()) and l['bbox'][0]>width*.8}
        variants={l['text'].strip() for l in top if re.fullmatch(r'[A-Z]',l['text'].strip()) and l['bbox'][0]>width*.9}
        if test_present and len(numbers)==1 and len(variants)<=1:tokens={next(iter(numbers))+(next(iter(variants)) if variants else '')}
    return (chapter,next(iter(tokens))) if len(tokens)==1 else None


def discover(native):
    matrices=defaultdict(list);bodies=defaultdict(list);solved=[];issues=[];key_pages=set()
    known_titles={normalize(h[0]) for p in native['pages'] if (h:=body_header(p))}
    for page in native['pages']:
        groups,problems=answer_matrices(page);issues.extend(problems)
        if groups:key_pages.add(page['physicalPage'])
        for group in groups:
            if group['chapterKey'] not in known_titles:
                suffix=re.sub(r'^\s*\d{1,2}\s*[.)]\s*','',group['chapter'])
                if normalize(suffix) in known_titles:
                    group['chapterKey']=normalize(suffix);group['printedChapterIndexRemovedForBodyIdentity']=True
            matrices[(group['chapterKey'],group['testToken'])].append(group)
    for page in native['pages']:
        if page['physicalPage'] in key_pages:continue
        header=body_header(page)
        if not header:continue
        chapter,token=header;width=page['rect'][2];height=page['rect'][3];anchors=[]
        for line in page['lines']:
            match=BODY.match(line['text'])
            x,y=line['bbox'][:2]
            if match and 60<y<height-40 and (28<=x<=54 or width/2+4<=x<=width/2+38):
                anchors.append({'printedNumber':int(match[1]),'page':page['physicalPage'],'bbox':line['bbox'],'text':line['text']})
        for anchor in anchors:
            column=anchor['bbox'][0]>width/2;nexts=[a['bbox'][1] for a in anchors if (a['bbox'][0]>width/2)==column and a['bbox'][1]>anchor['bbox'][1]+1]
            end=min(nexts)-3 if nexts else height-39
            row={**anchor,'chapter':chapter,'chapterKey':normalize(chapter),'testToken':token,'column':int(column),'columnEndY':end}
            if token=='SOLVED':
                labels=[l for l in page['lines'] if normalize(l['text']).startswith('cozum') and (l['bbox'][0]>width/2)==column and anchor['bbox'][1]<l['bbox'][1]<end]
                answers=[l for l in page['lines'] if ANSWER.fullmatch(l['text']) and (l['bbox'][0]>width/2)==column and anchor['bbox'][1]<l['bbox'][1]<end]
                if len(labels)==1 and len(answers)==1:
                    solved.append({**row,'answer':ANSWER.fullmatch(answers[0]['text'])[1].upper(),'answerBBox':answers[0]['bbox'],
                        'solutionStartBBox':labels[0]['bbox'],'status':'NATIVE_EXPLICIT_SOLVED_ANSWER_BOUND_NOT_ADMISSION'})
                else:issues.append({**row,'reason':'SOLVED_BODY_SOLUTION_OR_PRINTED_ANSWER_REQUIRES_CONTINUATION'})
            else:bodies[(normalize(chapter),token)].append(row)
    groups=[]
    for identity,key_rows in sorted(matrices.items()):
        if len(key_rows)!=1:
            issues.append({'chapterKey':identity[0],'testToken':identity[1],'reason':'REPEATED_MATRIX_ROW_IDENTITY','keyRows':key_rows});continue
        key=key_rows[0];by_number=defaultdict(list)
        for body in bodies.get(identity,[]):by_number[body['printedNumber']].append(body)
        questions=[]
        for answer in key['answers']:
            locations=by_number.get(answer['printedNumber'],[])
            if len(locations)==1:questions.append({**answer,'body':locations[0]})
            else:issues.append({'chapter':key['chapter'],'testToken':key['testToken'],'answer':answer,'reason':'MATRIX_BODY_NUMBER_NOT_UNIQUE_OR_MISSING','bodyLocations':locations})
        groups.append({**key,'questions':questions,'unmatchedBodyNumbers':sorted(set(by_number)-{r['printedNumber'] for r in key['answers']}),
            'status':'NATIVE_CHAPTER_TEST_MATRIX_BODY_CANDIDATES_NOT_ADMISSION'})
    known=set(matrices)
    for identity,rows in bodies.items():
        if identity not in known:issues.append({'chapterKey':identity[0],'testToken':identity[1],'bodyLocations':rows,'reason':'PRINTED_BODY_CHAPTER_TEST_HAS_NO_BOUND_MATRIX_ROW'})
    return {'groups':groups,'solvedQuestions':solved,'reviewQueueAdditions':issues,
        'matrixRows':sum(len(v) for v in matrices.values()),'matrixAnswerCells':sum(len(g['answers']) for g in groups),
        'boundMatrixBodies':sum(len(g['questions']) for g in groups),'boundSolvedBodies':len(solved)}


def run():
    OUT.mkdir(exist_ok=True);docs=json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents'];sources=[];counts=Counter();started=time.monotonic()
    for source in docs:
        if 'Konu Pekiştirme Testleri' not in source['relativePath']:continue
        target=OUT/(source['sourceSha256']+'.json')
        if target.exists():result=json.loads(target.read_text(encoding='utf8'))
        else:
            native=json.loads((BASE/source['cache']).read_text(encoding='utf8'))
            for page in native['pages']:
                if page['readingStatus']!='VISUAL_REVIEW_REQUIRED':continue
                stem=source['sourceSha256']+f"-p{page['physicalPage']:04}"
                reading=BASE/'visual-page-discovery'/(stem+'.json');word_path=BASE/'visual-page-discovery'/(stem+'.words.json')
                if reading.exists() and word_path.exists():
                    ocr=json.loads(reading.read_text(encoding='utf8'));words=json.loads(word_path.read_text(encoding='utf8'))
                    if ocr.get('imageSha256')!=words['imageSha256']:raise ValueError('OCR geometry input differs')
                    page['lines']=ocr['lines'];page['ocrWords']=words['words'];page['firstReadingMethod']='ORIGINAL_PIXEL_OCR_NOT_NATIVE_TEXT'
            result={**source,**discover(native),'questionWrites':0,'teacherApprovalsCreated':0,'productionImportAllowed':False}
            write_json(target,result)
        row={k:result[k] for k in ['relativePath','sourceSha256','matrixRows','matrixAnswerCells','boundMatrixBodies','boundSolvedBodies']}
        sources.append(row)
        for k in ['matrixRows','matrixAnswerCells','boundMatrixBodies','boundSolvedBodies']:counts[k]+=row[k]
        print(json.dumps({'sources':len(sources),'counts':dict(counts),'elapsedSeconds':round(time.monotonic()-started,1)}),flush=True)
    report={'status':'FOUR_SQUARE_NATIVE_BINDING_DISCOVERY_NOT_ADMISSION','sources':sources,'counts':dict(counts),
        'allPrintedQuestionsExtracted':False,'questionWrites':0,'teacherApprovalsCreated':0}
    write_json(OUT/'report.json',report)


if __name__=='__main__':run()
