"""Resume new archive chapters, reading original answers before small imports.

One process owns this expansion. Local OCR is independent of native PDF text;
vision is used for a first missing key reading or body completeness only.
Every chunk has immutable source admission evidence and the existing atomic
import/catalog/live-acceptance pipeline. Original source files stay read-only.
"""
import argparse
import hashlib
import json
import subprocess
import sys
import time
import re
from collections import defaultdict
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_genisletilmis_kabul import vision,complete
from mebi_pratik2_govde_model_pilotu import PROMPT
from mebi_pratik2_cevap_kurtarma import ocr,CELL,step_token
from mebi_pratik2_konu_basligi import normalize
from mebi_pratik2_uc_adim_kirpim import TEXT_SUBJECTS,page_graphics
import mebi_pratik2_uc_adim_kabul as key_reader
from yks_birlestirme import write_json,process_lock
from mebi_pratik2_pdf_tekrar_kapisi import current_decisions,skip_pdf

OUT=BASE/'curated-chapter-expansion'


def agrees_numbered_row(text,expected):
    matches=CELL.findall(text)
    values={str(int(n)):a for n,a in matches}
    return bool(values) and len(matches)==len(values) and values==expected


def source_key(group,pdf,discovery,module):
    folder=OUT/'independent-keys';folder.mkdir(exist_ok=True)
    target=folder/(group['groupId']+'.json');sha=group['keyImageSha256']
    if hashlib.sha256((BASE/group['keyImage']).read_bytes()).hexdigest()!=sha:raise ValueError('New source key image changed')
    if target.exists():
        result=json.loads(target.read_text(encoding='utf8'))
        if result['imageSha256']!=sha:raise ValueError('Expansion key receipt changed')
        return result
    # Successful earlier readings are reused only for the identical key image.
    old_attempt=False
    for prior in [BASE/'three-step-acceptance/key-readings'/(group['groupId']+'.json'),
                  BASE/'bounded-answer-recovery/alternative-key-readings'/(group['groupId']+'-recovery.json')]:
        if not prior.exists():continue
        old=json.loads(prior.read_text(encoding='utf8'));old_attempt=True
        if old.get('imageSha256')==sha and old['status'] in ('AGREES','SOURCE_KEY_RECOVERED'):
            result={'status':'AGREES','imageSha256':sha,'method':'IDENTICAL_SOURCE_KEY_SUCCESSFUL_READING_REUSED','priorEvidence':str(prior.relative_to(BASE))}
            write_json(target,result);return result
    native=next(g for g in discovery['groups'] if g['chapter']==group['chapter'] and g['stepToken']==group['stepToken'])
    if native['status']!='NATIVE_CHAPTER_STEP_BINDING_CANDIDATE':raise ValueError('Native source group is not bound')
    printed=native['keyRows'][0];cells=native['keys']
    images=OUT/'alternative-ocr';images.mkdir(exist_ok=True)
    def read(box,name):
        return ocr(pdf,printed['page'],[box[0]-2,box[1]-2,box[2]+2,box[3]+2],images,name)
    h=printed['chapterBBox'];header_id=hashlib.sha256(json.dumps([group['sourceSha256'],printed['page'],h]).encode()).hexdigest()[:24]
    heading=read(h,header_id+'-chapter');label=read(printed['stepBBox'],group['groupId']+'-step')
    box=[min(k['bbox'][0] for k in cells),min(k['bbox'][1] for k in cells),max(k['bbox'][2] for k in cells),max(k['bbox'][3] for k in cells)]
    row=read(box,group['groupId']+'-row')
    agreed=(normalize(heading.get('text',''))==normalize(group['chapter']) and step_token(label.get('text',''))==group['stepToken']
        and agrees_numbered_row(row.get('text',''),group['answers']))
    result={'status':'AGREES' if agreed else 'REVIEW_REQUIRED','imageSha256':sha,
        'method':'INDEPENDENT_ORIGINAL_PIXEL_TESSERACT_CHAPTER_STEP_AND_NUMBERED_ANSWERS',
        'heading':heading,'step':label,'numberedAnswers':row,'teacherApproved':False}
    if not agreed and not old_attempt:
        # First vision key reading, not repetition of a failed prompt.
        key_reader.OUT=OUT/'first-vision-key'
        alternative=key_reader.read_key(module,group)
        if alternative['status']=='AGREES':result={**alternative,'ocrAttemptRetained':result}
        else:result['firstVisionAttempt']=alternative
    write_json(target,result);return result


