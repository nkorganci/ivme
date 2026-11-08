"""Reuse a partial source edition without duplicating its linked or pending work.

Only exact equivalent pages/regions are reusable. Changed body/printed key
versions stay separate; this never changes a canonical answer or source file.
"""
from collections import Counter
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP
from yks_pilot_sorular import source_lines
from yks_soru_pilotu import live_bank
from yks_stages.database import Snapshot,connection
from yks_sayfa_esitligi import OLD,NEW,DPIS
from yks_anahtar_gorsel import transcription,MODEL
from yks_anahtar_pilotu import api

RAW=APP.parent/'veri-hatti/ogm-sorular/kayit/3a-tyt-turkce.json'
BODY_CODE='3a-tyt-turkce-09-07'
KEY_CODE='3a-tyt-turkce-81-01'
REGIONS={30:[30,510,292,798],280:[103,186,132,202]}
VIEWED={
 'old-p30-review.png':'d5641f267463e2c7565555258f4ec1f35d93f535552cce504b694eb90de7d231',
 'old-p280-review.png':'e3aadda129f5cada3573d97b3398415fb55f29cfa8c691680475c5f8438d20cb',
 'new-p30-review.png':'a10bb23d50b8d164880ee5399ae038c4e7c2b86fdbe02829cc8599f5b8392dc8',
 'new-p280-review.png':'099020dd737336e82f0beea0887f4e64e1814530543c28300210be5b70c3c124',
}


def outside_change_proof(old,new,box):
    """Require every changed full-page RGB pixel to lie in the read source region."""
    results=[]
    if old.rect!=new.rect:raise ValueError('Source page geometry changed')
    for dpi in DPIS:
        a=old.get_pixmap(dpi=dpi,alpha=False);b=new.get_pixmap(dpi=dpi,alpha=False)
        x=np.frombuffer(a.samples,dtype=np.uint8).reshape(a.height,a.width,a.n)
        y=np.frombuffer(b.samples,dtype=np.uint8).reshape(b.height,b.width,b.n)
        changed=np.any(x!=y,axis=2);mask=np.ones(changed.shape,dtype=bool)
        rect=(pymupdf.Rect(box)*pymupdf.Matrix(dpi/72,dpi/72)).irect
        mask[max(rect.y0,0):min(rect.y1,a.height),max(rect.x0,0):min(rect.x1,a.width)]=False
        count=int(np.count_nonzero(changed & mask))
        results.append({'dpi':dpi,'changedPixels':int(np.count_nonzero(changed)),
            'outsideChangedRegionPixels':count,'oldRgbSha256':hashlib.sha256(a.samples).hexdigest(),
            'newRgbSha256':hashlib.sha256(b.samples).hexdigest()})
    return {'status':'ONLY_DECLARED_READ_REGION_DIFFERS' if all(r['outsideChangedRegionPixels']==0 and r['changedPixels']>0 for r in results)
        else 'ADDITIONAL_SOURCE_DIFFERENCE_REVIEW_REQUIRED','regionPt':box,'resolutions':results}


