"""Revalidate prior OGM exam-booklet links through their original raw contract.

Booklet images live in the original pipeline's ham/img, and canonical raw
records contain the answer evidence. They are not OGM test cards with three
cevaplar_A/B fields. Preserve corrections, grouped cards and all old IDs.
"""
from collections import Counter
import json
from pathlib import Path
import re

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP,plain
from yks_soru_pilotu import live_bank
from pdf_source_scan import read_evidence_scan

HAM=APP.parent/'veri-hatti/ogm-yks-cikmis/ham'


def booklet_identity(group,known):
    books={Path(alias['path']).stem for alias in group['occurrences']
        if Path(alias['root']).name=='yks-cikmis-sorular' and alias['path'].startswith('OGM Kitapciklari/')}
    if len(books)!=1 or next(iter(books)) not in known:raise ValueError('Unique registered original booklet identity required')
    return next(iter(books))


def printed_keys(doc,observed,known_headers):
    allowed={plain(h):h for h in known_headers};headers={};answers={};duplicates=[];subject=None
    for item in observed['pages']:
        if 'CEVAP ANAHTARI' not in plain(item['text']):continue
        page=doc[item['page']-1]
        for line in page.get_text().splitlines():
            normalized=plain(line)
            if normalized in allowed:
                subject=allowed[normalized];headers.setdefault(subject,[]).append(item['page']);continue
            match=re.fullmatch(r'\s*(\d{1,4})\.\s*([A-E])\s*',line)
            if not match or subject is None:continue
            number=int(match[1]);key=(subject,number)
            if key in answers:duplicates.append([subject,number])
            answers[key]={'answer':match[2],'physicalKeyPage':item['page']}
    return answers,headers,duplicates


