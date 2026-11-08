"""Join prepared source questions with all original pending source work.

Pending cards and discovered regions are not bank admissions. Their immutable
locator is retained so a new MEBI copy cannot create a second intake queue.
This reads source text/packages; it never renders, solves, imports or deletes.
"""
from collections import Counter,defaultdict,OrderedDict
import json
import hashlib
from pathlib import Path

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP
from yks_partiler_arasi_tekrar import body_identity
from yks_kismi_kaynak_aktarimlari import evidence_path
from pdf_source_reconcile import text_fingerprint
from yks_soru_pilotu import live_bank


def old_location_id(row):return row['sourceSha256']+':'+row['sourceLocator']


def classify_relation(card,pending):
    new=body_identity(card['text']);old=body_identity(pending['text'])
    same_locator=(card['sourceSha256']==pending['sourceSha256'] and card['pdfPage']==pending['physicalPage']
        and pending['printedNumbers']==[card['printedNumber']])
    same=bool(new and old and new['identity']==old['identity'])
    if not same and not same_locator:return None
    if same_locator and not same:status='SAME_PHYSICAL_SOURCE_LOCATOR_BODY_CONFLICT_OR_INCOMPLETE_KEEP_OLD_QUEUE'
    elif pending['sourceAnswer'] in list('ABCDE'):
        mapped=next(k for k,value in old['options'].items() if value==new['options'][card['answer']])
        status='PENDING_COMPLETE_BODY_AND_MAPPED_SOURCE_ANSWER_AGREE_RESUME_OLD_LOCATOR' if mapped==pending['sourceAnswer'] else 'PENDING_AND_PREPARED_PRINTED_ANSWER_CONFLICT_NO_NEW_INTAKE'
    else:status='PENDING_COMPLETE_BODY_MATCH_SOURCE_ANSWER_NOT_VERIFIED_RESUME_OLD_LOCATOR'
    return {'oldSourceSha256':pending['sourceSha256'],'oldSourceLocator':pending['sourceLocator'],
        'oldSourceCode':pending['sourceCode'],'oldOccurrenceStatus':pending['oldOccurrenceStatus'],
        'samePhysicalSourceLocator':same_locator,'sameCompleteStemAndFiveOptions':same,'status':status,
        'oldSourceAnswer':pending['sourceAnswer'],'preparedSourceAnswer':card['answer'],
        'existingCanonicalCode':pending['existingCanonicalCode'],'newIntakeAllowed':False,'teacherApproved':False}


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);prior_path=root/'all-prior-occurrences/report.json';prior=read_json(prior_path)
    if prior['status']!='COMPLETE':raise ValueError('Complete prior occurrence reconciliation required')
    cross_path=root/'cross-source-candidates/report.json';cross=read_json(cross_path)
    if cross['status']!='PASS' or cross['bankSnapshotSha256']!=prior['bankSnapshotSha256']:raise ValueError('Prepared and pending bank baselines differ')
    folder=root/'pending-source-reuse';folder.mkdir(exist_ok=True);pending=[];packages={};external={};documents=OrderedDict();read_sources={};source_proofs={}
    discovery_path=APP/'veri/pdf-source-registry/discovery.json';discovered=read_json(discovery_path)
    discovery={(r['sha256'],r['locator']):r for r in discovered['candidates']};external[str(discovery_path)]=digest(discovery_path)
    def native(path,page,box,sha):
        if sha not in documents:
            if digest(path)!=sha:raise ValueError('Pending original source PDF changed')
            documents[sha]=pymupdf.open(path)
            if len(documents)>8:documents.popitem(last=False)[1].close()
        doc=documents.pop(sha);documents[sha]=doc
        return doc[page-1].get_text(clip=pymupdf.Rect(box)).strip()
    with process_lock(folder/'.writer.lock'):
        try:
            for source in prior['results']:
                path=Path(source['evidencePath'])
                if digest(path)!=source['evidenceSha256']:raise ValueError('Prior source occurrences changed')
                source_proofs[str(path)]=source['evidenceSha256']
                for row in read_json(path)['results']:
                    link=row['originalOccurrence'];e=link['evidence']
                    if link['status'] not in ['CANDIDATE','NEEDS_REVIEW']:continue
                    text=None;method=None;issue=None;reference=e.get('reference');body_proven=False
                    if e.get('origin')=='PAGE_QUESTION_REGION':
                        original=discovery.get((row['sourceSha256'],row['sourceLocator']))
                        if original:
                            if original['page']!=link['page_number'] or original['bbox']!=e['bbox']:raise ValueError('Original pending region geometry changed')
                            text=original['text'];method='FROZEN_REGISTERED_ORIGINAL_DISCOVERY_REGION_TEXT'
                            body_proven=hashlib.sha256(text.encode()).hexdigest()==e.get('textSha256')==original['textSha256']
                        else:
                            text=native(Path(source['sourcePath']),link['page_number'],e['bbox'],row['sourceSha256']);method='CURRENT_ORIGINAL_REGION_NATIVE_TEXT'
                            body_proven=hashlib.sha256(text.encode()).hexdigest()==e.get('textSha256')
                        if not body_proven:issue='ORIGINAL_REGION_TEXT_HASH_DIFFERS_OR_OCR_REQUIRED'
                    elif reference:
                        try:
                            file=evidence_path(reference)
                            if str(file) not in packages:packages[str(file)]=read_json(file);external[str(file)]=digest(file)
                            package=packages[str(file)]
                            if 'kayitlar' in package:
                                raw=next(c for c in package['kayitlar'] if c['id']==e['sourceCode']);text=raw['metin'];method='FROZEN_RAW_SOURCE_CARD_TEXT'
                            elif 'cards' in package:
                                raw=next(c for c in package['cards'] if c['code']==e['sourceCode']);text=raw['text'];method='FROZEN_ORIGINAL_SLIDE_CANDIDATE_TEXT'
                            else:issue='PROVIDER_OR_OTHER_PENDING_PACKAGE_REQUIRES_ITS_OWN_CONTRACT'
                            if text is not None:
                                body_proven=text_fingerprint(text)==e.get('textSha256')
                                if not body_proven:issue='SAVED_PENDING_TEXT_HASH_DIFFERS_KEEP_ORIGINAL_WORK'
                        except (ValueError,KeyError,StopIteration,FileNotFoundError):issue='ORIGINAL_PENDING_TEXT_CONTRACT_REVIEW_REQUIRED'
                    else:issue='ORIGINAL_PENDING_TEXT_REFERENCE_MISSING'
                    answers=e.get('answers');answer=answers[0] if isinstance(answers,list) and len(answers)==1 else None
                    reading_agrees=answer in list('ABCDE') and e.get('answersA')==[answer] and e.get('answersB')==[answer]
                    pending.append({'sourceSha256':row['sourceSha256'],'sourceLocator':row['sourceLocator'],'sourceCode':row['sourceCode'],
                        'oldOccurrenceStatus':link['status'],'physicalPage':link['page_number'],'printedNumbers':link['printed_numbers'],
                        'text':text if body_proven else '', 'textMethod':method,'originalTextHashRevalidated':body_proven,'textIssue':issue,
                        'sourceAnswer':answer if reading_agrees else None,'sourceAnswerReadingsRevalidated':reading_agrees,
                        'existingCanonicalCode':link['question_code'],'originalEvidenceSha256':signature(e),'newQuestionAccepted':False})
            if len(pending)!=5303 or len({old_location_id(r) for r in pending})!=len(pending):raise ValueError('Original pending work membership differs')
            groups=defaultdict(list);locations=defaultdict(list)
            for old in pending:
                identity=body_identity(old['text'])
                if identity:groups[identity['identity']].append(old)
                if len(old['printedNumbers'])==1:locations[old['sourceSha256'],old['physicalPage'],old['printedNumbers'][0]].append(old)
            cards={}
            for path,sha in cross['sourcePackages'].items():
                if digest(path)!=sha:raise ValueError('Prepared source package changed')
                cards.update({c['code']:c for c in read_json(path)['cards']})
            results=[]
            for card in cards.values():
                identity=body_identity(card['text']);related={old_location_id(r):r for r in locations.get((card['sourceSha256'],card['pdfPage'],card['printedNumber']),[])}
                if identity:related.update({old_location_id(r):r for r in groups.get(identity['identity'],[])})
                relations=[classify_relation(card,old) for old in related.values()];relations=[r for r in relations if r]
                results.append({'sourceSha256':card['sourceSha256'],'sourceCode':card['code'],
                    'status':'ORIGINAL_PENDING_SOURCE_RELATION_REQUIRES_REUSE_BEFORE_NEW_INTAKE' if relations else 'NO_EXACT_PENDING_MATCH_FOUND_NOT_NEW_QUESTION_ACCEPTANCE',
                    'oldPendingRelations':relations,'newQuestionAccepted':False,'teacherApproved':False})
            bank,_=live_bank(APP)
            if signature(bank)!=cross['bankSnapshotSha256'] or any(digest(p)!=sha for p,sha in {**source_proofs,**external,**cross['sourcePackages']}.items()):
                raise ValueError('Prior or prepared source/bank changed during pending work reuse')
            output={'status':'PASS','scope':'ALL_ORIGINAL_PENDING_LOCATORS_VS_PREPARED_SOURCE_QUESTIONS_ONLY','originalPendingOccurrences':len(pending),
                'originalPendingNativeOrRawTextVerified':sum(p['originalTextHashRevalidated'] for p in pending),
                'originalPendingCompleteLiteralFiveOptionBodies':sum(len(v) for v in groups.values()),'preparedQuestionsCompared':len(cards),
                'preparedQuestionsWithOldPendingRelations':sum(bool(r['oldPendingRelations']) for r in results),
                'relationStates':dict(Counter(rel['status'] for r in results for rel in r['oldPendingRelations'])),
                'bankSnapshotSha256':cross['bankSnapshotSha256'],'priorOccurrenceReportSha256':digest(prior_path),'crossSourceReportSha256':digest(cross_path),
                'externalEvidenceFiles':external,'toolSha256':digest(Path(__file__)),'newModelCalls':0,'newOcrCalls':0,'newRenders':0,
                'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'results':results}
            write_json(folder/'pending-source-observations.json',{'status':'PASS','results':pending})
            write_json(folder/'report.json',output)
        finally:
            for doc in documents.values():doc.close()
    print({k:v for k,v in output.items() if k not in ['results','externalEvidenceFiles']})


if __name__=='__main__':main()