def old_occurrence_state(raw,link,question,image_equal):
    """Keep pending work pending; equal pages never invent a prior admission."""
    if not link or link['status']!='LINKED':return 'REUSE_OLD_PENDING_WORK_NO_SECOND_QUESTION_QUEUE'
    e=link['evidence']
    if not question or question['stamp']!=e.get('sourceStamp'):
        return 'OLD_LINK_CURRENT_VERSION_REVIEW_REQUIRED'
    if not image_equal or any(e.get(k)!=[question['correct_answer']] for k in ['answers','answersA','answersB']):
        return 'OLD_LINK_IMAGE_ANSWER_OR_MULTI_QUESTION_REVIEW_REQUIRED'
    if raw['id']!=e.get('sourceCode') or link['page_number']!=raw['sayfa'] or link['printed_numbers']!=raw['nolar']:
        return 'OLD_LINK_SOURCE_LOCATOR_REVIEW_REQUIRED'
    return 'CURRENT_LINKED_ID_AND_SAVED_SOURCE_PROOF_REUSABLE_NO_REIMPORT'


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
    folder=root/'source-page-equivalence/3adim-turkce';equivalence_path=folder/'progress.json';equivalence_sha=digest(equivalence_path);equivalence=read_json(equivalence_path)
    if equivalence['status']!='COMPLETE' or equivalence['identity']['oldSourceSha256']!=OLD or equivalence['identity']['newSourceSha256']!=NEW:
        raise ValueError('Complete exact page-equivalence evidence required')
    paths=[Path(equivalence[k+'SourcePath']) for k in ['old','new']]
    if any(digest(p)!=sha for p,sha in zip(paths,[OLD,NEW])):raise ValueError('Source edition changed')
    raw=read_json(RAW);raw_sha=digest(RAW);rows=raw['kayitlar'];by_raw={r['id']:r for r in rows}
    if len(by_raw)!=1397 or raw['dosya']!='Turkce/TYT/3 Adim Soru Bankasi - TYT Turkce.pdf':raise ValueError('Original source extractor scope changed')
    bank,ocr=live_bank(APP);bank_sha=signature(bank);by_code={q['code']:q for q in bank}
    inventory=APP/'veri/content-labels/source-inventory.json';inventory_sha=digest(inventory)
    texts={q['code']:q.get('original',{}).get('text','') for q in read_json(inventory)['questions']}
    for code,text in ocr.items():
        if sum(c.isalpha() for c in text)>sum(c.isalpha() for c in texts.get(code,'')):texts[code]=text
    cmd,env=connection(APP)
    with Snapshot(cmd,env) as db:
        links=json.loads(db.execute("SELECT coalesce(json_agg(x),'[]') FROM (SELECT source_sha256,locator_key,page_number,printed_numbers,question_code,status,evidence FROM learning_catalog.pdf_question_occurrences WHERE source_sha256='"+OLD+"' ORDER BY locator_key) x;"))
    indexed={l['evidence'].get('sourceCode'):l for l in links}
    if len(indexed)!=len(links) or set(indexed)!=set(by_raw):raise ValueError('Raw source occurrences missing/duplicate')
    exact_pages={r['newPhysicalPage'] for r in equivalence['results'] if r['status']=='FULL_PAGE_NATIVE_AND_PIXELS_IDENTICAL'}
    if len(exact_pages)!=281 or set(range(1,284))-exact_pages!={30,280}:raise ValueError('Edition page scope changed')
    sys.path.insert(0,str(APP.parent/'veri-hatti/ogm-sorular'))
    from kitaplar import uc_adim_anahtar,baslik_anahtari
    from motor import Kitap
    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
    key_readings=[];calls=0;checks=[];regions=[];actual_read=[];external={str(RAW):raw_sha}
    with process_lock(folder/'.incremental-writer.lock'):
        write_json(folder/'incremental-progress.json',{'status':'RUNNING','questionBankWrites':0})
        try:
            with pymupdf.open(paths[0]) as old,pymupdf.open(paths[1]) as new:
                for page,box in REGIONS.items():
                    proof=outside_change_proof(old[page-1],new[page-1],box)
                    if proof['status']!='ONLY_DECLARED_READ_REGION_DIFFERS':raise ValueError('Other source pixels changed outside reviewed region: '+str(page))
                    regions.append({'physicalPage':page,**proof})
                # The exact native/word parser is the existing extractor's contract;
                # row assignment is by nearest label centre, not preceding Y alone.
                for role,path in zip(['old','new'],paths):
                    book=Kitap(path)
                    try:
                        topics=uc_adim_anahtar(book,[279]);selected=[t for t in topics if baslik_anahtari(t[0])=='yazimkurallari1']
                        if len(selected)!=1:raise ValueError('Printed topic heading not unique')
                        a,b=selected[0][1]['3. ADIM']
                        if a!=b or set(a)!=set(range(1,13)):raise ValueError('Printed key numbering and spatial readings differ')
                        key_readings.append({'edition':role,'answers':[{'number':n,'answer':v} for n,v in sorted(a.items())]})
                    finally:book.doc.close()
                if key_readings[0]['answers'][0]['answer']!='E' or key_readings[1]['answers'][0]['answer']!='D':raise ValueError('Actual read changed key cell differs')
                if key_readings[0]['answers'][1:]!=key_readings[1]['answers'][1:]:raise ValueError('More than the declared key cell differs')
                model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
                with ModelLease(role='yks-turkce-only-changed-key-row',model=MODEL):
                    try:
                        for item,doc in zip(key_readings,[old,new]):
                            crop=folder/(item['edition']+'-p280-step3-key.png')
                            doc[279].get_pixmap(dpi=330,clip=pymupdf.Rect(50,187,565,211),alpha=False).save(crop)
                            cache=folder/'key-vision';cache.mkdir(exist_ok=True);seen=transcription(model,crop,cache);calls+=not seen['cacheHit']
                            item.update({k:v for k,v in seen.items() if k!='reading'},cropPath=str(crop),independentAnswers=seen['reading'])
                            if seen['reading']!=item['answers']:raise ValueError('Independent changed key row does not agree')
                    finally:api('/api/generate',{'model':MODEL,'keep_alive':0})
            # Real source images were read in this session; store the actual
            # bytes, observation and physical region instead of a teacher claim.
            for role in ['old','new']:
                for page in [30,280]:
                    file=folder/(role+'-p'+str(page)+'-review.png')
                    if digest(file)!=VIEWED[file.name]:raise ValueError('Actually read source image bytes changed')
                    actual_read.append({'edition':role,'physicalPage':page,'path':str(file),'sha256':digest(file),
                        'method':'EXECUTING_AGENT_VIEWED_ACTUAL_ORIGINAL_SOURCE_RENDER','teacherApproved':False})
            for row in rows:
                code=row['id'];link=indexed[code];question=by_code.get(link['question_code']);image=APP.parent/'icerik'/row['gorsel']
                if not image.is_relative_to(APP.parent/'icerik') or not image.is_file():raise ValueError('Original raw source image missing/unsafe')
                source_sha=digest(image);external[str(image)]=source_sha;bank_image_sha=None
                if question:
                    image_root=APP/'veri/resimler-pilot';current=(image_root/question['image']).resolve()
                    if not current.is_relative_to(image_root.resolve()):raise ValueError('Canonical image escapes bank root')
                    bank_image_sha=digest(current)
                state=old_occurrence_state(row,link,question,source_sha==bank_image_sha)
                reviewed_proof=None
                if state=='OLD_LINK_IMAGE_ANSWER_OR_MULTI_QUESTION_REVIEW_REQUIRED' and link['evidence'].get('origin')=='REVIEWED_RAW_SOURCE_BANK_LINK':
                    from pdf_slide_compare import validate_link
                    card={'code':code,'text':row['metin'],'imageSha256':source_sha,'answer':row['cevaplar'][0],
                        'answerMethodA':row['cevaplar_A'][0],'answerMethodB':row['cevaplar_B'][0]}
                    try:
                        validate_link(link['evidence']['comparisonEvidence'],card,RAW,{**question,'source_stamp':question['stamp']},texts[question['code']],bank_image_sha)
                        state='CURRENT_FROZEN_REVIEWED_DUPLICATE_LINK_REUSABLE_NO_REIMPORT'
                        reviewed_proof=signature(link['evidence']['comparisonEvidence'])
                    except (ValueError,KeyError,TypeError):pass
                if code==BODY_CODE:reuse='CHANGED_QUESTION_BODY_KEEP_SEPARATE_SOURCE_EDITION'
                elif code==KEY_CODE:reuse='CHANGED_PRINTED_KEY_KEEP_CANONICAL_ANSWER_AND_BOTH_SOURCE_EDITIONS'
                elif row['sayfa'] in exact_pages or row['sayfa']==30:reuse='EQUIVALENT_BODY_REUSE_OLD_ID_OR_PENDING_WORK'
                else:reuse='SOURCE_BODY_PAGE_EQUIVALENCE_REVIEW_REQUIRED'
                checks.append({'sourceCode':code,'sourceSha256':NEW,'oldSourceSha256':OLD,'canonicalCode':link['question_code'],
                    'oldOccurrenceStatus':link['status'],'currentCanonicalQuestion':question,'physicalPage':row['sayfa'],
                    'printedNumbers':row['nolar'],'printedTestTitle':row['test'],'status':state,'editionReuseState':reuse,
                    'oldRawAnswers':row['cevaplar'],'oldOccurrenceEvidenceSha256':signature(link['evidence']),
                    'revalidatedOriginalComparisonProofSha256':reviewed_proof,
                    'oldSourceImageSha256':source_sha,'currentBankImageSha256':bank_image_sha,
                    'newQuestionAccepted':False,'freshSemanticOrTeacherApproval':False})
            after,_=live_bank(APP)
            if signature(after)!=bank_sha or digest(RAW)!=raw_sha or digest(equivalence_path)!=equivalence_sha or digest(inventory)!=inventory_sha:
                raise ValueError('Bank/raw source/equivalence changed during incremental reuse')
            report={'status':'PASS','scope':'PARTIAL_SOURCE_EDITION_REUSE_AND_TWO_CHANGED_REGIONS_ONLY',
                'oldSourceSha256':OLD,'sourceSha256':NEW,'rawCards':len(rows),
                'rawIdsCurrentlyActive':sum(r['id'] in by_code for r in rows),
                'oldOccurrenceStates':dict(Counter(l['status'] for l in links)),
                'states':dict(Counter(r['status'] for r in checks)),
                'editionReuseStates':dict(Counter(r['editionReuseState'] for r in checks)),
                'pageEquivalenceSha256':digest(equivalence_path),'originalRawPackageSha256':raw_sha,
                'sourceInventorySha256':inventory_sha,
                'externalEvidenceFiles':external,
                'originalRawPackage':str(RAW),'bankSnapshotSha256':bank_sha,'toolSha256':digest(Path(__file__)),
                'changedBodyCode':BODY_CODE,'changedKeyCode':KEY_CODE,'changedKeyPrintedHeading':'Yazım Kuralları - 1 / 3. ADIM / 1',
                'sourceRegionProofs':regions,'actualSourceImageReadings':actual_read,'changedKeyReadings':key_readings,
                'newModelCallsThisPass':calls,'newOcrCalls':0,'questionBankWrites':0,'sourceWrites':0,
                'sourceFullyAccepted':False,'teacherApproved':False,'results':checks}
            write_json(folder/'incremental-reuse.json',report)
            write_json(folder/'old-current-occurrences.json',{'sourceSha256':OLD,'bankSnapshotSha256':bank_sha,'links':links})
            write_json(folder/'incremental-progress.json',{'status':'COMPLETE','reportSha256':digest(folder/'incremental-reuse.json'),'newModelCallsThisPass':calls})
        except BaseException:
            write_json(folder/'incremental-progress.json',{'status':'INTERRUPTED','newModelCallsThisPass':calls,'questionBankWrites':0});raise
    print({k:v for k,v in report.items() if k not in ['results','sourceRegionProofs','actualSourceImageReadings','changedKeyReadings','externalEvidenceFiles']})


if __name__=='__main__':main()
