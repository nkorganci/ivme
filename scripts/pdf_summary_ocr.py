"""Read raster question panels hidden behind a nonempty PDF text layer.

Unfinished topic summaries and optional unread raster slide bodies are selected.
Existing source/model/version results are reused. OCR is evidence for extraction, never a completion or label
approval. Source PDFs and the question bank are read only.
"""
import argparse
from collections import Counter
from concurrent.futures import ProcessPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import time

import pymupdf

from pdf_ocr_cache import SUMMARY_VERSION, RASTER_BODY_VERSION, cache_path, model_hash, read_version
from pdf_source_scan import APP, OUT, ROOT, digest, write_json, read_scan


RASTER_PLAN_VERSION = 'nondecorative-raster-panels-v1'


def raster_pages(file, source):
    """Inspect object positions once; repeated backgrounds are not body panels."""
    target=OUT/'raster-plans'/f"{source['sha256']}-{RASTER_PLAN_VERSION}.json"
    if target.exists():
        return json.loads(target.read_text(encoding='utf-8'))['pages']
    pages=[]
    with pymupdf.open(ROOT/file['path']) as document:
        xrefs=Counter(image[0] for page in document for image in page.get_images(full=True))
        scans=read_scan(source['sha256'])['pages']
        repeated=Counter(line for page in scans for line in set(page['text'].splitlines()))
        for page,observed in zip(document,scans):
            body=[]
            for image in page.get_images(full=True):
                xref=image[0]
                # get_image_rects decodes/hashes every bitmap once per image.
                # The declared resource bbox is sufficient to schedule OCR;
                # it is never used as a question-completion certificate.
                for rect in [page.get_image_bbox(image)]:
                    area=(rect & page.rect).get_area()/page.rect.get_area()
                    background=area>.9 and xrefs[xref]>=max(8,len(document)*.8)
                    logo=area<.025 and (rect.y1<page.rect.height*.3 or rect.y0>page.rect.height*.9)
                    if area>.015 and not background and not logo:
                        body.append([xref,[round(v,2) for v in rect]])
            unique=' '.join(line for line in observed['text'].splitlines() if repeated[line]<max(3,len(document)*.5))
            vector_sparse=len(unique.strip())<80 and len(page.get_drawings())>25
            if body or vector_sparse:
                pages.append({'page':page.number+1,'rasterPanels':body,'sparseVectorContent':vector_sparse})
    write_json(target,{'version':RASTER_PLAN_VERSION,'sourceSha256':source['sha256'],'pages':pages})
    return pages


