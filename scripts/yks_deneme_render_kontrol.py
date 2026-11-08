"""Check mock PDF decoding warnings separately from successful printed-key reads."""
from collections import Counter
from pathlib import Path

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP


def inspect(row):
    if digest(row['sourcePath'])!=row['sourceSha256']:raise ValueError('Mock source changed before decoding check')
    pages=[];issues=[];pymupdf.TOOLS.mupdf_warnings(reset=True)
    with pymupdf.open(row['sourcePath']) as doc:
        opening=pymupdf.TOOLS.mupdf_warnings(reset=True)
        if opening:issues.append({'page':None,'warning':opening})
        for page in doc:
            pymupdf.TOOLS.mupdf_warnings(reset=True)
            try:
                text=page.get_text();image=page.get_pixmap(dpi=150,alpha=False)
                observation={'page':page.number+1,'nativeTextChars':len(text),'renderedPixels':[image.width,image.height],
                    'rgbSha256':__import__('hashlib').sha256(image.samples).hexdigest()}
            except Exception as exc:observation={'page':page.number+1,'error':type(exc).__name__+': '+str(exc)}
            warning=pymupdf.TOOLS.mupdf_warnings(reset=True)
            if warning:observation['decoderWarning']=warning
            if warning or observation.get('error'):issues.append(observation)
            pages.append(observation)
    if digest(row['sourcePath'])!=row['sourceSha256']:raise ValueError('Mock source changed during decoding check')
    return {'sourceSha256':row['sourceSha256'],'sourcePath':row['sourcePath'],
        'status':'SOURCE_DECODING_REVIEW_REQUIRED' if issues else 'NATIVE_AND_RASTER_DECODING_CHECK_PASSED',
        'renderDpi':150,'pageCount':len(pages),'issues':issues,'pages':pages,'bodyContentAccepted':False,
        'teacherApproved':False,'sourceWrites':0,'questionBankWrites':0}


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);source=root/'pdf-on-tarama/full-mock-keys/progress.json'
    current=read_json(source)
    if current['status']!='SUPPORTED_MOCK_PASS_COMPLETE':raise ValueError('Complete mock source-key pass first')
    folder=root/'pdf-on-tarama/mock-decoding';folder.mkdir(exist_ok=True);results=[];hits=0
    with process_lock(folder/'.writer.lock'):
        for row in current['results']:
            identity={'sourceSha256':row['sourceSha256'],'rendererVersion':pymupdf.VersionBind,'renderDpi':150,'toolSha256':digest(Path(__file__))}
            file=folder/(row['sourceSha256']+'.json');prior=read_json(file) if file.is_file() else {}
            if prior.get('identity')==identity:
                if digest(row['sourcePath'])!=row['sourceSha256']:raise ValueError('Cached mock source changed')
                result=prior['result'];hits+=1
            else:result=inspect(row);write_json(file,{'identity':identity,'result':result})
            results.append(result)
            if len(results)%10==0:print('Mock native/raster decode: '+str(len(results))+'/'+str(len(current['results'])),flush=True)
            write_json(folder/'report.json',{'status':'RUNNING','results':results})
        report={'status':'COMPLETE','scope':'MOCK_NATIVE_AND_RASTER_SOURCE_DECODING_ONLY','documents':len(results),
            'pages':sum(r['pageCount'] for r in results),'cachedDocumentsThisPass':hits,
            'states':dict(Counter(r['status'] for r in results)),'sourceKeyPassSha256':digest(source),
            'questionBankWrites':0,'sourceWrites':0,'newModelCalls':0,'teacherApproved':False,'results':results}
        write_json(folder/'report.json',report)
    print({k:v for k,v in report.items() if k!='results'})


if __name__=='__main__':main()
