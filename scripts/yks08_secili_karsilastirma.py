"""Reuse current bank evidence for the selected scope, never call similarity NEW."""
from collections import Counter
from pathlib import Path

from yks_birlestirme import Store, digest, read_json, write_json, signature
from yks_pilot_kaynaklari import APP
from yks_soru_pilotu import live_bank, OUT
from pdf_question_duplicates import VERSION as IMAGE_VERSION


def disposition(card, observed, compared):
    if not observed or not compared:
        return 'EXCLUDE_NO_RETRY', 'NO_COMPLETE_CURRENT_COMPARISON_PROOF'
    if observed['sourceImageSha256'] != card['imageSha256'] or compared['sourceSha256'] != card['sourceSha256']:
        return 'EXCLUDE_NO_RETRY', 'FROZEN_COMPARISON_BELONGS_TO_ANOTHER_SOURCE_VERSION'
    # Existing IDs already have their own immutable identity proofs. A low
    # similarity or absence of an exact match never proves a new question.
    if observed['existingCanonicalCodes']:
        return 'PRESERVE_EXISTING_ID_NO_NEW_QUESTION', 'EXISTING_SOURCE_IDENTITY_ALREADY_PROVEN'
    return 'EXCLUDE_NO_RETRY', 'NO_POSITIVE_CONTENT_AND_NOVELTY_ACCEPTANCE'


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    if store.verify(state,'YKS-07','full')['status']!='VERIFIED':
        raise ValueError('Selected full source acceptance must be current')
    folder=root/'selected-yks08-comparison';folder.mkdir(exist_ok=True);inputs={}
    def load(relative):
        p=root/relative;inputs[str(p)]=digest(p);return read_json(p)
    selected=load('selected-yks07-acceptance/source-candidates.json')['cards']
    source_report=load('selected-yks07-acceptance/report.json')
    queue=load('source-intake-queue/report.json');observed={r['sourceCode']:r for r in queue['results']}
    questions,_=live_bank(APP);bank_sha=signature(questions)
    if bank_sha!=queue['bankSnapshotSha256']:
        raise ValueError('Current bank changed: invalidate comparison evidence, never reuse it silently')
    bank_images_path=OUT/'bank-image-fingerprints.json';bank_images=read_json(bank_images_path)
    if bank_images['version']!=IMAGE_VERSION:raise ValueError('Unsupported bank image fingerprint version')
    inputs[str(bank_images_path)]=digest(bank_images_path)
    fingerprints={r['code']:r for r in bank_images['images']};image_root=(APP/'veri/resimler-pilot').resolve()
    for q in questions:
        file=(image_root/q['image']).resolve()
        if not file.is_relative_to(image_root) or not file.is_file():
            raise ValueError('Current bank image unavailable; invalidate frozen comparison')
        stat=file.stat();stamp=f"{q['stamp']}:{stat.st_size}:{stat.st_mtime_ns}"
        prior=fingerprints.get(q['code'],{})
        if prior.get('stamp')!=stamp or prior.get('error'):
            raise ValueError('Current bank image changed; invalidate frozen comparison: '+q['code'])
    comparisons={}
    for relative in ['full-mock-comparison/controlled-repeat-review.json',
                     'new-book-comparison/din/controlled-repeat-review.json']:
        report=load(relative)
        if report['status']!='PASS' or report['bankSnapshotSha256']!=bank_sha:
            raise ValueError('Frozen comparison uses another bank version')
        for r in report['results']:comparisons[r['sourceCode']]=r
    results=[]
    for card in selected:
        code=card['sourceCode'];prior=observed.get(code);compared=comparisons.get(code)
        action,reason=disposition(card,prior,compared)
        results.append({'sourceCode':code,'sourceSha256':card['sourceSha256'],
            'sourceImageSha256':card['imageSha256'],'comparisonReused':bool(prior and compared),
            'previousComparisonState':compared.get('status') if compared else None,
            'classification':'AMBIGUOUS_EXCLUDED_NOT_NEW','action':action,'reason':reason,
            'existingCanonicalCodes':prior['existingCanonicalCodes'] if prior else [],
            'retryAllowed':False,'learnerVisible':False,'productionImportAllowed':False})
    if signature(live_bank(APP)[0])!=bank_sha:
        raise ValueError('Bank changed during read-only comparison reuse')
    source_decisions=load('selected-yks07-acceptance/question-dispositions.json')['results']
    protected=[r for r in source_decisions if r['action'] in {
        'PRESERVE_EXISTING_ID_NO_NEW_QUESTION','REUSE_PREFERRED_LOCATOR_NO_NEW_QUESTION','KEEP_ISOLATED_PROOF_NO_PRODUCTION'}]
    write_json(folder/'protected-identities.json',{'results':protected,'oldIdsMergedOrDeleted':0})
    report={'status':'PASS','scope':'CURRENT_SELECTED_SOURCE_COMPARISON_AND_FINAL_EXCLUSIONS_NOT_FULL08_ACCEPTANCE',
        'selectedSourceQuestions':len(selected),'sourceStageReportSha256':digest(root/'selected-yks07-acceptance/report.json'),
        'bankQuestionsCompared':len(questions),'bankSnapshotSha256':bank_sha,
        'currentBankImageStampsChecked':len(questions),
        'frozenSourceComparisonsReused':sum(r['comparisonReused'] for r in results),
        'noComparisonProofExcluded':sum(r['reason']=='NO_COMPLETE_CURRENT_COMPARISON_PROOF' for r in results),
        'actions':dict(Counter(r['action'] for r in results)),'results':results,
        'protectedIdentityObservations':len(protected),'newQuestionsAccepted':0,
        'sourceContentRepairAttempts':0,'newModelCalls':0,'newOcrCalls':0,'newVisualEmbeddingCalls':0,
        'questionBankWrites':0,'oldIdsMergedOrDeleted':0,'fullYks08Accepted':False,
        'teacherApproved':False,'inputs':inputs,'toolSha256':digest(Path(__file__))}
    if any(digest(p)!=sha for p,sha in inputs.items()):raise ValueError('Frozen comparison inputs changed')
    write_json(folder/'report.json',report)
    print({k:v for k,v in report.items() if k not in ['results','inputs']})


if __name__=='__main__':main()
