"""Reconcile every prior source occurrence, including partially imported books.

A completed-source-only query misses most of the bank. Existing canonical
links are never new questions; unresolved source keys and old pending work
remain explicit. No application tables, source files or answers are changed.
"""
import argparse
from collections import Counter
import json
from pathlib import Path

from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP
from yks_soru_pilotu import live_bank
from yks_stages.database import Snapshot,connection
from yks_mevcut_aktarim_kontrol import provider_answers,validate_link
from yks_incelenmis_aktarim_kontrol import source_card
from pdf_source_scan import read_scan
from pdf_sb_evidence import printed_positions,printed_answers

VERSION='all-prior-occurrences-current-version-v1'


def compatible_identity(prior,current):
    # VERSION binds validation semantics. Extending a path allowlist, progress
    # output or resume bookkeeping must not rehash 80,000 unchanged images.
    # Any change to evidence/answer acceptance rules must bump VERSION.
    def stable(value):
        value=dict(value);readers=dict(value.get('readerFiles',{}));readers.pop(str(Path(__file__)),None)
        value['readerFiles']=readers;return value
    return bool(prior) and stable(prior)==stable(current)


def intake_action(link,question):
    if link['status']=='LINKED':
        return 'KEEP_EXISTING_CANONICAL_ID_DO_NOT_REIMPORT' if question else 'OLD_LINK_INACTIVE_OR_NON_YKS_KEEP_HISTORY_REVIEW_ONLY'
    if link['status']=='EXCLUDED':return 'KEEP_PRIOR_EXCLUSION_NO_NEW_INTAKE'
    return 'RESUME_ORIGINAL_PENDING_LOCATOR_NO_SECOND_QUESTION_QUEUE'


def evidence_path(reference):
    part=reference.split('#')[0].replace('\\','/')
    allowed=[APP/'veri/pdf-source-registry',APP/'veri/content-labels/pdf-extraction',APP.parent/'veri-hatti/ogm-sorular/kayit',
        APP.parent/'veri-hatti/ogm-yks-cikmis/ham',APP.parent/'veri-hatti/ogm-indirme']
    path=((APP/part) if part.startswith('veri/') else (APP.parent/part)).resolve()
    if not any(path.is_relative_to(p.resolve()) for p in allowed) or path.suffix!='.json':raise ValueError('Prior source package outside registered evidence roots')
    return path


