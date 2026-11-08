"""Resume full-archive key work with the supported single-diagnostic layout first.

Unrecognized layouts remain review-required; no source is called keyless and no
question is inserted. Existing verified pilot readings and OCR caches are reused.
"""
import argparse
from collections import Counter
import json
from pathlib import Path

import pymupdf
from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_anahtar_cohort import simple_key,observe
from yks_pilot_kaynaklari import APP,source_keys,verified_source_scope
from yks_pilot_sorular import source_lines,boundaries,OPTION,VERSION as BOUNDARY_VERSION
from pdf_source_scan import read_scan
from pdf_ocr_cache import model_hash


def select_diagnostics(groups):
    output=[]
    for group in groups:
        locations=[p for p in group['occurrences'] if p['kind']=='FILE' and Path(p['root']).name=='mebi-yks'
            and p['path'].startswith('Deneme-Tarama/Taramalar/')]
        if not locations:continue
        location=group['canonicalCandidate'] if group['canonicalCandidate'] in locations else locations[0]
        parts=location['path'].split('/')
        if len(parts)<6 or parts[2] not in ['TYT','AYT']:raise ValueError('Diagnostic provider scope is malformed')
        output.append({'source':{**group,'canonicalCandidate':location},'exam':parts[2],'course':parts[3]})
    return output


def body_number_proof(document,answers):
    numbers=[];bad=[]
    for page in list(document)[:-1]:
        regions,_=boundaries(source_lines(page),page.rect.width,page.rect.height)
        for region in regions:
            numbers.append(region['number']);text=page.get_text(clip=pymupdf.Rect(region['bboxPt']))
            if Counter(OPTION.findall(text))!=Counter('ABCDE'):bad.append({'page':page.number+1,'number':region['number']})
    expected=[r['number'] for r in answers]
    return {'status':'PASS' if numbers==expected and not bad else 'REVIEW_REQUIRED','numbers':numbers,
        'expectedNumbers':expected,'incompleteOptionRegions':bad,'boundaryVersion':BOUNDARY_VERSION}


