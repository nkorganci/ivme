"""Read the 75 newly queued physics summary key regions with local OCR/Qwen.

Only actual PDF pixels enter the model; expected letters never enter its
prompt. Matching readings approve no source body, complete question count,
category or new import. Those separate gates remain mandatory.
"""
import argparse
from collections import Counter
import hashlib
from pathlib import Path
import re
import sys

import pymupdf
from PIL import Image
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP
from yks_anahtar_pilotu import api,MODEL
from yks_anahtar_gorsel import transcription
from yks_kayitli_anahtar_kesfi import signals
from pdf_ocr_cache import model_hash
from yks_pilot_kaynaklari import plain


def key_numbers(text):
    normal=plain(text);headings=list(re.finditer(r'(?:CEVAP|YANIT)\s*ANAHTAR(?:LARI|I)?',normal))
    if len(headings)!=1:return None
    tail=normal[headings[0].end():];matches=list(re.finditer(r'(\d{1,3})\s*[.\-:)]+\s*([A-E])(?=\b|\d)',tail))
    residue=re.sub(r'(\d{1,3})\s*[.\-:)]+\s*([A-E])(?=\b|\d)','',tail)
    if matches and not re.sub(r'[\s,:;().\-]+','',residue):
        rows=[{'number':int(m[1]),'answer':m[2]} for m in matches]
    else:
        # Strict row/column tables: every token must belong to the complete
        # contiguous number row and A-E answer row, or alternate number/letter.
        tokens=re.findall(r'\d{1,3}|[A-E]',tail)
        if re.sub(r'\d{1,3}|[A-E]|[\s,:;().\-]+','',tail) or len(tokens)%2:return None
        n=len(tokens)//2
        if tokens[:n]==[str(i) for i in range(1,n+1)] and all(t in list('ABCDE') for t in tokens[n:]):
            rows=[{'number':i+1,'answer':t} for i,t in enumerate(tokens[n:])]
        elif tokens[::2]==[str(i) for i in range(1,n+1)] and all(t in list('ABCDE') for t in tokens[1::2]):
            rows=[{'number':i+1,'answer':t} for i,t in enumerate(tokens[1::2])]
        else:return None
    return rows if rows and [r['number'] for r in rows]==list(range(1,len(rows)+1)) else None


