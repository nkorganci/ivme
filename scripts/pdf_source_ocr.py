"""Resume local OCR for unreadable YKS pages using the shared source/model cache."""
import argparse
from concurrent.futures import ProcessPoolExecutor, as_completed
from functools import lru_cache
import hashlib
import importlib.util
import json
from pathlib import Path

import numpy as np
import pymupdf

from pdf_source_scan import APP, OUT, ROOT, read_scan, write_json
from pdf_ocr_cache import VERSION, cache_path, model_hash, read_page


def work(job):
    filename, sha, number, model_sha = job
    if read_page(sha,number,model_sha):return {'sha256':sha,'page':number,'status':'CACHE_REUSED'}
    pymupdf.TOOLS.mupdf_display_errors(False)
    pymupdf.TOOLS.mupdf_display_warnings(False)
    path=Path(filename);stat=path.stat()
    if verified_hash(filename,stat.st_size,stat.st_mtime_ns)!=sha:raise ValueError('Source bytes changed')
    with pymupdf.open(filename) as document:
        page = document[number-1]
        pixels = np.frombuffer(page.get_pixmap(colorspace=pymupdf.csGRAY,alpha=False).samples,dtype=np.uint8)
        if (pixels < 230).mean() < .00002:
            record = {'sourceSha256':sha,'page':number,'modelSha256':model_sha,'extractorVersion':VERSION,
                      'status':'BLANK_VERIFIED','text':'','textSha256':hashlib.sha256(b'').hexdigest(),
                      'headings':[],'contentVerified':False,'blankEvidence':'RENDERED_72_DPI_PIXELS'}
            write_json(cache_path(sha,number,model_sha),record)
            return {'sha256':sha,'page':number,'status':'BLANK_VERIFIED'}
        pix=page.get_pixmap(matrix=pymupdf.Matrix(2,2),colorspace=pymupdf.csRGB,alpha=False)
        with pymupdf.open('pdf',pix.pdfocr_tobytes(language='tur',tessdata=str(APP/'veri/tessdata'))) as recognized:
            text=recognized[0].get_text()
    status='EXTRACTED' if sum(c.isalpha() for c in text)>=30 else 'UNREADABLE_OR_BLANK'
    record={'sourceSha256':sha,'page':number,'modelSha256':model_sha,'extractorVersion':VERSION,
            'status':status,'text':text,'textSha256':hashlib.sha256(text.encode()).hexdigest(),
            'headings':[],'contentVerified':False,'readability':'NOT_MEASURED'}
    write_json(cache_path(sha,number,model_sha),record)
    return {'sha256':sha,'page':number,'status':status}


@lru_cache(maxsize=512)
def verified_hash(filename,size,mtime_ns):
    with Path(filename).open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workers',type=int,default=2)
    args=parser.parse_args()
    manifest=json.loads((OUT/'manifest.json').read_text(encoding='utf-8'))
    files={f['sha256']:f for f in manifest['files']}
    model_sha=model_hash()
    (APP/'veri/content-labels/pdf-ocr-cache').mkdir(parents=True,exist_ok=True)
    jobs=[];cached=0
    for sha,file in files.items():
        for page in read_scan(sha)['pages']:
            text=page['text']
            corrupt='\x00' in text or sum(ord(c)<32 and not c.isspace() for c in text)>2
            if not page['needsOcr'] and not corrupt:continue
            if read_page(sha,page['page'],model_sha):cached+=1;continue
            jobs.append((str(ROOT/file['path']),sha,page['page'],model_sha))
    processed=[];failures=[]
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        futures={pool.submit(work,job):job for job in jobs}
        for future in as_completed(futures):
            try:processed.append(future.result())
            except Exception as error:
                job=futures[future];failures.append({'sha256':job[1],'page':job[2],'error':str(error)})
            if (len(processed)+len(failures))%25==0:
                write_json(OUT/'ocr-progress.json',{'cached':cached,'totalNewPages':len(jobs),'processed':processed,'failures':failures})
                print(f'OCR {len(processed)}/{len(jobs)} pages, {cached} cached, {len(failures)} failures',flush=True)
    write_json(OUT/'ocr-progress.json',{'cached':cached,'totalNewPages':len(jobs),'processed':processed,'failures':failures})
    print(json.dumps({'processed':len(processed),'cached':cached,'failures':len(failures)}),flush=True)


if __name__=='__main__':main()