def source_image(link):
    value=link['evidence'].get('image')
    if not value:return None
    path=((APP/value) if value.startswith('veri/') else (APP.parent/'icerik'/value)).resolve()
    allowed=[(APP/'veri/pdf-source-registry').resolve(),(APP/'veri/content-labels/pdf-extraction').resolve(),(APP.parent/'icerik').resolve()]
    if not any(path.is_relative_to(p) for p in allowed):raise ValueError('Original source image escapes evidence roots')
    return path if path.is_file() else None


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--limit',type=int);args=parser.parse_args()
    if args.limit is not None and args.limit<1:parser.error('Positive source limit required')
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);folder=root/'all-prior-occurrences';folder.mkdir(exist_ok=True)
    inventory=next(root/a['path'] for a in state['stages']['YKS-03:full']['artifacts'] if a['path'].endswith('pdf-groups.jsonl'))
    inventory_sha=digest(inventory);groups={g['sha256']:g for g in map(json.loads,inventory.read_text(encoding='utf-8').splitlines())}
    bank,ocr=live_bank(APP);bank_sha=signature(bank);by_code={q['code']:q for q in bank}
    image_file=APP/'veri/pdf-source-registry/bank-image-fingerprints.json';image_index_sha=digest(image_file)
    images={r['code']:r for r in read_json(image_file)['images']}
    text_file=APP/'veri/content-labels/source-inventory.json';text_index_sha=digest(text_file)
    texts={r['code']:r.get('original',{}).get('text','') for r in read_json(text_file)['questions']}
    for code,text in ocr.items():
        if sum(c.isalpha() for c in text)>sum(c.isalpha() for c in texts.get(code,'')):texts[code]=text
    api_file=APP.parent/'veri-hatti/ogm-indirme/sb_yapi.json';api_sha=digest(api_file);api_answers=provider_answers(read_json(api_file))
    known={};base=root/'existing-transfer-reuse/report.json';reviewed=root/'reviewed-transfer-reuse/report.json'
    if base.is_file():
        r=read_json(base);base_sha=digest(base)
        if r['bankSnapshotSha256']!=bank_sha:raise ValueError('Completed source proof belongs to another current bank')
        for row in r['results']:
            for check in row['checks']:
                if not check['issues']:known[row['sourceSha256'],check['sourceLocator']]={'proofFile':str(base),'proofSha256':base_sha,'check':check}
    if reviewed.is_file():
        r=read_json(reviewed);reviewed_sha=digest(reviewed)
        if r['bankSnapshotSha256']!=bank_sha:raise ValueError('Reviewed source proof belongs to another current bank')
        for row in r['results']:
            for check in row['checks']:
                if not check['issues']:known[row['sourceSha256'],check['sourceLocator']]={'proofFile':str(reviewed),'proofSha256':reviewed_sha,'check':check}
    # Keep known booklet/raw/slide references intact. These are previous review
    # packages, not a replacement set of questions for the application.
    external={str(api_file):api_sha};actual_images={};actual_source_images={};results=[];new=0;cached=0
    readers={str(p):digest(p) for p in [Path(__file__),APP/'scripts/yks_mevcut_aktarim_kontrol.py',APP/'scripts/yks_incelenmis_aktarim_kontrol.py',APP/'scripts/pdf_slide_compare.py',APP/'scripts/pdf_sb_evidence.py']}
    cmd,env=connection(APP)
    with process_lock(folder/'.writer.lock'),Snapshot(cmd,env) as snapshot:
        source_ids=json.loads(snapshot.execute("SELECT json_agg(source_sha256 ORDER BY source_sha256) FROM (SELECT DISTINCT source_sha256 FROM learning_catalog.pdf_question_occurrences) s;"))
        registered=[sha for sha in source_ids if sha in groups];unregistered=[sha for sha in source_ids if sha not in groups]
        def save(status):
            write_json(folder/'report.json',{'status':status,'scope':'ALL_PRIOR_SOURCE_OCCURRENCES_NOT_FULL_DOCUMENT_OR_NEW_QUESTION_ACCEPTANCE',
                'sourceDocuments':len(registered),'completed':len(results),'pending':len(registered)-len(results),'unregisteredSourceHashes':unregistered,
                'sourceOccurrenceStates':dict(sum((Counter(r['sourceOccurrenceStates']) for r in results),Counter())),
                'proofStates':dict(sum((Counter(r['proofStates']) for r in results),Counter())),
                'intakeActions':dict(sum((Counter(r['intakeActions']) for r in results),Counter())),
                'occurrences':sum(r['occurrences'] for r in results),'newSourcesThisPass':new,'cachedSourcesThisPass':cached,
                'sourceGroupsSha256':inventory_sha,'bankSnapshotSha256':bank_sha,'bankImageIndexSha256':image_index_sha,
                'sourceInventorySha256':text_index_sha,'officialProviderFileSha256':api_sha,'readerFiles':readers,
                'freshBankImageFilesHashed':len(actual_images),'freshSourceImageFilesHashed':len(actual_source_images),
                'newModelCalls':0,'newOcrCalls':0,'newRenders':0,'questionBankWrites':0,'sourceWrites':0,
                'sourceFullyAccepted':False,'teacherApproved':False,'externalEvidenceFiles':external,'results':results})
        try:
            save('RUNNING')
            for sha in registered:
                links=json.loads(snapshot.execute("SELECT coalesce(json_agg(x),'[]') FROM (SELECT source_sha256,locator_key,page_number,printed_numbers,question_code,status,evidence FROM learning_catalog.pdf_question_occurrences WHERE source_sha256='"+sha+"' ORDER BY locator_key) x;"))
                group=groups[sha];loc=group['canonicalCandidate'];source=Path(loc['root'])/loc['path'];stat=source.stat()
                if loc['kind']!='FILE':raise ValueError('Prior imported source must have a registered physical original')
                if (stat.st_size,stat.st_mtime_ns)!=(loc['bytes'],loc['mtimeNs']) and digest(source)!=sha:raise ValueError('Prior source PDF changed')
                current=[by_code[l['question_code']] for l in links if l['question_code'] in by_code]
                identity={'sourceSha256':sha,'sourceLinkSnapshotSha256':signature(links),'currentCanonicalQuestionsSha256':signature(current),
                    'bankImageIndexSha256':image_index_sha,'sourceInventorySha256':text_index_sha,'officialProviderFileSha256':api_sha,
                    'version':VERSION,'readerFiles':readers,'knownProofs':{k[1]:v['proofSha256'] for k,v in known.items() if k[0]==sha}}
                file=folder/(sha+'.json');prior=read_json(file) if file.is_file() else {}
                if compatible_identity(prior.get('identity'),identity):
                    result={**prior['summary'],'evidenceSha256':digest(file)};external.update(prior.get('externalEvidenceFiles',{}));cached+=1
                    # All source and current bank image bytes were frozen by the
                    # original source proof. Changed file versions reopen it.
                    for item in prior['imageFileVersions']:
                        s=Path(item['path']).stat()
                        if [s.st_size,s.st_mtime_ns]!=item['version']:raise ValueError('Cached prior image version changed; reopen source '+sha)
                    results.append(result);continue
                if args.limit is not None and new>=args.limit:break
                positions={};printed={};provider=None;checks=[];versions={};source_external={}
                if any(l['evidence'].get('origin')=='PROVIDER_ID_PRINTED_SEQUENCE_AND_ANSWER' and (sha,l['locator_key']) not in known for l in links):
                    scan=read_scan(sha);positions,duplicates=printed_positions(scan);printed,conflicts=printed_answers(source,scan)
                    provider={'duplicatePrintedNumbers':duplicates,'printedAnswerConflicts':conflicts,'printedAnswersSha256':signature(printed)}
                for link in links:
                    q=by_code.get(link['question_code']);e=link['evidence'];action=intake_action(link,q);issues=[];proof=None
                    ref=e.get('reference')
                    reference_issue=None
                    if ref:
                        try:path=evidence_path(ref)
                        except ValueError:reference_issue='PRIOR_REFERENCE_HAS_NO_REGISTERED_LOCAL_PACKAGE_CONTRACT';path=None
                        if path is not None and path.is_file():
                            if str(path) not in external:external[str(path)]=digest(path)
                            source_external[str(path)]=external[str(path)]
                    if link['status']!='LINKED':
                        status='PRIOR_EXCLUDED_OCCURRENCE_PRESERVED' if link['status']=='EXCLUDED' else 'ORIGINAL_PENDING_OCCURRENCE_PRESERVED_NOT_ADMITTED'
                    elif q is None:status='OLD_LINK_INACTIVE_OR_OUTSIDE_ACTIVE_YKS_REVIEW_REQUIRED'
                    else:
                        image=(APP/'veri/resimler-pilot'/q['image']).resolve();image_root=(APP/'veri/resimler-pilot').resolve()
                        if not image.is_relative_to(image_root) or not image.is_file():raise ValueError('Canonical bank image missing/unsafe')
                        image_stat=image.stat();expected=f"{q['stamp']}:{image_stat.st_size}:{image_stat.st_mtime_ns}"
                        if images.get(q['code'],{}).get('stamp')!=expected:raise ValueError('Canonical image index stale: '+q['code'])
                        if q['code'] not in actual_images:actual_images[q['code']]=digest(image)
                        actual=actual_images[q['code']];versions[str(image)]=[image_stat.st_size,image_stat.st_mtime_ns]
                        try:img=source_image(link);image_contract_issue=None
                        except ValueError:img=None;image_contract_issue='PRIOR_SOURCE_IMAGE_HAS_NO_REGISTERED_LOCAL_EVIDENCE_CONTRACT'
                        source_img_sha=None
                        if img:
                            if str(img) not in actual_source_images:actual_source_images[str(img)]=digest(img)
                            source_img_sha=actual_source_images[str(img)];s=img.stat();versions[str(img)]=[s.st_size,s.st_mtime_ns]
                        saved=known.get((sha,link['locator_key']))
                        if (saved and saved['check']['questionStamp']==q['stamp'] and saved['check']['imageSha256']==actual
                                and saved['check'].get('savedSourceEvidenceSha256')==signature(e)
                                and saved['check'].get('savedSourceImageSha256')==source_img_sha):
                            status='EXISTING_VALID_SOURCE_PROOF_REUSED';proof={k:saved[k] for k in ['proofFile','proofSha256']}
                        elif e.get('origin') in ['REVIEWED_RAW_SOURCE_BANK_LINK','REVIEWED_SOURCE_BANK_LINK']:
                            try:
                                from pdf_slide_compare import validate_link as validate_review
                                package,pack,card,_=source_card(link)
                                validate_review(e['comparisonEvidence'],card,package,{**q,'source_stamp':q['stamp']},texts[q['code']],actual)
                                status='FROZEN_REVIEWED_SOURCE_CANONICAL_LINK_REVALIDATED';proof={'comparisonEvidenceSha256':signature(e['comparisonEvidence'])}
                            except (ValueError,KeyError,StopIteration,FileNotFoundError) as exc:
                                status='CURRENT_EXISTING_LINK_REQUIRES_SOURCE_PROOF_REVIEW';issues=[str(exc)]
                        else:
                            provider_reading=None
                            if e.get('origin')=='PROVIDER_ID_PRINTED_SEQUENCE_AND_ANSWER':
                                numbers=link['printed_numbers'];number=numbers[0] if len(numbers)==1 else None
                                provider_reading={'nativePrintedAnswer':printed.get(number),'nativePrintedPage':positions.get(number),'currentOfficialApiAnswer':api_answers.get(e.get('sourceCode'))}
                            issues=validate_link(link,q,images.get(q['code']),actual,source_img_sha,provider_reading)
                            if provider_reading and (provider['duplicatePrintedNumbers'] or provider['printedAnswerConflicts']):issues.append('PROVIDER_SOURCE_KEY_OR_POSITION_CONFLICT')
                            status='CURRENT_VERSION_IMAGE_AND_SAVED_SOURCE_READINGS_REVALIDATED' if not issues else 'CURRENT_EXISTING_LINK_REQUIRES_SOURCE_PROOF_REVIEW'
                        checks.append({'sourceSha256':sha,'sourceLocator':link['locator_key'],'sourceCode':e.get('sourceCode'),
                            'canonicalCode':q['code'],'status':status,'intakeAction':action,'issues':issues,'reusedProof':proof,
                            'currentQuestionStamp':q['stamp'],'currentImageSha256':actual,'originalSourceImageSha256':source_img_sha,
                            'referenceContractIssue':reference_issue,'sourceImageContractIssue':image_contract_issue,
                            'originalOccurrence':link,'teacherApproved':False});continue
                    checks.append({'sourceSha256':sha,'sourceLocator':link['locator_key'],'sourceCode':e.get('sourceCode'),
                        'canonicalCode':link['question_code'],'status':status,'intakeAction':action,'issues':issues,
                        'referenceContractIssue':reference_issue,'originalOccurrence':link,'teacherApproved':False})
                result={'sourceSha256':sha,'sourcePath':str(source),'status':'PRIOR_OCCURRENCES_RECONCILED_DOCUMENT_ACCEPTANCE_STILL_SEPARATE',
                    'occurrences':len(checks),'sourceOccurrenceStates':dict(Counter(c['originalOccurrence']['status'] for c in checks)),
                    'proofStates':dict(Counter(c['status'] for c in checks)),'intakeActions':dict(Counter(c['intakeAction'] for c in checks)),
                    'evidencePath':str(file),'sourceFullyAccepted':False,'teacherApproved':False}
                write_json(file,{'identity':identity,'summary':result,'imageFileVersions':[{'path':p,'version':v} for p,v in versions.items()],
                    'providerPrintProof':provider,'externalEvidenceFiles':source_external,'results':checks})
                result['evidenceSha256']=digest(file);results.append(result);new+=1
                if len(results)%25==0:save('RUNNING');print('Prior source occurrences',len(results),'/',len(registered),sum(r['occurrences'] for r in results),flush=True)
            after,_=live_bank(APP)
            if signature(after)!=bank_sha or digest(inventory)!=inventory_sha or digest(image_file)!=image_index_sha or digest(text_file)!=text_index_sha or digest(api_file)!=api_sha:
                raise ValueError('Source or bank baseline changed during prior-source reconciliation')
            save('COMPLETE' if len(results)==len(registered) else 'PARTIAL')
        except BaseException:save('INTERRUPTED');raise
    final=read_json(folder/'report.json');print({k:v for k,v in final.items() if k not in ['results','readerFiles','externalEvidenceFiles']})


if __name__=='__main__':main()
