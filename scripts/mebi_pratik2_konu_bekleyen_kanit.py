"""Finish answer/body evidence for prepared questions whose fine topic is open.

This is an evidence queue, not publication. Verified answers never manufacture
a fine-topic label or teacher approval. Frozen publisher packages have priority
and are excluded here; the worker waits for their guarded publication chain.
"""
import argparse
import hashlib
import json
import time
from collections import Counter
import pymupdf
from mebi_pratik2_tam_pdf_tarama import BASE,SOURCE
from mebi_pratik2_genisletilmis_kabul import vision
from mebi_pratik2_dort_dortluk_anahtar import read_key
import mebi_pratik2_arsiv_kabul as admission
from yks_birlestirme import write_json,process_lock
from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf

OUT=BASE/'all-source-evidence'
DIRECTORIES=['three-step-all-bodies-v2','compiled-tarama-crops','four-square-crops','three-step-mock-crops',
             'word-boundary-crops','four-square-header-crops','three-step-mock-additional-crops']


class NoModelCalls:
    def ask(self,*args,**kwargs):raise RuntimeError('Fast triage cannot call a model')


def reuse_evidence(previous,fast):
    # Actual completed/failed readings survive. Only an explicit fast-phase
    # deferral is eligible for the later model pass.
    return bool(previous) and (fast or not previous.get('deferredByFastPhase'))


def select_rows(rows,reserved):
    # The caller orders source layouts from earlier to corrected evidence.
    # Stable question codes survive; this is never a merge of question IDs.
    latest={row['code']:row for row in rows if row.get('image') and row.get('keyImage')}
    return [row for code,row in latest.items() if code not in reserved]


def prepare():
    OUT.mkdir(exist_ok=True);target=OUT/'chapter-packages.json'
    if target.exists():return json.loads(target.read_text(encoding='utf8'))
    reserved=set();groups={};rows=[];inputs={}
    for package in BASE.glob('*/chapter-packages.json'):
        reserved.update(r['code'] for r in json.loads(package.read_text(encoding='utf8')).get('items',[]))
    for manifest in BASE.rglob('source-pixel-acceptance.json'):
        reserved.update(r['code'] for r in json.loads(manifest.read_text(encoding='utf8')).get('accepted',[]))
    for directory in DIRECTORIES:
        report=BASE/directory/'report.json'
        if not report.exists():continue
        sources=json.loads(report.read_text(encoding='utf8'))['sources']
        for source in sources:
            path=BASE/directory/(source['sourceSha256']+'.json');data=json.loads(path.read_text(encoding='utf8'))
            inputs[str(path.relative_to(BASE))]=hashlib.sha256(path.read_bytes()).hexdigest()
            groups.update({g['groupId']:g for g in data.get('keyGroups',[])})
            rows.extend(data.get('items',[]))
    rows=select_rows(rows,reserved);used={r['groupId'] for r in rows}
    result={'status':'ANSWER_BODY_EVIDENCE_QUEUE_NOT_PUBLICATION','items':rows,'keyGroups':[groups[g] for g in sorted(used)],
            'candidateBodies':len(rows),'excludedReservedOrAlreadyAdmittedCodes':len(reserved),'sourceInputs':inputs,
            'questionWrites':0,'teacherApprovalsCreated':0,'studentVisible':False,'productionImportAllowed':False}
    write_json(target,result);return result