def compiled_key(group,pdf,discovery,module):
    folder=OUT/'independent-keys';folder.mkdir(exist_ok=True);target=folder/(group['groupId']+'.json')
    sha=group['keyImageSha256']
    if hashlib.sha256((BASE/group['keyImage']).read_bytes()).hexdigest()!=sha:raise ValueError('Compiled source key image changed')
    if target.exists():
        result=json.loads(target.read_text(encoding='utf8'))
        if result['imageSha256']!=sha:raise ValueError('Compiled key receipt changed')
        return result
    prior=BASE/'compiled-tarama-acceptance/key-readings'/(group['groupId']+'.json')
    old=json.loads(prior.read_text(encoding='utf8')) if prior.exists() else None
    if old and old['imageSha256']==sha and old['status']=='AGREES':
        result={'status':'AGREES','imageSha256':sha,'method':'IDENTICAL_PRINTED_TEST_KEY_READING_REUSED','priorEvidence':str(prior.relative_to(BASE))}
        write_json(target,result);return result
    native=next(g for g in discovery['groups'] if g['testNumber']==group['testNumber'])
    if native['status']!='NATIVE_PRINTED_TEST_BINDING_CANDIDATE':raise ValueError('Printed test binding is not proved')
    cells=native['keys'];printed=cells[0]['printedTestHeading'];page=cells[0]['page']
    images=OUT/'alternative-ocr';images.mkdir(exist_ok=True)
    box=printed['bbox'];heading=ocr(pdf,page,[box[0]-2,box[1]-2,box[2]+2,box[3]+2],images,group['groupId']+'-test')
    box=[min(k['bbox'][0] for k in cells),min(k['bbox'][1] for k in cells),max(k['bbox'][2] for k in cells),max(k['bbox'][3] for k in cells)]
    row=ocr(pdf,page,[box[0]-2,box[1]-2,box[2]+2,box[3]+2],images,group['groupId']+'-row')
    numbers=re.findall(r'\d+',heading.get('text',''))
    agreed=(numbers==[str(group['testNumber'])] and 'tarama' in normalize(heading.get('text','')) and agrees_numbered_row(row.get('text',''),group['answers']))
    result={'status':'AGREES' if agreed else 'REVIEW_REQUIRED','imageSha256':sha,
        'method':'INDEPENDENT_TESSERACT_PRINTED_TEST_IDENTITY_AND_NUMBERED_KEY','heading':heading,'numberedAnswers':row}
    if not agreed and old is None:
        from mebi_pratik2_tarama_kitap_kabul import SCHEMA
        try:
            value,hit=module.ask('Transcribe the printed test answer key. Do not solve any question. Return the printed TARAMA TESTI number and every numbered answer letter. Include all rows. Set uncertainty true if any identity or answer is unclear.',
                image=BASE/group['keyImage'],schema=SCHEMA,model='qwen3.5:9b',max_output_tokens=1500)
            answers={str(int(k)):v.strip().upper() for k,v in value.get('answers',{}).items()}
            agreed=value.get('testNumber')==group['testNumber'] and answers==group['answers'] and value.get('uncertainty') is False
            result={'status':'AGREES' if agreed else 'REVIEW_REQUIRED','imageSha256':sha,'reading':value,'cacheHit':hit,'ocrAttemptRetained':result}
        except Exception as error:result['firstVisionErrorType']=type(error).__name__
    write_json(target,result);return result


