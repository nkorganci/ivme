"""Match keyless-looking chemistry diagnostics to exact bodies in official books.

CPU/source-only pass. Different/partial bodies or disagreeing printed OCR are
held for review. This worker never loads a model or invents an answer.
"""
from collections import Counter,defaultdict
from contextlib import ExitStack
import argparse
import json
from pathlib import Path

import pymupdf
from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_pilot_kaynaklari import APP,test_identities,plain
from yks_pilot_sorular import source_lines,boundaries,OPTION
from yks_ayri_anahtar import CASES,body_check,key_section
from yks_anahtar_cohort import read_pairs,OCR_PAIR
from pdf_ocr_cache import model_hash
from yks_tam_anahtar_gorsel import source_signature

BOOKS={'kimya':{case['exam']:case['bookSha256'] for case in CASES.values()},
    'tarih':{'TYT':'4eaca408c09db1ad07131af06459d896b97de79108f34aa300c60739782bf1a2',
        'AYT':'da339fbece2cbe869b9ad81a8fc8a5c4012d450b11a9632a0846fa60fc49894b'}}
SUBJECTS={'kimya':'Kimya','tarih':'Tarih'}


def index_book(book,exam):
    bodies=defaultdict(list);keys=defaultdict(list)
    for page in book:
        text=page.get_text();ids=test_identities(text)
        if len(ids)==1 and len(OPTION.findall(text))>=5:
            exam_id,number=next(iter(ids))
            if exam_id==exam:bodies[number].append(page.number)
        for exam_id,number in ids:
            if exam_id!=exam:continue
            section=key_section(page,exam,number)
            if section and len(section['text'])<=len(section['answers'])*20+200:keys[number].append(section)
    return {'bodies':bodies,'keys':keys}


def complete_body_numbers(document,answers):
    actual=[];issues=[]
    for page in document:
        regions,_=boundaries(source_lines(page),page.rect.width,page.rect.height)
        for region in regions:
            actual.append(region['number'])
            if Counter(OPTION.findall(page.get_text(clip=pymupdf.Rect(region['bboxPt']))))!=Counter('ABCDE'):
                issues.append({'page':page.number+1,'number':region['number'],'issue':'INCOMPLETE_NATIVE_OPTIONS'})
    expected=[a['number'] for a in answers]
    return {'status':'PASS' if actual==expected and not issues else 'REVIEW_REQUIRED','numbers':actual,'expectedNumbers':expected,'issues':issues}


