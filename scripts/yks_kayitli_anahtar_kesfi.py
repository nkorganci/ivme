"""Index printed-key signals in all saved native/OCR readings without admission.

Raster question panels can be missed by an A-E region detector. An explicit
key heading is independently queued even when that detector found no question.
Missing headings never prove that a PDF has no answers. No OCR/model/render,
original PDF writes or question-bank writes occur here.
"""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP,plain
from pdf_source_scan import read_evidence_scan,cache_path
from pdf_ocr_cache import cache_path as ocr_path


HEADING=re.compile(r'(?:CEVAP|YANIT)\s*ANAHTAR')
INLINE=re.compile(r'\b(?:CEVAP|YANIT)\s*[:\-]?\s*([A-E])\b')
PAIR=re.compile(r'(?<!\d)(\d{1,3})\s*[.\-:)]+\s*([A-E])(?=\b|\d)')


def signals(text):
    normal=plain(text);headings=[]
    for match in HEADING.finditer(normal):
        # The original, not this normalized excerpt, remains the reading proof.
        tail=normal[match.end():match.end()+1200]
        headings.append({'normalizedExcerpt':normal[max(0,match.start()-30):match.end()+350],
            'unapprovedNumberLetterCandidates':[{'number':int(m[1]),'answer':m[2]} for m in PAIR.finditer(tail)]})
    return {'headings':headings,'inlineOptionAnswerCandidates':INLINE.findall(normal)}


