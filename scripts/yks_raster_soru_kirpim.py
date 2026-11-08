"""Prepare only newly verified raster-key sources; preserve all prior crops."""
import importlib.util
from pathlib import Path

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP
from yks_raster_anahtar_incele import validate_key
from yks_pilot_sorular import extract_source
from yks_pilot_kirpim_kontrol import check_pixels,uncovered_body_lines


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);source=root/'pdf-on-tarama/full-key-scan/raster-keys/report.json'
    report=read_json(source)
    if report['status']!='COMPLETE':raise ValueError('Complete independent raster-key source reading required')
    folder=root/'full-question-raster-crops';folder.mkdir(exist_ok=True);results=[];hits=0
    engine=APP/'scripts/pdf-metin.py';spec=importlib.util.spec_from_file_location('raster_pdf_metin',engine);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    with process_lock(folder/'.writer.lock'):
        for row in report['results']:
            if row['status']!='SOURCE_KEY_VERIFIED':continue
            validate_key(row);row={**row,'printedExamScopes':['AYT']}
            out=folder/row['sourceSha256'][:16];out.mkdir(exist_ok=True);cache=out/'technical-integrity.json'
            identity={'sourceKeyEvidenceSha256':row['keyEvidenceSha256'],'sourceAnswers':row['sourceAnswers'],
                'sourceSha256':row['sourceSha256'],'rendererVersion':pymupdf.VersionBind,
                'files':{p:digest(APP/'scripts'/p) for p in ['yks_raster_soru_kirpim.py','yks_pilot_sorular.py','yks_pilot_kirpim_kontrol.py']}}
            old=read_json(cache) if cache.is_file() else {}
            if old.get('identity')==identity:
                prepared=old['result']
                if digest(prepared['package'])!=prepared['packageSha256']:raise ValueError('Raster source package changed')
                for card in read_json(prepared['package'])['cards']:
                    if digest(card['image'])!=card['imageSha256']:raise ValueError('Raster source question crop changed')
                for proof in prepared['pixelProofs']:
                    if digest(proof['path'])!=proof['sha256']:raise ValueError('Raster pixel source proof changed')
                results.append(prepared);hits+=1;continue
            package=extract_source(row,out,module.visual_inside);proofs=[];coverage=[]
            with pymupdf.open(row['sourcePath']) as doc:
                for page in list(doc)[:-1]:
                    cards=[c for c in package['cards'] if c['pdfPage']==page.number+1]
                    coverage.append({'page':page.number+1,'uncoveredBodyLines':uncovered_body_lines(page,cards)})
                for card in package['cards']:
                    file=out/(card['code']+'.pixels.json');write_json(file,{**check_pixels(doc[card['pdfPage']-1],card),
                        'sourceSha256':row['sourceSha256'],'sourceCode':card['code'],'imageSha256':card['imageSha256']})
                    proofs.append({'path':str(file),'sha256':digest(file)})
            gaps=sum(len(r['uncoveredBodyLines']) for r in coverage);path=out/'candidates.json'
            prepared={'sourceSha256':row['sourceSha256'],'status':'PREPARED' if not gaps else 'NATIVE_BODY_LINE_COVERAGE_REVIEW_REQUIRED',
                'questions':len(package['cards']),'package':str(path),'packageSha256':digest(path),'pixelProofs':proofs,
                'bodyCoverage':coverage,'uncoveredNativeBodyLines':gaps,'sourceAndPreparedPixelsEqual':True,'teacherApproved':False,'questionBankWrites':0}
            write_json(cache,{'identity':identity,'result':prepared});results.append(prepared)
        output={'status':'SUPPORTED_KEYED_DIAGNOSTIC_CROP_PASS_COMPLETE','scope':'TWO_NEW_RASTER_KEY_SOURCES_ONLY','documentsWithVerifiedKeys':len(results),
            'sourceKeyIdentity':signature([r['sourceSha256']+r['keyEvidenceSha256'] for r in report['results'] if r['status']=='SOURCE_KEY_VERIFIED']),
            'questionsPrepared':sum(r['questions'] for r in results if r['status']=='PREPARED'),'reusedDocumentsThisPass':hits,
            'uncoveredNativeBodyLines':sum(r['uncoveredNativeBodyLines'] for r in results),'sourceKeyReportSha256':digest(source),
            'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'results':results}
        write_json(folder/'progress.json',output)
    print({k:v for k,v in output.items() if k!='results'})


if __name__=='__main__':main()