def run(phase='exceptions'):
    package=prepare();rows=package['items'];groups={g['groupId']:g for g in package['keyGroups']}
    admission.OUT=OUT;module=NoModelCalls() if phase=='fast' else vision();opened={};discoveries={};keys={};counts=Counter();start=time.monotonic();last=start;bucket=-1
    pdf_decisions=load_decisions();source_skips=0
    results=OUT/'candidate-evidence';results.mkdir(exist_ok=True)
    from mebi_pratik2_hizli_yol import COMPLETE_STATUSES
    from mebi_pratik2_klasor_etiketleri import lookup as source_labels
    fast=phase=='fast';methods=Counter()
    try:
        for index,row in enumerate(rows,1):
            if skip_pdf(row['sourceSha256'],pdf_decisions):
                source_skips+=1;continue
            target=results/(row['code']+'.json');sha=row['sourceSha256']
            previous=json.loads(target.read_text(encoding='utf8')) if target.exists() else None
            if reuse_evidence(previous,fast):
                result=json.loads(target.read_text(encoding='utf8'))
                if result['imageSha256']!=row['imageSha256']:raise ValueError('Evidence queue input changed')
            else:
                if sha not in opened:
                    path=(SOURCE/row['relativePath']).resolve()
                    if not path.is_relative_to(SOURCE):raise ValueError('Evidence source leaves archive')
                    with path.open('rb') as stream:
                        if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Original evidence source changed')
                    opened[sha]=pymupdf.open(path)
                group=groups[row['groupId']];key=None;body=None;reasons=[]
                for field,hash_field in [('image','imageSha256'),('keyImage','keyImageSha256')]:
                    path=(BASE/row[field]).resolve()
                    if not path.is_relative_to(BASE.resolve()) or hashlib.sha256(path.read_bytes()).hexdigest()!=row[hash_field]:
                        raise ValueError('Frozen evidence image changed')
                key_receipt=OUT/'independent-keys'/(group['groupId']+'.json')
                if fast and not key_receipt.exists():
                    key={'status':'KEY_READING_DEFERRED_TO_EXCEPTION_PASS','imageSha256':row['keyImageSha256']}
                elif group['groupId'] in keys:key=keys[group['groupId']]
                else:
                    if group.get('keyIdentityType'):key=read_key(group,opened[sha],module,OUT)
                    else:
                        directory='three-step-discovery-v3' if group.get('stepToken') else 'compiled-tarama-discovery'
                        identity=(sha,directory)
                        if identity not in discoveries:discoveries[identity]=json.loads((BASE/directory/(sha+'.json')).read_text(encoding='utf8'))
                        reader=admission.source_key if group.get('stepToken') else admission.compiled_key
                        key=reader(group,opened[sha],discoveries[identity],module)
                    keys[group['groupId']]=key
                if key['status']!='AGREES':reasons.append('INDEPENDENT_SOURCE_KEY_READING_UNRESOLVED')
                elif row['answer']!=group['answers'].get(str(row['printedNumber'])):
                    reasons.append('PRINTED_QUESTION_NUMBER_ANSWER_MISMATCH')
                else:
                    body=admission.body_read(row,opened[sha],module,allow_model=not fast,group=group)
                    if body['status'] not in COMPLETE_STATUSES:
                        reasons.append('BODY_COMPLETENESS_NOT_CONFIRMED')
                status='ANSWER_BODY_VERIFIED_FINE_TOPIC_REVIEW_REQUIRED' if not reasons else 'SOURCE_EVIDENCE_REVIEW_REQUIRED'
                result={'code':row['code'],'sourceSha256':sha,'imageSha256':row['imageSha256'],'keyImageSha256':row['keyImageSha256'],
                        'status':status,'reasons':reasons+['FINE_TOPIC_NOT_YET_VERIFIED'],
                        'keySecondReading':key,'bodyReview':body,'teacherApproved':False,'studentVisible':False,
                        'productionImportAllowed':False,'questionWrites':0,
                        'sourceLabelEvidence':source_labels(row,opened[sha],group),
                        'deferredByFastPhase':fast and (key['status']=='KEY_READING_DEFERRED_TO_EXCEPTION_PASS'
                            or bool(body and body.get('deferredByFastPhase')))}
                write_json(target,result)
            counts[result['status']]+=1
            if result.get('bodyReview'):methods[result['bodyReview']['status']]+=1
            now=time.monotonic();current=10*index//max(1,len(rows))
            if current>bucket or now-last>=300 or index==len(rows):
                progress={'stage':'EXISTING_CROP_FAST_TRIAGE' if fast else 'VISUAL_EXCEPTIONS_AFTER_FAST_TRIAGE','completed':index,'total':len(rows),
                          'percent':round(100*index/len(rows),2),'counts':dict(counts),'elapsedSeconds':round(now-start,1),
                          'estimatedRemainingSeconds':None,'questionWrites':0,'allPrintedQuestionsExtracted':False,
                          'phase':phase,'bodyProofMethods':dict(methods),'imageWrites':0}
                write_json(OUT/'progress-current.json',progress)
                with (OUT/'progress.jsonl').open('a',encoding='utf8') as stream:stream.write(json.dumps(progress)+'\n')
                print(json.dumps(progress),flush=True);last=now;bucket=current
        write_json(OUT/('fast-pass-result.json' if fast else 'pass-result.json'),{'status':'EXISTING_CROP_FAST_TRIAGE_COMPLETE_NOT_ARCHIVE_ACCEPTANCE' if fast else 'PREPARED_TOPIC_PENDING_EVIDENCE_PASS_COMPLETE_NOT_ARCHIVE_ACCEPTANCE',
            'counts':dict(counts),'candidateBodies':len(rows),'questionWrites':0,'allPrintedQuestionsExtracted':False,
            'sourcePdfSkippedCandidates':source_skips,'questionComparisons':0,
            'bodyProofMethods':dict(methods),'phase':phase,'imageWrites':0,
            'elapsedSeconds':round(time.monotonic()-start,1),'publishedThroughExistingGuardedPipeline':False})
        write_json(OUT/'progress-current.json',{'stage':'EXISTING_CROP_FAST_TRIAGE_COMPLETE' if fast else 'TOPIC_PENDING_SOURCE_PDF_POLICY_PASS_COMPLETE','completed':len(rows),'total':len(rows),
            'percent':100.0,'counts':dict(counts),'sourcePdfSkippedCandidates':source_skips,'questionComparisons':0,
            'elapsedSeconds':round(time.monotonic()-start,1),'questionWrites':0,'allPrintedQuestionsExtracted':False,
            'bodyProofMethods':dict(methods),'phase':phase,'imageWrites':0})
    finally:
        for document in opened.values():document.close()


