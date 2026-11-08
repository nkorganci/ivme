"""Reuse existing reviewed admissions in partial sources without reimporting.

The completed-source supplement covered only 27 documents. This checks the
same frozen admission contract for remaining partial-source NEW decisions;
it cannot turn missing answers or a new similarity score into approval.
"""
from collections import Counter
from pathlib import Path

from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP
from yks_soru_pilotu import live_bank
from yks_incelenmis_aktarim_kontrol import source_card,validate_saved_decision
from pdf_slide_questions import two_answer_readings
import pymupdf


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);base=root/'all-prior-occurrences/report.json';prior=read_json(base)
    if prior['status']!='COMPLETE':raise ValueError('Complete current prior occurrence proof required')
    bank,_=live_bank(APP);bank_sha=signature(bank)
    if bank_sha!=prior['bankSnapshotSha256']:raise ValueError('Current canonical bank changed')
    by_code={q['code']:{**q,'active':True,'source_stamp':q['stamp']} for q in bank}
    reviews={digest(p):p for p in (APP/'veri/pdf-source-registry').glob('*review*.json')}
    folder=root/'partial-reviewed-transfer-reuse';folder.mkdir(exist_ok=True);results=[];external={}
    with process_lock(folder/'.writer.lock'):
        for source in prior['results']:
            file=Path(source['evidencePath'])
            if digest(file)!=source['evidenceSha256']:raise ValueError('Prior source proof changed')
            candidates=[r for r in read_json(file)['results'] if r['status']=='CURRENT_EXISTING_LINK_REQUIRES_SOURCE_PROOF_REVIEW'
                and r['originalOccurrence']['evidence'].get('origin')=='REVIEWED_PDF_ACCEPTANCE']
            if not candidates:continue
            if digest(source['sourcePath'])!=source['sourceSha256']:raise ValueError('Original partial source PDF changed')
            with pymupdf.open(source['sourcePath']) as doc:
                for row in candidates:
                    link=row['originalOccurrence'];evidence=link['evidence'];issue=None;proof=None
                    try:
                        review_path=reviews.get(evidence.get('acceptanceReviewSha256'))
                        if review_path is None:raise ValueError('Original frozen acceptance review missing')
                        review=read_json(review_path);path,package,card,image=source_card(link,review.get('sourcePackage'))
                        question=by_code[link['question_code']]
                        if question['stamp']!=evidence['sourceStamp']:raise ValueError('Current canonical question version changed')
                        bank_image=(APP/'veri/resimler-pilot'/question['image']).resolve()
                        if not bank_image.is_relative_to((APP/'veri/resimler-pilot').resolve()):raise ValueError('Canonical image escapes bank root')
                        actual=digest(bank_image)
                        if actual!=row['currentImageSha256']:raise ValueError('Actual current canonical image changed')
                        decision=next(d for d in review['items'] if d['sourceCode']==card['code'])
                        decision={**{k:review[k] for k in ['sourcePackage','sourceSha256','packageSha256'] if k in review},**decision}
                        decision.setdefault('exam',evidence.get('exam'));decision.setdefault('teacherApproved',False)
                        validate_saved_decision(decision,card,path,review,question,actual)
                        if card.get('answerProof')=='VECTOR_COLOR_AND_RENDERED_RED_PIXELS_AGREE':
                            if two_answer_readings(doc[card['answerPage']-1])!=(card['answerMethodA'],card['answerMethodB']):
                                raise ValueError('Actual original colored answer no longer agrees')
                        if card.get('pdfPage') and card['pdfPage']!=link['page_number']:raise ValueError('Physical source question page changed')
                        for p in [review_path,path,image]:external[str(p)]=digest(p)
                        proof={'frozenReviewPath':str(review_path),'frozenReviewSha256':digest(review_path),'sourcePackageSha256':digest(path),
                            'currentBankImageSha256':actual,'sourceImageSha256':digest(image),'decision':decision['decision']}
                    except (ValueError,KeyError,StopIteration,FileNotFoundError) as exc:issue=str(exc)
                    results.append({'sourceSha256':source['sourceSha256'],'sourceCode':row['sourceCode'],'sourceLocator':row['sourceLocator'],
                        'canonicalCode':row['canonicalCode'],'status':'ORIGINAL_FROZEN_PARTIAL_SOURCE_ADMISSION_REVALIDATED_KEEP_ID' if issue is None else 'PARTIAL_SOURCE_FROZEN_CONTRACT_STILL_REQUIRES_REVIEW',
                        'previousProofStatus':row['status'],'proof':proof,'issue':issue,'newQuestionOrTeacherApprovalWritten':False})
        after,_=live_bank(APP)
        if signature(after)!=bank_sha or any(digest(p)!=sha for p,sha in external.items()):raise ValueError('Source review or bank changed during frozen admission reuse')
        output={'status':'PASS','scope':'EXISTING_FROZEN_NEW_ADMISSION_CONTRACTS_IN_PARTIAL_SOURCES_ONLY','sourceLinks':len(results),
            'states':dict(Counter(r['status'] for r in results)),'bankSnapshotSha256':bank_sha,'basePriorReportSha256':digest(base),
            'externalEvidenceFiles':external,'toolSha256':digest(Path(__file__)),'newModelCalls':0,'newOcrCalls':0,
            'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'results':results}
        write_json(folder/'report.json',output)
    print({k:v for k,v in output.items() if k not in ['results','externalEvidenceFiles']})


if __name__=='__main__':main()
