"""Revalidate prior completed source-to-bank links; never reimport old questions.

Current versions, saved source answer readings and actual image bytes must agree.
This reuses registered evidence, not a fresh semantic/teacher approval.
"""
from collections import Counter,defaultdict
import json
from pathlib import Path
import re

from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_pilot_kaynaklari import APP
from yks_soru_pilotu import live_bank
from yks_stages.database import Snapshot,connection
from pdf_source_scan import read_scan
from pdf_sb_evidence import printed_positions,printed_answers


def provider_answers(structure):
    answers=defaultdict(set)
    for group in structure:
        for unit in group['uniteler']:
            for outcome in unit['kazanimlar']:
                for number,value in outcome.get('sorular',{}).get('css',[]):
                    if type(number) is not int or type(value) is not int or not 1<=value<=5:raise ValueError('Invalid official provider answer entry')
                    answers['sb-'+str(number)].add('ABCDE'[value-1])
    return {code:next(iter(values)) if len(values)==1 else None for code,values in answers.items()}


def validate_link(link,question,image_proof,actual_image_sha,source_image_sha=None,provider_reading=None):
    evidence=link['evidence'];issues=[]
    if not question or not question.get('code') or not question.get('image'):return ['CURRENT_ACTIVE_YKS_QUESTION_MISSING']
    if link['question_code']!=question['code'] or evidence.get('sourceStamp')!=question['stamp']:issues.append('CURRENT_QUESTION_VERSION_DIFFERS')
    if evidence.get('image')!=question['image'] and (not source_image_sha or source_image_sha!=actual_image_sha):
        issues.append('SOURCE_AND_CURRENT_QUESTION_IMAGE_BYTES_NOT_PROVEN_EQUAL')
    if not image_proof or actual_image_sha!=image_proof.get('fileSha256'):issues.append('CURRENT_QUESTION_IMAGE_BYTES_DIFFER')
    # Numbered source duplicates/permuted editions need their own explicit proof;
    # this gate never guesses a letter from a canonical code or a list position.
    readings=[evidence.get(k) for k in ['answers','answersA','answersB']]
    if evidence.get('origin')=='PROVIDER_ID_PRINTED_SEQUENCE_AND_ANSWER':
        if not provider_reading or any(provider_reading.get(k)!=question['correct_answer'] for k in ['nativePrintedAnswer','currentOfficialApiAnswer']) or any(evidence.get(k)!=question['correct_answer'] for k in ['printedAnswer','apiAnswer']):
            issues.append('FRESH_PRINTED_KEY_OFFICIAL_PROVIDER_OR_CURRENT_ANSWER_DIFFERS')
        if not provider_reading or provider_reading.get('nativePrintedPage')!=link.get('page_number'):
            issues.append('FRESH_PRINTED_QUESTION_POSITION_DIFFERS')
    elif any(r!=[question['correct_answer']] for r in readings):issues.append('SAVED_PRINTED_SOURCE_READINGS_OR_CURRENT_ANSWER_DIFFER')
    if not link.get('printed_numbers') or any(type(n) is not int or n<1 for n in link['printed_numbers']):issues.append('PRINTED_QUESTION_NUMBER_EVIDENCE_MISSING')
    if not isinstance(link.get('page_number'),int) or link['page_number']<1:issues.append('SOURCE_PHYSICAL_PAGE_MISSING')
    return issues


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);folder=root/'existing-transfer-reuse';folder.mkdir(exist_ok=True)
    source=next(root/a['path'] for a in state['stages']['YKS-03:full']['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
    groups=[g for g in map(json.loads,source.read_text(encoding='utf-8').splitlines()) if g['processingCandidate']=='REUSE_TRANSFER_EVIDENCE_CANDIDATE']
    shas={g['sha256'] for g in groups}
    if not shas or any(len(s)!=64 or any(c not in '0123456789abcdef' for c in s) for s in shas):raise ValueError('Validated source identities required')
    bank,_=live_bank(APP);bank_sha=signature(bank);by_code={q['code']:q for q in bank}
    image_file=APP/'veri/pdf-source-registry/bank-image-fingerprints.json';image_sha=digest(image_file);images={r['code']:r for r in read_json(image_file)['images']}
    api_file=APP.parent/'veri-hatti/ogm-indirme/sb_yapi.json';api_sha=digest(api_file);api_answers=provider_answers(read_json(api_file))
    cmd,env=connection(APP);escaped=','.join("'"+s+"'" for s in sorted(shas))
    with Snapshot(cmd,env) as snapshot:
        linked=json.loads(snapshot.execute("SELECT coalesce(json_agg(x),'[]') FROM (SELECT source_sha256,locator_key,page_number,printed_numbers,question_code,status,evidence FROM learning_catalog.pdf_question_occurrences WHERE source_sha256 IN ("+escaped+") ORDER BY source_sha256,locator_key) x;"))
    occurrences=defaultdict(list)
    for link in linked:occurrences[link['source_sha256']].append(link)
    write_json(folder/'current-linked-source-snapshot.json',{'bankSnapshotSha256':bank_sha,'links':linked})
    actual_images={};source_images={};rows=[]
    with process_lock(folder/'.writer.lock'):
        for group in groups:
            sha=group['sha256'];location=group['canonicalCandidate'];path=Path(location['root'])/location['path'];prior=group['previousEvidence']
            if location['kind']!='FILE' or digest(path)!=sha:raise ValueError('Previously completed original source PDF changed')
            expected=prior['expectedQuestions'];items=occurrences[sha];checks=[];issues=[]
            if any(i['status']!='LINKED' for i in items):issues.append('CURRENT_PENDING_OR_UNLINKED_SOURCE_OCCURRENCES')
            current=[i for i in items if i['status']=='LINKED'];codes={i['question_code'] for i in current}
            printed={};positions={};provider_proof=None
            if any(i['evidence'].get('origin')=='PROVIDER_ID_PRINTED_SEQUENCE_AND_ANSWER' for i in current):
                scan=read_scan(sha);positions,duplicates=printed_positions(scan);printed,conflicts=printed_answers(path,scan)
                provider_proof={'nativePrintedQuestions':len(positions),'nativePrintedAnswers':len(printed),'duplicatePrintedNumbers':duplicates,
                    'printedAnswerConflicts':conflicts,'officialProviderFileSha256':api_sha,'nativePrintedKeySha256':signature(printed)}
                if duplicates or conflicts:issues.append('PROVIDER_SOURCE_PRINTED_NUMBERS_OR_ANSWERS_CONFLICT')
            if len(codes)!=expected:issues.append('CURRENT_DISTINCT_LINK_COUNT_DIFFERS_FROM_EXPECTED_SOURCE_QUESTIONS')
            for link in current:
                question=by_code.get(link['question_code']);image_digest=None
                if question:
                    image=(APP/'veri/resimler-pilot'/question['image']).resolve();allowed=(APP/'veri/resimler-pilot').resolve()
                    if not image.is_relative_to(allowed) or not image.is_file():raise ValueError('Current bank image is missing or unsafe')
                    if question['code'] not in actual_images:actual_images[question['code']]=digest(image)
                    image_digest=actual_images[question['code']]
                source_image_sha=None;source_reference=link['evidence'].get('image')
                if source_reference:
                    source_root=(APP.parent/'icerik').resolve();source_image=(source_root/source_reference).resolve()
                    if not source_image.is_relative_to(source_root):raise ValueError('Saved source image escapes original content directory')
                    if source_image.is_file():
                        if str(source_image) not in source_images:source_images[str(source_image)]=digest(source_image)
                        source_image_sha=source_images[str(source_image)]
                provider_reading=None
                if provider_proof:
                    numbers=link.get('printed_numbers') or [];number=numbers[0] if len(numbers)==1 else None
                    provider_reading={'nativePrintedAnswer':printed.get(number),'nativePrintedPage':positions.get(number),
                        'currentOfficialApiAnswer':api_answers.get(link['evidence'].get('sourceCode'))}
                differences=validate_link(link,question,images.get(link['question_code']),image_digest,source_image_sha,provider_reading)
                if not isinstance(link['page_number'],int) or not 1<=link['page_number']<=prior['pageCount']:differences.append('SOURCE_PHYSICAL_PAGE_OUTSIDE_DOCUMENT')
                checks.append({'questionCode':link['question_code'],'sourceLocator':link['locator_key'],'printedNumbers':link['printed_numbers'],
                    'physicalPage':link['page_number'],'status':'CURRENT_LINK_AND_SAVED_READINGS_AGREE' if not differences else 'REVIEW_REQUIRED',
                    'issues':differences,'questionStamp':question['stamp'] if question else None,'imageSha256':image_digest,
                    'savedSourceImageSha256':source_image_sha,'providerReading':provider_reading,'savedSourceEvidenceSha256':signature(link['evidence']),
                    'teacherApproved':False,'questionBankWrites':0})
            if any(c['issues'] for c in checks):issues.append('ONE_OR_MORE_CURRENT_LINK_PROOFS_REQUIRE_REVIEW')
            rows.append({'sourceSha256':sha,'sourcePath':str(path),'status':'CURRENT_EXISTING_TRANSFER_EVIDENCE_REVALIDATED' if not issues else 'EXISTING_TRANSFER_REVIEW_REQUIRED',
                'expectedQuestions':expected,'currentDistinctLinkedQuestions':len(codes),'issues':issues,'checks':checks,
                'providerPrintProof':provider_proof,'reuseAction':'KEEP_CANONICAL_IDS_DO_NOT_REIMPORT','freshSemanticApproval':False,'teacherApproved':False})
        after,_=live_bank(APP)
        if signature(after)!=bank_sha or digest(image_file)!=image_sha or digest(api_file)!=api_sha:raise ValueError('Current bank/image/provider evidence changed during existing-transfer validation')
        proof={'status':'PASS','scope':'PRIOR_COMPLETED_SOURCE_TRANSFER_CURRENT_VERSION_AND_SAVED_EVIDENCE_REVALIDATION_ONLY',
            'documents':len(rows),'states':dict(Counter(r['status'] for r in rows)),
            'currentExistingQuestionLinks':sum(len(r['checks']) for r in rows),
            'revalidatedExistingQuestionLinks':sum(len(r['checks']) for r in rows if r['status']=='CURRENT_EXISTING_TRANSFER_EVIDENCE_REVALIDATED'),
            'sourceGroupsSha256':digest(source),'bankSnapshotSha256':bank_sha,'bankImageIndexSha256':image_sha,
            'officialProviderFileSha256':api_sha,
            'currentLinkSnapshotSha256':signature(linked),'actualImagesHashed':len(actual_images),'toolSha256':digest(Path(__file__)),
            'newOcrCalls':0,'newModelCalls':0,'questionBankWrites':0,'sourceWrites':0,'freshSemanticApproval':False,'teacherApproved':False,'results':rows}
        write_json(folder/'report.json',proof)
    print({k:v for k,v in proof.items() if k!='results'})


if __name__=='__main__':main()
