"""Prepare six actual diagnostic body exceptions, without approving source keys.

Two source questions continue at the top of the right column. Other exceptions
have A/B/C labels inside a stem/table before the actual five answer options.
Only explicitly read source/question identities may use these exceptions.
"""
from collections import Counter
import hashlib
from pathlib import Path
import re

import pymupdf
from yks_birlestirme import Store,digest,read_json,write_json,signature,process_lock
from yks_pilot_kaynaklari import APP
from yks_pilot_sorular import source_lines,OPTION,question_sequence
from yks_kirpim_istisna import layout_regions

READINGS={
    '23faac230':{'continuation':{15:16},'embedded':set()},
    '50020846f':{'continuation':{1:2},'embedded':set()},
    '83a0cab17':{'continuation':{},'embedded':{2,10,15}},
    '8ed441229':{'continuation':{},'embedded':{15}},
    'd7ad84157':{'continuation':{},'embedded':{15}},
    'fa7a8756d':{'continuation':{},'embedded':{3}},
}


def terminal_options(text,explicit_embedded=False):
    labels=OPTION.findall(text)
    if Counter(labels)==Counter('ABCDE'):return {'status':'PASS','method':'EXACTLY_FIVE_NATIVE_SOURCE_OPTIONS','embeddedLabels':[]}
    if explicit_embedded and labels[-5:]==list('ABCDE'):
        return {'status':'PASS','method':'EXPLICITLY_READ_STEM_OR_TABLE_LABELS_BEFORE_TERMINAL_OPTIONS','embeddedLabels':labels[:-5]}
    raise ValueError('Incomplete, duplicated or unreviewed embedded source options')


def continuation_region(page,regions,number,next_number):
    left=next(r for r in regions if r['number']==number);following=next(r for r in regions if r['number']==next_number)
    if left['column']!=0 or following['column']!=1:raise ValueError('Expected left-to-right continuation is missing')
    candidates=[l for l in source_lines(page) if l['bbox'][0]>page.rect.width/2 and
        page.rect.height*.1<l['bbox'][1]<following['bboxPt'][1] and OPTION.fullmatch(l['text'].strip())]
    if not candidates:raise ValueError('Expected actual source continuation option label is missing')
    bbox=[page.rect.width/2-1,min(l['bbox'][1] for l in candidates)-4,page.rect.width-14,following['bboxPt'][1]-.1]
    return {'pdfPage':page.number+1,'bboxPt':bbox,'role':'PRINTED_OPTION_CONTINUATION_AT_TOP_OF_RIGHT_COLUMN'}


def inspect(row):
    prefix=next((p for p in READINGS if row['sourceSha256'].startswith(p)),None)
    if prefix is None:raise ValueError('Unreviewed diagnostic exception')
    policy=READINGS[prefix];cards=[];all_regions=[];source=Path(row['sourcePath'])
    if digest(source)!=row['sourceSha256']:raise ValueError('Read body exception source changed')
    with pymupdf.open(source) as document:
        for page in list(document)[:-1]:
            regions,mode=layout_regions(source_lines(page),page.rect.width,page.rect.height)
            all_regions.extend({**r,'page':page.number+1} for r in regions)
            for region in regions:
                number=region['number'];parts=[{'pdfPage':page.number+1,'bboxPt':region['bboxPt'],'role':'ORIGINAL_QUESTION_BODY'}]
                if number in policy['continuation']:parts.append(continuation_region(page,regions,number,policy['continuation'][number]))
                texts=[page.get_text(clip=pymupdf.Rect(part['bboxPt'])).strip() for part in parts];text='\n\n'.join(texts)
                proof=terminal_options(text,number in policy['embedded'])
                cards.append({'printedNumber':number,'sourceRegions':parts,'text':text,'textSha256':hashlib.sha256(text.encode()).hexdigest(),
                    'nativeOptionProof':proof,'layout':mode,'keyVerified':False,'teacherApproved':False,'questionBankWrites':0})
        question_sequence(all_regions,row['nativePrintedAnswers'])
    if digest(source)!=row['sourceSha256']:raise ValueError('Source changed during body proof preparation')
    return {'status':'BODY_SEQUENCE_AND_EXPLICIT_SOURCE_OPTIONS_PREPARED_KEY_STILL_REQUIRED','sourceSha256':row['sourceSha256'],
        'sourcePath':str(source),'exam':row['exam'],'course':row['course'],'questions':len(cards),'cards':cards,
        'nativePrintedAnswers':row['nativePrintedAnswers'],'originalKeyObservationStatus':row['status'],
        'sourceKeyCropPath':row['cropPath'],'sourceKeyCropSha256':row['cropSha256'],
        'sourceKeysApproved':False,'pixelsAndContentAccepted':False,'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False}


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    source=root/'pdf-on-tarama/full-key-scan/progress.json';cohort=read_json(source);folder=root/'pdf-on-tarama/diagnostic-body-exceptions';folder.mkdir(exist_ok=True)
    identity={'sourceScanSha256':digest(source),'readerFiles':{p:digest(APP/'scripts'/p) for p in ['yks_govde_istisna_incele.py','yks_kirpim_istisna.py','yks_pilot_sorular.py']},'rendererVersion':pymupdf.VersionBind}
    rows=[];hits=0
    with process_lock(folder/'.writer.lock'):
        for prefix in READINGS:
            chosen=[r for r in cohort['results'] if r['sourceSha256'].startswith(prefix)]
            if len(chosen)!=1:raise ValueError('Read source prefix missing or ambiguous')
            original=chosen[0];sha=original['sourceSha256'];cache=folder/(sha+'.json');key={**identity,'sourceSha256':sha}
            if cache.is_file() and read_json(cache)['identity']==key:
                if digest(original['sourcePath'])!=sha or digest(original['cropPath'])!=original['cropSha256']:raise ValueError('Body exception source/key crop changed')
                result=read_json(cache)['result'];hits+=1
            else:result=inspect(original);write_json(cache,{'identity':key,'result':result})
            rows.append(result)
        report={'status':'PASS','scope':'SIX_EXPLICITLY_READ_SOURCE_BODY_EXCEPTIONS_ONLY','documents':len(rows),'questions':sum(r['questions'] for r in rows),
            'sourcesWithColumnContinuation':sum(bool(READINGS[p]['continuation']) for p in READINGS),
            'cachedDocumentsThisPass':hits,'identity':identity,'newOcrCalls':0,'newModelCalls':0,'questionBankWrites':0,
            'sourceWrites':0,'sourceKeysApproved':False,'teacherApproved':False,'results':rows}
        write_json(folder/'report.json',report)
    print({k:v for k,v in report.items() if k not in ['results','identity']})


if __name__=='__main__':main()