def body_read(row,pdf,module,allow_model=True,group=None):
    path=BASE/row['image'];sha=hashlib.sha256(path.read_bytes()).hexdigest()
    if sha!=row['imageSha256']:raise ValueError('New chapter body image changed')
    if row.get('nativeBodyProof',{}).get('status')=='FULL_NATIVE_TEXT_NO_SHARED_CONTEXT_OR_GRAPHICS' and row['subject'] in TEXT_SUBJECTS and not page_graphics(pdf[row['bodyPage']-1]):
        return {'status':'DETERMINISTIC_NATIVE_BODY_PROVED','imageSha256':sha,
            'basis':row['nativeBodyProof'],'pageGraphics':False,'sourcePixelsChanged':False}
    for folder in [OUT/'body-readings',BASE/'single-test-crops/body-model-review',BASE/'expanded-chapter-evidence/body-readings',
                   BASE/'three-step-acceptance/body-readings',BASE/'bounded-answer-recovery/body-readings',BASE/'all-source-evidence/body-readings']:
        receipt=folder/(row['code']+'.json')
        if receipt.exists():
            value=json.loads(receipt.read_text(encoding='utf8'))
            if value.get('imageSha256')!=sha:
                if row.get('newLayoutEvidence'):continue
                raise ValueError('Previous body receipt differs; explicit new evidence needed')
            from mebi_pratik2_hizli_yol import STATUS,valid_receipt
            if value.get('status')==STATUS and not valid_receipt(value,row):raise ValueError('Cached profile body proof differs')
            return value
    from mebi_pratik2_hizli_yol import prove as fast_prove,STATUS,valid_receipt
    result=fast_prove(pdf,row,path,group=group)
    if result:
        if result['status']==STATUS and not valid_receipt(result,row):raise ValueError('Invalid independent profile proof')
        folder=OUT/'body-readings';folder.mkdir(exist_ok=True)
        write_json(folder/(row['code']+'.json'),result);return result
    if not allow_model:return {'status':'PROFILE_EXCEPTION_REQUIRES_VISUAL_REVIEW','imageSha256':sha,'deferredByFastPhase':True}
    folder=OUT/'body-readings';folder.mkdir(exist_ok=True)
    try:
        reading,hit=module.ask(PROMPT,image=path,as_json=True,model='qwen3.5:9b',max_output_tokens=256)
        result={'status':'MODEL_NO_VISIBLE_ISSUE' if complete(reading) else 'REVIEW_REQUIRED','imageSha256':sha,'reading':reading,'cacheHit':hit}
    except Exception as error:result={'status':'REVIEW_REQUIRED','imageSha256':sha,'errorType':type(error).__name__}
    write_json(folder/(row['code']+'.json'),result);return result


