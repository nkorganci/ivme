"""Reuse local page OCR, then read only missing pages across verified PDF sources."""
from concurrent.futures import ProcessPoolExecutor,as_completed
import importlib.util
import json
from pathlib import Path
import shutil

from yks_birlestirme import Store,digest,process_lock,read_json,write_json
from yks_stages.database import RESERVE
from pdf_ocr_cache import model_hash,read_page

APP=Path(__file__).resolve().parents[1]


def extract_one(job):
    spec=importlib.util.spec_from_file_location('ivme_page_ocr',APP/'scripts/pdf-page-ocr.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module.extract(job)


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    folder=store.child(state['runId']+'/pdf-on-tarama')
    preflight=read_json(folder/'progress.json')
    if preflight['status']!='PASS':raise ValueError('Full source page preflight required')
    record=state['stages']['YKS-03:full']
    groups=next(store.child(state['runId']+'/'+a['path']) for a in record['artifacts'] if a['path'].replace('\\','/').endswith('/pdf-groups.jsonl'))
    paths={g['sha256']:g['canonicalCandidate'] for g in map(json.loads,groups.read_text(encoding='utf-8').splitlines())}
    model=model_hash();jobs=[];reused=[]
    visual_pages={r['sourceSha256']:r['visualReviewPages'] for r in map(json.loads,(folder/'answer-observations.jsonl').read_text(encoding='utf-8').splitlines())}
    for doc in preflight['documents']:
        source=paths[doc['sha256']]
        if source['kind']!='FILE':raise ValueError('ZIP-only PDF needs prepared extraction before OCR')
        for number in sorted(set(doc.get('ocrPages',[]))|set(visual_pages.get(doc['sha256'],[]))):
            cached=read_page(doc['sha256'],number,model)
            if cached is not None:
                reused.append({'sourceSha256':doc['sha256'],'page':number,'status':cached['status']})
            else:
                jobs.append((str(Path(source['root'])/source['path']),doc['sha256'],number,model))
    print(f'OCR preflight: {len(reused)} cached pages, {len(jobs)} missing page observations',flush=True)
    results=[];errors=[]
    def save(status):
        report={'status':status,'scope':'OCR_OBSERVATIONS_ONLY','modelSha256':model,
                'preflightSha256':digest(folder/'progress.json'),'cachedPages':len(reused),
                'selectedMissingPages':len(jobs),'processedPages':len(results),'errors':errors,
                'unreadableOrBlankPages':sum(r['status'] not in ('EXTRACTED','BLANK_VERIFIED') for r in [*reused,*results]),
                'sourceWrites':0,'questionsInserted':0,'contentApproval':False,'modelsCalled':0,
                'cached':reused,'processed':results}
        write_json(folder/'ocr-preflight-report.json',report)
    (APP/'veri/content-labels/pdf-ocr-cache').mkdir(parents=True,exist_ok=True)
    with process_lock(folder/'.ocr-writer.lock'):
        save('RUNNING')
        try:
            with ProcessPoolExecutor(max_workers=2) as pool:
                futures={pool.submit(extract_one,job):job for job in jobs}
                for future in as_completed(futures):
                    if min(shutil.disk_usage(APP).free,shutil.disk_usage(Path.home()).free)<RESERVE:
                        raise RuntimeError('OCR disk reserve reached')
                    job=futures[future]
                    try:results.append(future.result())
                    except Exception as exc:errors.append({'sourceSha256':job[1],'page':job[2],'reason':type(exc).__name__+': '+str(exc)})
                    if (len(results)+len(errors))%25==0:
                        save('RUNNING');print(f'OCR preflight: {len(results)}/{len(jobs)} pages processed, {len(errors)} errors',flush=True)
            save('FAIL' if errors else 'PASS')
        except BaseException:
            save('INTERRUPTED');raise
    print(json.dumps({k:v for k,v in read_json(folder/'ocr-preflight-report.json').items() if k not in ('cached','processed')}),flush=True)


if __name__=='__main__':main()