if __name__=='__main__':
    from pathlib import Path
    p=argparse.ArgumentParser();p.add_argument('--prepare',action='store_true');p.add_argument('--wait-for')
    p.add_argument('--package-dir',default=OUT.name)
    p.add_argument('--phase',choices=['fast','exceptions','fast-then-exceptions'],default='fast-then-exceptions');a=p.parse_args()
    if Path(a.package_dir).name!=a.package_dir:raise ValueError('Unsafe evidence package path')
    OUT=BASE/a.package_dir
    with process_lock(BASE/'.jobs'/(OUT.name+'.lock')):
        if a.prepare:
            result=prepare();print(json.dumps({k:result[k] for k in ['status','candidateBodies','excludedReservedOrAlreadyAdmittedCodes','questionWrites']}))
        else:
            if a.wait_for:
                dependency=(BASE/a.wait_for).resolve()
                if not dependency.is_relative_to(BASE.resolve()):raise ValueError('Unsafe evidence dependency')
                last=0
                while not dependency.exists():
                    now=time.monotonic()
                    if not last or now-last>=300:
                        print(json.dumps({'stage':'WAITING_FOR_PUBLISHER_PRIORITY','dependency':a.wait_for}),flush=True);last=now
                    time.sleep(5)
                if not json.loads(dependency.read_text(encoding='utf8')).get('publishedThroughExistingGuardedPipeline'):
                    raise ValueError('Publisher dependency has not passed')
            if a.phase=='fast-then-exceptions':
                if not (OUT/'fast-pass-result.json').exists():run('fast')
                run('exceptions')
            else:run(a.phase)