def key_box(lines,width,height):
    matching=[l['bbox'] for l in lines if signals(l['text'])['headings']]
    if not matching:raise ValueError('No explicit saved heading geometry; original source review required')
    rect=pymupdf.Rect(min(b[0] for b in matching)-12,min(b[1] for b in matching)-8,
        max(max(b[2] for b in matching)+12,width-8),max(b[3] for b in matching)+70)&pymupdf.Rect(0,0,width,height)
    if rect.is_empty or rect.get_area()>width*height*.35:raise ValueError('Key heading geometry is not an isolated strip')
    return list(rect)


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--limit',type=int);parser.add_argument('--native-heading-retry',action='store_true');args=parser.parse_args()
    if args.limit is not None and args.limit<1:parser.error('Positive model call limit required')
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);source=root/'saved-key-signal-discovery/report.json'
    index=read_json(source);input_sha=digest(source)
    if index['status']!='COMPLETE':raise ValueError('Complete all-source saved key index required')
    cases=[]
    for row in index['results']:
        if row['status']!='UNASSESSED_SAVED_KEY_HEADING_READ_ORIGINAL_SOURCE':continue
        if digest(row['evidencePath'])!=row['evidenceSha256']:raise ValueError('Source key discovery evidence changed')
        detail=read_json(row['evidencePath'])['result'];path=detail['sourceLocation']['path']
        if path.startswith('Fizik/') and '/Konu Ozetleri ' in path:cases.append(detail)
    if len(cases)!=75:raise ValueError('Expected frozen 75-summary source scope; reconcile changed sources first')
    original_report_sha=None
    if args.native_heading_retry:
        original_report=root/'physics-summary-key-readings/report.json';previous=read_json(original_report)
        if previous['status']!='COMPLETE':raise ValueError('Complete original summary-key pass required')
        wanted={r['sourceSha256'] for r in previous['results'] if r['status']=='SOURCE_KEY_GEOMETRY_OR_PIXELS_REVIEW_REQUIRED'}
        cases=[c for c in cases if c['sourceSha256'] in wanted];original_report_sha=digest(original_report)
        if len(cases)!=3:raise ValueError('Expected exactly three original native-heading geometry exceptions')
    model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
    if 'vision' not in api('/api/show',{'model':MODEL}).get('capabilities',[]):raise ValueError('Actual source vision model required')
    folder=root/('physics-summary-native-key-readings' if args.native_heading_retry else 'physics-summary-key-readings');folder.mkdir(exist_ok=True);cache=folder/'readings';cache.mkdir(exist_ok=True)
    results=[];calls=0;ocr_new=0;ocr_model=model_hash();readers={str(p):digest(p) for p in [Path(__file__),APP/'scripts/yks_anahtar_gorsel.py',APP/'scripts/yks_kayitli_anahtar_kesfi.py']}
    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
    def save(status):
        write_json(folder/'report.json',{'status':status,'scope':'ONLY_THREE_PRIOR_NATIVE_HEADING_GEOMETRY_EXCEPTIONS' if args.native_heading_retry else 'ONLY_75_NEWLY_QUEUED_PHYSICS_SUMMARY_KEY_REGIONS_NOT_QUESTION_ADMISSION',
            'sourceIndexSha256':input_sha,'model':MODEL,'modelDigest':model['digest'],'readerFiles':readers,
            'originalSummaryKeyReportSha256':original_report_sha,
            'documents':len(cases),'completed':len(results),'pending':len(cases)-len(results),'states':dict(Counter(r['status'] for r in results)),
            'newModelCallsThisPass':calls,'newOcrCallsThisPass':ocr_new,'results':results,'sourceQuestionAnswersBound':False,
            'wholeSourceKeyCompletenessAccepted':False,'newQuestionAdmissionAccepted':False,'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False})
    with process_lock(folder/'.writer.lock'),ModelLease(role='yks-physics-summary-printed-key',model=MODEL):
        try:
            save('RUNNING')
            for case in cases:
                if args.limit is not None and calls>=args.limit:break
                sha=case['sourceSha256'];loc=case['sourceLocation'];path=Path(loc['root'])/loc['path']
                if digest(path)!=sha:raise ValueError('Actual original summary changed')
                lines=[]
                for reading in case['readings']:
                    if not reading.get('savedReadingPath'):continue
                    file=Path(reading['savedReadingPath'])
                    if digest(file)!=reading['savedReadingSha256']:raise ValueError('Original OCR key heading changed')
                    lines.extend(read_json(file).get('lines',[]))
                try:
                    with pymupdf.open(path) as doc:
                        if len(doc)!=1:raise ValueError('Expected one original source page')
                        page=doc[0]
                        if args.native_heading_retry:
                            lines=[{'text':''.join(s['text'] for s in line['spans']),'bbox':list(line['bbox'])}
                                for block in page.get_text('dict',flags=pymupdf.TEXTFLAGS_TEXT)['blocks'] for line in block.get('lines',[])]
                        box=key_box(lines,page.rect.width,page.rect.height)
                        crop=folder/(sha+'-'+signature(box)[:12]+'-key.png');pix=page.get_pixmap(dpi=330,clip=pymupdf.Rect(box),alpha=False)
                        if crop.is_file():
                            with Image.open(crop) as saved:
                                if saved.mode!='RGB' or saved.size!=(pix.width,pix.height) or saved.tobytes()!=pix.samples:raise ValueError('Original key crop pixels changed')
                        else:pix.save(crop)
                        identity={'sourceSha256':sha,'page':1,'bboxPt':box,'dpi':330,'cropSha256':digest(crop),'ocrModelSha256':ocr_model,'rendererVersion':pymupdf.VersionBind}
                        raw_path=folder/(signature(identity)+'-ocr.json')
                        if raw_path.is_file():raw=read_json(raw_path)
                        else:
                            with pymupdf.open('pdf',pix.pdfocr_tobytes(language='tur',tessdata=str(APP/'veri/tessdata'))) as recognized:text=recognized[0].get_text()
                            raw={'identity':identity,'text':text,'textSha256':hashlib.sha256(text.encode()).hexdigest()};write_json(raw_path,raw);ocr_new+=1
                        if raw['identity']!=identity or hashlib.sha256(raw['text'].encode()).hexdigest()!=raw['textSha256']:raise ValueError('Cached strip OCR identity changed')
                    observed=transcription(model,crop,cache);calls+=int(not observed['cacheHit']);native=key_numbers(raw['text'])
                    agree=native is not None and observed['reading']==native
                    results.append({'sourceSha256':sha,'sourcePath':str(path),'status':'ORIGINAL_KEY_STRIP_OCR_AND_LOCAL_VISION_AGREE_BODY_ENUMERATION_REQUIRED' if agree else 'SOURCE_KEY_STRIP_READING_DISAGREEMENT_HOLD',
                        'sourcePage':1,'sourceBboxPt':box,'cropPath':str(crop),'cropSha256':digest(crop),'sourceCropPixelsEqual':True,
                        'stripOcrEvidencePath':str(raw_path),'stripOcrEvidenceSha256':digest(raw_path),'stripOcrReading':native,
                        'independentPrintedReading':observed['reading'],**{k:observed[k] for k in ['evidencePath','evidenceSha256','error']},
                        'sourceQuestionAnswersBound':False,'wholeSourceKeyCompletenessAccepted':False,'newQuestionAdmissionAccepted':False,'teacherApproved':False})
                except ValueError as exc:
                    results.append({'sourceSha256':sha,'sourcePath':str(path),'status':'SOURCE_KEY_GEOMETRY_OR_PIXELS_REVIEW_REQUIRED',
                        'issue':str(exc),'sourceQuestionAnswersBound':False,'wholeSourceKeyCompletenessAccepted':False,'newQuestionAdmissionAccepted':False,'teacherApproved':False})
                if len(results)%5==0:save('RUNNING');print('Summary source keys',len(results),'/',len(cases),dict(Counter(r['status'] for r in results)),flush=True)
            if digest(source)!=input_sha or any(digest(p)!=v for p,v in readers.items()):raise ValueError('Source index or key reader changed during reading')
            save('COMPLETE' if len(results)==len(cases) else 'PARTIAL')
        except BaseException:save('INTERRUPTED');raise
    print({k:v for k,v in read_json(folder/'report.json').items() if k not in ['results','readerFiles']})


if __name__=='__main__':main()
