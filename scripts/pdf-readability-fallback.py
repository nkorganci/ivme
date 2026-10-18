"""Try alternate extraction and record page-specific manual dispositions.

Blank detection examines rendered pixels; sparse diagrams are not blank pages.
Higher-resolution grayscale and focused OCR reuse the same installed model.
Original PDF bytes are never changed. Unresolved content remains unapproved.
"""
import argparse
from collections import Counter
from concurrent.futures import ProcessPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import time

import pymupdf
from pdf_ocr_cache import FALLBACK_VERSION, cache_path, model_hash, read_version

APP = Path(__file__).resolve().parents[1]
STATE = APP / 'veri/content-labels'


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def disposition(text, ink):
    if ink < .00002:
        return 'BLANK_CANDIDATE'
    if sum(c.isalpha() for c in text)>=30:
        return 'EXTRACTED'
    return 'VISUAL_OR_UNREADABLE'


def recognize(page, dpi, clip=None):
    gray = page.get_pixmap(matrix=pymupdf.Matrix(dpi/72,dpi/72),colorspace=pymupdf.csGRAY,alpha=False,clip=clip)
    rgb = pymupdf.Pixmap(pymupdf.csRGB,gray)
    with pymupdf.open('pdf',rgb.pdfocr_tobytes(language='tur',tessdata=str(APP / 'veri/tessdata'))) as result:
        p=result[0]
        text=p.get_text()
        headings=[line.strip() for b in p.get_text('blocks') if b[1]/p.rect.height<.28
                  for line in b[4].splitlines() if 4<=len(line.strip())<=160]
    return text,headings


def extract(job):
    filename,sha,number,model_sha=job
    started=time.monotonic()
    with Path(filename).open('rb') as stream:
        if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:
            raise ValueError('Source hash changed')
    original=read_version(sha,number,model_sha)
    text,headings=original['text'],original['headings']
    attempts=[{'method':'PRESERVED_144_DPI_OCR','characters':sum(c.isalpha() for c in text)}]
    pymupdf.TOOLS.mupdf_display_errors(False)
    pymupdf.TOOLS.mupdf_display_warnings(False)
    with pymupdf.open(filename) as doc:
        page=doc[number-1]
        pixels=page.get_pixmap(matrix=pymupdf.Matrix(1,1),colorspace=pymupdf.csGRAY,alpha=False).samples
        ink=sum(v<230 for v in pixels)/max(1,len(pixels))
        attempts.append({'method':'RENDERED_PIXEL_CHECK','inkFraction':round(ink,7)})
        if ink>=.00002:
            for dpi,clip,method in [(300,None,'GRAYSCALE_300_DPI'),
                (360,pymupdf.Rect(page.rect.width*.035,page.rect.height*.06,page.rect.width*.965,page.rect.height*.94),'FOCUSED_360_DPI')]:
                candidate,candidate_headings=recognize(page,dpi,clip)
                attempts.append({'method':method,'characters':sum(c.isalpha() for c in candidate)})
                if sum(c.isalpha() for c in candidate)>sum(c.isalpha() for c in text):
                    text,headings=candidate,candidate_headings
                if sum(c.isalpha() for c in text)>=30:
                    break
    status=disposition(text,ink)
    record={'sourceSha256':sha,'page':number,'modelSha256':model_sha,'extractorVersion':FALLBACK_VERSION,
            'status':status,'text':text,'textSha256':hashlib.sha256(text.encode()).hexdigest(),
            'headings':headings,'readability':'NOT_MEASURED','contentVerified':False,'attempts':attempts,
            'manualReview':None if status=='EXTRACTED' else {'status':'NEEDS_MANUAL_REVIEW',
                'label':'Boş/okunamayan' if status=='BLANK_CANDIDATE' else 'Görsel/okunamayan',
                'reason':'Renderda içerik görünmedi; boş sayfa adayı.' if status=='BLANK_CANDIDATE' else
                         'Yüksek çözünürlüklü ve odaklanmış OCR sonrası az metin; şekil veya okunamayan içerik olabilir.'},
            'elapsedSeconds':round(time.monotonic()-started,2)}
    path=cache_path(sha,number,model_sha,FALLBACK_VERSION)
    temp=path.with_suffix('.tmp');temp.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8');temp.replace(path)
    return {'status':status,'page':number,'sourceSha256':sha,'elapsedSeconds':record['elapsedSeconds']}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit',type=int)
    parser.add_argument('--workers',type=int,default=4)
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    if args.limit is not None and args.limit<1 or not 1<=args.workers<=4:
        parser.error('Positive limit; 1..4 workers')
    started=time.monotonic();model_sha=model_hash()
    jobs=[];seen=set();states=Counter();reused=0
    for source in load(APP/'backend/src/main/resources/pdf-review-labels.json')['items']:
        sha=source.get('sourceSha256')
        if not sha or sha in seen: continue
        seen.add(sha)
        page_file=STATE/'pdf-page-cache'/f'{sha}-pdf-page-headings-v1.json'
        if not page_file.exists(): continue
        base=APP.parent/'Kaynaklar'
        if source.get('sourceScope')!='RESOURCES':base=base/'ogm-materyal'
        filename=(base/source['relativePath']).resolve()
        if not filename.is_relative_to((APP.parent/'Kaynaklar').resolve()):raise ValueError('Outside resources')
        for page in load(page_file)['pages']:
            if not page['needsOcr']:continue
            primary=read_version(sha,page['page'],model_sha)
            if not primary or primary['status']=='EXTRACTED':continue
            cached=read_version(sha,page['page'],model_sha,FALLBACK_VERSION)
            if cached:
                states[cached['status']]+=1;reused+=1;continue
            jobs.append((str(filename),sha,page['page'],model_sha))
    selected=[] if args.check else jobs[:args.limit] if args.limit else jobs
    failures=[];processed=0
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        futures={pool.submit(extract,job):job for job in selected}
        for future in as_completed(futures):
            job=futures[future]
            try:
                result=future.result();states[result['status']]+=1;processed+=1
            except Exception as e:
                failures.append({'sourceSha256':job[1],'page':job[2],'errorType':type(e).__name__})
            if (processed+len(failures))%20==0:print(json.dumps({'processed':processed,'failed':len(failures),'batchPages':len(selected)}),flush=True)
    report={'version':1,'extractorVersion':FALLBACK_VERSION,'reusedPages':reused,'processedPages':processed,
            'pendingPages':len(jobs)-processed,'states':dict(states),'failures':failures,
            'elapsedSeconds':round(time.monotonic()-started,2),'modelCalls':0,'sourceWrites':0}
    (STATE/'pdf-fallback-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report))
    if failures:raise SystemExit('Fallback failures remain recorded; successful pages cached')


if __name__=='__main__':main()
