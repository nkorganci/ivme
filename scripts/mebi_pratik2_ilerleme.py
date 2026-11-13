"""Observe an existing scan without signalling or restarting it.

Append a measured snapshot initially, every five minutes, or each ten-point
increase in PDF coverage. A separate process allows observing an already
running scanner without changing its in-memory code.
"""
import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import BASE
from yks_birlestirme import write_json


def snapshot():
    items = json.loads((BASE/'inventory.json').read_text(encoding='utf-8'))['items']
    pdfs = [r for r in items if r['extension']=='.pdf']
    cache = BASE/'full-pdf-native'
    completed = sum((cache/(r['sha256']+'.json')).is_file() for r in pdfs)
    progress_path = BASE/'full-pdf-progress.json'
    progress = json.loads(progress_path.read_text(encoding='utf-8')) if progress_path.exists() else {}
    acceptance=BASE/'single-test-crops/source-pixel-acceptance.json'
    accepted=json.loads(acceptance.read_text(encoding='utf8'))['acceptedCount'] if acceptance.exists() else 0
    imported=0;published=0
    for name in ('publication-preparation','verified-source-batch-001'):
        folder=BASE/name
        result=folder/'import-result.json'
        if result.exists():imported+=json.loads(result.read_text(encoding='utf8')).get('inserted',0)
        result=folder/'publication-result.json'
        if result.exists():published+=json.loads(result.read_text(encoding='utf8')).get('questionsAppended',0)
    return {'atUtc':datetime.now(timezone.utc).isoformat(), 'totalFiles':len(items),
        'totalPdfs':len(pdfs), 'completedPdfPaths':completed,
        'remainingPdfPaths':len(pdfs)-completed, 'pdfPercent':round(100*completed/len(pdfs),2),
        'lastScannerCheckpoint':progress, 'acceptedQuestionCount':accepted,
        'importedQuestionCount':imported,'catalogPublishedQuestionCount':published,
        'verifiedSubsetImportPercent':round(100*imported/accepted,2) if accepted else None,
        'totalQuestionCount':None, 'overallProjectPercent':None, 'remainingSecondsEstimate':None,
        'estimateReason':'No representative timed throughput or final question denominator yet',
        'cacheLastChangedUtc':max((datetime.fromtimestamp(p.stat().st_mtime,timezone.utc).isoformat()
            for p in cache.glob('*.json')),default=None)}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--watch',action='store_true');args=parser.parse_args()
    last=0;bucket=-1
    while True:
        data=snapshot();now=time.monotonic();current=int(data['pdfPercent']//10)
        if not last or now-last>=300 or current>bucket:
            with (BASE/'progress-events.jsonl').open('a',encoding='utf-8') as stream:
                stream.write(json.dumps(data,ensure_ascii=False)+'\n')
            write_json(BASE/'progress-current.json',data)
            print(json.dumps(data,ensure_ascii=False),flush=True)
            last=now;bucket=current
        if not args.watch or (BASE/'full-pdf-coverage.json').exists():break
        time.sleep(10)


if __name__=='__main__':main()