def recognize(job):
    filename, sha, number, model_sha, version = job
    started = time.monotonic()
    if digest(Path(filename)) != sha:
        raise ValueError('PDF changed since inventory')
    pymupdf.TOOLS.mupdf_display_errors(False)
    pymupdf.TOOLS.mupdf_display_warnings(False)
    with pymupdf.open(filename) as document:
        source = document[number - 1]
        # Grayscale reduces coloured backgrounds without dropping pale text.
        gray = source.get_pixmap(dpi=300 if version==SUMMARY_VERSION else 144, colorspace=pymupdf.csGRAY, alpha=False)
        rgb = pymupdf.Pixmap(pymupdf.csRGB, gray)
        with pymupdf.open('pdf', rgb.pdfocr_tobytes(language='tur', tessdata=str(APP / 'veri/tessdata'))) as recognized:
            page = recognized[0]
            sx, sy = source.rect.width / page.rect.width, source.rect.height / page.rect.height
            lines = [{'text': ''.join(s['text'] for s in line['spans']).strip(),
                      'bbox': [round(v * (sx if i % 2 == 0 else sy), 2) for i, v in enumerate(line['bbox'])]}
                     for block in page.get_text('dict', flags=pymupdf.TEXTFLAGS_TEXT)['blocks']
                     for line in block.get('lines', [])]
            lines = [line for line in lines if line['text']]
            text = '\n'.join(line['text'] for line in lines)
        record = {'sourceSha256': sha, 'page': number, 'modelSha256': model_sha,
                  'extractorVersion': version,
                  'status': 'EXTRACTED' if sum(c.isalpha() for c in text) >= 30 else 'VISUAL_OR_UNREADABLE',
                  'text': text, 'textSha256': hashlib.sha256(text.encode()).hexdigest(),
                  'lines': lines, 'headings': [], 'contentVerified': False,
                  'readability': 'NOT_MEASURED', 'reason': 'RASTER_CONTENT_WITH_NONEMPTY_TEXT_LAYER',
                  'elapsedSeconds': round(time.monotonic() - started, 2)}
    write_json(cache_path(sha, number, model_sha, version), record)
    return {'sourceSha256': sha, 'page': number, 'status': record['status']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workers', type=int, default=4, choices=range(1, 9))
    parser.add_argument('--limit', type=int)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--include-slides', action='store_true', help='Also inspect previously untranscribed slide body images')
    args = parser.parse_args()
    pymupdf.TOOLS.mupdf_display_errors(False)
    pymupdf.TOOLS.mupdf_display_warnings(False)
    data = json.loads((OUT / 'reconciliation.json').read_text(encoding='utf-8'))
    files = {f['sha256']: f for f in data['files']}
    model_sha = model_hash()
    jobs, reused = [], 0
    reused_states=Counter()
    extractor_versions=set()
    for source in data['documents']:
        sha = source['sha256']
        if source['coverageState'] in ('VERIFIED', 'NO_QUESTIONS'):
            continue
        file = files[sha]
        if '/Konu Ozetleri ' in file['path']:
            numbers=range(1,source['pageCount']+1)
            version=SUMMARY_VERSION
        elif args.include_slides and '/Ders Anlatim Sunulari ' in file['path']:
            plan=raster_pages(file,source)
            # A repeated header strip cannot hide another question in a page
            # whose full body is native text. Sparse vector bodies still need OCR.
            observations=read_scan(sha)['pages']
            repeated=Counter(line for p in observations for line in set(p['text'].splitlines()))
            numbers=[p['page'] for p in plan if p['sparseVectorContent']
                     or any(b[1][3]>observations[p['page']-1]['height']*.25 for b in p['rasterPanels'])]
            # Read sparse bodies first, then the remaining mixed image/text pages.
            numbers.sort(key=lambda n:len(' '.join(line for line in observations[n-1]['text'].splitlines()
                         if repeated[line]<max(3,len(observations)*.5)))>=80)
            version=RASTER_BODY_VERSION
        else:continue
        for number in numbers:
            prior=read_version(sha, number, model_sha, version)
            if not prior and version==RASTER_BODY_VERSION:
                old=read_version(sha,number,model_sha)
                if old and old['status']=='EXTRACTED':prior=old
            if prior:
                reused += 1
                reused_states[prior['status']]+=1
                extractor_versions.add(prior['extractorVersion'])
                continue
            jobs.append((str(ROOT / file['path']), sha, number, model_sha, version))
    selected = [] if args.check else jobs[:args.limit] if args.limit else jobs
    states, failures = Counter(), []
    print(json.dumps({'newPages': len(selected), 'reused': reused, 'pending': len(jobs)}), flush=True)
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(recognize, job): job for job in selected}
        for future in as_completed(futures):
            job = futures[future]
            try:
                result = future.result()
                states[result['status']] += 1
            except Exception as error:
                failures.append({'sourceSha256': job[1], 'page': job[2], 'error': str(error)})
            if (sum(states.values()) + len(failures)) % 100 == 0:
                print(json.dumps({'processed': sum(states.values()), 'total': len(selected), 'failures': len(failures)}), flush=True)
    report = {'version': RASTER_PLAN_VERSION, 'extractorVersions':sorted(extractor_versions|{job[4] for job in selected}),
              'reused': reused, 'processed': sum(states.values()),
              'pending': len(jobs) - sum(states.values()), 'states': dict(states), 'cachedStates':dict(reused_states),'failures': failures,
              'sourceWrites': 0, 'bankWrites': 0}
    write_json(OUT / 'summary-ocr-report.json', report)
    print(json.dumps({**report, 'failures': len(failures)}), flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