def examine(case,folder,ocr):
    sha=case['source']['sha256'];scan=read_scan(sha);key=simple_key(scan)
    row={'sourceSha256':sha,'sourcePath':str(Path(case['source']['canonicalCandidate']['root'])/case['source']['canonicalCandidate']['path']),
        'exam':case['exam'],'course':case['course'],'sourcePageCount':scan['pageCount'],'absenceClaimed':False,
        'questionBankWrites':0,'teacherApproved':False}
    if key is None:return {**row,'status':'UNSUPPORTED_LAST_PAGE_KEY_LAYOUT_REVIEW_REQUIRED','sourceAnswers':None,'newOcrCalls':0}
    result=observe({**case,'key':key},folder,ocr)
    outcome={**row,**result,'newOcrCalls':0 if result.get('cacheHit') else 1,
        'status':'PRINTED_KEY_READING_DISAGREEMENT_REVIEW_REQUIRED','sourceAnswers':None}
    with pymupdf.open(row['sourcePath']) as document:
        body=body_number_proof(document,key['answers']);outcome['bodyNumberProof']=body
        try:scope=verified_source_scope(row,document)
        except ValueError as exc:
            return {**outcome,'status':'PRINTED_TEST_OR_COURSE_SCOPE_REVIEW_REQUIRED','scopeIssue':str(exc)}
    if result['status']!='TWO_PRINTED_SOURCE_READINGS_AGREE':return outcome
    if body['status']!='PASS':return {**outcome,'status':'PRINTED_KEY_READ_BUT_BODY_SEQUENCE_REVIEW_REQUIRED'}
    return {**outcome,**scope,'status':'SOURCE_KEY_VERIFIED','sourceAnswers':key['answers'],
        'sourceKeyPage':key['page'],'sourceKeyDocumentSha256':sha,'sourceKeyPath':row['sourcePath'],
        'bodyPageCount':scan['pageCount']-1,'keyEvidenceSha256':result['ocrEvidenceSha256'],
        'method':'NATIVE_PLUS_RENDERED_CROP_TUR_OCR'}


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--limit',type=int);args=parser.parse_args()
    if args.limit is not None and args.limit<1:parser.error('Positive new-document limit required')
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    if store.verify(state,'YKS-10','pilot')['status']!='VERIFIED':raise ValueError('Actual isolated pilot acceptance is required before full expansion')
    group_file=next(root/a['path'] for a in state['stages']['YKS-03:full']['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
    groups=[json.loads(line) for line in group_file.read_text(encoding='utf-8').splitlines()];cases=select_diagnostics(groups)
    folder=root/'pdf-on-tarama/full-key-scan';folder.mkdir(exist_ok=True)
    files=[Path(__file__),APP/'scripts/yks_anahtar_cohort.py',APP/'scripts/yks_pilot_kaynaklari.py',APP/'scripts/yks_pilot_sorular.py']
    ocr=model_hash();identity={'sourceGroupsSha256':digest(group_file),'ocrModelSha256':ocr,
        'readerFiles':{p.name:digest(p) for p in files},'rendererVersion':pymupdf.VersionBind}
    prior={r['sourceSha256']:r for r in source_keys(root/'pdf-on-tarama/key-cohort')}
    results=[];processed=0;calls=0;hits=0
    def save(status):
        report={'status':status,'scope':'FULL_ARCHIVE_FIRST_SUPPORTED_SINGLE_DIAGNOSTIC_KEY_READER',
            'inventoryUniquePdfs':len(groups),'diagnosticDocuments':len(cases),'otherPdfLayoutsRemainOpen':len(groups)-len(cases),
            'completedDiagnosticDocuments':len(results),'pendingDiagnosticDocuments':len(cases)-len(results),
            'states':dict(Counter(r['status'] for r in results)),
            'verifiedPrintedAnswers':sum(len(r.get('sourceAnswers') or []) for r in results if r['status']=='SOURCE_KEY_VERIFIED'),
            'newDocumentsThisPass':processed,'newOcrCallsThisPass':calls,'cachedDocumentsThisPass':hits,
            'newModelCalls':0,'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'fullYks07Accepted':False,
            'identity':identity,'results':results}
        write_json(folder/'progress.json',report)
    with process_lock(folder/'.writer.lock'):
        try:
            save('RUNNING')
            for case in cases:
                sha=case['source']['sha256'];source=case['source']['canonicalCandidate'];path=Path(source['root'])/source['path']
                if sha in prior:
                    results.append({**prior[sha],'methodOfThisPass':'REUSED_FRESHLY_VALIDATED_PILOT_SOURCE_READING','newOcrCalls':0});hits+=1
                else:
                    cache=folder/(sha+'.json');key={**identity,'sourceSha256':sha,'exam':case['exam'],'course':case['course']}
                    if cache.is_file() and read_json(cache).get('identity')==key:
                        if digest(path)!=sha:raise ValueError('Cached diagnostic source PDF changed')
                        row=read_json(cache)['result']
                        for file_key,sha_key in [('cropPath','cropSha256'),('ocrEvidencePath','ocrEvidenceSha256')]:
                            if row.get(file_key) and digest(row[file_key])!=row[sha_key]:raise ValueError('Saved independent key evidence changed')
                        results.append(row);hits+=1
                    else:
                        if args.limit is not None and processed>=args.limit:break
                        if digest(path)!=sha:raise ValueError('Diagnostic source PDF changed')
                        row=examine(case,folder,ocr);write_json(cache,{'identity':key,'result':row})
                        results.append(row);processed+=1;calls+=row['newOcrCalls']
                save('RUNNING')
                if processed and processed%10==0:print(f'Full diagnostic keys: {len(results)}/{len(cases)}; '+str(Counter(r['status'] for r in results)),flush=True)
            save('SUPPORTED_DIAGNOSTIC_LAYOUT_PASS_COMPLETE' if len(results)==len(cases) else 'PARTIAL')
        except BaseException:save('INTERRUPTED');raise
    print({k:v for k,v in read_json(folder/'progress.json').items() if k not in ('results','identity')})


if __name__=='__main__':main()
