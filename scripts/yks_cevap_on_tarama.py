"""Inspect all cached PDF pages for explicit answer evidence; never infer answers.

No match is an observation requiring OCR/visual review, never proof of absence.
Candidates do not become bank-ready questions without test/number/source checks.
"""
from collections import Counter
import argparse
import hashlib
import json
from pathlib import Path
import re
import unicodedata

from yks_birlestirme import Store, digest, read_json, write_json
from pdf_source_scan import read_scan, read_evidence_scan, cache_path

APP = Path(__file__).resolve().parents[1]
PAIR = re.compile(r'(?<![\w\d])(\d{1,3})\s*[.\-:)]+\s*([A-E])\b')
INLINE = re.compile(r'\b(?:cevap|yanıt|yanit)\s*[:\-]\s*([A-E])\b',re.I)


def normalized(text):
    text=''.join(c for c in unicodedata.normalize('NFKD',text.casefold().replace('ı','i')) if not unicodedata.combining(c))
    return re.sub(r'\s+','',text)


def inspect(scan):
    observations=[]
    for page in scan['pages']:
        text=page['text']
        compact=normalized(text)
        explicit_header=any(h in compact for h in ('cevapanahtari','yanitanahtari','cevaplar','yanitlar'))
        pairs=[{'number':int(m[1]),'answer':m[2],'offset':m.start()} for m in PAIR.finditer(text) if int(m[1])>0]
        inline=[{'answer':m[1].upper(),'offset':m.start()} for m in INLINE.finditer(text)]
        needs_visual=page.get('needsOcr',False) or '\ufffd' in text
        if explicit_header or len(pairs)>=2 or inline or needs_visual:
            observations.append({'page':page['page'],'textSha256':page['textSha256'],
                'explicitKeyHeader':explicit_header,'numberAnswerPairs':pairs,'inlineSourceAnswers':inline,
                'requiresVisualReview':needs_visual,'sourceExcerpt':text[:180] if explicit_header else None})
    candidates=[p for p in observations if p['explicitKeyHeader'] or len(p['numberAnswerPairs'])>=2 or p['inlineSourceAnswers']]
    visual=[p['page'] for p in observations if p['requiresVisualReview']]
    return {'sourceSha256':scan['sha256'],'pageCount':scan['pageCount'],'observedPages':len(scan['pages']),
            'status':'SOURCE_KEY_CANDIDATE' if candidates else 'NO_TEXT_KEY_VISUAL_REVIEW_REQUIRED',
            'candidatePages':[p['page'] for p in candidates],'visualReviewPages':visual,
            'questionSignalPages':([p['page'] for p in scan['pages'] if p.get('questionSignal')]
                if any('questionSignal' in p for p in scan['pages']) else scan['questionSignalPages']),'evidence':observations,
            'answersApproved':False,'questionsEligibleForImport':False}


def main(with_ocr=False):
    tool_sha=digest(Path(__file__))
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    folder=store.child(state['runId']+'/pdf-on-tarama')
    preflight=read_json(folder/'progress.json')
    preflight_sha=digest(folder/'progress.json')
    if preflight['status']!='PASS' or preflight['observedPdfs']!=preflight['totalPdfs'] or preflight['errors']:
        raise ValueError('All PDF page observations must complete first')
    output=folder/('answer-observations-with-ocr.jsonl' if with_ocr else 'answer-observations.jsonl')
    temporary=output.with_suffix('.jsonl.part')
    counts=Counter(); pages=0; candidates=0; visuals=0; cache_identity=hashlib.sha256()
    with temporary.open('w',encoding='utf-8') as stream:
        for index,doc in enumerate(preflight['documents'],1):
            scan=read_evidence_scan(doc['sha256'],for_review=True) if with_ocr else read_scan(doc['sha256'])
            if scan['error'] or scan['pageCount']!=doc['pageCount'] or len(scan['pages'])!=scan['pageCount']:
                raise ValueError('Source page cache is incomplete or changed')
            result=inspect(scan)
            stream.write(json.dumps(result,ensure_ascii=False)+'\n')
            counts[result['status']]+=1;pages+=result['pageCount'];candidates+=len(result['candidatePages']);visuals+=len(result['visualReviewPages'])
            cache_identity.update((doc['sha256']+':'+digest(cache_path(doc['sha256']))+':'+scan.get('ocrEvidenceSha256','')+'\n').encode())
            if index%500==0:print(f'Answer evidence: {index}/{len(preflight["documents"])} PDFs',flush=True)
    temporary.replace(output)
    if digest(Path(__file__))!=tool_sha or digest(folder/'progress.json')!=preflight_sha:
        raise ValueError('Preflight tool or input changed during answer observation; rerun affected preparation')
    report={'status':'PASS','scope':'ANSWER_EVIDENCE_CANDIDATES_ONLY','documents':len(preflight['documents']),
            'pages':pages,'sourceStates':dict(counts),'candidatePages':candidates,'pagesNeedingVisualReview':visuals,
            'observationSha256':digest(output),'pageCacheSetSha256':cache_identity.hexdigest(),
            'sourcePreflightSha256':preflight_sha,'toolSha256':tool_sha,
            'modelsCalled':0,'answersApproved':0,'questionsInserted':0,'usesExistingPageOcr':with_ocr,
            'absenceClaimed':False,'nextAction':'Verify key/test/question-number identity and visual/OCR exceptions before extraction acceptance'}
    write_json(folder/('answer-preflight-with-ocr-report.json' if with_ocr else 'answer-preflight-report.json'),report)
    print(json.dumps(report),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--with-ocr',action='store_true')
    main(parser.parse_args().with_ocr)
