"""Certify exact native and full-page pixel equality between source editions.

This reuses existing processing only at explicitly equivalent page positions;
changed answer keys or question bodies are retained as separate review work.
"""
from collections import Counter
import difflib
import hashlib
import json
from pathlib import Path

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP
from yks_ayri_anahtar import normalized_body

OLD='ab98a35e4819d2695482dcf5e98b2f11fd4b63022c0a24824c1011103f562fd1'
NEW='6135f25358db393eba2de11825b15cc7595246165f3ddfaa477134e57da99607'
DPIS=[180,330]


def compare_page(left,right):
    a=left.get_text();b=right.get_text();native=normalized_body(a)==normalized_body(b)
    if list(left.rect)!=list(right.rect):return {'status':'PAGE_GEOMETRY_DIFFERS_REVIEW_REQUIRED','nativeTextEqual':native,'pixels':[]}
    pixels=[]
    for dpi in DPIS:
        x=left.get_pixmap(dpi=dpi,alpha=False);y=right.get_pixmap(dpi=dpi,alpha=False)
        px=hashlib.sha256(x.samples).hexdigest();py=hashlib.sha256(y.samples).hexdigest()
        pixels.append({'dpi':dpi,'oldRgbSha256':px,'newRgbSha256':py,'equal':px==py,'width':x.width,'height':x.height})
    return {'status':'FULL_PAGE_NATIVE_AND_PIXELS_IDENTICAL' if native and all(p['equal'] for p in pixels) else 'SOURCE_PAGE_CONTENT_OR_NATIVE_TEXT_DIFFERENCE_REVIEW_REQUIRED',
        'nativeTextEqual':native,'oldNativeTextSha256':hashlib.sha256(normalized_body(a).encode()).hexdigest(),
        'newNativeTextSha256':hashlib.sha256(normalized_body(b).encode()).hexdigest(),'pixels':pixels,
        'nativeDifferences':list(difflib.unified_diff(a.splitlines(),b.splitlines())) if not native else []}


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    inventory=next(root/a['path'] for a in state['stages']['YKS-03:full']['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
    groups={g['sha256']:g for g in map(json.loads,inventory.read_text(encoding='utf-8').splitlines())};paths=[]
    for sha in [OLD,NEW]:
        location=groups[sha]['canonicalCandidate'];path=Path(location['root'])/location['path']
        if location['kind']!='FILE' or digest(path)!=sha:raise ValueError('Registered source edition changed')
        paths.append(path)
    folder=root/'source-page-equivalence/3adim-turkce';folder.mkdir(parents=True,exist_ok=True);results=[];hits=0
    identity={'oldSourceSha256':OLD,'newSourceSha256':NEW,'rendererVersion':pymupdf.VersionBind,'dpis':DPIS,'toolSha256':digest(Path(__file__))}
    def save(status):
        write_json(folder/'progress.json',{'status':status,'scope':'FULL_ORIGINAL_PAGE_EQUIVALENCE_ONLY_NOT_QUESTION_KEY_OR_IMPORT_ACCEPTANCE',
            'identity':identity,'oldSourcePath':str(paths[0]),'newSourcePath':str(paths[1]),'pages':283,'completed':len(results),
            'states':dict(Counter(r['status'] for r in results)),'cachedPagesThisPass':hits,'newModelCalls':0,'newOcrCalls':0,
            'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'results':results})
    with process_lock(folder/'.writer.lock'):
        try:
            save('RUNNING')
            with pymupdf.open(paths[0]) as old,pymupdf.open(paths[1]) as new:
                if len(old)!=len(new) or len(old)!=283:raise ValueError('Expected source edition page counts differ')
                for index,(left,right) in enumerate(zip(old,new),1):
                    file=folder/('page-'+str(index)+'.json');key={**identity,'physicalPage':index};prior=read_json(file) if file.is_file() else {}
                    if prior.get('identity')==key:result=prior['result'];hits+=1
                    else:
                        result={'oldPhysicalPage':index,'newPhysicalPage':index,**compare_page(left,right)}
                        write_json(file,{'identity':key,'result':result})
                    results.append(result)
                    if index%20==0:save('RUNNING');print('3 Adım page equivalence',index,'/ 283',flush=True)
            if any(digest(path)!=sha for path,sha in zip(paths,[OLD,NEW])):raise ValueError('Source edition changed during comparison')
            save('COMPLETE')
        except BaseException:save('INTERRUPTED');raise
    report=read_json(folder/'progress.json');print({k:v for k,v in report.items() if k not in ['results','identity']})
    print('Different pages:',[r['newPhysicalPage'] for r in results if r['status']!='FULL_PAGE_NATIVE_AND_PIXELS_IDENTICAL'])


if __name__=='__main__':main()
