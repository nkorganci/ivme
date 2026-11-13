"""Read inventoried PDF pages missed by native text, without admission or DB writes.

Cache original rendered pixels and independent Turkish/English OCR geometry.
An empty OCR result is not a claim that the page contains no question.
"""
import hashlib
import json
import re
import time
import argparse
from collections import Counter
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from yks_birlestirme import write_json,process_lock

OUT=BASE/'visual-page-discovery'


def enrich_words():
    pages=[]
    for path in sorted(OUT.glob('*.json')):
        value=json.loads(path.read_text(encoding='utf8'))
        if isinstance(value,dict) and value.get('status')=='OCR_TEXT_READ' and value.get('image'):pages.append((path,value))
    for index,(path,value) in enumerate(pages,1):
        target=path.with_name(path.stem+'.words.json')
        if not target.exists():
            image=BASE/value['image']
            if hashlib.sha256(image.read_bytes()).hexdigest()!=value['imageSha256']:raise ValueError('OCR layout source image changed')
            pix=pymupdf.Pixmap(str(image));raw=pix.pdfocr_tobytes(language='tur+eng',tessdata=str(APP/'veri/tessdata'))
            pdf_path=path.with_name(path.stem+'.ocr.pdf');pdf_path.write_bytes(raw)
            with pymupdf.open('pdf',raw) as document:
                page=document[0];sx=value['sourceRect'][2]/page.rect.width;sy=value['sourceRect'][3]/page.rect.height
                words=[[w[0]*sx,w[1]*sy,w[2]*sx,w[3]*sy,*w[4:]] for w in page.get_text('words')]
            write_json(target,{'status':'OCR_WORD_LAYOUT_CAPTURED_NOT_ADMISSION','sourceSha256':value['sourceSha256'],
                'physicalPage':value['physicalPage'],'imageSha256':value['imageSha256'],'words':words,
                'ocrPdfSha256':hashlib.sha256(raw).hexdigest(),'questionWrites':0})
        if index%20==0 or index==len(pages):print(json.dumps({'stage':'OCR_WORD_LAYOUT_CAPTURE','completed':index,'total':len(pages)}),flush=True)


def run():
    OUT.mkdir(exist_ok=True);documents=json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents']
    tasks={};path_pages=0
    for source in documents:
        cached=json.loads((BASE/source['cache']).read_text(encoding='utf8'))
        for page in cached['pages']:
            if page['readingStatus']!='VISUAL_REVIEW_REQUIRED':continue
            path_pages+=1
            tasks.setdefault((source['sourceSha256'],page['physicalPage']),{**source,'physicalPage':page['physicalPage']})
    started=time.monotonic();last=started;bucket=-1;opened={};counts=Counter();results=[]
    try:
        for index,((sha,number),source) in enumerate(tasks.items(),1):
            stem=sha+f'-p{number:04}';target=OUT/(stem+'.json')
            if target.exists():
                value=json.loads(target.read_text(encoding='utf8'))
                if value.get('image') and hashlib.sha256((BASE/value['image']).read_bytes()).hexdigest()!=value['imageSha256']:raise ValueError('OCR input pixels changed')
            else:
                if sha not in opened:
                    original=(SOURCE/source['relativePath']).resolve()
                    if not original.is_relative_to(SOURCE):raise ValueError('OCR leaves inventory source root')
                    with original.open('rb') as stream:
                        if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Original OCR source changed')
                    opened[sha]=pymupdf.open(original)
                page=opened[sha][number-1];image=OUT/(stem+'.png')
                pix=page.get_pixmap(matrix=pymupdf.Matrix(3,3),alpha=False);pix.save(image)
                value={'sourceSha256':sha,'relativePath':source['relativePath'],'physicalPage':number,'sourceRotation':page.rotation,
                    'sourceRect':list(page.rect),'image':str(image.relative_to(BASE)),'imageSha256':hashlib.sha256(image.read_bytes()).hexdigest(),
                    'method':'INDEPENDENT_TESSERACT_TUR_ENG_3X_ORIGINAL_PAGE_PIXELS','studentVisible':False,'productionImportAllowed':False}
                try:
                    text_pdf=pix.pdfocr_tobytes(language='tur+eng',tessdata=str(APP/'veri/tessdata'))
                    with pymupdf.open('pdf',text_pdf) as ocr:
                        p=ocr[0];sx=page.rect.width/p.rect.width;sy=page.rect.height/p.rect.height;lines=[]
                        for block in p.get_text('dict')['blocks']:
                            for line in block.get('lines',[]):
                                box=line['bbox'];lines.append({'text':''.join(s['text'] for s in line['spans']),
                                    'bbox':[box[0]*sx,box[1]*sy,box[2]*sx,box[3]*sy]})
                    text='\n'.join(l['text'] for l in lines)
                    value.update(status='OCR_TEXT_READ' if text.strip() else 'NO_OCR_TEXT_REVIEW_REQUIRED',lines=lines,
                        numberSignals=sum(bool(re.match(r'^\s*\d{1,3}\s*[.)]',l['text'])) for l in lines),
                        choiceSignals=len(re.findall(r'(?<!\w)[ABCDE]\s*\)',text)),
                        keyHeadingSignal=bool(re.search(r'cevap\s*anahtar',text,re.I)))
                except Exception as error:value.update(status='OCR_REVIEW_REQUIRED',errorType=type(error).__name__)
                write_json(target,value)
            counts[value['status']]+=1;results.append({k:value[k] for k in ['sourceSha256','relativePath','physicalPage','status']})
            now=time.monotonic();current=10*index//max(1,len(tasks))
            if current>bucket or now-last>=300 or index==len(tasks):
                progress={'stage':'NATIVE_TEXT_GAP_ORIGINAL_PAGE_OCR','completed':index,'totalUniqueSourcePages':len(tasks),'inventoriedPathPages':path_pages,
                    'percent':round(100*index/len(tasks),2),'counts':dict(counts),'elapsedSeconds':round(now-started,1),'estimatedRemainingSeconds':None}
                write_json(OUT/'progress-current.json',progress)
                with (OUT/'progress.jsonl').open('a',encoding='utf8') as stream:stream.write(json.dumps(progress)+'\n')
                print(json.dumps(progress),flush=True);last=now;bucket=current
        write_json(OUT/'report.json',{'status':'VISUAL_NATIVE_GAP_OCR_COMPLETE_NOT_QUESTION_ADMISSION','pages':results,
            'counts':dict(counts),'uniquePages':len(tasks),'inventoriedPathPages':path_pages,'questionWrites':0,'teacherApprovalsCreated':0})
    finally:
        for document in opened.values():document.close()


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--enrich-words',action='store_true');a=p.parse_args()
    with process_lock(BASE/'.jobs/visual-native-gap-ocr.lock'):
        if a.enrich_words:enrich_words()
        else:run()
