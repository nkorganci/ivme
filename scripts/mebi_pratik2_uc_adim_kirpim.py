"""Prepare source-pixel crops for chapter/step-bound 3 Adım questions.

Fully native text, five complete options and absence of shared context or
graphics are proved mechanically. Other intact crops require local visual
review. Neither path bypasses the independent printed-key reading gate.
"""
import argparse
import hashlib
import json
import re
import time
from collections import Counter
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json

OUT=BASE/'three-step-crops'
OPTION=re.compile(r'(?<!\w)([ABCDE])\s*\)')
SHARED=re.compile(r'(\d{1,3})\s*[.]?\s*(?:[-–—]|ve)\s*(\d{1,3})\s*[.]?\s*sorular',re.I)
TEXT_SUBJECTS={'Türkçe','Türk Dili ve Edebiyatı','Edebiyat','Tarih','Felsefe','Psikoloji','Sosyoloji','Mantık'}
TURKCE={
 'ana dusunce':'Paragrafta Anlam','yardimci dusunce':'Paragrafta Anlam','coklu paragraf':'Paragrafta Anlam',
 'paragrafta anlatim':'Paragrafta Anlam','paragraf yapi':'Paragrafın Yapısı',
 'sozcukte yapi':'Biçim Bilgisi','ses olaylari':'Ses Bilgisi','cumlenin ogeleri':'Cümlenin Öğeleri',
 'sozcuk turleri isim ad':'İsim Soylu Sözcükler','sozcuk turleri sifat on ad':'İsim Soylu Sözcükler',
 'sozcuk turleri zamir adil':'İsim Soylu Sözcükler','sozcuk turleri zarf belirtec':'İsim Soylu Sözcükler',
 'sozcuk turleri edat ilgec baglac unlem':'İsim Soylu Sözcükler','tamlamalar':'İsim Soylu Sözcükler',
}


def scope(source,categories):
    exam=source['relativePath'].split('\\')[0]
    filename=normalize(source['relativePath'].split('\\')[-1])
    subjects={c['subject'] for c in categories if c['exam']==exam}
    found={s for s in subjects if normalize(s) in filename}
    if 'matematik' in filename:found|={'Matematik','Geometri'}
    if 'felsefe grubu' in filename:found|={'Felsefe','Psikoloji','Sosyoloji','Mantık'}
    return exam,found


def topic(group,exam,subjects,categories):
    title=re.sub(r'\s*[-–]\s*\d+\s*$','',group['chapter']).strip();normalized=normalize(title)
    if 'Türkçe' in subjects:title=TURKCE.get(normalized,title)
    possible=[c for c in categories if c['id'].startswith('excel.') and c['exam']==exam and c['subject'] in subjects and c.get('selectable') and normalize(c['topic'])==normalize(title)]
    return possible[0] if len(possible)==1 else None


def page_graphics(page):
    """Ignore only the known page header/footer and central column separator."""
    body=pymupdf.Rect(0,48,page.rect.width,page.rect.height-45)
    text_rects=[pymupdf.Rect(line['bbox']) for block in page.get_text('dict')['blocks'] for line in block.get('lines',[])
        if ''.join(span['text'] for span in line['spans']).strip()]
    for image in page.get_image_info():
        rect=pymupdf.Rect(image['bbox'])
        if rect.width>page.rect.width*.8 and rect.height<40 and (rect.y1<60 or rect.y0>page.rect.height-60):continue
        if body.intersects(rect):return True
    for drawing in page.get_drawings():
        rect=pymupdf.Rect(drawing['rect'])
        # PyMuPDF treats zero-height/width path rectangles as empty; expand
        # for intersection so an actual graph axis cannot silently disappear.
        hit=pymupdf.Rect(rect.x0-.1,rect.y0-.1,rect.x1+.1,rect.y1+.1)
        if not body.intersects(hit):continue
        if rect.width<2 and abs(rect.x0-page.rect.width/2)<4:continue
        # Short horizontal underlines beneath words remain original source
        # pixels; all other drawn content uses the visual-review route.
        if rect.height<1.5 and drawing['type']=='s' and any(t.x0-1<=rect.x0 and t.x1+1>=rect.x1 and t.y0<=rect.y0<=t.y1+3 for t in text_rects):continue
        return True
    return False


