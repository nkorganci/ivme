"""Reuse frozen source reviews through their original contracts; never weaken exact matching."""
from collections import Counter
import hashlib
from pathlib import Path

from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP
from yks_soru_pilotu import live_bank
from pdf_slide_compare import validate_link
from pdf_question_accept import validate_card,reviewed_answer
from pdf_slide_questions import two_answer_readings
import pymupdf


def source_path(reference):
    relative=reference.split('#')[0].replace('\\','/')
    if relative.startswith('veri/'):
        path=(APP/relative).resolve();allowed=(APP/'veri').resolve()
    elif relative.startswith('veri-hatti/'):
        path=(APP.parent/relative).resolve();allowed=(APP.parent/'veri-hatti').resolve()
    else:raise ValueError('Unregistered source-review package path')
    if not path.is_relative_to(allowed):raise ValueError('Source package escapes registered evidence directory')
    return path


def source_card(link,registered_reference=None):
    evidence=link['evidence'];path=source_path(evidence.get('reference') or registered_reference or '');package=read_json(path)
    if 'cards' in package:
        if package['sourceSha256']!=link['source_sha256']:raise ValueError('Current reviewed package belongs to another source')
        card=next(c for c in package['cards'] if c['code']==evidence['sourceCode']);image=(path.parent/card['image']).resolve()
        if not image.is_relative_to(path.parent):raise ValueError('Source crop escapes reviewed package')
    else:
        raw=next(c for c in package['kayitlar'] if c['id']==evidence['sourceCode'])
        card={'code':raw['id'],'text':raw['metin'],'answer':raw['cevaplar'][0],'answerMethodA':raw['cevaplar_A'][0],
            'answerMethodB':raw['cevaplar_B'][0],'imageSha256':digest(APP.parent/'icerik'/raw['gorsel'])}
        image=APP.parent/'icerik'/raw['gorsel']
    if digest(image)!=card['imageSha256']:raise ValueError('Reviewed original source crop bytes changed')
    return path,package,card,image


