"""Read every sidebar mock's printed key with separate section identities.

Strict supported-layout expansion, not source-question/content/import acceptance.
Missing printed identity or unsupported keys remain explicit review work.
"""
import argparse
from collections import Counter
import json
from pathlib import Path
import re
import sys

import pymupdf
from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_deneme_anahtar_pilotu import partition_key,printed_mock_numbers
from yks_pilot_kaynaklari import APP,plain
from yks_anahtar_cohort import read_pairs,OCR_PAIR
from yks_anahtar_gorsel import transcription,checked_reading,MODEL
from yks_anahtar_pilotu import api
from pdf_ocr_cache import model_hash


def mock_identity(document,exam):
    page=document[-1];text=plain(page.get_text())
    body=printed_mock_numbers(list(document)[:-1])
    keys={int(m[1]) for m in re.finditer(r'\b(\d+)\.\s*DENEME\s+CEVAP',text)}
    if len(body)!=1 or keys!=body or exam not in text:
        raise ValueError('Explicit printed mock body/key/exam identity is missing or differs')
    return next(iter(body))


def validate_saved(row,model):
    if digest(row['sourcePath'])!=row['sourceSha256']:raise ValueError('Saved mock source changed')
    for section in row.get('sections',[]):
        if digest(section['cropPath'])!=section['cropSha256']:raise ValueError('Saved mock key crop changed')
        proof=read_json(section['evidencePath'])
        if digest(section['evidencePath'])!=section['keyEvidenceSha256']:raise ValueError('Saved mock key evidence changed')
        if section['readingMethod']=='NATIVE_PLUS_INDEPENDENT_QWEN_SECTION_IMAGE':
            if proof['identity']['modelDigest']!=model['digest'] or proof['identity']['cropSha256']!=section['cropSha256']:
                raise ValueError('Saved mock model/source identity changed')
            try:actual=checked_reading(proof['response'])
            except (ValueError,TypeError,KeyError):actual=None
        else:
            if proof['cropSha256']!=section['cropSha256'] or proof['modelSha256']!=model_hash():raise ValueError('Saved mock OCR/source identity changed')
            actual=read_pairs(proof['text'],OCR_PAIR)
        if actual!=section['independentAnswers']:raise ValueError('Saved mock independent source reading differs')
        if section['status']=='TWO_PRINTED_SOURCE_READINGS_AGREE' and actual!=section['answers']:
            raise ValueError('Saved mock source answers disagree')
    return row


