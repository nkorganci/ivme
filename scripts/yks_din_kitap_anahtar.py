"""Read all ten diagnostic and the separate past-exam keys in each Din book.

The past-exam heading terminates test10; restarted numbers must never be
flattened into one key. This verifies printed readings, not body binding/import.
"""
from collections import Counter
from pathlib import Path
import sys

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP,test_identities,plain
from yks_pilot_sorular import source_lines
from yks_buyuk_anahtar_incele import large_pairs
from yks_anahtar_gorsel import transcription,checked_reading,MODEL
from yks_anahtar_pilotu import api

BOOKS={
 '0d71ed945447d0672bd38f841988e449fe28955f20905d2bc1211f5727d3fe5e':('AYT',[100,101]),
 '3294337d6b620faf7f2c1f6e675e5cad2629e9861b59c212784874439584b845':('TYT',[114,115]),
}


def page_sections(page,exam):
    lines=source_lines(page);headers=[]
    for line in lines:
        identities=test_identities(line['text']);value=plain(line['text'])
        if identities:
            if len(identities)!=1 or next(iter(identities))[0]!=exam:raise ValueError('Printed key exam/identity differs')
            _,number=next(iter(identities));kind='DIAGNOSTIC';name=str(number)
        elif 'YKS CIKMIS SORULAR' in value:
            if exam not in value or 'DIN KULTURU VE AHLAK BILGISI' not in value:raise ValueError('Past-exam key heading differs')
            kind='PAST_EXAMS';name='past-exams';number=None
        else:continue
        headers.append({**line,'kind':kind,'name':name,'testNumber':number})
    headers.sort(key=lambda l:l['bbox'][1]);result=[]
    for i,header in enumerate(headers):
        bottom=headers[i+1]['bbox'][1]-.1 if i+1<len(headers) else page.rect.height-14
        region=[l for l in lines if header['bbox'][1]-.1<=l['bbox'][1]<bottom]
        text='\n'.join(l['text'] for l in region);answers=large_pairs(text)
        if any(l is not header and test_identities(l['text']) for l in region if l['text']!=header['text']):
            raise ValueError('Another diagnostic heading entered selected key')
        box=[min(l['bbox'][0] for l in region)-4,min(l['bbox'][1] for l in region)-4,
            max(l['bbox'][2] for l in region)+4,max(l['bbox'][3] for l in region)+4]
        result.append({'exam':exam,'kind':header['kind'],'sectionName':header['name'],'testNumber':header['testNumber'],
            'physicalKeyPage':page.number+1,'printedHeading':header['text'],'bboxPt':box,'nativePrintedAnswers':answers,
            'nativeTextSha256':__import__('hashlib').sha256(text.encode()).hexdigest()})
    return result


def validate_section(row):
    if row['status']!='PRINTED_SECTION_KEY_READINGS_VERIFIED_BODY_BINDING_REQUIRED':raise ValueError('Two agreeing source readings required')
    sha=row['sourceSha256'];exam,_=BOOKS[sha]
    if digest(row['sourcePath'])!=sha:raise ValueError('Actual source Din book changed')
    with pymupdf.open(row['sourcePath']) as doc:
        sections=[s for s in page_sections(doc[row['physicalKeyPage']-1],exam) if s['sectionName']==row['sectionName']]
    if len(sections)!=1 or sections[0]['nativePrintedAnswers']!=row['nativePrintedAnswers'] or sections[0]['bboxPt']!=row['bboxPt']:
        raise ValueError('Current printed section/answers differ')
    if digest(row['cropPath'])!=row['cropSha256'] or digest(row['evidencePath'])!=row['evidenceSha256']:raise ValueError('Independent source crop/raw key reading changed')
    raw=read_json(row['evidencePath'])
    if raw['identity']['cropSha256']!=row['cropSha256'] or raw['identity']['modelDigest']!=row['modelDigest']:
        raise ValueError('Independent key crop/model identity differs')
    if checked_reading(raw['response'])!=row['nativePrintedAnswers']:raise ValueError('Independent printed key readings differ')
    return row


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
    discovery={r['sourceSha256']:r for r in read_json(root/'new-source-discovery/scoped-report.json')['results']}
    folder=root/'new-book-keys/din';folder.mkdir(parents=True,exist_ok=True);results=[];calls=0
    model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
    def save(status):
        report={'status':status,'scope':'TWO_DIN_BOOKS_TEN_DIAGNOSTIC_PLUS_SEPARATE_PAST_EXAM_KEYS_EACH',
            'sourceDocuments':2,'expectedSections':22,'completedSections':len(results),
            'states':dict(Counter(r['status'] for r in results)),
            'verifiedPrintedAnswers':sum(len(r['nativePrintedAnswers']) for r in results if r['status']=='PRINTED_SECTION_KEY_READINGS_VERIFIED_BODY_BINDING_REQUIRED'),
            'newModelCallsThisPass':calls,'newOcrCalls':0,'sourceQuestionKeysBound':False,'questionBankWrites':0,
            'sourceWrites':0,'teacherApproved':False,'toolSha256':digest(Path(__file__)),'results':results}
        write_json(folder/'progress.json',report)
    with process_lock(folder/'.writer.lock'),ModelLease(role='yks-new-din-books-printed-keys',model=MODEL):
        try:
            save('RUNNING')
            for sha,(exam,key_pages) in BOOKS.items():
                source=Path(discovery[sha]['sourcePath'])
                if digest(source)!=sha:raise ValueError('Registered Din book changed')
                with pymupdf.open(source) as doc:
                    sections=[s for p in key_pages for s in page_sections(doc[p-1],exam)]
                    if {s['sectionName'] for s in sections}!={str(n) for n in range(1,11)}|{'past-exams'} or len(sections)!=11:
                        raise ValueError('All ten diagnostic and separate past-exam keys required')
                    for section in sections:
                        out=folder/sha[:16];out.mkdir(exist_ok=True);crop=out/(section['sectionName']+'-key.png')
                        doc[section['physicalKeyPage']-1].get_pixmap(dpi=330,clip=pymupdf.Rect(section['bboxPt']),alpha=False).save(crop)
                        cache=out/'vision';cache.mkdir(exist_ok=True);seen=transcription(model,crop,cache);calls+=not seen['cacheHit']
                        agree=seen['reading']==section['nativePrintedAnswers']
                        result={**section,'sourceSha256':sha,'sourcePath':str(source),'sourcePageCount':len(doc),
                            'sectionId':f'din-book:{sha}:{exam}:{section["sectionName"]}',
                            'status':'PRINTED_SECTION_KEY_READINGS_VERIFIED_BODY_BINDING_REQUIRED' if agree else 'PRINTED_KEY_READINGS_DISAGREE_REVIEW_REQUIRED',
                            'cropPath':str(crop),**{k:v for k,v in seen.items() if k!='reading'},'independentPrintedAnswers':seen['reading'],
                            'sourceQuestionKeysBound':False,'subjectId':'din','teacherApproved':False,'questionBankWrites':0}
                        if agree:validate_section(result)
                        results.append(result);save('RUNNING');print(exam,section['sectionName'],len(section['nativePrintedAnswers']),result['status'],flush=True)
                if digest(source)!=sha:raise ValueError('Din source changed during printed key pass')
            save('COMPLETE')
        except BaseException:save('INTERRUPTED');raise
        finally:api('/api/generate',{'model':MODEL,'keep_alive':0})
    print({k:v for k,v in read_json(folder/'progress.json').items() if k!='results'})


if __name__=='__main__':main()
