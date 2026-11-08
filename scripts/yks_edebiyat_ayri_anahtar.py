"""Bind two mislabelled source keys to the exact body in an official book.

Keep the original conflicting key unchanged. Require complete native bodies
and exact RGB equality at both 180 and 330 DPI before reading the book's key.
An explicitly viewed first-page publication banner is excluded only for Test3.
"""
from pathlib import Path
import sys

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP,test_identities,plain
from yks_pilot_sorular import source_lines,boundaries
from yks_ayri_anahtar import body_check,normalized_body,key_section
from yks_tam_ayri_anahtar import index_book
from yks_tam_anahtar_taramasi import body_number_proof
from yks_anahtar_gorsel import transcription,checked_reading,MODEL
from yks_anahtar_pilotu import api

BOOK='5ee1e81b8e10d2d63622e535c05bed5404070cc9fcd7940fb454072b7e222983'
CASES={'145e9aa1d643cf45b29ec349d05fab12ab6022395fc9e251413d059115180749':12,
    '61b6c6af4d557a835b931c2749673fa6684f0e4e84b8289acdba819ec044c4ff':3}


def bind_body(source,book,test,start):
    body=list(source)[:-1];checks=[]
    if set().union(*(test_identities(p.get_text()) for p in body))!={('AYT',test)}:
        raise ValueError('Source printed body identity differs')
    if 'TURK DILI VE EDEBIYATI' not in plain(body[0].get_text()):raise ValueError('Printed source subject differs')
    for i,left in enumerate(body):
        right=book[start+i];prior=body_check(left,right)
        if test_identities(right.get_text())!={('AYT',test)}:raise ValueError('Official counterpart page test identity differs')
        if list(left.rect)!=list(right.rect) or 'clipPt' not in prior:raise ValueError('Body geometry differs')
        box=pymupdf.Rect(prior['clipPt']);excluded_banner=False
        if test==3 and i==0:
            regions,_=boundaries(source_lines(left),left.rect.width,left.rect.height)
            top=min(r['anchor']['contentTopPt'] for r in regions)-.25
            # The actual two banner images were viewed. No native source body
            # line may be discarded by this narrow, source-specific exclusion.
            old=left.get_text(clip=box);box.y0=top
            if normalized_body(old)!=normalized_body(left.get_text(clip=box)):
                raise ValueError('Banner exclusion would remove native question text')
            excluded_banner=True
        a=normalized_body(left.get_text(clip=box));b=normalized_body(right.get_text(clip=box))
        if not a or a!=b:raise ValueError('Complete source/official question texts differ')
        pixels=[]
        for dpi in [180,330]:
            x=left.get_pixmap(dpi=dpi,clip=box,alpha=False);y=right.get_pixmap(dpi=dpi,clip=box,alpha=False)
            if (x.width,x.height,x.samples)!=(y.width,y.height,y.samples):raise ValueError('Complete body source/official pixels differ')
            pixels.append({'dpi':dpi,'sourcePixelSha256':__import__('hashlib').sha256(x.samples).hexdigest(),
                'bookPixelSha256':__import__('hashlib').sha256(y.samples).hexdigest(),'width':x.width,'height':x.height})
        checks.append({'sourcePage':i+1,'bookPage':start+i+1,'bboxPt':list(box),'nativeBodyTextSha256':__import__('hashlib').sha256(a.encode()).hexdigest(),
            'pixels':pixels,'sourceSpecificViewedPublicationBannerExcluded':excluded_banner,'original144DpiComparison':prior,'matches':True})
    return checks


