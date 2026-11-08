"""Read mock-test keys by printed section, never flatten restarted numbers.

Extra philosophy/religion alternative questions are preserved as printed. The
key's section is not yet an individual question's discipline/topic assignment.
"""
import hashlib
from pathlib import Path
import re
import sys

import pymupdf
from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_pilot_kaynaklari import APP,plain
from yks_pilot_sorular import source_lines
from yks_cevap_on_tarama import PAIR
from yks_anahtar_cohort import read_pairs,OCR_PAIR
from yks_anahtar_gorsel import transcription
from yks_anahtar_pilotu import MODEL,api
from pdf_ocr_cache import model_hash

SOURCES={
    '10fa50c7f88284b75880ed69af3a630d88c50810b3db22af16374c4a2268c3b6':'TYT',
    '05fbeafee7bcc172f4f22c039df2447293060448ff493346e30768862df6d2cd':'AYT'}
SECTIONS={'TYT':[('TURKCE',40),('SOSYAL BILIMLER',25),('TEMEL MATEMATIK',40),('FEN BILIMLERI',20)],
          'AYT':[('TURK DILI VE EDEBIYATI',40),('SOSYAL BILIMLER 2',46),('MATEMATIK',40),('FEN BILIMLERI',40)]}


def printed_mock_numbers(pages):
    return {int(match[1]) for page in pages for line in source_lines(page)
        if line['bbox'][1]<page.rect.height*.1
        and (match:=re.fullmatch(r'(\d+)\.\s*DENEME',plain(line['text']).strip()))}