def run(include_topic_review=False):
    out=BASE/('three-step-all-bodies-v2' if include_topic_review else 'three-step-crops')
    out.mkdir(exist_ok=True);(BASE/'three-step-crops').mkdir(exist_ok=True)
    categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    sources=json.loads((BASE/'three-step-discovery-v3/report.json').read_text(encoding='utf8'))['sources']
    results=[];started=time.monotonic()
    for index,source in enumerate(sources,1):
        target=out/(source['sourceSha256']+'.json')
        if target.exists():report=json.loads(target.read_text(encoding='utf8'))
        else:
            discovery=json.loads((BASE/'three-step-discovery-v3'/(source['sourceSha256']+'.json')).read_text(encoding='utf8'))
            native=json.loads((BASE/source['cache']).read_text(encoding='utf8'));pages={p['physicalPage']:p for p in native['pages']}
            exam,subjects=scope(source,categories);items=[];review=[];groups=[]
            path=(SOURCE/source['relativePath']).resolve()
            if not path.is_relative_to(SOURCE):raise ValueError('Source leaves MEBI root')
            with path.open('rb') as stream:
                if hashlib.file_digest(stream,'sha256').hexdigest()!=source['sourceSha256']:raise ValueError('Original source changed')
            with pymupdf.open(path) as pdf:
                graphics={};page_anchors={}
                for group in discovery['groups']:
                    for anchor in group['bodies']:page_anchors.setdefault(anchor['page'],[]).append(anchor)
                for group in discovery['groups']:
                    category=topic(group,exam,subjects,categories)
                    identity=hashlib.sha256((group['chapterKey']+'|'+group['stepToken']).encode()).hexdigest()[:10]
                    group_id=source['sourceSha256'][:16]+'-'+identity
                    if group['status']!='NATIVE_CHAPTER_STEP_BINDING_CANDIDATE' or (not category and not include_topic_review):
                        review.append({'sourceSha256':source['sourceSha256'],'relativePath':source['relativePath'],'groupId':group_id,
                            'chapter':group['chapter'],'stepToken':group['stepToken'],'keys':group['keys'],'bodies':group['bodies'],
                            'reasons':group['reasons']+([] if category else ['CONTROLLED_TOPIC_NOT_UNIQUE']),
                            'status':'REVIEW_REQUIRED','studentVisible':False});continue
                    if len({r['page'] for r in group['keys']})!=1:
                        review.append({'groupId':group_id,'reasons':['KEY_ROW_SPANS_PAGES'],'studentVisible':False});continue
                    page_number=group['keys'][0]['page'];key_page=pdf[page_number-1]
                    row=group['keyRows'][0];key_clip=[max(0,row['chapterBBox'][0]-8),max(0,row['chapterBBox'][1]-5),
                        key_page.rect.width-30,max(r['bbox'][3] for r in group['keys'])+5]
                    key_relative=out.name+'/'+group_id+'-key.png';key_pix=key_page.get_pixmap(matrix=pymupdf.Matrix(3,3),clip=pymupdf.Rect(key_clip),alpha=False)
                    key_pix.save(BASE/key_relative);key_sha=hashlib.sha256((BASE/key_relative).read_bytes()).hexdigest()
                    groups.append({'groupId':group_id,'sourceSha256':source['sourceSha256'],'relativePath':source['relativePath'],
                        'chapter':group['chapter'],'stepToken':group['stepToken'],'categoryId':category['id'] if category else None,
                        'keyPage':page_number,'keyClip':key_clip,'keyImage':key_relative,'keyImageSha256':key_sha,
                        'answers':{str(r['printedNumber']):r['answer'] for r in group['keys']}})
                    keys={r['printedNumber']:r for r in group['keys']}
                    for anchor in group['bodies']:
                        number=anchor['printedNumber'];physical=anchor['page'];page=pdf[physical-1];cache=pages[physical]
                        code=f'MEBI2-{source["sourceSha256"][:12]}-{identity}-Q{number:03}'
                        column=int(anchor['bbox'][0]>page.rect.width/2)
                        following=[a['bbox'][1] for a in page_anchors[physical] if int(a['bbox'][0]>page.rect.width/2)==column and a['bbox'][1]>anchor['bbox'][1]+1]
                        clip=pymupdf.Rect(page.rect.width/2+1 if column else 0,anchor['bbox'][1]-4,
                            page.rect.width if column else page.rect.width/2-1,min(following)-4 if following else page.rect.height-35)
                        reasons=[]
                        for line in cache['lines']:
                            for match in SHARED.finditer(line['text']):
                                if int(match[1])<=number<=int(match[2]):reasons.append('SHARED_CONTEXT_REQUIRES_SEPARATE_REGIONS')
                        selected=[]
                        for line in cache['lines']:
                            rect=pymupdf.Rect(line['bbox'])
                            if not line['text'].strip() or not clip.intersects(rect):continue
                            if rect.x0<clip.x0-.25 or rect.x1>clip.x1+.25 or rect.y0<clip.y0-.25 or rect.y1>clip.y1+.25:
                                reasons.append('NATIVE_LINE_INTERSECTS_CROP_BOUNDARY')
                            selected.append(line)
                        choices=Counter(letter for line in selected for letter in OPTION.findall(line['text']))
                        if any(choices[c]!=1 for c in 'ABCDE'):reasons.append('FIVE_UNIQUE_NATIVE_CHOICES_NOT_PROVED')
                        subject=category['subject'] if category else next(iter(subjects)) if len(subjects)==1 else None
                        base={'code':code,'groupId':group_id,'sourceSha256':source['sourceSha256'],'relativePath':source['relativePath'],
                            'printedNumber':number,'testNumber':group['chapter']+' / '+group['stepToken'],'exam':exam,
                            'subject':subject,'subjectCandidates':sorted(subjects),'subjectId':category['subjectId'] if category else None,'categoryId':category['id'] if category else None,
                            'unit':category.get('unit') if category else group['chapter'],'topic':category['topic'] if category else group['chapter'],
                            'topicDecision':'CONTROLLED_TOPIC_BOUND' if category else 'CONTROLLED_TOPIC_REVIEW_PENDING','bodyPage':physical,'bodyClip':list(clip),
                            'keyPage':page_number,'keyClip':key_clip,'keyCellBBox':keys[number]['bbox'],'answer':keys[number]['answer'],
                            'keyImage':key_relative,'keyImageSha256':key_sha,'bank':'MEBI_PRACTICE_2','teacherApproved':False,'studentVisible':False}
                        if reasons:
                            review.append({**base,'reasons':sorted(set(reasons)),'status':'REVIEW_REQUIRED'});continue
                        relative=out.name+'/'+code+'.png';pix=page.get_pixmap(matrix=pymupdf.Matrix(2,2),clip=clip,alpha=False);pix.save(BASE/relative)
                        saved=pymupdf.Pixmap(str(BASE/relative))
                        if saved.samples!=pix.samples:raise ValueError('Original rendered pixels differ after encoding')
                        if physical not in graphics:graphics[physical]=page_graphics(page)
                        native_proof=subject in TEXT_SUBJECTS and not graphics[physical]
                        items.append({**base,'image':relative,'imageSha256':hashlib.sha256((BASE/relative).read_bytes()).hexdigest(),
                            'originalBodyPixelSha256':hashlib.sha256(pix.samples).hexdigest(),
                            'nativeBodyProof':{'uniqueChoiceCounts':dict(choices),'wholeNativeLineCount':len(selected),'pageGraphics':graphics[physical],
                                'status':'FULL_NATIVE_TEXT_NO_SHARED_CONTEXT_OR_GRAPHICS' if native_proof else 'LOCAL_VISUAL_BODY_REVIEW_REQUIRED'},
                            'status':'INDEPENDENT_PRINTED_KEY_READING_REQUIRED','productionImportAllowed':False})
            report={**source,'items':items,'keyGroups':groups,'reviewQueueAdditions':review,'preparedBodies':len(items),
                'nativeBodyProofs':sum(r['nativeBodyProof']['status']=='FULL_NATIVE_TEXT_NO_SHARED_CONTEXT_OR_GRAPHICS' for r in items),
                'independentKeysVerified':False,'questionWrites':0}
            write_json(target,report)
        results.append({k:v for k,v in report.items() if k not in ('items','keyGroups','reviewQueueAdditions')})
        print(json.dumps({'completedBooks':index,'totalBooks':len(sources),'preparedBodies':report['preparedBodies'],
            'nativeBodyProofs':report['nativeBodyProofs'],'elapsedSeconds':round(time.monotonic()-started,2)}),flush=True)
    summary={'status':'THREE_STEP_CROPS_PREPARED_NOT_PUBLISHED','sources':results,
        'preparedBodies':sum(r['preparedBodies'] for r in results),'nativeBodyProofs':sum(r['nativeBodyProofs'] for r in results),'questionWrites':0}
    write_json(out/'report.json',summary);print(json.dumps({k:v for k,v in summary.items() if k!='sources'}))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--include-topic-review',action='store_true');run(parser.parse_args().include_topic_review)
