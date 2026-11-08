"""Verify two actually viewed raster literature keys, never infer missing letters."""
from pathlib import Path
import sys

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP,test_identities,plain
from yks_tam_anahtar_taramasi import body_number_proof
from yks_anahtar_gorsel import transcription,checked_reading,MODEL
from yks_anahtar_pilotu import api

READINGS={
 '239208318a662598ef8513055e3bf4134caf45f1f7fd7a3b8d0e546717d854e3':{
     'testNumber':1,'letters':'CCADEBBBCCCCEBACDEDD',
     'viewedImage':'239208318a-last.png','viewedImageSha256':'a9f0b5ceb45215891bf9f08b4b548fd01efa06cf4c23ac0bc797c6e13665e2e4'},
 'c42a33c105cebb32f3e61788b6b434e752036b59582560190d135112228f57bc':{
     'testNumber':14,'letters':'CDBCDBDBCCBDACECCACB',
     'viewedImage':'c42a33c10-last.png','viewedImageSha256':'230c3fc8b41f4e01d65a5f808f54622b28c85e468c3625db750166219c8dec6c'},
}


def viewed_answers(sha):
    letters=READINGS[sha]['letters']
    if len(letters)!=20 or any(c not in 'ABCDE' for c in letters):raise ValueError('Complete actual source-image reading required')
    return [{'number':n,'answer':c} for n,c in enumerate(letters,1)]


def validate_key(row):
    sha=row['sourceSha256'];expected=viewed_answers(sha);identity=READINGS[sha]
    if row['testNumber']!=identity['testNumber'] or digest(row['sourcePath'])!=sha:raise ValueError('Raster source or printed test differs')
    if digest(row['agentViewedImagePath'])!=identity['viewedImageSha256']:raise ValueError('Actually viewed source raster image changed')
    if row['agentSourceImageReading']!=expected:raise ValueError('Saved actual raster source-image reading changed')
    if digest(row['cropPath'])!=row['cropSha256'] or digest(row['evidencePath'])!=row['evidenceSha256']:raise ValueError('Independent raster crop/proof changed')
    raw=read_json(row['evidencePath'])
    if raw['identity']['cropSha256']!=row['cropSha256'] or raw['identity']['modelDigest']!=row['modelDigest']:raise ValueError('Raster model/source identity differs')
    actual=checked_reading(raw['response'])
    if actual!=expected or row['sourceAnswers']!=expected:raise ValueError('Two independent raster source readings disagree')
    with pymupdf.open(row['sourcePath']) as doc:
        if doc[-1].get_text().strip() or not doc[-1].get_image_info():raise ValueError('Expected actual raster-only key layout changed')
        ids=set().union(*(test_identities(p.get_text()) for p in list(doc)[:-1]))
        if ids!={('AYT',identity['testNumber'])} or 'TURK DILI VE EDEBIYATI' not in plain(doc[0].get_text()):raise ValueError('Printed body exam/test/course differs')
        if body_number_proof(doc,expected)['status']!='PASS':raise ValueError('Raster-key body sequence/options incomplete')
    return row


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);base=root/'pdf-on-tarama/full-key-scan'
    observations={r['sourceSha256']:r for r in read_json(base/'progress.json')['results']};out=base/'raster-keys';out.mkdir(exist_ok=True)
    model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
    results=[];calls=0
    def save(status):
        write_json(out/'report.json',{'status':status,'scope':'TWO_ACTUALLY_VIEWED_RASTER_SOURCE_KEYS_ONLY','documents':2,'completed':len(results),
            'verifiedAnswers':sum(len(r['sourceAnswers'] or []) for r in results),'newModelCallsThisPass':calls,'newOcrCalls':0,
            'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'toolSha256':digest(Path(__file__)),'results':results})
    with process_lock(out/'.writer.lock'),ModelLease(role='yks-literature-raster-printed-key',model=MODEL):
        try:
            save('RUNNING')
            for sha,identity in READINGS.items():
                original=observations[sha];folder=out/sha[:16];folder.mkdir(exist_ok=True);source=Path(original['sourcePath'])
                viewed=root/'pdf-on-tarama/diagnostic-layout-review'/identity['viewedImage']
                if digest(source)!=sha or digest(viewed)!=identity['viewedImageSha256']:raise ValueError('Actual viewed source differs')
                expected=viewed_answers(sha)
                with pymupdf.open(source) as doc:
                    infos=doc[-1].get_image_info()
                    if len(infos)!=1:raise ValueError('One explicit raster key table image required')
                    box=pymupdf.Rect(infos[0]['bbox']);box=box+(-4,-4,4,4);box&=doc[-1].rect
                    crop=folder/'printed-raster-key.png';doc[-1].get_pixmap(dpi=330,clip=box,alpha=False).save(crop)
                    body=body_number_proof(doc,expected)
                    if body['status']!='PASS':raise ValueError('Source body requires separate review before raster key acceptance')
                    pages=len(doc)
                cache=folder/'vision';cache.mkdir(exist_ok=True)
                for active in api('/api/ps').get('models',[]):
                    if active['name']!=MODEL:api('/api/generate',{'model':active['name'],'keep_alive':0})
                observed=transcription(model,crop,cache);calls+=not observed['cacheHit'];agree=observed['reading']==expected
                result={**original,'status':'SOURCE_KEY_VERIFIED' if agree else 'RASTER_KEY_SOURCE_READINGS_DISAGREE_REVIEW_REQUIRED',
                    'sourceAnswers':expected if agree else None,'agentSourceImageReading':expected,'agentViewedImagePath':str(viewed),
                    'agentViewedImageSha256':identity['viewedImageSha256'],'independentSourceImageReading':observed['reading'],
                    'sourceSha256':sha,'sourcePath':str(source),'exam':'AYT','subjectId':'edebiyat','subject':'Türk Dili ve Edebiyatı',
                    'testNumber':identity['testNumber'],'testId':f'mebi-diagnostic:{sha}:AYT:{identity["testNumber"]}',
                    'sourceKeyPage':pages,'sourceKeyDocumentSha256':sha,'sourceKeyPath':str(source),'bodyPageCount':pages-1,'printedExamScopes':['AYT'],
                    'cropPath':str(crop),'sourceKeyBboxPt':list(box),'bodyNumberProof':body,
                    'method':'ACTUALLY_VIEWED_SOURCE_RASTER_PLUS_INDEPENDENT_QWEN_CROP',
                    **{k:v for k,v in observed.items() if k!='reading'},'keyEvidenceSha256':observed['evidenceSha256'],
                    'teacherApproved':False,'questionBankWrites':0,'sourceWrites':0}
                if agree:validate_key(result)
                results.append(result);save('RUNNING');print(sha[:12],result['status'],flush=True)
            save('COMPLETE')
        except BaseException:save('INTERRUPTED');raise
        finally:api('/api/generate',{'model':MODEL,'keep_alive':0})


if __name__=='__main__':main()