def run(chunk_size=200,publish=False,limit=None,first_batch=7):
    if not 1<=chunk_size<=500:raise ValueError('Bounded admission chunks required')
    package_path=OUT/'chapter-packages.json';package=json.loads(package_path.read_text(encoding='utf8'))
    calibration=json.loads((BASE/'expanded-chapter-evidence/negative-calibration-v2/report.json').read_text(encoding='utf8'))
    if calibration['status']!='PASS':raise ValueError('Body completeness calibration must pass')
    module=vision();groups={g['groupId']:g for g in package['keyGroups']}
    rows=package['items'][:limit] if limit else package['items'];started=time.monotonic();done=0;last=started;bucket=-1
    source_shas={r['sourceSha256'] for r in rows}
    pdf_decisions=current_decisions(source_shas);skipped_total=0
    eligible_scope=sum(not skip_pdf(r['sourceSha256'],pdf_decisions) for r in rows);eligible_done=0
    write_json(OUT/'pdf-source-decisions.json',{'sources':[pdf_decisions[s] for s in sorted(source_shas)] if pdf_decisions else [],
        'comparisonUnit':'PDF_DOCUMENT_ONLY','questionComparisons':0})
    keys={};opened={};discoveries={};accepted_total=review_total=0
    try:
        for chunk_index,offset in enumerate(range(0,len(rows),chunk_size),1):
            folder=OUT/f'part-{chunk_index:03}';folder.mkdir(exist_ok=True)
            manifest=folder/'source-pixel-acceptance.json';chunk=rows[offset:offset+chunk_size]
            if manifest.exists():
                report=json.loads(manifest.read_text(encoding='utf8'))
                if report.get('inputCodes')!=[r['code'] for r in chunk]:raise ValueError('Existing chunk identity differs')
                accepted_total+=report['acceptedCount'];review_total+=report['reviewCount'];done+=len(chunk)
                skipped_total+=report.get('sourcePdfSkipCandidateCount',0)
                eligible_done+=sum(not skip_pdf(r['sourceSha256'],pdf_decisions) for r in chunk)
            else:
                accepted=[];review=[];eligible=[r for r in chunk if not skip_pdf(r['sourceSha256'],pdf_decisions)]
                skipped_sources=sorted({r['sourceSha256'] for r in chunk if skip_pdf(r['sourceSha256'],pdf_decisions)})
                skipped_count=len(chunk)-len(eligible);done+=skipped_count;skipped_total+=skipped_count
                for row in eligible:
                    sha=row['sourceSha256']
                    if sha not in opened:
                        source=(SOURCE/row['relativePath']).resolve()
                        if not source.is_relative_to(SOURCE):raise ValueError('Archive expansion leaves source root')
                        with source.open('rb') as stream:
                            if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Original source changed')
                        opened[sha]=pymupdf.open(source)
                        if groups[row['groupId']].get('keyIdentityType'):discoveries[sha]={}
                        else:
                            directory='three-step-discovery-v3' if groups[row['groupId']].get('stepToken') else 'compiled-tarama-discovery'
                            discoveries[sha]=json.loads((BASE/directory/(sha+'.json')).read_text(encoding='utf8'))
                    group_id=row['groupId']
                    if group_id not in keys:
                        if groups[group_id].get('keyIdentityType'):
                            from mebi_pratik2_dort_dortluk_anahtar import read_key
                            keys[group_id]=read_key(groups[group_id],opened[sha],module,OUT)
                        else:
                            reader=source_key if groups[group_id].get('stepToken') else compiled_key
                            keys[group_id]=reader(groups[group_id],opened[sha],discoveries[sha],module)
                    key=keys[group_id];reasons=[];body=None
                    if key['status']!='AGREES':reasons.append('INDEPENDENT_SOURCE_KEY_READING_UNRESOLVED')
                    elif row['answer']!=groups[group_id]['answers'].get(str(row['printedNumber'])):raise ValueError('Printed number does not bind to the answer')
                    else:
                        body=body_read(row,opened[sha],module,group=groups[group_id])
                        from mebi_pratik2_hizli_yol import COMPLETE_STATUSES
                        if body['status'] not in COMPLETE_STATUSES:reasons.append('BODY_COMPLETENESS_NOT_CONFIRMED')
                    evidence={**row,'keySecondReading':key,'bodyModelReview':body,'teacherApproved':False}
                    if reasons:review.append({**evidence,'status':'REVIEW_REQUIRED','reasons':reasons,'studentVisible':False})
                    else:
                        if evidence.get('reasons'):evidence['priorReviewReasons']=evidence.pop('reasons')
                        accepted.append({**evidence,'status':'SOURCE_VERIFIED_READY_FOR_INSERT_ONLY','productionImportAllowed':True,
                            'acceptanceBasis':('REVIEWED_ORIGINAL_NATIVE_QUESTION_TOPIC_INDEPENDENT_PRINTED_KEY_COMPLETE_ORIGINAL_BODY'
                                if row.get('topicEvidence',{}).get('basis')=='REVIEWED_ORIGINAL_NATIVE_QUESTION_TOPIC'
                                else 'REVIEWED_CONTROLLED_CHAPTER_IDENTITY_INDEPENDENT_PRINTED_KEY_COMPLETE_ORIGINAL_BODY')})
                    done+=1;eligible_done+=1;now=time.monotonic();current=10*done//max(1,len(rows))
                    if current>bucket or now-last>=300 or done==len(rows):
                        progress={'stage':'FULL_ARCHIVE_NEW_CHAPTER_ACCEPTANCE','completed':done,'total':len(rows),'percent':round(100*done/len(rows),2),
                            'accepted':accepted_total+len(accepted),'review':review_total+len(review),
                            'sourcePdfSkippedCandidates':skipped_total,'sourcePdfEligibleCandidates':eligible_scope,'sourcePdfEligibleCompleted':eligible_done,
                            'elapsedSeconds':round(now-started,1),'estimatedRemainingSeconds':None}
                        write_json(OUT/'progress-current.json',progress)
                        with (OUT/'progress.jsonl').open('a',encoding='utf8') as stream:stream.write(json.dumps(progress)+'\n')
                        print(json.dumps(progress),flush=True);last=now;bucket=current
                report={'status':'NEW_ARCHIVE_CHAPTER_SOURCE_ACCEPTANCE_COMPLETE','accepted':accepted,'reviewQueueAdditions':review,
                    'acceptedCount':len(accepted),'reviewCount':len(review),'inputCodes':[r['code'] for r in chunk],
                    'sourcePdfSkipCandidateCount':skipped_count,'skippedExistingSourcePdfs':skipped_sources,'questionComparisons':0,
                    'packageSha256':hashlib.sha256(package_path.read_bytes()).hexdigest(),'questionWrites':0,'teacherApprovalsCreated':0}
                write_json(manifest,report);accepted_total+=len(accepted);review_total+=len(review)
            if publish:
                batch=first_batch+chunk_index-1
                subprocess.run([sys.executable,'scripts/mebi_pratik2_arsiv_partisi.py','--acceptance',str(manifest.relative_to(BASE)),
                    '--batch-dir',f'verified-source-batch-{batch:03}','--after-batch',f'verified-source-batch-{batch-1:03}'],cwd=APP,check=True)
        write_json(OUT/'pass-result.json',{'status':'CURATED_CHAPTER_PASS_COMPLETE_NOT_FULL_ARCHIVE','candidateBodies':len(rows),
            'acceptedSourceCandidates':accepted_total,'reviewCandidates':review_total,'allPrintedQuestionsExtracted':False,
            'sourcePdfSkippedCandidates':skipped_total,'questionComparisons':0,
            'questionComparisonScope':'CURRENT_PDF_POLICY_RUN_ONLY','previousAcceptedReceiptsPreserved':True,
            'elapsedSeconds':round(time.monotonic()-started,1),'publishedThroughExistingGuardedPipeline':publish})
        write_json(OUT/'progress-current.json',{'stage':'SOURCE_PDF_POLICY_PASS_COMPLETE','completed':len(rows),'total':len(rows),'percent':100.0,
            'accepted':accepted_total,'review':review_total,'sourcePdfSkippedCandidates':skipped_total,
            'elapsedSeconds':round(time.monotonic()-started,1),'estimatedRemainingSeconds':None})
    finally:
        for pdf in opened.values():pdf.close()


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--chunk-size',type=int,default=200);p.add_argument('--publish',action='store_true');p.add_argument('--limit',type=int)
    p.add_argument('--package-dir',default='curated-chapter-expansion');p.add_argument('--first-batch',type=int,default=7);p.add_argument('--wait-for')
    a=p.parse_args()
    from pathlib import Path
    if Path(a.package_dir).name!=a.package_dir or a.first_batch<7:raise ValueError('Unsafe expansion identity')
    OUT=BASE/a.package_dir
    with process_lock(BASE/'.jobs'/(a.package_dir+'.lock')):
        if a.wait_for:
            dependency=(BASE/a.wait_for).resolve()
            if not dependency.is_relative_to(BASE):raise ValueError('Unsafe dependency path')
            last=0
            while not dependency.exists():
                now=time.monotonic()
                if not last or now-last>=300:
                    print(json.dumps({'stage':'WAITING_FOR_PREVIOUS_EXPANSION','dependency':a.wait_for,'estimatedRemainingSeconds':None}),flush=True);last=now
                time.sleep(5)
            previous=json.loads(dependency.read_text(encoding='utf8'))
            if not previous.get('publishedThroughExistingGuardedPipeline'):raise ValueError('Preceding expansion has not passed publication')
        run(a.chunk_size,a.publish,a.limit,a.first_batch)
