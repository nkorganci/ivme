"""Freshly bind full diagnostic key evidence to current original sources."""
from collections import Counter
from pathlib import Path

import pymupdf
from yks_birlestirme import Store,digest,signature,read_json,write_json
from yks_pilot_kaynaklari import APP,source_keys,verified_source_scope,test_identities
from yks_anahtar_cohort import read_pairs,OCR_PAIR
from yks_anahtar_gorsel import checked_reading
from yks_ayri_anahtar import key_section
from yks_tam_anahtar_gorsel import source_signature
from yks_buyuk_anahtar_incele import large_pairs


def key_scope(row):
    sha=row['sourceSha256'];source=Path(row['sourcePath'])
    if digest(source)!=sha:raise ValueError('Current source diagnostic PDF changed')
    expected=row['sourceAnswers']
    if not expected or [a['number'] for a in expected]!=list(range(1,len(expected)+1)):raise ValueError('Full sequential printed key required')
    separate=row['sourceKeyDocumentSha256']!=sha
    if separate:
        book=Path(row['sourceKeyPath'])
        if digest(book)!=row['sourceKeyDocumentSha256']:raise ValueError('Current official key PDF changed')
        if not row['fullQuestionBodyTextAndPixelsEqual'] or any(not p['matches'] for p in row['bodyChecks']):
            raise ValueError('Different or partial source body cannot inherit an official book key')
        with pymupdf.open(book) as doc:
            section=key_section(doc[row['sourceKeyPage']-1],row['exam'],row['testNumber'])
        if not section or section['answers']!=expected:raise ValueError('Actual official section key content differs')
        with pymupdf.open(source) as doc:
            if set().union(*(test_identities(p.get_text()) for p in doc))!={(row['exam'],row['testNumber'])}:
                raise ValueError('Source body printed test differs')
        scope={'exam':row['exam'],'printedExamScopes':[row['exam']],'subjectId':row['subjectId'],'subject':row['subject'],
            'testNumber':row['testNumber'],'testId':f'mebi-diagnostic:{sha}:{row["exam"]}:{row["testNumber"]}',
            'sourcePageCount':row['sourcePageCount'],'bodyPageCount':row['sourcePageCount']}
    else:
        with pymupdf.open(source) as doc:
            fresh=(large_pairs if len(expected)>60 else read_pairs)(doc[row['sourceKeyPage']-1].get_text())
            if fresh!=expected:raise ValueError('Fresh source native printed key differs')
            scope=verified_source_scope(row,doc)
        scope['bodyPageCount']=scope['sourcePageCount']-1
    visual=row.get('evidencePath')
    if visual:
        if digest(visual)!=row['evidenceSha256'] or row['keyEvidenceSha256']!=row['evidenceSha256']:
            raise ValueError('Visual printed-key evidence changed')
        evidence=read_json(visual)
        if evidence['identity']['cropSha256']!=row['cropSha256'] or checked_reading(evidence['response'])!=expected:
            raise ValueError('Actual independent visual printed reading differs')
    else:
        evidence_file=Path(row['ocrEvidencePath'])
        if digest(evidence_file)!=row['keyEvidenceSha256']:raise ValueError('Separate/native OCR evidence changed')
        if read_pairs(read_json(evidence_file)['text'],OCR_PAIR)!=expected:raise ValueError('Actual independent OCR printed reading differs')
    if digest(row['cropPath'])!=row['cropSha256']:raise ValueError('Independent printed key crop changed')
    return {**row,**scope,'status':'SOURCE_KEY_VERIFIED','teacherApproved':False,'questionBankWrites':0}


def verified_keys(root):
    base=root/'pdf-on-tarama/full-key-scan';native=read_json(base/'progress.json');resolved=read_json(base/'resolved-key-scope-report.json')
    if resolved['sourceEvidenceSignature']!=source_signature(native):raise ValueError('Full source/key signatures differ')
    pilot={r['sourceSha256']:r for r in source_keys(root/'pdf-on-tarama/key-cohort') if r['status']=='SOURCE_KEY_VERIFIED'}
    rows={}
    for row in resolved['results']:
        if row['status']!='SOURCE_KEY_VERIFIED':continue
        sha=row['sourceSha256']
        if sha in pilot:
            if pilot[sha]['sourceAnswers']!=row['sourceAnswers']:raise ValueError('Previously accepted source answers changed')
            rows[sha]=pilot[sha]
        else:rows[sha]=key_scope(row)
    for name in ['separate-chemistry/progress.json','separate-tarih/progress.json','separate-visual-report.json']:
        report=read_json(base/name)
        if report['status'] not in ['SUPPORTED_OFFICIAL_BOOK_PASS_COMPLETE','COMPLETE']:
            raise ValueError('Separate official key pass is incomplete')
        for row in report['results']:
            if row['status']!='SEPARATE_KEY_VERIFIED':continue
            normalized=key_scope(row);sha=row['sourceSha256']
            if sha in rows and rows[sha]['sourceAnswers']!=normalized['sourceAnswers']:raise ValueError('Two actual source key proofs disagree')
            rows[sha]=normalized
    large=base/'large-key/report.json'
    if large.is_file():
        row=read_json(large)
        original=next(r for r in native['results'] if r['sourceSha256']==row['sourceSha256'])
        if row['status']=='SOURCE_KEY_VERIFIED':rows[row['sourceSha256']]=key_scope({**original,**row})
    return sorted(rows.values(),key=lambda r:r['sourceSha256'])


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    rows=verified_keys(root);report={'status':'PASS','scope':'FRESHLY_BOUND_DIAGNOSTIC_AND_SEPARATE_BOOK_PRINTED_KEYS',
        'documentsWithVerifiedKeys':len(rows),'verifiedPrintedAnswers':sum(len(r['sourceAnswers']) for r in rows),
        'byExamSubject':dict(Counter(r['exam']+':'+r['subjectId'] for r in rows)),
        'sourceKeyScopeSignature':signature(rows),'toolSha256':digest(Path(__file__)),
        'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'fullYks07Accepted':False,'results':rows}
    write_json(root/'pdf-on-tarama/full-key-scan/verified-source-keys.json',report)
    print({k:v for k,v in report.items() if k!='results'})


if __name__=='__main__':main()
