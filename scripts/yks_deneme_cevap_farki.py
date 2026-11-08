"""Freeze mock/bank answer disagreements for source-image and old-key review.

Matching native text does not prove unchanged diagrams or an erroneous bank.
Neither current answers nor student history are overwritten.
"""
from pathlib import Path

from yks_birlestirme import Store,read_json,write_json,digest,signature
from yks_pilot_kaynaklari import APP
from yks_soru_pilotu import live_bank


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);folder=root/'full-mock-comparison'
    review_path=folder/'controlled-repeat-review.json';review=read_json(review_path);bank,_=live_bank(APP)
    if signature(bank)!=review['bankSnapshotSha256']:raise ValueError('Mock answer review bank snapshot stale')
    current={r['code']:r for r in bank};inventory_path=APP/'veri/content-labels/source-inventory.json'
    inventory={r['code']:r for r in read_json(inventory_path)['questions']};cards={}
    comparison=read_json(folder/'comparison-report.json')
    for path,sha in comparison['sourcePackages'].items():
        if digest(path)!=sha:raise ValueError('Source mock package changed')
        cards.update({c['code']:c for c in read_json(path)['cards']})
    results=[];original_root=(APP.parent/'Kaynaklar/ogm-materyal').resolve()
    for row in review['results']:
        matches=[m for m in row['exactTextCandidates'] if 'PRINTED_SOURCE_AND_BANK_ANSWER_DISAGREE' in m.get('issues',[])]
        if not matches:continue
        card=cards[row['sourceCode']]
        if digest(card['image'])!=card['imageSha256']:raise ValueError('Disagreeing source image changed')
        links=[]
        for match in matches:
            code=match['code'];old=inventory[code];image=APP/'veri/resimler-pilot'/current[code]['image']
            if current[code]['correct_answer']!=match['bankAnswer'] or card['answer']!=match['sourcePrintedAnswer']:
                raise ValueError('Disagreeing source/current answer changed')
            original=old.get('original',{});old_pdf=(original_root/original.get('file','')).resolve()
            if not old_pdf.is_relative_to(original_root):raise ValueError('Original PDF reference escapes registered archive')
            links.append({'canonicalQuestionCode':code,'canonicalAnswerPreserved':current[code]['correct_answer'],
                'canonicalQuestionVersion':current[code]['stamp'],'bankImagePath':str(image),'bankImageSha256':digest(image),
                'oldOriginalSourceObservation':original,'oldPrintedPdfPath':str(old_pdf),
                'oldPrintedPdfSha256':digest(old_pdf) if old_pdf.is_file() else None,
                'oldPrintedKeyFreshlyVerified':False,'actualImagePairRead':False,
                'canonicalAnswerOverwritten':False,'studentHistoryRewritten':False})
        results.append({'sourceCode':card['code'],'sourceSha256':card['sourceSha256'],
            'status':'PRINTED_SOURCE_BANK_ANSWER_DISAGREEMENT_IMAGE_AND_OLD_KEY_REVIEW_REQUIRED',
            'sectionId':card['sectionId'],'printedNumber':card['printedNumber'],'sourceKeyPhysicalPage':card['sourceKeyPage'],
            'sourceKeyEvidenceSha256':card['keyEvidenceSha256'],'newSourcePrintedAnswer':card['answer'],
            'sourceImagePath':card['image'],'sourceImageSha256':card['imageSha256'],'bankLinks':links,
            'action':'BLOCK_MERGE_REIMPORT_OR_ANSWER_OVERWRITE_UNTIL_SOURCE_VARIANTS_AND_OLD_PRINTED_KEYS_ARE_REVIEWED',
            'teacherApproved':False})
    after,_=live_bank(APP)
    if signature(after)!=review['bankSnapshotSha256']:raise ValueError('Bank changed during conflict evidence capture')
    report={'status':'REVIEW_REQUIRED','scope':'SOURCE_BOUND_MOCK_ANSWER_DISAGREEMENT_QUEUE_NOT_AN_EDITION_OR_BANK_ERROR_VERDICT',
        'sourceQuestions':len(results),'canonicalBankLinks':sum(len(r['bankLinks']) for r in results),
        'bankSnapshotSha256':review['bankSnapshotSha256'],'controlledReviewSha256':digest(review_path),
        'sourceInventorySha256':digest(inventory_path),'questionBankWrites':0,'modelSolutionsGenerated':0,
        'teacherApproved':False,'results':results}
    write_json(folder/'answer-conflict-queue.json',report)
    print({k:v for k,v in report.items() if k!='results'})


if __name__=='__main__':main()
