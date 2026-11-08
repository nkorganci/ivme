"""Read a representative diagnostic key cohort with native text and independent OCR.

An unsupported layout remains review-required. No answer is solved or invented,
no question is imported, and valid existing visual-key evidence is reused.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import time

import pymupdf
from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from pdf_source_scan import read_scan
from pdf_ocr_cache import model_hash
from yks_cevap_on_tarama import PAIR
from yks_anahtar_pilotu import SOURCE

APP=Path(__file__).resolve().parents[1]
OCR_PAIR=re.compile(PAIR.pattern,re.I)


def read_pairs(text,pattern=PAIR):
    rows=[{'number':int(m[1]),'answer':m[2].upper()} for m in pattern.finditer(text)]
    rows.sort(key=lambda r:r['number'])
    if not 4<=len(rows)<=60 or [r['number'] for r in rows]!=list(range(1,len(rows)+1)):
        return None
    return rows


def simple_key(scan):
    last=scan['pages'][-1];rows=read_pairs(last['text'])
    if rows is None or len(last['text'])>len(rows)*20+150:return None
    # The source last-page list is only an answer candidate until its numbered
    # body questions and an independent printed-source reading agree.
    anchors=[a['number'] for p in scan['pages'][:-1] for a in p.get('anchors',[])]
    return {'answers':rows,'page':last['page'],'bodyAnchorNumbers':anchors,
        'questionNumbersComplete':sorted(anchors)==[r['number'] for r in rows]}


def choose(groups):
    by_scope={}
    for group in groups:
        row=group['canonicalCandidate'];parts=row['path'].split('/')
        if 'Taramalar' not in parts or Path(row['root']).name!='mebi-yks':continue
        scope=tuple(parts[2:4]);key=simple_key(read_scan(group['sha256']))
        old=by_scope.get(scope)
        if old is None or old['key'] is None and key is not None:
            by_scope[scope]={'source':group,'key':key,'exam':scope[0],'course':scope[1]}
    return [by_scope[key] for key in sorted(by_scope)]


def observe(case,folder,ocr_model):
    group=case['source'];sha=group['sha256'];entry=group['canonicalCandidate']
    source=Path(entry['root'])/entry['path'];key=case['key']
    if digest(source)!=sha:raise ValueError('Diagnostic PDF source changed')
    result={'sourceSha256':sha,'sourcePath':str(source),'exam':case['exam'],'course':case['course'],
        'sourcePageCount':read_scan(sha)['pageCount'],'questionBankWrites':0,'modelsCalled':0,'teacherApproved':False,
        'scope':'REPRESENTATIVE_DIAGNOSTIC_KEY_ONLY'}
    if key is None:
        return {**result,'status':'UNSUPPORTED_KEY_LAYOUT_REVIEW_REQUIRED','answers':None,
            'reason':'No complete compact last-page list; this is not proof that a source key is absent.',
            'questionNumbersComplete':False,'absenceClaimed':False}
    result.update(sourceKeyPage=key['page'],nativePrintedAnswers=key['answers'],
        bodyAnchorNumbers=key['bodyAnchorNumbers'],questionNumbersComplete=key['questionNumbersComplete'])
    if sha==SOURCE:
        prior=folder.parent/'key-pilot'/SOURCE
        proof=read_json(prior/'key-pilot-report.json')
        source_evidence=read_json(prior/'source-key.json')
        if proof['status']!='PASS' or proof['sourceEvidenceSha256']!=digest(prior/'source-key.json') or source_evidence['nativeTextReading']!=key['answers']:
            raise ValueError('Existing independently read pilot key changed')
        return {**result,'status':'TWO_PRINTED_SOURCE_READINGS_AGREE','methodB':'REUSED_VERIFIED_LOCAL_QWEN_IMAGE',
                'sourceProofSha256':digest(prior/'key-pilot-report.json'),'sourceAnswers':key['answers'],'cacheHit':True}
    source_folder=folder/sha;source_folder.mkdir(exist_ok=True)
    with pymupdf.open(source) as doc:
        page=doc[key['page']-1];native=page.get_text()
        if read_pairs(native)!=key['answers']:raise ValueError('Fresh native answer list differs from the source observation')
        words=page.get_text('words')
        clip=pymupdf.Rect(min(w[0] for w in words)-8,min(w[1] for w in words)-8,max(w[2] for w in words)+8,max(w[3] for w in words)+8)&page.rect
        pixmap=page.get_pixmap(dpi=220,clip=clip,alpha=False)
        crop=source_folder/'printed-key.png';pixmap.save(crop)
        cache_id=signature([sha,key['page'],digest(crop),ocr_model,'pymupdf-tesseract-tur-crop-v1',pymupdf.VersionBind])
        cache=source_folder/(cache_id+'.json')
        if cache.is_file():
            observation=read_json(cache);cached=True
        else:
            started=time.monotonic()
            with pymupdf.open('pdf',pixmap.pdfocr_tobytes(language='tur',tessdata=str(APP/'veri/tessdata'))) as recognized:
                text=recognized[0].get_text()
            observation={'sourceSha256':sha,'sourcePage':key['page'],'cropSha256':digest(crop),'clipPt':list(clip),
                'ocrModelSha256':ocr_model,'rendererVersion':pymupdf.VersionBind,'text':text,
                'textSha256':hashlib.sha256(text.encode()).hexdigest(),'seconds':round(time.monotonic()-started,2)}
            write_json(cache,observation);cached=False
    ocr_rows=read_pairs(observation['text'],OCR_PAIR)
    agree=ocr_rows==key['answers']
    if digest(source)!=sha:raise ValueError('Source changed during independent answer reading')
    return {**result,'status':'TWO_PRINTED_SOURCE_READINGS_AGREE' if agree else 'PRINTED_READING_DISAGREEMENT_REVIEW_REQUIRED',
        'methodB':'INDEPENDENT_RENDERED_CROP_TUR_OCR','ocrPrintedAnswers':ocr_rows,
        'sourceAnswers':key['answers'] if agree else None,'cropPath':str(crop),
        'cropSha256':digest(crop),'ocrEvidencePath':str(cache),'ocrEvidenceSha256':digest(cache),'cacheHit':cached,
        'absenceClaimed':False}


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    record=state['stages']['YKS-03:full']
    group_file=next(store.child(state['runId']+'/'+a['path']) for a in record['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
    groups=[json.loads(line) for line in group_file.read_text(encoding='utf-8').splitlines()]
    cohort=choose(groups);folder=store.child(state['runId']+'/pdf-on-tarama/key-cohort');folder.mkdir(exist_ok=True)
    model= model_hash();results=[]
    cohort_identity=signature([[c['source']['sha256'],c['exam'],c['course']] for c in cohort])
    with process_lock(folder/'.writer.lock'):
        for case in cohort:
            result=observe(case,folder,model);results.append(result)
            write_json(folder/'cohort-progress.json',{'status':'RUNNING','completed':len(results),'total':len(cohort),
                'cohortSignature':cohort_identity,'results':results})
            print(f'Printed key cohort: {len(results)}/{len(cohort)} {case["exam"]} {case["course"]}: {result["status"]}',flush=True)
        report={'status':'PASS','scope':'REPRESENTATIVE_DIAGNOSTIC_ANSWER_OBSERVATIONS','cohortSignature':cohort_identity,
            'documents':len(results),'states':dict(Counter(r['status'] for r in results)),
            'sourceBoundAnswers':sum(len(r['sourceAnswers'] or []) for r in results if r.get('sourceAnswers')),
            'allQuestionNumbersComplete':sum(r['questionNumbersComplete'] for r in results),
            'sourceGroupSha256':digest(group_file),'toolSha256':digest(Path(__file__)),'ocrModelSha256':model,
            'sourceWrites':0,'questionBankWrites':0,'modelsCalled':0,'teacherApproved':False,'results':results,
            'fullYks07Accepted':False,'nextAction':'Review disagreement/unsupported layouts; validate test identity, crops, shared passages and bank duplicates in pilot acceptance'}
        write_json(folder/'cohort-report.json',report)
        write_json(folder/'cohort-progress.json',{'status':'PASS','completed':len(results),'total':len(cohort),'cohortSignature':cohort_identity})
    print(json.dumps({k:v for k,v in report.items() if k!='results'}))


if __name__=='__main__':main()
