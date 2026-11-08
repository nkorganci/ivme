"""Reuse a proven canonical ID through the same official book/question locator.

The new source body is exactly equal to the official book at two DPIs; its
old canonical occurrence in that book has already been validated. No image
similarity threshold or model verdict establishes this transitive identity.
"""
from collections import Counter,defaultdict
from pathlib import Path
from yks_birlestirme import Store,read_json,write_json,digest,signature
from yks_soru_pilotu import APP,live_bank


def link_identity(card,edition,prior,current):
    original=prior['originalOccurrence'];evidence=original['evidence'];proof=card['individualEditionProof']
    expected=[q for q in edition['questions'] if q['sourceCode']==card['code']]
    if len(expected)!=1 or expected[0]!=proof:raise ValueError('The exact recorded individual edition proof differs')
    if (prior['status'] not in ['EXISTING_VALID_SOURCE_PROOF_REUSED','CURRENT_VERSION_IMAGE_AND_SAVED_SOURCE_READINGS_REVALIDATED']
            or prior['issues']):raise ValueError('Original official-book link has no current accepted source proof')
    if (original['source_sha256']!=edition['officialBookSha256'] or original['page_number']!=proof['bookPage']
            or original['printed_numbers']!=[card['printedNumber']] or original['question_code']!=current['code']):
        raise ValueError('The exact official book/page/printed question locator differs')
    if proof['sourceSha256']!=card['sourceSha256'] or proof['printedNumber']!=card['printedNumber']:
        raise ValueError('Individual equality proof belongs to another source question')
    if (proof['status']!='INDIVIDUAL_ORIGINAL_NATIVE_AND_TWO_DPI_PIXELS_IDENTICAL'
            or [p['dpi'] for p in proof['pixels']]!=[180,330]
            or any(not p['equal'] or p['sourceRgbSha256']!=p['bookRgbSha256'] for p in proof['pixels'])):
        raise ValueError('Exact original native and two-DPI question equality required')
    if (current['stamp']!=prior['currentQuestionStamp'] or current['correct_answer']!=card['answer']
            or any(evidence.get(k)!=[card['answer']] for k in ['answers','answersA','answersB'])):
        raise ValueError('Current version or independently recorded old/new source answers differ')
    if prior['originalSourceImageSha256']!=prior['currentImageSha256']:
        raise ValueError('Original canonical image provenance changed')
    return {'sourceBookSha256':edition['officialBookSha256'],'officialBookPage':proof['bookPage'],
        'printedNumber':card['printedNumber'],'oldSourceLocator':prior['sourceLocator'],
        'currentCanonicalCode':current['code'],'currentCanonicalVersion':current['stamp'],
        'currentCanonicalImageSha256':prior['currentImageSha256'],'sourceAnswer':card['answer']}


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
    prior_path=root/'all-prior-occurrences/report.json';prior=read_json(prior_path);sources={r['sourceSha256']:r for r in prior['results']}
    body_path=root/'pdf-on-tarama/chemistry-question-editions/report.json';body=read_json(body_path)
    editions={r['sourceSha256']:r for r in body['results']};bank,_=live_bank(APP);bank_sha=signature(bank);bank_by_code={q['code']:q for q in bank}
    if prior['bankSnapshotSha256']!=bank_sha:raise ValueError('Current bank differs from the accepted old source proof')
    inputs={str(prior_path):digest(prior_path),str(body_path):digest(body_path)};old_by_book={};results=[];checked_sources={}
    for cohort in ['partial-chemistry-comparison','partial-chemistry-visual-comparison']:
        report_path=root/cohort/'controlled-repeat-review.json';comparison=read_json(report_path)
        if comparison['status']!='PASS' or comparison['bankSnapshotSha256']!=bank_sha:raise ValueError('Current complete controlled comparison required')
        package_index_path=root/cohort/'comparison-report.json';package_index=read_json(package_index_path);cards={}
        inputs[str(report_path)]=digest(report_path);inputs[str(package_index_path)]=digest(package_index_path)
        for path,sha in package_index['sourcePackages'].items():
            if digest(path)!=sha:raise ValueError('Original source question package changed')
            inputs[path]=sha;cards.update({c['code']:c for c in read_json(path)['cards']})
        for row in comparison['results']:
            card=cards[row['sourceCode']];edition=editions[card['sourceSha256']];book_sha=edition['officialBookSha256'];links=[];issues=[]
            for file,expected in [(card['sourcePath'],card['sourceSha256']),(edition['officialBookPath'],book_sha)]:
                if file not in checked_sources:
                    if digest(file)!=expected:raise ValueError('Actual source or official book PDF changed')
                    checked_sources[file]=expected
            if book_sha not in old_by_book:
                source=sources[book_sha];path=Path(source['evidencePath'])
                if digest(path)!=source['evidenceSha256']:raise ValueError('Original official book occurrence proof changed')
                inputs[str(path)]=source['evidenceSha256'];by_code=defaultdict(list)
                for old in read_json(path)['results']:by_code[old['canonicalCode']].append(old)
                old_by_book[book_sha]=by_code
            for match in row['exactTextCandidates']:
                if match['status']!='EXACT_TEXT_SOURCE_ANSWER_AND_CONTROLLED_SCOPE_AGREE':continue
                current=bank_by_code[match['code']]
                for old in old_by_book[book_sha].get(current['code'],[]):
                    try:
                        reused=old.get('reusedProof')
                        if reused and reused['proofFile'] in inputs and inputs[reused['proofFile']]!=reused['proofSha256']:
                            raise ValueError('Two different frozen versions of the same canonical proof')
                        if reused and reused['proofFile'] not in inputs:
                            if digest(reused['proofFile'])!=reused['proofSha256']:raise ValueError('Original reused canonical source proof changed')
                            inputs[reused['proofFile']]=reused['proofSha256']
                        identity=link_identity(card,edition,old,current);image=APP/'veri/resimler-pilot'/current['image']
                        if digest(image)!=identity['currentCanonicalImageSha256']:raise ValueError('Actual current canonical image changed')
                        links.append(identity)
                    except ValueError as exc:issues.append(str(exc))
            distinct={p['currentCanonicalCode'] for p in links}
            results.append({'sourceCode':card['code'],'sourceSha256':card['sourceSha256'],
                'status':'EXACT_TWO_DPI_OFFICIAL_BOOK_BODY_AND_PREVIOUS_CANONICAL_LINK_KEEP_ID' if len(distinct)==1 else 'SOURCE_IDENTITY_OR_CONTENT_REVIEW_REQUIRED',
                'canonicalCode':next(iter(distinct)) if len(distinct)==1 else None,'sourceIdentityProofs':links,'issues':issues,
                'intakeAction':'KEEP_EXISTING_ID_DO_NOT_REIMPORT' if len(distinct)==1 else 'NO_NEW_INTAKE_WITHOUT_CONTENT_REVIEW',
                'fineTopicAccepted':False,'newQuestionAdmissionAccepted':False,'teacherApproved':False})
    after,_=live_bank(APP)
    if signature(after)!=bank_sha or any(digest(p)!=sha for p,sha in {**inputs,**checked_sources}.items()):raise ValueError('Source or current canonical bank changed during identity proof')
    report={'status':'PASS','scope':'INDIVIDUAL_EXACT_SOURCE_TO_OFFICIAL_BOOK_TO_PREVIOUS_CANONICAL_QUESTION_IDENTITY',
        'questions':len(results),'states':dict(Counter(r['status'] for r in results)),
        'existingCanonicalIdsReused':sum(r['canonicalCode'] is not None for r in results),'bankSnapshotSha256':bank_sha,
        'inputs':inputs,'results':results,'toolSha256':digest(Path(__file__)),'newModelCalls':0,'newOcrCalls':0,'newRenders':0,
        'actualOriginalPdfHashesVerified':checked_sources,
        'questionBankWrites':0,'teacherApproved':False}
    write_json(root/'partial-chemistry-canonical-reuse/report.json',report)
    print({k:v for k,v in report.items() if k not in ['results','inputs','actualOriginalPdfHashesVerified']})


if __name__=='__main__':main()