def validate_saved_decision(decision,card,package_path,review,question,actual_bank_image_sha):
    if review.get('teacherApproved') is not False:raise ValueError('Automated reuse cannot claim teacher approval')
    expected=card['code'] if decision['decision']=='NEW' else decision['canonicalCode']
    if question['code']!=expected:raise ValueError('Prior source admission points to another canonical question')
    if decision['packageSha256']!=digest(package_path) or decision['sourceTextSha256']!=hashlib.sha256(card['text'].encode()).hexdigest():
        raise ValueError('Frozen admitted source package or text changed')
    validate_card(card,decision,question)
    if decision['decision']=='NEW' and (actual_bank_image_sha!=card['imageSha256'] or question['correct_answer']!=reviewed_answer(card,decision)):
        raise ValueError('Previously inserted source question now has different image/answer')
    if decision['decision']=='MATCH' and len(decision.get('sourceReading',decision.get('reason','')))<20:raise ValueError('Frozen canonical match source reading is missing')


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);base=root/'existing-transfer-reuse';initial=read_json(base/'report.json')
    snapshot=read_json(base/'current-linked-source-snapshot.json')
    if signature(snapshot['links'])!=initial['currentLinkSnapshotSha256']:raise ValueError('Original current-link snapshot changed')
    bank,ocr=live_bank(APP)
    if signature(bank)!=initial['bankSnapshotSha256']:raise ValueError('Existing bank changed since completed transfer checks')
    by_code={q['code']:{**q,'active':True,'source_stamp':q['stamp']} for q in bank}
    raw=read_json(APP/'veri/content-labels/source-inventory.json');texts={q['code']:q.get('original',{}).get('text','') for q in raw['questions']}
    for code,text in ocr.items():
        if sum(c.isalpha() for c in text)>sum(c.isalpha() for c in texts.get(code,'')):texts[code]=text
    review_files={digest(p):p for p in (APP/'veri/pdf-source-registry').glob('*review*.json')}
    links={(l['source_sha256'],l['locator_key']):l for l in snapshot['links']};results=[];validated=0;external_files={}
    folder=root/'reviewed-transfer-reuse';folder.mkdir(exist_ok=True)
    with process_lock(folder/'.writer.lock'):
        for source in initial['results']:
            if not source['issues']:continue
            if digest(source['sourcePath'])!=source['sourceSha256']:raise ValueError('Reviewed original source PDF changed')
            checks=[]
            with pymupdf.open(source['sourcePath']) as doc:
                for original in source['checks']:
                    link=links[source['sourceSha256'],original['sourceLocator']];evidence=link['evidence']
                    if not original['issues']:checks.append(original);continue
                    try:
                        if evidence['origin'] not in ['REVIEWED_SOURCE_BANK_LINK','REVIEWED_RAW_SOURCE_BANK_LINK','REVIEWED_PDF_ACCEPTANCE']:
                            raise ValueError('No compatible frozen reviewed-admission contract; keep source open')
                        question=by_code[link['question_code']]
                        if question['stamp']!=evidence['sourceStamp']:raise ValueError('Current canonical question version changed')
                        file=review_files.get(evidence.get('acceptanceReviewSha256'));review=read_json(file) if file else None
                        path,package,card,image=source_card(link,review.get('sourcePackage') if review else None);bank_image=APP/'veri/resimler-pilot'/question['image'];bank_sha=digest(bank_image)
                        external_files[str(path)]=digest(path);external_files[str(image)]=digest(image)
                        if file:external_files[str(file)]=digest(file)
                        if evidence['origin'] in ['REVIEWED_SOURCE_BANK_LINK','REVIEWED_RAW_SOURCE_BANK_LINK']:
                            validate_link(evidence['comparisonEvidence'],card,path,question,texts[question['code']],bank_sha)
                        else:
                            if file is None:raise ValueError('Original admitted source-content review missing or changed')
                            decision=next(d for d in review['items'] if d['sourceCode']==card['code'])
                            # Some reviewed batches put shared source/package fields
                            # on the document instead of repeating them per row.
                            decision={**{k:review[k] for k in ['sourcePackage','sourceSha256','packageSha256'] if k in review},**decision}
                            decision.setdefault('exam',evidence.get('exam'));decision.setdefault('teacherApproved',False)
                            validate_saved_decision(decision,card,path,review,question,bank_sha)
                        if card.get('answerProof')=='VECTOR_COLOR_AND_RENDERED_RED_PIXELS_AGREE':
                            actual=two_answer_readings(doc[card['answerPage']-1])
                            if actual!=(card['answerMethodA'],card['answerMethodB']):raise ValueError('Fresh rendered slide answer differs from original two-method proof')
                        # Unnumbered slides are located by their immutable source,
                        # physical page and exact source card instead of invented numbers.
                        if card.get('pdfPage') and card['pdfPage']!=link['page_number']:raise ValueError('Physical source page changed')
                        if card.get('printedNumber') is not None and [card['printedNumber']]!=link['printed_numbers']:raise ValueError('Printed source number changed')
                        checks.append({**original,'status':'FROZEN_REVIEW_AND_CURRENT_SOURCE_BANK_LINK_REVALIDATED','issues':[],
                            'method':'ORIGINAL_REVIEW_CONTRACT_AND_CURRENT_VERSION_AND_REAL_IMAGE_BYTES',
                            'sourceImageSha256':digest(image),'bankImageSha256':bank_sha,'sourcePackageSha256':digest(path),
                            'unnumberedSourcePage':not bool(link['printed_numbers']),'newReviewOrApprovalWritten':False});validated+=1
                    except (ValueError,KeyError,StopIteration,FileNotFoundError) as exc:
                        checks.append({**original,'reviewedReuseIssue':str(exc)})
            passed=all(not c['issues'] for c in checks)
            results.append({'sourceSha256':source['sourceSha256'],'sourcePath':source['sourcePath'],
                'status':'CURRENT_REVIEWED_TRANSFER_EVIDENCE_REVALIDATED' if passed else 'REVIEWED_TRANSFER_STILL_REQUIRES_EVIDENCE',
                'expectedQuestions':source['expectedQuestions'],'checks':checks,'teacherApproved':False,'questionBankWrites':0})
        after,_=live_bank(APP)
        if signature(after)!=initial['bankSnapshotSha256']:raise ValueError('Bank changed during reviewed transfer reuse')
        report={'status':'PASS','scope':'EXISTING_FROZEN_SOURCE_REVIEW_CONTRACTS_ONLY','documents':len(results),
            'states':dict(Counter(r['status'] for r in results)),'newlyRevalidatedLinks':validated,
            'fullyRevalidatedExistingLinks':sum(len(r['checks']) for r in results if r['status']=='CURRENT_REVIEWED_TRANSFER_EVIDENCE_REVALIDATED'),
            'baseCurrentReuseReportSha256':digest(base/'report.json'),'bankSnapshotSha256':initial['bankSnapshotSha256'],
            'externalEvidenceFiles':external_files,'toolSha256':digest(Path(__file__)),
            'sourceWrites':0,'questionBankWrites':0,'newModelCalls':0,'teacherApproved':False,'results':results}
        write_json(folder/'report.json',report)
    print({k:v for k,v in report.items() if k not in ['results','externalEvidenceFiles']})


if __name__=='__main__':main()