def examine(case,folder,pilot,model,visual):
    sha=case['sourceSha256'];source=Path(case['sourcePath']);out=folder/sha[:16];out.mkdir(exist_ok=True)
    row={**case,'status':'PRINTED_MOCK_IDENTITY_OR_LAYOUT_REVIEW_REQUIRED','sections':[],
        'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'absenceClaimed':False,
        'newOcrCalls':0,'newModelCalls':0,'branchAndTopicAssignmentsAccepted':False}
    with pymupdf.open(source) as document:
        row['sourcePageCount']=len(document)
        try:
            number=mock_identity(document,case['exam']);sections=partition_key(document[-1],case['exam'])
        except ValueError as exc:return {**row,'issue':str(exc)}
        row.update(printedMockNumber=number,sourceKeyPage=len(document))
        for section in sections:
            name=section['sectionId'].replace(':','-');crop=out/(name+'.png')
            pixmap=document[-1].get_pixmap(dpi=220,clip=pymupdf.Rect(section['keyBboxPt']),alpha=False);pixmap.save(crop)
            crop_sha=digest(crop);identity=signature([sha,crop_sha,model_hash(),'mock-section-tur-ocr-v1',pymupdf.VersionBind])
            cache=out/(identity+'.json');old_ocr=pilot/sha[:12]/(identity+'.json')
            if cache.is_file():ocr=read_json(cache)
            elif old_ocr.is_file():cache=old_ocr;ocr=read_json(cache)
            else:
                with pymupdf.open('pdf',pixmap.pdfocr_tobytes(language='tur',tessdata=str(APP/'veri/tessdata'))) as recognized:text=recognized[0].get_text()
                ocr={'text':text,'cropSha256':crop_sha,'modelSha256':model_hash()};write_json(cache,ocr);row['newOcrCalls']+=1
            if ocr['cropSha256']!=crop_sha or ocr['modelSha256']!=model_hash():raise ValueError('Mock OCR cache/source differs')
            reading=read_pairs(ocr['text'],OCR_PAIR);method='NATIVE_PLUS_INDEPENDENT_RENDERED_SECTION_OCR';proof=cache
            if reading!=section['answers']:
                prior=pilot/sha[:12]/(name+'.section.json');old=read_json(prior) if prior.is_file() else {}
                observation=old.get('visualEvidence')
                if observation and observation['cropSha256']==crop_sha and observation['modelDigest']==model['digest']:
                    evidence=Path(observation['evidencePath'])
                    if digest(evidence)!=observation['evidenceSha256']:raise ValueError('Pilot visual evidence changed')
                    raw=read_json(evidence)
                    if raw['identity']['cropSha256']!=crop_sha or raw['identity']['modelDigest']!=model['digest']:raise ValueError('Pilot source/model binding differs')
                    try:reading=checked_reading(raw['response'])
                    except (ValueError,TypeError,KeyError):reading=None
                    proof=evidence;method='NATIVE_PLUS_INDEPENDENT_QWEN_SECTION_IMAGE'
                elif visual:
                    for active in api('/api/ps').get('models',[]):
                        if active['name']!=MODEL:api('/api/generate',{'model':active['name'],'keep_alive':0})
                    vision=out/(name+'-vision');vision.mkdir(exist_ok=True)
                    observation=transcription(model,crop,vision);row['newModelCalls']+=not observation['cacheHit']
                    reading=observation['reading'];proof=Path(observation['evidencePath']);method='NATIVE_PLUS_INDEPENDENT_QWEN_SECTION_IMAGE'
            section.update(status='TWO_PRINTED_SOURCE_READINGS_AGREE' if reading==section['answers'] else 'SOURCE_READING_DISAGREEMENT_REVIEW_REQUIRED',
                independentAnswers=reading,readingMethod=method,keyEvidenceSha256=digest(proof),evidencePath=str(proof),
                cropPath=str(crop),cropSha256=crop_sha)
            row['sections'].append(section)
            write_json(out/(name+'.section.json'),section)
        row['status']='SOURCE_MOCK_KEY_VERIFIED' if all(s['status']=='TWO_PRINTED_SOURCE_READINGS_AGREE' for s in sections) else 'MOCK_KEY_SECTION_REVIEW_REQUIRED'
    return validate_saved(row,model)


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--visual',action='store_true');parser.add_argument('--limit',type=int);args=parser.parse_args()
    if args.limit is not None and args.limit<1:parser.error('Positive limit required')
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    if store.verify(state,'YKS-10','pilot')['status']!='VERIFIED':raise ValueError('Actual isolated pilot required')
    file=next(root/a['path'] for a in state['stages']['YKS-03:full']['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
    cases=[]
    for group in map(json.loads,file.read_text(encoding='utf-8').splitlines()):
        locations=[p for p in group['occurrences'] if p['kind']=='FILE' and Path(p['root']).name=='mebi-yks' and p['path'].startswith('Deneme-Tarama/Denemeler/')]
        if not locations:continue
        exams={p['path'].split('/')[3] for p in locations}
        if len(exams)!=1 or not exams<={'TYT','AYT'}:raise ValueError('Sidebar mock exam aliases disagree')
        location=locations[0];cases.append({'sourceSha256':group['sha256'],'sourcePath':str(Path(location['root'])/location['path']),
            'exam':next(iter(exams)),'providerDisplayPath':location['path']})
    folder=root/'pdf-on-tarama/full-mock-keys';folder.mkdir(exist_ok=True)
    identity={'sourceGroupsSha256':digest(file),'readerFiles':{p:digest(APP/'scripts'/p) for p in ['yks_tam_deneme_anahtar.py','yks_deneme_anahtar_pilotu.py','yks_anahtar_gorsel.py']},
        'ocrModelSha256':model_hash(),'rendererVersion':pymupdf.VersionBind,'visualEnabled':args.visual}
    model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL);identity['visualModelDigest']=model['digest']
    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
    results=[];hits=0;processed=0
    def save(status):
        report={'status':status,'scope':'FULL_SIDEBAR_MOCK_PRINTED_SECTION_KEYS_ONLY','documents':len(cases),'completed':len(results),'pending':len(cases)-len(results),
            'states':dict(Counter(r['status'] for r in results)),
            'verifiedPrintedAnswers':sum(len(s['answers']) for r in results for s in r['sections'] if s['status']=='TWO_PRINTED_SOURCE_READINGS_AGREE'),
            'newOcrCallsThisPass':sum(r['newOcrCalls'] for r in results if not r.get('cacheHit')),
            'newModelCallsThisPass':sum(r['newModelCalls'] for r in results if not r.get('cacheHit')),
            'cachedDocumentsThisPass':hits,'identity':identity,'questionBankWrites':0,'sourceWrites':0,'absenceClaimed':False,
            'teacherApproved':False,'fullYks07Accepted':False,'results':results}
        write_json(folder/'progress.json',report)
    with process_lock(folder/'.writer.lock'),ModelLease(role='yks-full-mock-printed-key',model=MODEL):
        try:
            save('RUNNING')
            for case in cases:
                sha=case['sourceSha256'];cache=folder/(sha+'.json');key={**identity,'sourceSha256':sha}
                if cache.is_file() and read_json(cache)['identity']==key:
                    result={**validate_saved(read_json(cache)['result'],model),'cacheHit':True};hits+=1
                else:
                    if args.limit is not None and processed>=args.limit:break
                    if digest(case['sourcePath'])!=sha:raise ValueError('Original sidebar mock PDF changed')
                    result=examine(case,folder,root/'pdf-on-tarama/mock-key-pilot',model,args.visual)
                    if digest(case['sourcePath'])!=sha:raise ValueError('Mock source changed during reading')
                    write_json(cache,{'identity':key,'result':result});processed+=1
                results.append(result);save('RUNNING')
                print(f'Mock printed key {len(results)}/{len(cases)}: {case["exam"]} {result["status"]}',flush=True)
            save('SUPPORTED_MOCK_PASS_COMPLETE' if len(results)==len(cases) else 'PARTIAL')
        except BaseException:save('INTERRUPTED');raise
        finally:api('/api/generate',{'model':MODEL,'keep_alive':0})
    print({k:v for k,v in read_json(folder/'progress.json').items() if k not in ['results','identity']})


if __name__=='__main__':main()