def examine(row,official,book_index,book_info,folder,ocr_model):
    sha=row['sourceSha256'];source=Path(row['sourcePath']);out=folder/sha[:16];out.mkdir(exist_ok=True)
    result={'sourceSha256':sha,'sourcePath':str(source),'exam':row['exam'],'subjectId':'kimya','subject':'Kimya',
        'officialBookSha256':book_info['sha256'],'officialBookPath':book_info['path'],
        'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'newModelCalls':0,'newOcrCalls':0,'absenceClaimed':False}
    subject=book_info['subjectId'];result.update(subjectId=subject,subject=SUBJECTS[subject])
    with pymupdf.open(source) as document:
        ids=set().union(*(test_identities(p.get_text()) for p in document))
        if len(ids)!=1 or next(iter(ids))[0]!=row['exam'] or plain(SUBJECTS[subject]) not in plain(document[0].get_text()):
            return {**result,'status':'SOURCE_TEST_OR_COURSE_SCOPE_REVIEW_REQUIRED'}
        _,test=next(iter(ids));result['testNumber']=test
        page_numbers=book_index['bodies'].get(test,[])
        if not page_numbers:return {**result,'status':'NO_PRINTED_BODY_COUNTERPART_IN_THIS_BOOK_REVIEW_REQUIRED'}
        candidates=[]
        for start in page_numbers:
            if start+len(document)>len(official):continue
            checks=[{'sourcePage':i+1,'bookPage':start+i+1,**body_check(p,official[start+i])} for i,p in enumerate(document)]
            candidates.append({'start':start,'checks':checks,'matchedPages':sum(c['matches'] for c in checks)})
        if not candidates:return {**result,'status':'NO_COMPLETE_BODY_COUNTERPART_REVIEW_REQUIRED'}
        best=max(candidates,key=lambda c:c['matchedPages'])
        result.update(sourcePageCount=len(document),bodyChecks=best['checks'],bookBodyStartPage=best['start']+1,
            fullQuestionBodyTextAndPixelsEqual=best['matchedPages']==len(document))
        if best['matchedPages']!=len(document):return {**result,'status':'BODY_CONTENT_OR_LAYOUT_DIFFERENCE_REVIEW_REQUIRED'}
        if page_numbers!=list(range(best['start'],best['start']+len(document))):
            return {**result,'status':'EXACT_PARTIAL_BODY_REQUIRES_QUESTION_LEVEL_COVERAGE'}
        sections=[s for s in book_index['keys'].get(test,[]) if s['page']>best['start']+len(document)]
        if len(sections)!=1:return {**result,'status':'OFFICIAL_KEY_LAYOUT_MISSING_OR_AMBIGUOUS_REVIEW_REQUIRED'}
        section=sections[0];body=complete_body_numbers(document,section['answers']);result['bodyNumberProof']=body
        crop=out/'printed-key.png';pixmap=official[section['page']-1].get_pixmap(dpi=330,clip=pymupdf.Rect(section['bboxPt']),alpha=False);pixmap.save(crop)
        key_id=signature([book_info['sha256'],section['page'],section['bboxPt'],digest(crop),ocr_model,pymupdf.VersionBind,'separate-key-native-tur-330-v1'])
        evidence=out/(key_id+'.json')
        if evidence.is_file():observation=read_json(evidence)
        else:
            with pymupdf.open('pdf',pixmap.pdfocr_tobytes(language='tur',tessdata=str(APP/'veri/tessdata'))) as recognized:text=recognized[0].get_text()
            observation={'sourceSha256':sha,'keyBookSha256':book_info['sha256'],'keySourcePage':section['page'],'cropSha256':digest(crop),
                'ocrModelSha256':ocr_model,'rendererVersion':pymupdf.VersionBind,'text':text};write_json(evidence,observation);result['newOcrCalls']=1
        if observation['cropSha256']!=digest(crop) or observation['ocrModelSha256']!=ocr_model:raise ValueError('Separate key OCR evidence changed')
        independent=read_pairs(observation['text'],OCR_PAIR);agree=independent==section['answers']
        status='SEPARATE_KEY_VERIFIED' if agree else 'SEPARATE_KEY_PRINTED_READINGS_DISAGREE_REVIEW_REQUIRED'
        if body['status']!='PASS':status='EXACT_BODY_KEY_READ_WITH_OPEN_QUESTION_LAYOUT'
        result.update(status=status,sourceKeyDocumentSha256=book_info['sha256'],sourceKeyPath=book_info['path'],
            sourceKeyPage=section['page'],sourceKeyBboxPt=section['bboxPt'],cropPath=str(crop),cropSha256=digest(crop),
            ocrEvidencePath=str(evidence),keyEvidenceSha256=digest(evidence),nativePrintedAnswers=section['answers'],
            independentPrintedAnswers=independent,sourceAnswers=section['answers'] if agree and body['status']=='PASS' else None,
            bodyPageCount=len(document),method='NATIVE_PLUS_RENDERED_SEPARATE_KEY_CROP_TUR_OCR')
    if digest(source)!=sha:raise ValueError('Chemistry source changed during separate key matching')
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--subject',choices=SUBJECTS,default='kimya');args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    if store.verify(state,'YKS-10','pilot')['status']!='VERIFIED':raise ValueError('Verified actual isolated pilot required')
    native=read_json(root/'pdf-on-tarama/full-key-scan/progress.json')
    cases=[r for r in native['results'] if r['status']=='UNSUPPORTED_LAST_PAGE_KEY_LAYOUT_REVIEW_REQUIRED' and SUBJECTS[args.subject] in r['course']]
    groups_file=next(root/a['path'] for a in state['stages']['YKS-03:full']['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
    groups={g['sha256']:g for g in map(json.loads,groups_file.read_text(encoding='utf-8').splitlines())}
    books=BOOKS[args.subject];folder=root/('pdf-on-tarama/full-key-scan/separate-'+('chemistry' if args.subject=='kimya' else args.subject))
    folder.mkdir(exist_ok=True);ocr=model_hash();results=[];calls=0;hits=0
    identity={'sourceEvidenceSignature':source_signature(native),'ocrModelSha256':ocr,'rendererVersion':pymupdf.VersionBind,
        'readerFiles':{p:digest(APP/'scripts'/p) for p in ['yks_tam_ayri_anahtar.py','yks_ayri_anahtar.py','yks_pilot_sorular.py','yks_anahtar_cohort.py']}}
    def save(status):
        write_json(folder/'progress.json',{'status':status,'scope':'EXACT_SEPARATE_OFFICIAL_BOOK_BODY_AND_KEY_READINGS','subjectId':args.subject,
            'identity':identity,'documents':len(cases),'completed':len(results),'pending':len(cases)-len(results),
            'states':dict(Counter(r['status'] for r in results)),'newOcrCallsThisPass':calls,'cachedDocumentsThisPass':hits,
            'newModelCalls':0,'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'fullYks07Accepted':False,'results':results})
    with process_lock(folder/'.writer.lock'),ExitStack() as stack:
        handles={};indices={};info={}
        for exam,sha in books.items():
            entry=groups[sha]['canonicalCandidate'];path=Path(entry['root'])/entry['path']
            if entry['kind']!='FILE' or digest(path)!=sha:raise ValueError('Official chemistry book source changed')
            info[exam]={'sha256':sha,'path':str(path),'subjectId':args.subject};handles[exam]=stack.enter_context(pymupdf.open(path));indices[exam]=index_book(handles[exam],exam)
        try:
            save('RUNNING')
            for row in cases:
                sha=row['sourceSha256'];source=Path(row['sourcePath'])
                if digest(source)!=sha:raise ValueError('Diagnostic source changed')
                key={**identity,'sourceSha256':sha,'officialBookSha256':books[row['exam']]};cache=folder/(sha+'.json')
                if cache.is_file() and read_json(cache).get('identity')==key:
                    result=read_json(cache)['result'];hits+=1
                    for file_key,sha_key in [('cropPath','cropSha256'),('ocrEvidencePath','keyEvidenceSha256')]:
                        if result.get(file_key) and digest(result[file_key])!=result[sha_key]:raise ValueError('Separate key cached evidence changed')
                else:
                    result=examine(row,handles[row['exam']],indices[row['exam']],info[row['exam']],folder,ocr)
                    write_json(cache,{'identity':key,'result':result});calls+=result['newOcrCalls']
                results.append(result);save('RUNNING')
                if len(results)%10==0:print(f'Separate {args.subject} bodies: {len(results)}/{len(cases)} '+str(Counter(r['status'] for r in results)),flush=True)
            for item in info.values():
                if digest(item['path'])!=item['sha256']:raise ValueError('Official book changed during matching')
            save('SUPPORTED_OFFICIAL_BOOK_PASS_COMPLETE')
        except BaseException:save('INTERRUPTED');raise
    print({k:v for k,v in read_json(folder/'progress.json').items() if k not in ('identity','results')})


if __name__=='__main__':main()
