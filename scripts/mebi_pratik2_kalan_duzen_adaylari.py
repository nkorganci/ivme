"""Find positive MCQ/key cues on pages not yet represented by crop evidence.

Uses existing native caches only. Cues are neither question counts nor answer
admission. Already prepared pages and explicit failed body pages are distinct;
known broken mocks/PDFs are not sent through another repair loop.
"""
import hashlib
import json
import re
import time
from collections import defaultdict,Counter
from mebi_pratik2_tam_pdf_tarama import BASE
from yks_birlestirme import write_json,process_lock
from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf

OUT=BASE/'remaining-positive-layout-cues'
CHOICE=re.compile(r'(?<!\w)([ABCDE])\s*[).]')
EXPLICIT=re.compile(r'\bCevap\s*:\s*[ABCDE]\b',re.I)
PAIR=re.compile(r'(?<!\d)\d{1,3}\s*[-–—.:]\s*[ABCDE]\b')


def page_choices(lines):
    counts=Counter(CHOICE.findall('\n'.join(l['text'] for l in lines)))
    return min((counts[c] for c in 'ABCDE'),default=0)


def run():
    OUT.mkdir(exist_ok=True);started=time.monotonic();prepared=defaultdict(set);reviewed=defaultdict(set)
    for package in BASE.glob('*/chapter-packages.json'):
        data=json.loads(package.read_text(encoding='utf8'))
        for r in data.get('items',[]):prepared[r['sourceSha256']].add(r['bodyPage'])
    for directory in ['single-test-crops','three-step-all-bodies-v2','compiled-tarama-crops','word-boundary-crops',
                      'four-square-crops','four-square-header-crops','three-step-mock-crops','three-step-mock-additional-crops','full-mock-source-crops','individual-tarama-crops']:
        for file in (BASE/directory).glob('*.json'):
            data=json.loads(file.read_text(encoding='utf8'))
            if not isinstance(data,dict):continue
            for r in data.get('items',[])+data.get('crops',[]):
                if r.get('bodyPage') and r.get('sourceSha256'):prepared[r['sourceSha256']].add(r['bodyPage'])
            for r in data.get('reviewQueueAdditions',[]):
                if r.get('bodyPage') and r.get('sourceSha256'):reviewed[r['sourceSha256']].add(r['bodyPage'])
    excluded=set();mock=BASE/'full-mock-source-reuse/report.json'
    if mock.exists():
        excluded={r['sourceSha256'] for r in json.loads(mock.read_text(encoding='utf8'))['sources'] if r['status']=='EXCLUDE_NO_RETRY'}
    docs=json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents'];unique={r['sourceSha256']:r for r in docs}
    sources=[];states=Counter();pdf_decisions=load_decisions()
    for index,(sha,source) in enumerate(unique.items(),1):
        if skip_pdf(sha,pdf_decisions):states['EXISTING_PRACTICE_PDF_SKIPPED_BEFORE_QUESTION_CUES']+=1;continue
        if sha in excluded:states['KNOWN_FAILED_SOURCE_NOT_RETRIED']+=1;continue
        path=BASE/source['cache'];native=json.loads(path.read_text(encoding='utf8'))
        if native['status']!='SCANNED':states['KNOWN_UNREADABLE_SOURCE_NOT_RETRIED']+=1;continue
        key_pages=[]
        for page in native['pages']:
            text='\n'.join(l['text'] for l in page['lines'])
            if page['keyHeadingSignal'] or EXPLICIT.search(text) or len(PAIR.findall(text))>=4:key_pages.append(page['physicalPage'])
        if not key_pages:states['NO_PRINTED_KEY_CUE_IN_NATIVE_CACHE_NOT_AN_ABSENCE_CLAIM']+=1;continue
        pages=[]
        for page in native['pages']:
            n=page['physicalPage'];sets=page_choices(page['lines'])
            if sets<1:continue
            if n in prepared[sha]:states['PAGE_HAS_EXISTING_BODY_EVIDENCE']+=1;continue
            if n in reviewed[sha]:states['PAGE_HAS_EXPLICIT_BODY_REVIEW_NOT_RETRIED']+=1;continue
            pages.append({'physicalPage':n,'fiveChoiceCueSetsNotQuestionCount':sets,'nativeNumberSignals':page['numberSignals']})
        if not pages:continue
        sources.append({'sourceSha256':sha,'relativePath':source['relativePath'],'nativeCache':source['cache'],
            'nativeCacheSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'printedKeyCuePages':key_pages,
            'unpreparedPositivePages':pages,'sourceHasAnyPreparedBodies':bool(prepared[sha]),
            'status':'POSITIVE_CUES_REQUIRE_SOURCE_LAYOUT_BINDING_NOT_QUESTION_ADMISSION','studentVisible':False})
        if index%100==0:print(json.dumps({'sourcesVisited':index,'totalUniqueSources':len(unique),'positiveSources':len(sources),'elapsedSeconds':round(time.monotonic()-started,1)}),flush=True)
    result={'status':'POSITIVE_REMAINING_LAYOUT_CUES_NOT_QUESTION_COUNTS','sources':sources,'states':dict(states),
            'positiveSources':len(sources),'positivePages':sum(len(s['unpreparedPositivePages']) for s in sources),
            'previouslyUnpreparedSources':sum(not s['sourceHasAnyPreparedBodies'] for s in sources),
            'questionWrites':0,'modelCalls':0,'allPrintedQuestionsExtracted':False}
    write_json(OUT/'report.json',result)
    print(json.dumps({k:v for k,v in result.items() if k!='sources'}),flush=True)


if __name__=='__main__':
    with process_lock(BASE/'.jobs/remaining-positive-layout-cues.lock'):run()
