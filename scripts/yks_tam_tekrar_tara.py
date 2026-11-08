"""Compare all technically complete keyed diagnostic crops against the whole bank."""
from collections import Counter
from pathlib import Path

from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_soru_pilotu import APP,compare
from yks_gorsel_aday import VisualCandidates
from pdf_source_reconcile import text_fingerprint


def crop_scope(report):
    # Rechecking unchanged source/pixel proofs changes execution counters only.
    # Bind the comparison to the actual question packages and proofs instead.
    return signature({'sourceKeyIdentity':report['sourceKeyIdentity'],'results':report['results']})


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    source=root/'full-question-crops/progress.json';crops=read_json(source)
    if crops['status']!='SUPPORTED_KEYED_DIAGNOSTIC_CROP_PASS_COMPLETE':raise ValueError('Complete supported source crop pass first')
    cards=[];packages={};deferred=[]
    for row in crops['results']:
        if row['status']!='PREPARED':deferred.append({'sourceSha256':row['sourceSha256'],'status':row['status']});continue
        path=Path(row['package'])
        if digest(path)!=row['packageSha256']:raise ValueError('Technically checked source package changed')
        package=read_json(path);packages[str(path)]=row['packageSha256']
        for proof in row['pixelProofs']:
            if digest(proof['path'])!=proof['sha256']:raise ValueError('Source crop pixel proof changed')
        for card in package['cards']:
            if digest(card['image'])!=card['imageSha256']:raise ValueError('Source question crop changed')
            cards.append(card)
    if len({c['code'] for c in cards})!=len(cards):raise ValueError('Repeated source code in full comparison input')
    folder=root/'full-question-comparison';folder.mkdir(exist_ok=True)
    input_sha=digest(source);input_scope=crop_scope(crops)
    with process_lock(folder/'.writer.lock'):
        write_json(folder/'progress.json',{'status':'RUNNING','scope':'ALL_TECHNICALLY_COMPLETE_DIAGNOSTIC_QUESTION_CANDIDATES',
            'questions':len(cards),'sourceCropReportSha256':input_sha,'questionBankWrites':0,'teacherApproved':False})
        try:
            print(f'Comparing {len(cards)} complete source crops against the entire current YKS bank; caches reused',flush=True)
            comparison=compare(cards,folder,source_sha=None,shared_cache_folder=root/'question-cohort',visual_matcher_factory=VisualCandidates)
            repeats={}
            for card in cards:
                fingerprint=text_fingerprint(card['text'])
                if fingerprint:repeats.setdefault(fingerprint,[]).append(card['code'])
            if crop_scope(read_json(source))!=input_scope or any(digest(p)!=sha for p,sha in packages.items()):raise ValueError('Source crop packages changed during comparison')
            report={'status':'PASS','scope':'ALL_TECHNICALLY_COMPLETE_KEYED_DIAGNOSTIC_DUPLICATE_CANDIDATES_ONLY',
                'questions':len(cards),'sourceDocuments':len(packages),'sourcePackages':packages,'sourceCropReportSha256':input_sha,
                'sourceCropScopeSignature':input_scope,
                'deferredSourceDocuments':deferred,'bankSnapshotSha256':comparison['bankSnapshotSha256'],
                'bankQuestions':comparison['bankQuestions'],'bankImagesCompared':comparison['bankImagesCompared'],
                'bankTextsCompared':comparison['bankTextsCompared'],'questionsWithoutComparableBankText':comparison['bankQuestionsWithoutComparableText'],
                'bankTextCacheHit':comparison['bankTextCacheHit'],'bankComparisonSha256':digest(folder/'bank-comparison.json'),
                'textCandidates':sum(bool(q['textMatches']) for q in comparison['candidates']),
                'visualCandidates':sum(bool(q['visualMatches']) for q in comparison['candidates']),
                'withinSourceTextRepeats':[v for v in repeats.values() if len(v)>1],'newQuestionsAccepted':0,
                'questionBankWrites':0,'newModelCalls':0,'newOcrCalls':0,'teacherApproved':False,
                'toolSha256':digest(Path(__file__)),'visualMatcherSha256':digest(APP/'scripts/yks_gorsel_aday.py')}
            write_json(folder/'comparison-report.json',report);write_json(folder/'progress.json',{k:v for k,v in report.items() if k!='sourcePackages'})
        except BaseException:
            write_json(folder/'progress.json',{'status':'INTERRUPTED','sourceCropReportSha256':input_sha,'questionBankWrites':0,'teacherApproved':False});raise
    print({k:v for k,v in report.items() if k not in ['sourcePackages','deferredSourceDocuments','withinSourceTextRepeats']})


if __name__=='__main__':main()
