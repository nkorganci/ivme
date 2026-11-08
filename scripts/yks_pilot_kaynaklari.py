"""Bind independently read diagnostic keys to exact test/exam/subject identities.

No question/answer is inferred from a bank record or from a filename alone.
Unsupported keys remain explicit exclusions, including both chemistry samples.
"""
from collections import Counter
import json
from pathlib import Path
import re
import unicodedata

import pymupdf
from yks_birlestirme import Store,digest,read_json,write_json,signature
from yks_anahtar_cohort import read_pairs,OCR_PAIR
from yks_anahtar_gorsel import checked_reading
from yks_anahtar_pilotu import SOURCE
from pdf_source_scan import read_scan

APP=Path(__file__).resolve().parents[1]
SUBJECTS={'Biyoloji':'biyoloji','Coğrafya':'cografya','Din Kültürü ve Ahlak Bilgisi':'din','Fizik':'fizik',
    'Kimya':'kimya','Mantık':'mantik','Matematik':'matematik','Psikoloji':'psikoloji','Sosyoloji':'sosyoloji',
    'Tarih':'tarih','Türk Dili ve Edebiyatı':'edebiyat','Felsefe':'felsefe','Türkçe':'turkce'}
TEST=re.compile(r'\b(TYT\s*/\s*AYT|TYT|AYT)\s+TARAMA\s+TESTI\s*[-–]?\s*(\d+)\b')


def plain(value):
    return ''.join(c for c in unicodedata.normalize('NFKD',value.replace('ı','i').replace('İ','I').upper()) if not unicodedata.combining(c))


def test_identities(text):
    return {(re.sub(r'\s+','',m[1]),int(m[2])) for m in TEST.finditer(plain(text))}


def verified_source_scope(row,pdf,separate_key=None):
    name=re.sub(r'\s*\([^)]*\)\s*$','',row['course']).strip()
    if name not in SUBJECTS:raise ValueError('Unknown controlled source subject')
    scan=read_scan(row['sourceSha256'])
    body_ids=set().union(*(test_identities(p['text']) for p in (scan['pages'] if separate_key else scan['pages'][:-1])))
    key_ids={(separate_key['exam'],separate_key['testNumber'])} if separate_key else test_identities(scan['pages'][-1]['text'])
    if len(body_ids)!=1 or key_ids!=body_ids:raise ValueError('Answer key and question body test identity differ/missing')
    exam,test=next(iter(body_ids));scopes=exam.split('/')
    if row['exam'] not in scopes:raise ValueError('Printed exam conflicts with provider metadata')
    # Source headings confirm course where printed; Din's source prints its
    # institution rather than a course name and keeps that explicit limitation.
    printed=plain(pdf[0].get_text())
    has_subject=plain(name) in printed
    if not has_subject and SUBJECTS[name]!='din':raise ValueError('Printed source course differs from provider metadata')
    return {'subjectId':SUBJECTS[name],'subject':name,'exam':row['exam'],'printedExamScopes':scopes,
        'testNumber':test,'testId':f'mebi-diagnostic:{row["sourceSha256"]}:{exam}:{test}',
        'courseEvidence':'PRINTED_SOURCE_HEADER_AND_PROVIDER_METADATA' if has_subject else 'PROVIDER_METADATA_WITH_DIN_INSTITUTION_HEADER',
        'printedTestIdentity':exam+' TARAMA TESTI-'+str(test),'sourcePageCount':len(pdf)}


