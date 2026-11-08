"""Prepare and technically verify diagnostic crops, reusing accepted pilot assets."""
import argparse
from collections import Counter
import importlib.util
from pathlib import Path
import shutil

import pymupdf
from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_pilot_kaynaklari import APP
from yks_tam_kaynak_kontrol import verified_keys
from yks_pilot_sorular import extract_source,SHARED,VERSION
from yks_pilot_kirpim_kontrol import uncovered_body_lines,check_pixels,VERSION as PIXEL_VERSION


def key_identity(source):
    return signature({k:source[k] for k in ['sourceSha256','sourceAnswers','keyEvidenceSha256','sourceKeyPage',
        'sourceKeyDocumentSha256','sourceKeyPath','exam','subjectId','bodyPageCount','testId']})


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--limit',type=int);args=parser.parse_args()
    if args.limit is not None and args.limit<1:parser.error('Positive new-document limit required')
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    if store.verify(state,'YKS-10','pilot')['status']!='VERIFIED':raise ValueError('Verified isolated pilot required')
    sources=verified_keys(root);folder=root/'full-question-crops';folder.mkdir(exist_ok=True);pixels=folder/'pixel-cache';pixels.mkdir(exist_ok=True)
    pilot=read_json(root/'question-cohort/source-crop-report.json');previous={r['sourceSha256']:r for r in pilot['results'] if r['status']=='PREPARED'}
    pixel_report=read_json(root/'question-cohort/crop-integrity-report.json');prior_pixels={p['sourceCode']:p for p in pixel_report['results']}
    spec=importlib.util.spec_from_file_location('pdf_metin',APP/'scripts/pdf-metin.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    results=[];new_documents=0;new_renders=0;cache_hits=0
    def save(status):
        write_json(folder/'progress.json',{'status':status,'scope':'DIAGNOSTIC_SOURCE_CROP_TECHNICAL_PREPARATION_ONLY',
            'documentsWithVerifiedKeys':len(sources),'completed':len(results),'pending':len(sources)-len(results),
            'states':dict(Counter(r['status'] for r in results)),'questionsPrepared':sum(r.get('questions',0) for r in results if r['status']=='PREPARED'),
            'newDocumentsThisPass':new_documents,'reusedDocumentsThisPass':cache_hits,'newPixelRendersThisPass':new_renders,
            'sourceKeyIdentity':signature([key_identity(s) for s in sources]),'toolSha256':digest(Path(__file__)),
            'questionBankWrites':0,'sourceWrites':0,'newModelCalls':0,'teacherApproved':False,'fullYks07Accepted':False,'results':results})
    with process_lock(folder/'.writer.lock'):
        try:
            save('RUNNING')
            for source in sources:
                sha=source['sourceSha256'];key=key_identity(source);out=folder/sha[:16];out.mkdir(exist_ok=True)
                cache=out/'technical-integrity.json';identity={'sourceKey':key,'cropVersion':VERSION,'pixelVersion':PIXEL_VERSION,
                    'rendererVersion':pymupdf.VersionBind,'readerFiles':{p:digest(APP/'scripts'/p) for p in ['yks_pilot_sorular.py','pdf-metin.py','yks_pilot_kirpim_kontrol.py']}}
                if cache.is_file() and read_json(cache).get('identity')==identity:
                    record=read_json(cache);row=record['result']
                    if row.get('package'):
                        if digest(row['package'])!=row['packageSha256']:raise ValueError('Prepared question package changed')
                        for c in read_json(row['package'])['cards']:
                            if digest(c['image'])!=c['imageSha256']:raise ValueError('Source question crop changed')
                    for p in row.get('pixelProofs',[]):
                        if digest(p['path'])!=p['sha256']:raise ValueError('Prepared crop technical pixel proof changed')
                    results.append(row);cache_hits+=1;save('RUNNING');continue
                if args.limit is not None and new_documents>=args.limit:break
                if shutil.disk_usage(folder).free<20*1024**3:raise RuntimeError('20 GB disk reserve required for source crop preparation')
                shared=[]
                with pymupdf.open(source['sourcePath']) as pdf:
                    for page in list(pdf)[:source['bodyPageCount']]:
                        if SHARED.search(page.get_text()):shared.append(page.number+1)
                if shared:
                    row={'sourceSha256':sha,'status':'SHARED_CONTEXT_LAYOUT_REVIEW_REQUIRED','pages':shared,
                        'reason':'Shared question heading observed outside individual crops; preserve a shared source context before proceeding.'}
                else:
                    reused=sha in previous
                    if reused:
                        item=previous[sha]
                        if digest(item['package'])!=item['packageSha256']:raise ValueError('Existing pilot package changed')
                        package=read_json(item['package']);package_file=Path(item['package'])
                        if [(c['printedNumber'],c['answer']) for c in package['cards']]!=[(a['number'],a['answer']) for a in source['sourceAnswers']]:
                            raise ValueError('Pilot question answers differ from current source key')
                    else:
                        try:package=extract_source(source,out,module.visual_inside);package_file=out/'candidates.json'
                        except ValueError as exc:
                            row={'sourceSha256':sha,'status':'SOURCE_BOUNDARY_REVIEW_REQUIRED','reason':str(exc)}
                            write_json(cache,{'identity':identity,'result':row});results.append(row);new_documents+=1;save('RUNNING');continue
                    proofs=[];coverage=[]
                    with pymupdf.open(source['sourcePath']) as pdf:
                        for number in sorted({c['pdfPage'] for c in package['cards']}):
                            page_cards=[c for c in package['cards'] if c['pdfPage']==number]
                            coverage.append({'page':number,'uncoveredBodyLines':uncovered_body_lines(pdf[number-1],page_cards)})
                        for card in package['cards']:
                            if digest(card['image'])!=card['imageSha256']:raise ValueError('Actual source crop bytes changed')
                            if reused:
                                proof=prior_pixels[card['code']]
                                if proof['imageSha256']!=card['imageSha256'] or digest(proof['pixelProofPath'])!=proof['pixelProofSha256']:
                                    raise ValueError('Already accepted pixel evidence differs')
                                path=Path(proof['pixelProofPath'])
                            else:
                                pixel_key=signature([PIXEL_VERSION,sha,card['pdfPage'],card['bboxPt'],card['imageSha256'],pymupdf.VersionBind]);path=pixels/(pixel_key+'.json')
                                if not path.is_file():
                                    values=check_pixels(pdf[card['pdfPage']-1],card)
                                    write_json(path,{**values,'version':PIXEL_VERSION,'sourceSha256':sha,'imageSha256':card['imageSha256'],'bboxPt':card['bboxPt']});new_renders+=1
                                values=read_json(path)
                                if values['sourcePixelSha256']!=values['preparedPixelSha256'] or values['imageSha256']!=card['imageSha256']:
                                    raise ValueError('Source pixel verification cache differs')
                            proofs.append({'path':str(path),'sha256':digest(path)})
                    gaps=sum(len(p['uncoveredBodyLines']) for p in coverage)
                    row={'sourceSha256':sha,'status':'PREPARED' if not gaps else 'NATIVE_BODY_LINE_COVERAGE_REVIEW_REQUIRED',
                        'questions':len(package['cards']),'package':str(package_file),'packageSha256':digest(package_file),'pixelProofs':proofs,
                        'bodyCoverage':coverage,'uncoveredNativeBodyLines':gaps,'sourceAndPreparedPixelsEqual':True,
                        'graphicsOrGlyphConcerns':sum(c['containsGraphics'] or bool(c['reviewConcerns']) for c in package['cards']),
                        'reusedAcceptedPilotPackage':reused,'teacherApproved':False,'questionBankWrites':0}
                write_json(cache,{'identity':identity,'result':row});results.append(row);new_documents+=1;save('RUNNING')
                if len(results)%10==0:print(f'Full diagnostic crops: {len(results)}/{len(sources)} '+str(Counter(r['status'] for r in results)),flush=True)
            save('SUPPORTED_KEYED_DIAGNOSTIC_CROP_PASS_COMPLETE' if len(results)==len(sources) else 'PARTIAL')
        except BaseException:save('INTERRUPTED');raise
    print({k:v for k,v in read_json(folder/'progress.json').items() if k!='results'})


if __name__=='__main__':main()