def validate_key(row):
    sha=row['sourceSha256'];test=CASES[sha]
    if row['status']!='SOURCE_KEY_VERIFIED' or digest(row['sourcePath'])!=sha or digest(row['sourceKeyPath'])!=BOOK:
        raise ValueError('Reviewed source/official PDF changed')
    if row['testNumber']!=test or row['exam']!='AYT' or row['subjectId']!='edebiyat':raise ValueError('Invalid rebound source scope')
    if digest(row['bodyProofPath'])!=row['bodyProofSha256']:raise ValueError('Exact body proof changed')
    proof=read_json(row['bodyProofPath'])
    if proof['sourceSha256']!=sha or proof['bookSha256']!=BOOK or len(proof['checks'])!=row['bodyPageCount']:
        raise ValueError('Incomplete/different body proof')
    for p in proof['checks']:
        if not p['matches'] or [v['dpi'] for v in p['pixels']]!=[180,330] or any(v['sourcePixelSha256']!=v['bookPixelSha256'] for v in p['pixels']):
            raise ValueError('Full body equality at two resolutions required')
    with pymupdf.open(row['sourceKeyPath']) as official,pymupdf.open(row['sourcePath']) as source:
        section=key_section(official[row['sourceKeyPage']-1],'AYT',test)
        if not section or section['answers']!=row['sourceAnswers']:raise ValueError('Printed official section key differs')
        if body_number_proof(source,row['sourceAnswers'])['status']!='PASS':raise ValueError('Current original question number/options proof failed')
    if digest(row['cropPath'])!=row['cropSha256'] or digest(row['evidencePath'])!=row['evidenceSha256']:raise ValueError('Official key crop/reading changed')
    raw=read_json(row['evidencePath'])
    if raw['identity']['cropSha256']!=row['cropSha256'] or raw['identity']['modelDigest']!=row['modelDigest'] or checked_reading(raw['response'])!=row['sourceAnswers']:
        raise ValueError('Official native/independent image answers differ')
    return row


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);base=root/'pdf-on-tarama/full-key-scan'
    inventory=next(root/a['path'] for a in state['stages']['YKS-03:full']['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
    groups={g['sha256']:g for g in map(__import__('json').loads,inventory.read_text(encoding='utf-8').splitlines())}
    location=groups[BOOK]['canonicalCandidate'];book=Path(location['root'])/location['path']
    if digest(book)!=BOOK:raise ValueError('Official literature book changed')
    sources={r['sourceSha256']:r for r in read_json(base/'progress.json')['results']}
    folder=base/'rebound-literature-keys';folder.mkdir(exist_ok=True);results=[];calls=0
    model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
    with process_lock(folder/'.writer.lock'),ModelLease(role='yks-identical-literature-body-official-printed-keys',model=MODEL):
        try:
            with pymupdf.open(book) as official:
                index=index_book(official,'AYT')
                for sha,test in CASES.items():
                    original=sources[sha];out=folder/sha[:16];out.mkdir(exist_ok=True)
                    if digest(original['sourcePath'])!=sha:raise ValueError('Original literature source changed')
                    with pymupdf.open(original['sourcePath']) as source:
                        pages=index['bodies'][test];count=len(source)-1
                        if pages!=list(range(pages[0],pages[0]+count)):raise ValueError('Official counterpart body coverage incomplete')
                        proof_path=out/'body-proof.json';identity={'sourceSha256':sha,'bookSha256':BOOK,'testNumber':test,
                            'toolSha256':digest(Path(__file__)),'rendererVersion':pymupdf.VersionBind}
                        prior=read_json(proof_path) if proof_path.is_file() else {}
                        if prior.get('identity')!=identity:
                            checks=bind_body(source,official,test,pages[0]);write_json(proof_path,{'identity':identity,'sourceSha256':sha,'bookSha256':BOOK,'checks':checks})
                        sections=index['keys'].get(test,[])
                        if len(sections)!=1:raise ValueError('Unambiguous official printed key required')
                        section=sections[0];body=body_number_proof(source,section['answers'])
                        if body['status']!='PASS':raise ValueError('Original complete body/option sequence differs from official key')
                        source_key_ids=sorted(test_identities(source[-1].get_text()))
                    crop=out/'official-key.png';official[section['page']-1].get_pixmap(dpi=330,clip=pymupdf.Rect(section['bboxPt']),alpha=False).save(crop)
                    cache=out/'vision';cache.mkdir(exist_ok=True);observed=transcription(model,crop,cache);calls+=not observed['cacheHit']
                    agree=observed['reading']==section['answers']
                    row={**original,'sourceAnswers':section['answers'] if agree else None,'status':'SOURCE_KEY_VERIFIED' if agree else 'OFFICIAL_KEY_READINGS_DISAGREE_REVIEW_REQUIRED',
                        'subjectId':'edebiyat','subject':'Türk Dili ve Edebiyatı','exam':'AYT','printedExamScopes':['AYT'],'testNumber':test,
                        'testId':f'mebi-diagnostic:{sha}:AYT:{test}','bodyPageCount':count,'sourceKeyDocumentSha256':BOOK,'sourceKeyPath':str(book),
                        'sourceKeyPage':section['page'],'sourceKeyBboxPt':section['bboxPt'],'cropPath':str(crop),'keyEvidenceSha256':observed['evidenceSha256'],
                        **{k:v for k,v in observed.items() if k!='reading'},'bodyProofPath':str(proof_path),'bodyProofSha256':digest(proof_path),
                        'originalConflictingSourceKeyIdentities':source_key_ids,'originalConflictingKeyRetained':True,'bodyNumberProof':body,
                        'method':'COMPLETE_NATIVE_BODY_PLUS_EXACT_180_AND_330_DPI_OFFICIAL_BODY_AND_INDEPENDENT_KEY_IMAGE',
                        'teacherApproved':False,'questionBankWrites':0,'sourceWrites':0}
                    if agree:validate_key(row)
                    results.append(row);print(sha[:12],row['status'],flush=True)
                    write_json(folder/'report.json',{'status':'RUNNING','results':results})
            report={'status':'COMPLETE','scope':'TWO_IDENTICAL_LITERATURE_BODIES_WITH_ORIGINAL_KEY_IDENTITY_CONFLICTS_RETAINED',
                'documents':len(results),'verifiedAnswers':sum(len(r['sourceAnswers'] or []) for r in results),'newModelCallsThisPass':calls,
                'newOcrCalls':0,'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'results':results}
            write_json(folder/'report.json',report)
        finally:api('/api/generate',{'model':MODEL,'keep_alive':0})
    print({k:v for k,v in report.items() if k!='results'})


if __name__=='__main__':main()
