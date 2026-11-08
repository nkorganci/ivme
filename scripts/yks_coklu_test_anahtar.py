"""Bind a single printed test to its own section on a multi-test key page."""
from pathlib import Path
import sys

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,process_lock
from yks_pilot_kaynaklari import APP,test_identities,plain
from yks_ayri_anahtar import key_section
from yks_tam_anahtar_taramasi import body_number_proof
from yks_anahtar_gorsel import transcription,checked_reading,MODEL
from yks_anahtar_pilotu import api

SOURCE='9a98660b82c6189a1d508fd074d16a0cab8310ca429c5e8c453d8cbf1052e9f7'


def checked_section(doc):
    body=set().union(*(test_identities(p.get_text()) for p in list(doc)[:-1]))
    if body!={('TYT',4)} or 'FIZIK' not in plain(doc[0].get_text()):raise ValueError('Source body test/exam/course differs')
    if test_identities(doc[-1].get_text())!={('TYT',n) for n in range(1,8)}:raise ValueError('Expected seven distinct key headings')
    section=key_section(doc[-1],'TYT',4)
    if not section or len(section['answers'])!=41:raise ValueError('Complete printed Test-4 section missing')
    if test_identities(section['text'])!={('TYT',4)}:raise ValueError('Another printed test leaked into selected key region')
    body_proof=body_number_proof(doc,section['answers'])
    if body_proof['status']!='PASS':raise ValueError('Body/answer number/options proof incomplete')
    return section,body_proof


def validate_key(row):
    if row['status']!='SOURCE_KEY_VERIFIED' or row['sourceSha256']!=SOURCE or digest(row['sourcePath'])!=SOURCE:
        raise ValueError('Exact reviewed multi-test source required')
    with pymupdf.open(row['sourcePath']) as doc:section,body=checked_section(doc)
    if row['sourceAnswers']!=section['answers'] or row['sourceKeyBboxPt']!=section['bboxPt'] or row['bodyNumberProof']!=body:
        raise ValueError('Saved selected section/body evidence differs from actual source')
    if row['exam']!='TYT' or row['subjectId']!='fizik' or row['testNumber']!=4:raise ValueError('Invalid source scope')
    if digest(row['cropPath'])!=row['cropSha256'] or digest(row['evidencePath'])!=row['evidenceSha256']:
        raise ValueError('Independent source crop/raw response changed')
    raw=read_json(row['evidencePath'])
    if raw['identity']['cropSha256']!=row['cropSha256'] or raw['identity']['modelDigest']!=row['modelDigest']:
        raise ValueError('Independent crop/model identity differs')
    if checked_reading(raw['response'])!=section['answers']:raise ValueError('Native and independently read printed section answers differ')
    return row


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);base=root/'pdf-on-tarama/full-key-scan'
    original=next(r for r in read_json(base/'progress.json')['results'] if r['sourceSha256']==SOURCE)
    folder=base/'multi-test-key';folder.mkdir(exist_ok=True);model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
    if digest(original['sourcePath'])!=SOURCE:raise ValueError('Source PDF changed')
    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
    with process_lock(folder/'.writer.lock'),ModelLease(role='yks-single-section-of-seven-printed-keys',model=MODEL):
        try:
            with pymupdf.open(original['sourcePath']) as doc:
                section,body=checked_section(doc);crop=folder/'only-test4-key.png'
                doc[-1].get_pixmap(dpi=330,clip=pymupdf.Rect(section['bboxPt']),alpha=False).save(crop)
            cache=folder/'vision';cache.mkdir(exist_ok=True);observed=transcription(model,crop,cache)
            agree=observed['reading']==section['answers']
            row={**original,'status':'SOURCE_KEY_VERIFIED' if agree else 'SECTION_KEY_READINGS_DISAGREE_REVIEW_REQUIRED',
                'sourceAnswers':section['answers'] if agree else None,'independentImageReading':observed['reading'],
                'sourceKeyBboxPt':section['bboxPt'],'bodyNumberProof':body,'bodyPageCount':original['sourcePageCount']-1,
                'subjectId':'fizik','subject':'Fizik','exam':'TYT','printedExamScopes':['TYT'],'testNumber':4,
                'testId':f'mebi-diagnostic:{SOURCE}:TYT:4','sourceKeyDocumentSha256':SOURCE,'sourceKeyPath':original['sourcePath'],
                'sourceKeyPage':section['page'],'method':'EXACT_PRINTED_TEST_SECTION_NATIVE_PLUS_INDEPENDENT_QWEN_CROP',
                'cropPath':str(crop),'keyEvidenceSha256':observed['evidenceSha256'],
                **{k:v for k,v in observed.items() if k!='reading'},'teacherApproved':False,'questionBankWrites':0}
            if agree:validate_key(row)
            report={'status':'COMPLETE','scope':'ONE_SOURCE_EXACT_SECTION_OF_SEVEN_TEST_KEY_PAGE','documents':1,
                'verifiedAnswers':len(row['sourceAnswers'] or []),'newModelCallsThisPass':int(not observed['cacheHit']),
                'newOcrCalls':0,'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'toolSha256':digest(Path(__file__)),'results':[row]}
            write_json(folder/'report.json',report)
        finally:api('/api/generate',{'model':MODEL,'keep_alive':0})
    print({k:v for k,v in report.items() if k!='results'})


if __name__=='__main__':main()