def source_keys(folder):
    file=folder/'cohort-report.json';cohort=read_json(file)
    visual_file=folder/'visual-resolution-report.json'
    visual=read_json(visual_file) if visual_file.is_file() else {}
    if visual and visual['sourceCohortSha256']!=digest(file):raise ValueError('Visual resolution belongs to another source cohort')
    resolutions={r['sourceSha256']:r for r in visual.get('results',[])}
    separate_file=folder/'separate-key/separate-key-report.json'
    separate={r['sourceSha256']:r for r in read_json(separate_file)['results']} if separate_file.is_file() else {}
    output=[]
    for row in cohort['results']:
        source=Path(row['sourcePath']);sha=row['sourceSha256']
        if digest(source)!=sha:raise ValueError('Original diagnostic PDF changed')
        accepted=None;method=None;evidence=None;exclude=None;external=None
        if row['status']=='TWO_PRINTED_SOURCE_READINGS_AGREE':
            if sha==SOURCE:
                prior=folder.parent/'key-pilot'/SOURCE;proof=read_json(prior/'key-pilot-report.json')
                if proof['sourceEvidenceSha256']!=digest(prior/'source-key.json'):raise ValueError('Prior printed source key evidence changed')
                source_key=read_json(prior/'source-key.json')
                model_file=next((p for p in prior.glob('*.json') if digest(p)==proof['modelEvidenceSha256']),None)
                if model_file is None:raise ValueError('Prior local visual key evidence missing')
                response=read_json(model_file)['rawResponse']
                if checked_reading(response)!=source_key['nativeTextReading']:raise ValueError('Prior key transcription changed')
                accepted=source_key['nativeTextReading'];method='NATIVE_PLUS_PREVIOUS_INDEPENDENT_QWEN_CROP';evidence=digest(prior/'key-pilot-report.json')
            else:
                if digest(row['ocrEvidencePath'])!=row['ocrEvidenceSha256'] or digest(row['cropPath'])!=row['cropSha256']:
                    raise ValueError('Independent crop/OCR evidence changed')
                observed=read_json(row['ocrEvidencePath'])
                if read_pairs(observed['text'],OCR_PAIR)!=row['nativePrintedAnswers']:raise ValueError('Saved OCR no longer agrees')
                accepted=row['nativePrintedAnswers'];method='NATIVE_PLUS_RENDERED_CROP_TUR_OCR';evidence=row['ocrEvidenceSha256']
        elif sha in resolutions:
            resolution=resolutions[sha]
            if digest(resolution['evidencePath'])!=resolution['evidenceSha256'] or digest(resolution['sourceCropPath'])!=resolution['cropSha256']:
                raise ValueError('Independent visual source evidence changed')
            try:reading=checked_reading(read_json(resolution['evidencePath'])['response'])
            except ValueError:reading=None
            if reading is not None and reading==row['nativePrintedAnswers']:
                accepted=reading;method='NATIVE_PLUS_INDEPENDENT_QWEN_CROP';evidence=resolution['evidenceSha256']
            else:exclude='INDEPENDENT_SOURCE_READINGS_DISAGREE_OR_INCOMPLETE'
        else:exclude='NO_VERIFIED_SOURCE_KEY_EVIDENCE' if row['status']=='UNSUPPORTED_KEY_LAYOUT_REVIEW_REQUIRED' else 'INDEPENDENT_VISUAL_READING_PENDING'
        if accepted is None and sha in separate:
            relation=separate[sha]
            if relation['status']=='SEPARATE_OFFICIAL_KEY_VERIFIED':
                book=Path(relation['officialBookPath'])
                if digest(book)!=relation['officialBookSha256'] or digest(relation['cropPath'])!=relation['cropSha256']:
                    raise ValueError('Separate printed key source or crop changed')
                checks=relation['bodyChecks']
                if len(checks)!=relation['sourcePages'] or any(not c['matches'] or c['sourcePixelSha256']!=c['bookPixelSha256']
                    or c['sourceBodyTextSha256']!=c['bookBodyTextSha256'] for c in checks):
                    raise ValueError('Separate key requires all identical source-body pages')
                proof_files=[p for p in (folder/'separate-key'/sha[:16]).rglob('*.json') if digest(p)==relation['keyEvidenceSha256']]
                if len(proof_files)!=1:raise ValueError('Independent separate-key observation missing/ambiguous')
                proof=read_json(proof_files[0])
                independent=checked_reading(proof['response']) if 'response' in proof else read_pairs(proof['text'],OCR_PAIR)
                if independent!=relation['answers']:raise ValueError('Independent separate-key reading differs')
                with pymupdf.open(book) as doc:
                    text=doc[relation['keySourcePage']-1].get_text(clip=pymupdf.Rect(relation['keyBboxPt']))
                if read_pairs(text)!=independent or test_identities(text)!={(relation['exam'],relation['testNumber'])}:
                    raise ValueError('Fresh separate printed key identity differs')
                accepted=independent;method=relation['method'];evidence=relation['keyEvidenceSha256'];external=relation;exclude=None
            elif relation['status']=='EXCLUDED_TEST_VERSION_VARIANT':exclude='SEPARATE_BOOK_HAS_DIFFERENT_QUESTION_VERSION'
        with pymupdf.open(source) as pdf:
            if accepted is not None:
                # Re-read the actual current source page; neither saved cache nor
                # local-model agreement can silently repair a differing native key.
                if external is None and read_pairs(pdf[-1].get_text())!=accepted:raise ValueError('Fresh printed source answers differ from accepted readings')
                scope=verified_source_scope(row,pdf,external)
            else:scope={'exam':row['exam'],'sourcePageCount':len(pdf)}
        output.append({'sourceSha256':sha,'sourcePath':str(source),'providerCourse':row['course'],**scope,
            'status':'SOURCE_KEY_VERIFIED' if accepted is not None else 'EXCLUDED_UNTIL_SOURCE_KEY_VERIFIED',
            'sourceKeyPage':external['keySourcePage'] if external else row.get('sourceKeyPage'),
            'sourceKeyDocumentSha256':external['officialBookSha256'] if external else sha,
            'sourceKeyPath':external['officialBookPath'] if external else str(source),
            'bodyPageCount':scope['sourcePageCount'] if external else scope['sourcePageCount']-1,
            'separateKeyBodyEvidence':signature(external['bodyChecks']) if external else None,
            'sourceAnswers':accepted,'method':method,'keyEvidenceSha256':evidence,
            'exclusionReason':exclude,'teacherApproved':False,'questionBankWrites':0})
    return output


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    folder=store.child(state['runId']+'/pdf-on-tarama/key-cohort')
    rows=source_keys(folder)
    report={'status':'PASS','scope':'SOURCE_BOUND_DIAGNOSTIC_KEY_AND_SCOPE_VALIDATION','documents':len(rows),
        'states':dict(Counter(r['status'] for r in rows)),'verifiedAnswers':sum(len(r['sourceAnswers'] or []) for r in rows),
        'cohortSha256':digest(folder/'cohort-report.json'),'toolSha256':digest(Path(__file__)),
        'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'results':rows}
    write_json(folder/'source-key-scope-report.json',report)
    print(json.dumps({k:v for k,v in report.items() if k!='results'}))


if __name__=='__main__':main()
