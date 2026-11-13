"""Index raw numbered signals on every cached PDF page, never count as questions.

Unlike the earlier filename-selected scan, this includes all 1,573 PDFs.
Native markers are hints for future review, not verified body/key bindings.
"""
import hashlib
import json
import re
import time
from collections import Counter
from mebi_pratik2_tam_pdf_tarama import BASE
from yks_birlestirme import write_json

BODY=re.compile(r'^\s*(\d{1,4})\s*[.)]\s*(.*)$')
KEY=re.compile(r'(?<!\w)(\d{1,4})\s*[.):-]\s*([ABCDE])(?=\s|\d|$)')


def run():
    documents=json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents']
    folder=BASE/'all-pdf-native-observations';folder.mkdir(exist_ok=True)
    started=time.monotonic();sources=[];totals=Counter();last_log=started;last_bucket=-1
    with (folder/'observations.jsonl').open('w',encoding='utf8') as stream:
        for index,doc in enumerate(documents,1):
            cached=json.loads((BASE/doc['cache']).read_text(encoding='utf8'));counts=Counter()
            if len(cached['pages'])!=doc['pageCount']:raise ValueError('Cached page coverage differs from inventory')
            for page in cached['pages']:
                totals['pages']+=1
                if page['readingStatus']=='VISUAL_REVIEW_REQUIRED':counts['VISUAL_PAGE_REVIEW_REQUIRED']+=1
                for line in page['lines']:
                    keys=list(KEY.finditer(line['text']));body=BODY.match(line['text']) if not keys else None
                    signals=[('PRINTED_KEY_CELL_SIGNAL',int(k[1]),k[2]) for k in keys]
                    if body:signals.append(('NUMBERED_BODY_SIGNAL',int(body[1]),None))
                    for kind,number,answer in signals:
                        row={'sourceSha256':doc['sourceSha256'],'relativePath':doc['relativePath'],
                            'physicalPage':page['physicalPage'],'bbox':line['bbox'],'nativeText':line['text'],
                            'kind':kind,'printedNumber':number,'readAnswer':answer,'cache':doc['cache'],
                            'status':'RAW_NATIVE_SIGNAL_UNVERIFIED','studentVisible':False}
                        row['observationId']=hashlib.sha256(json.dumps(row,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
                        stream.write(json.dumps(row,ensure_ascii=False)+'\n');counts[kind]+=1
            totals.update(counts);sources.append({**doc,'rawCounts':dict(counts),'verifiedQuestionCount':None})
            now=time.monotonic();bucket=10*index//len(documents)
            if bucket>last_bucket or now-last_log>=300:
                progress={'completedPdfs':index,'totalPdfs':len(documents),'percent':round(100*index/len(documents),2),
                    'elapsedSeconds':round(now-started,2),'estimatedRemainingSeconds':None}
                with (folder/'progress.jsonl').open('a',encoding='utf8') as log:log.write(json.dumps(progress)+'\n')
                print(json.dumps(progress),flush=True);last_bucket=bucket;last_log=now
    report={'status':'ALL_CACHED_PDF_PAGES_INDEXED_NOT_QUESTION_ACCEPTANCE','pdfs':len(documents),
        'counts':dict(totals),'sources':sources,'distinctQuestionTotal':None,'questionWrites':0,
        'elapsedSeconds':round(time.monotonic()-started,2)}
    write_json(folder/'report.json',report)
    print(json.dumps({k:v for k,v in report.items() if k!='sources'}))


if __name__=='__main__':run()
