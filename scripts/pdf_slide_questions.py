"""Stage lesson-slide questions whose answer text color and rendered pixels agree.

Question/answer slides must have equal content. Only the unanswered source slide
is cropped. Neither color alone nor a model prediction can admit a bank question.
"""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

import numpy as np
import pymupdf

from kaynakli_arastirma_db import db_connection,query
from pdf_source_scan import APP,OUT,ROOT,read_evidence_scan,write_json
from pdf_source_reconcile import text_fingerprint

VERSION='slide-vector-and-pixel-answer-v2'
OPTION=re.compile(r'^\s*([A-E])\s*\)')


def spans(page):
    return [s for b in page.get_text('dict',flags=pymupdf.TEXTFLAGS_TEXT)['blocks']
            for line in b.get('lines',[]) for s in line['spans'] if s['text'].strip()]


def red(color):
    r,g,b=(color>>16)&255,(color>>8)&255,color&255
    return r>140 and r>g*1.7 and r>b*1.7


def option_regions(page):
    content=spans(page)
    labels=[(OPTION.match(s['text'])[1],s) for s in content if OPTION.match(s['text'])]
    if sorted(letter for letter,_ in labels)!=list('ABCDE'):return None
    labels.sort(key=lambda pair:pair[1]['bbox'][1])
    if [letter for letter,_ in labels]!=list('ABCDE'):return None
    x=min(s['bbox'][0] for _,s in labels)
    if any(abs(s['bbox'][0]-x)>30 for _,s in labels):return None
    regions=[]
    for index,(letter,label) in enumerate(labels):
        y=label['bbox'][1]-1
        bottom=labels[index+1][1]['bbox'][1]-1 if index+1<len(labels) else min(page.rect.height*.93,label['bbox'][3]+55)
        group=[s for s in content if s['bbox'][0]>=x-3 and y<=s['bbox'][1]<bottom and s['bbox'][1]<page.rect.height*.93]
        if not group:return None
        box=pymupdf.Rect(x-2,y,max(s['bbox'][2] for s in group)+2,max(s['bbox'][3] for s in group)+1)&page.rect
        weight=sum(len(s['text']) for s in group)
        vector=sum(len(s['text']) for s in group if red(s['color']))/max(1,weight)
        if red(label['color']):
            vector=1
            box=pymupdf.Rect(label['bbox'])&page.rect
        regions.append((letter,box,vector))
    return regions


def two_answer_readings(page):
    regions=option_regions(page)
    if regions is None:return None
    vector=[letter for letter,_,weight in regions if weight>.65]
    if len(vector)!=1:return None
    rendered=[]
    for letter,box,_ in regions:
        pix=page.get_pixmap(clip=box,matrix=pymupdf.Matrix(2,2),colorspace=pymupdf.csRGB,alpha=False)
        pixels=np.frombuffer(pix.samples,dtype=np.uint8).reshape(-1,3).astype(np.int16)
        ink=(pixels.min(axis=1)<210).sum()
        red_pixels=((pixels[:,0]>140)&(pixels[:,0]>pixels[:,1]*1.7)&(pixels[:,0]>pixels[:,2]*1.7)).sum()
        if red_pixels/max(1,ink)>.5:rendered.append(letter)
    return (vector[0],rendered[0]) if len(rendered)==1 and rendered==vector else None


def question_text(observed,repeated,page_count):
    lines=[]
    for line in observed['text'].splitlines():
        text=line.strip()
        if not text or re.fullmatch(r'(?:soru|cevap|çözüm|örnek)\s*:?\s*',text,re.I):continue
        if repeated[text]>=max(3,page_count*.35):continue
        lines.append(text)
    return '\n'.join(lines)