def classify(has_heading,has_inline,prepared,prior,ydt):
    if ydt:return 'PRINTED_YDT_KEEP_EXISTING_TYT_AYT_EXCLUSION'
    if prepared:return 'PREPARED_SOURCE_KEEP_CURRENT_QUESTION_QUEUE'
    if prior:return 'PRIOR_OCCURRENCES_KEEP_IDS_AND_PENDING_LOCATORS_BEFORE_NEW_EXTRACTION'
    if has_heading:return 'UNASSESSED_SAVED_KEY_HEADING_READ_ORIGINAL_SOURCE'
    if has_inline:return 'UNASSESSED_SAVED_INLINE_OPTION_ANSWER_READ_ORIGINAL_SOURCE'
    return 'NO_EXPLICIT_SAVED_KEY_SIGNAL_NOT_AN_ABSENCE_PROOF'


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    folder=root/'saved-key-signal-discovery';folder.mkdir(exist_ok=True)
    groups_path=next(root/a['path'] for a in state['stages']['YKS-03:full']['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
    paths=[groups_path,root/'all-prior-occurrences/report.json',root/'source-intake-queue/report.json',root/'new-source-discovery/scoped-report.json']
    inputs={str(p):digest(p) for p in paths};groups=list(map(json.loads,groups_path.read_text('utf8').splitlines()))
    prior=read_json(paths[1]);prepared=read_json(paths[2]);discovery=read_json(paths[3])
    if prior['status']!='COMPLETE' or prepared['status']!='PASS' or discovery['status']!='COMPLETE':
        raise ValueError('Complete current saved source/queue/discovery evidence required')
    old={r['sourceSha256']:r for r in prior['results']};present={r['sourceSha256'] for r in prepared['results']}
    previous_regions={r['sourceSha256']:r for r in discovery['results']}
    ydt={r['sourceSha256'] for r in discovery['results'] if r['status']=='EXCLUDED_PRINTED_YDT_FROM_TYT_AYT_QUESTION_QUEUE'}
    readers={str(p):digest(p) for p in [Path(__file__),APP/'scripts/pdf_source_scan.py',APP/'scripts/pdf_ocr_cache.py',APP/'scripts/yks_pilot_kaynaklari.py']}
    results=[];cached=0;created=0
    def save(status):
        report={'status':status,'scope':'ALL_CACHED_NATIVE_AND_OCR_KEY_SIGNALS_ONLY_NOT_SOURCE_ANSWER_ACCEPTANCE',
            'documents':len(groups),'completed':len(results),'pending':len(groups)-len(results),
            'observedPages':sum(r['pageCount'] for r in results),'states':dict(Counter(r['status'] for r in results)),
            'unassessedHeadingSourcesWithoutPreviousRegions':sum(r['status']=='UNASSESSED_SAVED_KEY_HEADING_READ_ORIGINAL_SOURCE' and not r['previousDiscoveredRegions'] for r in results),
            'newAnalysesThisPass':created,'cacheHitsThisPass':cached,'inputs':inputs,'readerFiles':readers,'results':results,
            'newModelCalls':0,'newOcrCalls':0,'newRenders':0,'questionBankWrites':0,'sourceWrites':0,
            'sourceAnswersApproved':False,'absenceClaimed':False,'teacherApproved':False,'fullYks07Accepted':False}
        write_json(folder/'report.json',report)
    with process_lock(folder/'.writer.lock'):
        try:
            save('RUNNING')
            for group in groups:
                sha=group['sha256'];native=cache_path(sha);scan=read_evidence_scan(sha)
                if scan.get('error') or len(scan['pages'])!=scan['pageCount']:raise ValueError('Complete cached PDF observations required')
                identity={'sourceSha256':sha,'nativeCacheSha256':digest(native),'ocrEvidenceSha256':scan['ocrEvidenceSha256'],
                    'preparedSource':sha in present,'priorOccurrenceCount':old.get(sha,{}).get('occurrences',0),'printedYdt':sha in ydt,
                    'previousDiscoveryEvidenceSha256':previous_regions.get(sha,{}).get('evidenceSha256'),'readerFiles':readers}
                target=folder/(sha+'.json');previous=read_json(target) if target.is_file() else {}
                if previous.get('identity')==identity:detail=previous['result'];cached+=1
                else:
                    readings=[];external={str(native):identity['nativeCacheSha256']}
                    for page in scan['pages']:
                        variants=[('NATIVE',page)]+[(v['extractorVersion'],v) for v in ([page['ocr']]+page.get('ocrAlternatives',[]) if page.get('ocr') else [])]
                        for version,record in variants:
                            if hashlib.sha256(record['text'].encode()).hexdigest()!=record['textSha256']:raise ValueError('Saved page reading checksum mismatch')
                            found=signals(record['text'])
                            if not found['headings'] and not found['inlineOptionAnswerCandidates']:continue
                            reading={'page':page['page'],'readingVersion':version,'textSha256':record['textSha256'],**found}
                            if version!='NATIVE':
                                file=ocr_path(sha,page['page'],record['modelSha256'],version);external[str(file)]=digest(file)
                                reading['savedReadingPath']=str(file);reading['savedReadingSha256']=external[str(file)]
                            readings.append(reading)
                    status=classify(any(r['headings'] for r in readings),any(r['inlineOptionAnswerCandidates'] for r in readings),sha in present,sha in old,sha in ydt)
                    detail={'sourceSha256':sha,'status':status,'pageCount':scan['pageCount'],'sourceLocation':group['canonicalCandidate'],
                        'keySignalPhysicalPages':sorted({r['page'] for r in readings}),'readings':readings,'externalEvidenceFiles':external,
                        'priorOccurrenceCount':identity['priorOccurrenceCount'],'previousDiscoveredRegions':previous_regions.get(sha,{}).get('candidateRegions'),
                        'sourceAnswersApproved':False,'absenceClaimed':False,'newQuestionAdmissionAccepted':False,'teacherApproved':False}
                    write_json(target,{'identity':identity,'result':detail});created+=1
                results.append({k:detail[k] for k in ['sourceSha256','status','pageCount','keySignalPhysicalPages','priorOccurrenceCount','previousDiscoveredRegions']})
                results[-1].update(evidencePath=str(target),evidenceSha256=digest(target))
                if len(results)%250==0:save('RUNNING');print('Saved printed-key signals',len(results),'/',len(groups),flush=True)
            if any(digest(p)!=sha for p,sha in {**inputs,**readers}.items()):raise ValueError('Saved key-signal inputs changed during analysis')
            save('COMPLETE')
        except BaseException:save('INTERRUPTED');raise
    print({k:v for k,v in read_json(folder/'report.json').items() if k not in ['results','inputs','readerFiles']})


if __name__=='__main__':main()
