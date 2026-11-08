"""Discover question regions in previously unassessed non-diagnostic sources.

Preserve original discovery, processed questions and all source PDFs. This is
only a resumable candidate queue: no answer, category or import is inferred.
"""
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
from pathlib import Path
import re

import pymupdf
from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_pilot_kaynaklari import APP
from pdf_source_scan import read_evidence_scan

VERSION='new-source-region-discovery-v1'
OPTION=re.compile(r'(?:^|\s)([A-E])\s*\)')


def eligible(group):
    if group['processingCandidate']!='NOT_PREVIOUSLY_ASSESSED':return False
    return not any(Path(p['root']).name=='mebi-yks' and p['path'].startswith(('Deneme-Tarama/Denemeler/','Deneme-Tarama/Taramalar/')) for p in group['occurrences'])


def native_lines(page):
    return [{'text':''.join(s['text'] for s in line['spans']).strip(),'bbox':list(line['bbox'])}
        for block in page.get_text('dict',flags=pymupdf.TEXTFLAGS_TEXT)['blocks']
        for line in block.get('lines',[]) if ''.join(s['text'] for s in line['spans']).strip()]


def discover_page(page,observed,repeated,page_count,extractor):
    lines=observed.get('evidenceLines') or native_lines(page)
    extractor.lines_of=lambda _page:lines
    regions=[q for q in extractor.questions(page) if q['tur']=='soru' and len(set(OPTION.findall(q['text'])))>=4]
    if not regions:
        body=[l for l in lines if repeated[l['text']]<max(3,page_count*.35)]
        counts=Counter(OPTION.findall('\n'.join(l['text'] for l in body)))
        if len(counts)>=4 and max(counts.values())==1 and body:
            regions=[{'number':None,'text':'\n'.join(l['text'] for l in body),
                'bbox':[min(l['bbox'][0] for l in body),min(l['bbox'][1] for l in body),max(l['bbox'][2] for l in body),max(l['bbox'][3] for l in body)]}]
    rows=[]
    for region in regions:
        box=[round(v,1) for v in region['bbox']]
        if not (len(box)==4 and 0<=box[0]<box[2]<=page.rect.width+.1 and 0<=box[1]<box[3]<=page.rect.height+.1):
            raise ValueError('Discovered native question region extends outside source page')
        rows.append({'page':page.number+1,'number':region['number'],'bbox':box,'text':region['text'],
            'textSha256':hashlib.sha256(region['text'].encode()).hexdigest(),'optionLabels':OPTION.findall(region['text']),
            'status':'PRINTED_ANSWER_BODY_GRAPHICS_DUPLICATE_AND_CATEGORY_REVIEW_REQUIRED','importEligible':False,'teacherApproved':False})
    return rows