def stage_source(file,alias):
    sha=file['sha256'];folder=OUT/'slide-candidates'/sha;target=folder/'candidates.json'
    with (ROOT/file['path']).open('rb') as stream:
        if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Slide source bytes changed')
    if target.exists():
        previous=json.loads(target.read_text(encoding='utf-8'))
        if previous.get('version')==VERSION:return previous
    observed=read_evidence_scan(sha,True)
    repeated=Counter(line.strip() for p in observed['pages'] for line in set(p['text'].splitlines()) if line.strip())
    texts={p['page']:question_text(p,repeated,observed['pageCount']) for p in observed['pages']}
    keys={number:text_fingerprint(text) for number,text in texts.items()}
    cards=[];unresolved=[];answer_pages=[]
    with pymupdf.open(ROOT/file['path']) as document:
        for observed_page in observed['pages']:
            number=observed_page['page']
            if len(observed_page['options'])<4:continue
            text=observed_page['text']
            if re.search(r'^\s*(?:Cevap|Çözüm)\s*:',text,re.M|re.I):answer_pages.append(number);continue
            page=document[number-1]
            regions=option_regions(page)
            if regions is None:unresolved.append({'page':number,'reason':'OPTION_LAYOUT_NOT_SUPPORTED'});continue
            if any(weight>.4 for _,_,weight in regions):
                unresolved.append({'page':number,'reason':'QUESTION_PAGE_MAY_REVEAL_ANSWER'});continue
            matched=None
            for answer_number in (number+1,number+2):
                if answer_number>len(document) or not keys[number] or keys[number]!=keys[answer_number]:continue
                answer=two_answer_readings(document[answer_number-1])
                if answer:matched=(answer_number,answer);break
            if matched is None:unresolved.append({'page':number,'reason':'NO_TWO_METHOD_ANSWER_PROOF'});continue
            answer_number,(method_a,method_b)=matched
            content=[s for s in spans(page) if repeated[s['text'].strip()]<max(3,len(document)*.35)
                     and not re.fullmatch(r'Soru\s*:?\s*',s['text'].strip(),re.I)]
            if not content:continue
            top=min(s['bbox'][1] for s in content)-4
            bottom=max(s['bbox'][3] for s in content)+4
            visual=[pymupdf.Rect(image['bbox']) for image in page.get_image_info()]
            visual += [drawing['rect'] for drawing in page.get_drawings()]
            for rect in visual:
                if rect.y0>=top and rect.y0<page.rect.height*.94 and rect.get_area()<page.rect.get_area()*.9:
                    bottom=max(bottom,min(rect.y1+4,page.rect.height*.96))
            box=pymupdf.Rect(0,top,page.rect.width,bottom)&page.rect
            code=f'pdf-{sha[:16]}-p{number:04d}-q01'
            image=folder/(code+'.webp');folder.mkdir(parents=True,exist_ok=True)
            pix=page.get_pixmap(clip=box,matrix=pymupdf.Matrix(2,2),alpha=False)
            from PIL import Image
            Image.frombytes('RGB',(pix.width,pix.height),pix.samples).save(image,'WEBP',quality=95)
            cards.append({'code':code,'pdfPage':number,'answerPage':answer_number,'printedNumber':None,
                          'answer':method_a,'answerMethodA':method_a,'answerMethodB':method_b,
                          'text':texts[number],'bbox':list(box),'image':image.name,
                          'imageSha256':hashlib.sha256(image.read_bytes()).hexdigest(),
                          'answerProof':'VECTOR_COLOR_AND_RENDERED_RED_PIXELS_AGREE'})
    package={'version':VERSION,'sourceSha256':sha,'sourceRelativePath':file['path'],'sourceCatalogIds':alias['ids'],
             'sourceTitle':alias['title'],'sourceExam':alias['exam'],'sourceSubject':alias['subject'],
             'status':'CANDIDATE_NOT_IN_BANK','questionCount':len(cards),'cards':cards,
             'unresolvedPages':unresolved,'answerPages':answer_pages,'teacherApproved':False}
    write_json(target,package)
    return package


def main():
    c=db_connection('ivme')
    aliases=json.loads(query(c,"""SELECT json_agg(x) FROM (SELECT s.source_sha256,array_agg(r.catalog_id ORDER BY r.catalog_id) ids,
        min(r.data->>'title') title,min(r.data->>'exam') exam,min(r.data->>'subject') subject
        FROM learning_catalog.pdf_source_catalog s JOIN learning_catalog.pdf_audit_rows r USING(catalog_id)
        WHERE r.data->>'source' LIKE 'Ders Anlatım Sunuları%' GROUP BY s.source_sha256) x"""))
    files={f['sha256']:f for f in json.loads((OUT/'manifest.json').read_text(encoding='utf-8'))['files']}
    processed=[]
    pymupdf.TOOLS.mupdf_display_errors(False);pymupdf.TOOLS.mupdf_display_warnings(False)
    for alias in aliases:
        package=stage_source(files[alias['source_sha256']],alias)
        processed.append({'sha256':package['sourceSha256'],'questions':package['questionCount'],'unresolvedPages':len(package['unresolvedPages'])})
        if len(processed)%50==0:print(f'Slide staging: {len(processed)}/{len(aliases)} PDFs, {sum(r["questions"] for r in processed)} candidates with two answer readings',flush=True)
    write_json(OUT/'slide-staging-report.json',{'sources':processed,'questions':sum(r['questions'] for r in processed)})
    print(json.dumps({'sources':len(processed),'questions':sum(r['questions'] for r in processed)}),flush=True)


if __name__=='__main__':main()
