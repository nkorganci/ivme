"""Compare the source-key cohort with the whole current bank; candidates are not imports."""
from collections import Counter
from pathlib import Path

from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_soru_pilotu import APP,compare,SOURCE
from pdf_source_reconcile import text_fingerprint


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    folder=store.child(state['runId']+'/question-cohort')
    source_report=folder/'source-crop-report.json';report_sha=digest(source_report)
    packages=read_json(source_report)['results'];cards=[];package_proofs={}
    for item in packages:
        if item['status']!='PREPARED':continue
        file=Path(item['package'])
        if digest(file)!=item['packageSha256']:raise ValueError('Source crop package changed')
        package=read_json(file);package_proofs[str(file)]=item['packageSha256']
        for card in package['cards']:
            if digest(card['image'])!=card['imageSha256']:raise ValueError('Source crop bytes changed')
            cards.append(card)
    if len({c['code'] for c in cards})!=len(cards):raise ValueError('Duplicate source candidate code')
    with process_lock(folder/'.comparison-writer.lock'):
        comparison=compare(cards,folder,source_sha=None,
            shared_cache_folder=store.child(state['runId']+'/soru-pilotu/'+SOURCE[:16]))
        within={}
        for card in cards:
            fingerprint=text_fingerprint(card['text'])
            if fingerprint is not None:within.setdefault(fingerprint,[]).append(card['code'])
        repeats=[values for values in within.values() if len(values)>1]
        if digest(source_report)!=report_sha or any(digest(file)!=sha for file,sha in package_proofs.items()):
            raise ValueError('Source candidate packages changed during comparison')
        report={'status':'PASS','scope':'SOURCE_COHORT_DUPLICATE_CANDIDATES_ONLY','questions':len(cards),
            'bankQuestions':comparison['bankQuestions'],'bankImagesCompared':comparison['bankImagesCompared'],
            'bankTextsCompared':comparison['bankTextsCompared'],'missingBankTexts':len(comparison['bankQuestionsWithoutComparableText']),
            'bankTextCacheHit':comparison['bankTextCacheHit'],'sourceCropReportSha256':report_sha,
            'sourcePackages':package_proofs,'bankComparisonSha256':digest(folder/'bank-comparison.json'),
            'bankSnapshotSha256':comparison['bankSnapshotSha256'],
            'textCandidates':sum(bool(r['textMatches']) for r in comparison['candidates']),
            'visualCandidates':sum(bool(r['visualMatches']) for r in comparison['candidates']),
            'withinCohortTextRepeatCandidates':repeats,'questionBankWrites':0,'questionsAcceptedAsNew':0,
            'teacherApproved':False,'toolSha256':digest(Path(__file__))}
        write_json(folder/'cohort-comparison-report.json',report)
    print(__import__('json').dumps({k:v for k,v in report.items() if k!='sourcePackages'}))


if __name__=='__main__':main()
