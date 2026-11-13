"""Prove visibly empty source pages without another OCR or model attempt.

Only pages with no native text, images, vector drawings or annotations and an
entirely white fresh 2x original render qualify. This is a page disposition,
never a claim that a whole PDF lacks questions or answers.
"""
import hashlib
import json
from collections import Counter
import pymupdf
from mebi_pratik2_tam_pdf_tarama import BASE,SOURCE
from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf
from yks_birlestirme import write_json,process_lock

OUT=BASE/'empty-original-pages'


def prove_empty(page):
    if page.get_text().strip() or page.get_image_info() or page.get_drawings() or list(page.annots()):return None
    pix=page.get_pixmap(matrix=pymupdf.Matrix(2,2),alpha=False)
    if min(pix.samples,default=255)!=255:return None
    return {'status':'PROVED_EMPTY_ORIGINAL_PAGE','method':'NO_NATIVE_TEXT_IMAGES_DRAWINGS_ANNOTATIONS_AND_ALL_WHITE_ORIGINAL_2X_PIXELS',
        'pixelSha256':hashlib.sha256(pix.samples).hexdigest(),'width':pix.width,'height':pix.height,
        'modelCalls':0,'ocrCalls':0,'wholePdfQuestionAbsenceClaimed':False}


def run():
    OUT.mkdir(exist_ok=True);decisions=load_decisions()
    documents=json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents']
    unique={r['sourceSha256']:r for r in documents};records=[];counts=Counter()
    for sha,source in unique.items():
        native=json.loads((BASE/source['cache']).read_text(encoding='utf8'))
        pages=[p['physicalPage'] for p in native['pages'] if p['readingStatus']=='VISUAL_REVIEW_REQUIRED']
        if skip_pdf(sha,decisions):counts['existingPdfVisualPagesSkipped']+=len(pages);continue
        if not pages:continue
        target=OUT/(sha+'.json')
        if target.exists():data=json.loads(target.read_text(encoding='utf8'));rows=data['pages']
        else:
            original=(SOURCE/source['relativePath']).resolve()
            if not original.is_relative_to(SOURCE):raise ValueError('Blank-page proof leaves source root')
            with original.open('rb') as stream:
                if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Blank-page source changed')
            rows=[]
            with pymupdf.open(original) as pdf:
                for physical in pages:
                    proof=prove_empty(pdf[physical-1])
                    rows.append({'sourceSha256':sha,'relativePath':source['relativePath'],'physicalPage':physical,
                        **(proof or {'status':'VISUAL_SOURCE_CONTENT_REMAINS_IN_REVIEW'}),'studentVisible':False})
            write_json(target,{'sourceSha256':sha,'pages':rows,'questionWrites':0})
        if {r['physicalPage'] for r in rows}!=set(pages):raise ValueError('Frozen empty-page proof scope differs')
        records.extend(rows);counts.update(r['status'] for r in rows)
    manual_path=OUT/'agent-page-review.json'
    if manual_path.exists():
        manual={(r['sourceSha256'],r['physicalPage']):r for r in json.loads(manual_path.read_text(encoding='utf8'))['records']}
        for row in records:
            review=manual.get((row['sourceSha256'],row['physicalPage']))
            if not review:continue
            path=BASE/review['image']
            if review.get('sourcePixelsRechecked') is not True or hashlib.sha256(path.read_bytes()).hexdigest()!=review['imageSha256']:
                raise ValueError('Actually reviewed page evidence changed')
            if review['status'] not in {'AGENT_VIEWED_EMPTY_SOURCE_PAGE','AGENT_READ_PRINTED_ANSWER_KEY'}:raise ValueError('Unknown page review decision')
            row.update(**review,agentReviewEvidence=str(manual_path.relative_to(BASE)))
        skipped=counts['existingPdfVisualPagesSkipped'];counts=Counter(r['status'] for r in records);counts['existingPdfVisualPagesSkipped']=skipped
    result={'status':'EMPTY_SOURCE_PAGE_DISPOSITION_COMPLETE_NOT_ARCHIVE_QUESTION_ACCEPTANCE','pages':records,
        'counts':dict(counts),'questionWrites':0,'questionComparisons':0,'modelCalls':0,'ocrCalls':0,
        'allPrintedQuestionsExtracted':False}
    write_json(OUT/'report.json',result);print(json.dumps({k:v for k,v in result.items() if k!='pages'}),flush=True)


if __name__=='__main__':
    with process_lock(BASE/'.jobs/empty-original-pages.lock'):run()
