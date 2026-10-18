"""OCR only PDF pages missing a usable text layer; cache each source/page.

Uses the installed Turkish model locally. OCR text is private evidence, never a
claim that a mathematical expression or a topic interval was visually verified.
Successful pages survive interruption; failed pages remain explicit exceptions.
"""
import argparse
from concurrent.futures import ProcessPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import re
import time

import pymupdf
from pdf_ocr_cache import VERSION, cache_path, model_hash, read_page

APP = Path(__file__).resolve().parents[1]
STATE = APP / 'veri/content-labels'


def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def extract(job):
    filename, sha, number, model_sha = job
    started = time.monotonic()
    # Validate bytes before trusting the page number, including resumed batches.
    with Path(filename).open('rb') as stream:
        if hashlib.file_digest(stream, 'sha256').hexdigest() != sha:
            raise ValueError('PDF source hash changed')
    pymupdf.TOOLS.mupdf_display_errors(False)
    pymupdf.TOOLS.mupdf_display_warnings(False)
    with pymupdf.open(filename) as doc:
        page = doc[number-1]
        pix = page.get_pixmap(matrix=pymupdf.Matrix(2,2), colorspace=pymupdf.csRGB, alpha=False)
        with pymupdf.open('pdf', pix.pdfocr_tobytes(language='tur', tessdata=str(APP / 'veri/tessdata'))) as recognized:
            result = recognized[0]
            text = result.get_text()
            headings = []
            for block in result.get_text('blocks'):
                if block[1] / result.rect.height < .28:
                    headings.extend(line.strip() for line in block[4].splitlines() if 4<=len(line.strip())<=160)
    record = {'sourceSha256':sha, 'page':number, 'extractorVersion':VERSION, 'modelSha256':model_sha,
              'status':'EXTRACTED' if sum(c.isalpha() for c in text)>=30 else 'UNREADABLE_OR_BLANK',
              'text':text, 'textSha256':hashlib.sha256(text.encode()).hexdigest(),
              'headings':sorted(set(headings)), 'readability':'NOT_MEASURED',
              'contentVerified':False, 'elapsedSeconds':round(time.monotonic()-started,2)}
    destination = cache_path(sha,number,model_sha)
    temporary = destination.with_suffix('.tmp')
    temporary.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    temporary.replace(destination)
    return {k:record[k] for k in ('sourceSha256','page','status','elapsedSeconds')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit', type=int, help='Maximum new page attempts; default all pending')
    parser.add_argument('--workers', type=int, default=2)
    parser.add_argument('--check', action='store_true', help='Inspect caches without extracting pages')
    args = parser.parse_args()
    if args.limit is not None and args.limit<1 or not 1<=args.workers<=4:
        parser.error('Positive limit and 1..4 workers required')
    started = time.monotonic()
    model_sha = model_hash()
    sources = load(APP / 'backend/src/main/resources/pdf-review-labels.json')['items']
    pending, seen, reused, needed, cached_unreadable = [], set(), 0, 0, 0
    for source in sources:
        sha = source.get('sourceSha256')
        if not sha or sha in seen:
            continue
        seen.add(sha)
        metadata_path = STATE / 'pdf-page-cache' / f'{sha}-pdf-page-headings-v1.json'
        if not metadata_path.is_file():
            continue
        metadata = load(metadata_path)
        base = APP.parent / 'Kaynaklar'
        if source.get('sourceScope')!='RESOURCES':
            base = base / 'ogm-materyal'
        filename = (base / source['relativePath']).resolve()
        if not filename.is_relative_to((APP.parent / 'Kaynaklar').resolve()):
            raise ValueError('Source outside resource directory')
        for page in metadata['pages']:
            if not page['needsOcr']:
                continue
            needed += 1
            cached = read_page(sha,page['page'],model_sha)
            if cached:
                reused += 1
                cached_unreadable += cached['status']!='EXTRACTED'
                continue
            pending.append((str(filename),sha,page['page'],model_sha))
    selected = [] if args.check else pending[:args.limit] if args.limit else pending
    (STATE / 'pdf-ocr-cache').mkdir(exist_ok=True)
    results, failures = [], []
    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(extract,job):job for job in selected}
        for future in as_completed(futures):
            job = futures[future]
            try:
                results.append(future.result())
            except Exception as error:
                failures.append({'sourceSha256':job[1],'page':job[2],'reason':type(error).__name__})
            if (len(results)+len(failures))%10==0:
                print(json.dumps({'processed':len(results),'failed':len(failures),'batchPages':len(selected)}),flush=True)
    report = {'version':1,'extractorVersion':VERSION,'modelSha256':model_sha,'requiredPages':needed,
              'reusedPages':reused,'processedPages':len(results),'failedPages':len(failures),
              'pendingPages':len(pending)-len(results),'modelCalls':0,'externalCalls':0,
              'elapsedSeconds':round(time.monotonic()-started,2),'failures':failures,
              'ocrUnreadableOrBlankPages':cached_unreadable+sum(r['status']=='UNREADABLE_OR_BLANK' for r in results)}
    (STATE / 'pdf-ocr-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report))
    if failures:
        raise SystemExit('Some OCR pages failed; successful pages cached')


if __name__=='__main__':
    main()