def proof_issues(link,raw,question,source_image_sha,bank_image_sha,native,frozen):
    issues=[];e=link['evidence']
    if not raw or not question:return ['ORIGINAL_RAW_OR_CURRENT_ACTIVE_QUESTION_MISSING']
    if e.get('sourceStamp')!=question['stamp']:issues.append('CURRENT_QUESTION_VERSION_DIFFERS')
    if source_image_sha!=bank_image_sha:issues.append('ORIGINAL_AND_CURRENT_CANONICAL_IMAGE_BYTES_DIFFER')
    if len(link['printed_numbers'])!=1 or len(raw['cevaplar'])!=1:issues.append('GROUPED_MULTI_ANSWER_CARD_REQUIRES_ORIGINAL_GROUP_CONTRACT')
    if raw['cevaplar']!=[question['correct_answer']]:issues.append('ORIGINAL_OFFICIAL_ANSWER_RECORD_AND_CURRENT_CANONICAL_ANSWER_DIFFER')
    if not native or native.get('answer')!=question['correct_answer']:issues.append('CURRENT_PRINTED_KEY_AND_CANONICAL_ANSWER_DIFFER_OR_BLANK')
    if frozen!=question['correct_answer']:issues.append('FROZEN_BOOKLET_KEY_AND_CANONICAL_ANSWER_DIFFER')
    return issues


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);base=root/'all-prior-occurrences/report.json';baseline=read_json(base)
    if baseline['status']!='COMPLETE':raise ValueError('Complete current prior-occurrence audit required')
    bank,_=live_bank(APP);bank_sha=signature(bank)
    if bank_sha!=baseline['bankSnapshotSha256']:raise ValueError('Bank changed since prior occurrence audit')
    by_code={q['code']:q for q in bank};raw_path=HAM/'sorular_son.json';raw=read_json(raw_path);raw_by={r['id']:r for r in raw['sorular']}
    key_path=HAM/'eski/ck_anahtar.json';frozen=read_json(key_path);external={str(raw_path):digest(raw_path),str(key_path):digest(key_path)}
    groups_path=next(root/a['path'] for a in state['stages']['YKS-03:full']['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
    groups={g['sha256']:g for g in map(json.loads,groups_path.read_text(encoding='utf-8').splitlines())}
    folder=root/'booklet-prior-reuse';folder.mkdir(exist_ok=True);results=[];source_rows=[]
    with process_lock(folder/'.writer.lock'):
        for source in baseline['results']:
            file=Path(source['evidencePath'])
            if digest(file)!=source['evidenceSha256']:raise ValueError('Prior source occurrence evidence changed')
            checks=[c for c in read_json(file)['results'] if c['originalOccurrence']['evidence'].get('origin')=='EXACT_BOOKLET_REFERENCE']
            if not checks:continue
            sha=source['sourceSha256'];path=Path(source['sourcePath'])
            if digest(path)!=sha:raise ValueError('Actual source booklet PDF changed')
            # Cross-book copies retain the canonical code of another booklet.
            # Bind the physical source through its registered original alias,
            # never infer a booklet from that canonical question-code prefix.
            book=booklet_identity(groups[sha],frozen);scan=read_evidence_scan(sha,for_review=True)
            with pymupdf.open(path) as doc:native,headers,duplicates=printed_keys(doc,scan,frozen[book])
            source_rows.append({'sourceSha256':sha,'originalBooklet':book,'currentSourcePath':str(path),'keyHeaders':headers,'duplicateKeyNumbers':duplicates})
            for check in checks:
                link=check['originalOccurrence'];record=raw_by.get(check['sourceCode']);question=by_code.get(link['question_code'])
                copies=[c for c in record['kopyalar'] if c['kitap']==book and c['sayfa']==link['page_number'] and c['kitap_nolar']==link['printed_numbers']] if record else []
                source_img=HAM/copies[0]['gorsel'] if len(copies)==1 else None
                if source_img and not source_img.resolve().is_relative_to((HAM/'img').resolve()):raise ValueError('Booklet source image escapes its original ham/img root')
                source_sha=digest(source_img) if source_img and source_img.is_file() else None
                bank_img=APP/'veri/resimler-pilot'/question['image'] if question else None
                if bank_img and not bank_img.resolve().is_relative_to((APP/'veri/resimler-pilot').resolve()):raise ValueError('Canonical bank image escapes image root')
                bank_image_sha=digest(bank_img) if bank_img and bank_img.is_file() else None
                number=link['printed_numbers'][0] if len(link['printed_numbers'])==1 else None
                matches=[s for s in frozen[book] if record and plain(s)==plain(record['ders_ham'])]
                subject=matches[0] if len(matches)==1 else None
                reading=native.get((subject,number));prior=frozen[book].get(subject,{}).get(str(number))
                issues=proof_issues(link,record,question,source_sha,bank_image_sha,reading,prior)
                if len(copies)!=1:issues.append('ORIGINAL_BOOKLET_COPY_LOCATOR_NOT_UNIQUE')
                if subject is None:issues.append('PRINTED_SOURCE_DISCIPLINE_HEADER_NOT_IDENTIFIED')
                if duplicates:issues.append('SOURCE_BOOKLET_KEY_NUMBER_DUPLICATES')
                results.append({'sourceSha256':sha,'sourceCode':check['sourceCode'],'canonicalCode':link['question_code'],
                    'sourceLocator':link['locator_key'],'previousProofStatus':check['status'],
                    'status':'CURRENT_ORIGINAL_BOOKLET_IMAGE_OFFICIAL_RECORD_AND_PRINTED_KEY_AGREE' if not issues else 'PRESERVE_OLD_BOOKLET_QUESTION_AND_REVIEW_SOURCE_EXCEPTION',
                    'issues':issues,'originalBooklet':book,'physicalBodyPage':link['page_number'],'printedNumbers':link['printed_numbers'],
                    'currentCanonicalQuestion':question,'originalAnswers':record.get('cevaplar') if record else None,
                    'originalAnswerSources':record.get('cevap_kaynaklari') if record else None,
                    'originalAnswerEvidence':record.get('cevap_kanitlari') if record else None,'nativeKeyReading':reading,'frozenPrintedAnswer':prior,
                    'originalSourceImageSha256':source_sha,'currentBankImageSha256':bank_image_sha,
                    'intakeAction':'KEEP_EXISTING_CANONICAL_ID_DO_NOT_REIMPORT','newQuestionAccepted':False,'teacherApproved':False})
        after,_=live_bank(APP)
        if signature(after)!=bank_sha or any(digest(p)!=sha for p,sha in external.items()):raise ValueError('Booklet source or bank changed during original-contract reuse')
        report={'status':'PASS','scope':'ORIGINAL_BOOKLET_PRIOR_LINK_CONTRACT_REVALIDATION_ONLY','documents':len(source_rows),'questions':len(results),
            'states':dict(Counter(c['status'] for c in results)),'bankSnapshotSha256':bank_sha,'basePriorReportSha256':digest(base),
            'sourceBooklets':source_rows,'externalEvidenceFiles':external,'toolSha256':digest(Path(__file__)),
            'newModelCalls':0,'newOcrCalls':0,'newRenders':0,'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'results':results}
        write_json(folder/'report.json',report)
    print({k:v for k,v in report.items() if k not in ['results','externalEvidenceFiles','sourceBooklets']})


if __name__=='__main__':main()