def inspect(group,observations,extractor):
    location=group['canonicalCandidate'];path=Path(location['root'])/location['path'];sha=group['sha256']
    if location['kind']!='FILE' or digest(path)!=sha:raise ValueError('Original new PDF differs from its inventory hash')
    if observations.get('error') or len(observations['pages'])!=observations['pageCount']:raise ValueError('Complete new-source observations required')
    repeated=Counter(l.strip() for p in observations['pages'] for l in set(p['text'].splitlines()) if l.strip())
    question_pages=[p for p in observations['pages'] if len(p['options'])>=4 or p.get('evidenceLines') and (p['questionSignal'] or p.get('possibleQuestionHeading'))]
    candidates=[];ambiguous=[]
    if question_pages:
        with pymupdf.open(path) as document:
            if len(document)!=observations['pageCount']:raise ValueError('Source page count differs')
            for observed in question_pages:
                page=document[observed['page']-1];rows=discover_page(page,observed,repeated,len(document),extractor)
                if not rows:ambiguous.append({'page':observed['page'],'reason':'SOURCE_QUESTION_SIGNAL_WITH_NO_COMPLETE_REGION'})
                for row in rows:
                    row.update(sourceSha256=sha,locator='full-region:'+signature([sha,row['page'],row['bbox'],VERSION])[:24]);candidates.append(row)
    unreadable=[p['page'] for p in observations['pages'] if p.get('needsOcr') or p.get('ocr',{}).get('status')=='UNREADABLE_OR_BLANK']
    return {'sourceSha256':sha,'sourcePath':str(path),'status':'QUESTION_REGION_CANDIDATES_REVIEW_REQUIRED' if candidates else 'NO_NEW_REGION_DETECTED_SOURCE_REVIEW_REMAINS',
        'pageCount':observations['pageCount'],'selectedQuestionPhysicalPages':[p['page'] for p in question_pages],
        'unreadableOrVisualReviewPhysicalPages':unreadable,'ambiguousPages':ambiguous,'candidates':candidates,
        'absenceClaimed':False,'sourceAnswersApproved':False,'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False}


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--limit',type=int);args=parser.parse_args()
    if args.limit is not None and args.limit<1:parser.error('Positive new-source limit required')
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);folder=root/'new-source-discovery';folder.mkdir(exist_ok=True)
    file=next(root/a['path'] for a in state['stages']['YKS-03:full']['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
    groups=[g for g in map(json.loads,file.read_text(encoding='utf-8').splitlines()) if eligible(g)]
    engine=APP/'scripts/pdf-metin.py';spec=importlib.util.spec_from_file_location('yks_new_pdf_text',engine);extractor=importlib.util.module_from_spec(spec);spec.loader.exec_module(extractor)
    extractor.visual_inside=lambda *args:(True,0)
    files=[Path(__file__),engine,APP/'scripts/pdf_source_scan.py'];readers={str(p):digest(p) for p in files}
    results=[];created=0;hits=0;identities=[]
    def save(status):
        report={'status':status,'scope':'PREVIOUSLY_UNASSESSED_NON_DIAGNOSTIC_PDF_REGION_DISCOVERY_ONLY','documents':len(groups),'completed':len(results),'pending':len(groups)-len(results),
            'states':dict(Counter(r['status'] for r in results)),'candidateRegions':sum(r['candidateRegions'] for r in results),
            'ambiguousPhysicalPages':sum(r['ambiguousPages'] for r in results),'unreadableOrVisualReviewPages':sum(r['unreadableOrVisualReviewPages'] for r in results),
            'newSourcesThisPass':created,'cachedSourcesThisPass':hits,'sourceGroupsSha256':digest(file),'readerFiles':readers,'pageEvidenceSignature':signature(identities),
            'newOcrCalls':0,'newModelCalls':0,'newRenders':0,'questionBankWrites':0,'sourceWrites':0,'sourceAnswersApproved':False,'absenceClaimed':False,'teacherApproved':False,'results':results}
        write_json(folder/'progress.json',report)
    with process_lock(folder/'.writer.lock'):
        try:
            save('RUNNING')
            for group in groups:
                sha=group['sha256'];scan=read_evidence_scan(sha,for_review=True)
                identity={'sourceSha256':sha,'ocrEvidenceSha256':scan['ocrEvidenceSha256'],'nativePageTextHashes':[p.get('rawTextSha256',p['textSha256']) for p in scan['pages']],
                    'sourceGroupsSha256':digest(file),'readerFiles':readers,'version':VERSION}
                cache=folder/(sha+'.json');prior=read_json(cache) if cache.is_file() else {}
                if prior.get('identity')==identity:
                    location=group['canonicalCandidate'];path=Path(location['root'])/location['path'];stat=path.stat()
                    if (stat.st_size,stat.st_mtime_ns)!=(location['bytes'],location['mtimeNs']) and digest(path)!=sha:raise ValueError('Cached new source changed')
                    result=prior['result'];hits+=1
                else:
                    if args.limit is not None and created>=args.limit:break
                    result=inspect(group,scan,extractor);write_json(cache,{'identity':identity,'result':result});created+=1
                results.append({'sourceSha256':sha,'status':result['status'],'pageCount':result['pageCount'],'candidateRegions':len(result['candidates']),
                    'ambiguousPages':len(result['ambiguousPages']),'unreadableOrVisualReviewPages':len(result['unreadableOrVisualReviewPhysicalPages']),
                    'evidencePath':str(cache),'evidenceSha256':digest(cache)})
                identities.append(signature(identity))
                if len(results)%25==0:save('RUNNING')
                if len(results)%100==0:print(f'New PDF question regions: {len(results)}/{len(groups)}, candidates '+str(sum(r['candidateRegions'] for r in results)),flush=True)
            if any(digest(p)!=sha for p,sha in readers.items()):raise ValueError('New source discovery reader changed while running')
            save('COMPLETE' if len(results)==len(groups) else 'PARTIAL')
        except BaseException:save('INTERRUPTED');raise
    print({k:v for k,v in read_json(folder/'progress.json').items() if k not in ['results','readerFiles']})


if __name__=='__main__':main()