def partition_key(page,exam):
    lines=source_lines(page);pairs=[l for l in lines if PAIR.fullmatch(l['text'])]
    groups=[]
    for line in sorted(pairs,key=lambda l:l['bbox'][0]):
        if not groups or line['bbox'][0]-groups[-1][0]['bbox'][0]>25:groups.append([])
        groups[-1].append(line)
    if len(groups)!=4:raise ValueError('Mock key must have four distinct printed column groups')
    centers=[sum((l['bbox'][0]+l['bbox'][2])/2 for l in group)/len(group) for group in groups]
    header_top=min(l['bbox'][1] for l in pairs)
    headings=[l for l in lines if header_top-50<=l['bbox'][1]<header_top and not PAIR.fullmatch(l['text'])
        and 'DENEME' not in plain(l['text']) and 'YETERLILIK' not in plain(l['text'])]
    sections=[]
    for index,(expected,count) in enumerate(SECTIONS[exam]):
        header=[l for l in headings if min(range(4),key=lambda i:abs(centers[i]-(l['bbox'][0]+l['bbox'][2])/2))==index]
        heading=plain(' '.join(l['text'] for l in header))
        if expected not in heading:raise ValueError('Printed key section name differs from expected exam layout')
        group=sorted(groups[index],key=lambda l:l['bbox'][1]);text='\n'.join(l['text'] for l in group)
        answers=read_pairs(text)
        if answers is None or len(answers)!=count:raise ValueError('Mock section source numbers/answers incomplete or duplicated')
        included=[*header,*group]
        box=[min(l['bbox'][0] for l in included)-6,min(l['bbox'][1] for l in included)-6,
             max(l['bbox'][2] for l in included)+6,max(l['bbox'][3] for l in included)+6]
        sections.append({'sectionId':exam+':'+str(index+1),'printedSectionTitle':' '.join(l['text'] for l in header),
            'answers':answers,'keyBboxPt':box,'expectedPrintedQuestions':count,
            'branchAssignment':'NOT_INFERRED_FROM_KEY_COLUMN','alternativeQuestionsIncluded':index==1})
    return sections


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    file=next(root/a['path'] for a in state['stages']['YKS-03:full']['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
    groups={g['sha256']:g for g in map(__import__('json').loads,file.read_text(encoding='utf-8').splitlines())}
    folder=root/'pdf-on-tarama/mock-key-pilot';folder.mkdir(exist_ok=True);results=[];new_ocr=0;new_model_calls=0
    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
    model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
    with process_lock(folder/'.writer.lock'),ModelLease(role='yks-mock-source-key',model=MODEL):
        try:
            for sha,exam in SOURCES.items():
                row=groups[sha]['canonicalCandidate'];source=Path(row['root'])/row['path']
                if row['kind']!='FILE' or digest(source)!=sha:raise ValueError('Mock PDF source differs from inventory')
                out=folder/sha[:12];out.mkdir(exist_ok=True)
                with pymupdf.open(source) as doc:
                    # The printed body and key identity must agree inside this PDF;
                    # a provider display number is kept as separate metadata.
                    body_numbers=printed_mock_numbers(list(doc)[:-1])
                    key_numbers={int(m[1]) for m in re.finditer(r'\b(\d+)\.\s*DENEME\s+CEVAP',plain(doc[-1].get_text()))}
                    if len(body_numbers)!=1 or key_numbers!=body_numbers:raise ValueError('Mock body/key printed identity differs')
                    if exam not in plain(doc[-1].get_text()):raise ValueError('Printed mock exam scope differs')
                    sections=partition_key(doc[-1],exam);page_count=len(doc)
                    for section in sections:
                        name=section['sectionId'].replace(':','-');crop=out/(name+'.png')
                        pixmap=doc[-1].get_pixmap(dpi=220,clip=pymupdf.Rect(section['keyBboxPt']),alpha=False);pixmap.save(crop)
                        identity=signature([sha,digest(crop),model_hash(),'mock-section-tur-ocr-v1',pymupdf.VersionBind]);cache=out/(identity+'.json')
                        if cache.is_file():ocr=read_json(cache)
                        else:
                            with pymupdf.open('pdf',pixmap.pdfocr_tobytes(language='tur',tessdata=str(APP/'veri/tessdata'))) as recognized:text=recognized[0].get_text()
                            ocr={'text':text,'cropSha256':digest(crop),'modelSha256':model_hash()};write_json(cache,ocr)
                            new_ocr+=1
                        reading=read_pairs(ocr['text'],OCR_PAIR);method='NATIVE_PLUS_INDEPENDENT_RENDERED_SECTION_OCR';proof=digest(cache)
                        if reading!=section['answers']:
                            for active in api('/api/ps').get('models',[]):
                                if active['name']!=MODEL:api('/api/generate',{'model':active['name'],'keep_alive':0})
                            vision=out/(name+'-vision');vision.mkdir(exist_ok=True)
                            record=transcription(model,crop,vision);reading=record['reading'];method='NATIVE_PLUS_INDEPENDENT_QWEN_SECTION_IMAGE';proof=record['evidenceSha256']
                            new_model_calls+=not record['cacheHit']
                            section['visualEvidence']=record
                        section.update(status='TWO_PRINTED_SOURCE_READINGS_AGREE' if reading==section['answers'] else 'SOURCE_READING_DISAGREEMENT_REVIEW_REQUIRED',
                            independentAnswers=reading,readingMethod=method,keyEvidenceSha256=proof,cropPath=str(crop),cropSha256=digest(crop))
                        print(f'Mock key: {exam} {section["printedSectionTitle"]}: {section["status"]}',flush=True)
                        write_json(out/(name+'.section.json'),section)
                results.append({'sourceSha256':sha,'sourcePath':str(source),'exam':exam,'printedMockNumber':next(iter(body_numbers)),
                    'providerDisplayPath':row['path'],'sourceKeyPage':page_count,
                    'sections':sections,'questionBankWrites':0,'teacherApproved':False})
                if digest(source)!=sha:raise ValueError('Original mock source changed during key reading')
                write_json(folder/'mock-progress.json',{'status':'RUNNING','results':results})
            report={'status':'PASS','scope':'MOCK_SOURCE_KEY_OBSERVATIONS_ONLY','sources':len(results),
                'sections':sum(len(r['sections']) for r in results),
                'verifiedPrintedAnswers':sum(len(s['answers']) for r in results for s in r['sections'] if s['status']=='TWO_PRINTED_SOURCE_READINGS_AGREE'),
                'pendingSections':sum(s['status']!='TWO_PRINTED_SOURCE_READINGS_AGREE' for r in results for s in r['sections']),
                'newOcrCallsThisPass':new_ocr,'newModelCallsThisPass':new_model_calls,
                'toolSha256':digest(Path(__file__)),'questionBankWrites':0,'branchAndTopicAssignmentsAccepted':False,'results':results}
            write_json(folder/'mock-key-report.json',report)
        finally:api('/api/generate',{'model':MODEL,'keep_alive':0})
    print(__import__('json').dumps({k:v for k,v in report.items() if k!='results'}))


if __name__=='__main__':main()
