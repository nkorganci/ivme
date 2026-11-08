"""Prove diagnostic duplicates through exact official-source question pixels.

Only the 3,036 existing controlled-scope candidates are considered. Each new
body must match the original canonical book/page/number, complete native body,
actual 180/330-DPI RGB, printed test identity, old answer readings and current
bank version/image. Unsupported/shared layouts remain unapproved.
"""
from collections import Counter,defaultdict,OrderedDict
from pathlib import Path
import argparse

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_soru_pilotu import APP,live_bank
from yks_partiler_arasi_tekrar import COHORTS
from yks_kimya_soru_nushasi import compare_question
from yks_pilot_sorular import boundaries,source_lines
from yks_pilot_kaynaklari import test_identities
from yks_pilot_kirpim_kontrol import uncovered_body_lines
from yks_stages.database import Snapshot,connection
from yks_deneme_govde import section_number,glyph_lines
from yks_tam_deneme_anahtar import validate_saved as validate_mock_keys


def prove_original_link(card,current,old):
    original=old['originalOccurrence'];evidence=original['evidence']
    if old['status'] not in ['EXISTING_VALID_SOURCE_PROOF_REUSED','CURRENT_VERSION_IMAGE_AND_SAVED_SOURCE_READINGS_REVALIDATED'] or old['issues']:
        raise ValueError('Original canonical source link is not currently proven')
    if (old['canonicalCode']!=current['code'] or old['currentQuestionStamp']!=current['stamp']
            or current['correct_answer']!=card['answer'] or original['printed_numbers']!=[card['printedNumber']]
            or any(evidence.get(k)!=[card['answer']] for k in ['answers','answersA','answersB'])):
        raise ValueError('Current original canonical version, printed number or source answers differ')
    if old['originalSourceImageSha256']!=old['currentImageSha256']:raise ValueError('Original canonical image provenance differs')


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--limit',type=int);parser.add_argument('--mocks',action='store_true')
    choice=parser.add_mutually_exclusive_group();choice.add_argument('--combined',action='store_true');choice.add_argument('--source-exceptions',action='store_true');args=parser.parse_args()
    if args.limit is not None and args.limit<1:parser.error('Positive source limit required')
    if (args.combined or args.source_exceptions) and not args.mocks:parser.error('Combined printed subjects/source exceptions require the mock source cohort')
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);folder=root/('mock-source-exception-identities' if args.source_exceptions else 'mock-combined-canonical-reuse' if args.combined else 'mock-official-canonical-reuse' if args.mocks else 'diagnostic-official-canonical-reuse');folder.mkdir(exist_ok=True)
    wanted_statuses={'SOURCE_OR_CONTROLLED_SCOPE_CONFLICT_REVIEW','PRINTED_DISCIPLINE_RANGE_REVIEW_REQUIRED'} if args.source_exceptions else {'EXACT_TEXT_WITHIN_COMBINED_SECTION_SUBJECT_REVIEW_REQUIRED' if args.combined else 'EXISTING_SOURCE_MATCH_CANDIDATE'}
    match_status='EXACT_TEXT_AND_ANSWER_WITHIN_COMBINED_SECTION_REQUIRES_SUBJECT_CONTENT_REVIEW' if args.combined else 'EXACT_TEXT_SOURCE_ANSWER_AND_CONTROLLED_SCOPE_AGREE'
    inputs={};packages={};wanted={};cards={};bank_shas=set();catalog_runs=set()
    for cohort in (['full-mock-comparison'] if args.mocks else [c for c in COHORTS if c not in ['full-mock-comparison','new-book-comparison/din']]):
        proof_path=root/cohort/'controlled-repeat-review.json';proof=read_json(proof_path);inputs[str(proof_path)]=digest(proof_path);bank_shas.add(proof['bankSnapshotSha256'])
        catalog_runs.add(proof['currentCatalogRun'])
        index_path=root/cohort/'comparison-report.json';index=read_json(index_path);inputs[str(index_path)]=digest(index_path)
        if proof['status']!='PASS' or index['status']!='PASS':raise ValueError('Complete current controlled source comparison required')
        for row in proof['results']:
            if row['status'] in wanted_statuses:wanted[row['sourceCode']]=row
        for file,sha in index['sourcePackages'].items():
            if digest(file)!=sha:raise ValueError('Original prepared diagnostic source package changed')
            packages[file]=sha
            package=read_json(file)
            for card in package['cards']:
                card=dict(card);card.setdefault('sourcePath',package.get('sourcePath'))
                cards[card['code']]=card
    keys={}
    for relative in ['verified-source-keys.json','rebound-literature-keys/report.json','raster-keys/report.json','body-exception-keys/report.json','multi-test-key/report.json']:
        key_path=root/'pdf-on-tarama/full-key-scan'/relative;key_report=read_json(key_path);inputs[str(key_path)]=digest(key_path)
        for key in key_report['results']:
            if key['status']=='SOURCE_KEY_VERIFIED':keys[key['sourceSha256'],key['keyEvidenceSha256']]=key
    if args.mocks:
        mock_key_path=root/'pdf-on-tarama/full-mock-keys/progress.json';mock_keys=read_json(mock_key_path);inputs[str(mock_key_path)]=digest(mock_key_path)
        keys={}
        for original in mock_keys['results']:
            if original['status']!='SOURCE_MOCK_KEY_VERIFIED':continue
            validate_mock_keys(original,{'digest':mock_keys['identity']['visualModelDigest']})
            for section in original['sections']:
                if section['status']=='TWO_PRINTED_SOURCE_READINGS_AGREE':
                    keys[original['sourceSha256'],section['keyEvidenceSha256']]={
                        'status':'SOURCE_KEY_VERIFIED','sourcePath':original['sourcePath'],'keyEvidenceSha256':section['keyEvidenceSha256'],
                        'sourceAnswers':section['answers'],'sectionId':section['sectionId'],'testNumber':None}
    prior_path=root/'all-prior-occurrences/report.json';prior=read_json(prior_path);inputs[str(prior_path)]=digest(prior_path)
    old_by_code=defaultdict(list);needed={m['code'] for row in wanted.values() for m in row['exactTextCandidates']}
    for source in prior['results']:
        if ('MEBİ YKS Deneme Kitapları' if args.mocks else 'MEBİ Tarama Testi Kitapları') not in source['sourcePath']:continue
        path=Path(source['evidencePath'])
        if digest(path)!=source['evidenceSha256']:raise ValueError('Original official book link evidence changed')
        inputs[str(path)]=source['evidenceSha256']
        for old in read_json(path)['results']:
            if old['canonicalCode'] in needed:old_by_code[old['canonicalCode']].append((source,old))
    bank,_=live_bank(APP);bank_sha=signature(bank);by_code={r['code']:r for r in bank}
    if bank_shas!={bank_sha} or prior['bankSnapshotSha256']!=bank_sha:raise ValueError('Current diagnostic source comparisons are stale')
    cmd,env=connection(APP)
    with Snapshot(cmd,env) as snapshot:catalog_run=snapshot.execute('SELECT run_key FROM learning_catalog.current_run;')
    if catalog_runs!={catalog_run}:raise ValueError('Controlled diagnostic scopes belong to an old catalog run')
    documents=OrderedDict();source_hashes={};page_cache={};results=[];new=0;hits=0
    readers={str(p):digest(p) for p in [Path(__file__),APP/'scripts/yks_kimya_soru_nushasi.py',APP/'scripts/yks_pilot_sorular.py',APP/'scripts/yks_pilot_kirpim_kontrol.py']}
    if args.mocks:
        readers.update({str(p):digest(p) for p in [APP/'scripts/yks_deneme_govde.py',APP/'scripts/yks_tam_deneme_anahtar.py']})
    def cache_identity(identity):
        # Adding another explicitly verified key family changes no body proof.
        # Cache validity still binds every geometry helper and all source bytes.
        return signature({**identity,'readers':{p:s for p,s in identity['readers'].items() if Path(p).name!=Path(__file__).name}})
    previous={}
    for path in folder.glob('*.json'):
        if path.name=='report.json':continue
        value=read_json(path)
        if 'identity' in value:previous[cache_identity(value['identity'])]=path
    def document(path,sha):
        if not path:raise ValueError('No explicit original source PDF path')
        if path not in source_hashes:
            if digest(path)!=sha:raise ValueError('Original source/book PDF changed')
            source_hashes[path]=sha
        elif source_hashes[path]!=sha:raise ValueError('Original source path has two hashes')
        if path in documents:doc=documents.pop(path)
        else:doc=pymupdf.open(path)
        documents[path]=doc
        if len(documents)>8:documents.popitem(last=False)[1].close()
        return doc
    def page_geometry(page,sha):
        key=(sha,page.number)
        if key not in page_cache:
            regions,_=boundaries(glyph_lines(page) if args.mocks else source_lines(page),page.rect.width,page.rect.height)
            page_cache[key]=(regions,uncovered_body_lines(page,regions))
        return page_cache[key]
    def save(status):
        write_json(folder/'report.json',{'status':status,'scope':'ONLY_PREVIOUS_CONTROLLED_MOCK_CANDIDATES_EXACT_OFFICIAL_SOURCE_IDENTITY' if args.mocks else 'ONLY_PREVIOUS_CONTROLLED_DIAGNOSTIC_MATCH_CANDIDATES_EXACT_OFFICIAL_SOURCE_IDENTITY',
            'sourceQuestions':len(wanted),'completed':len(results),'pending':len(wanted)-len(results),
            'newQuestionComparisonsThisPass':new,'cacheHitsThisPass':hits,'bankSnapshotSha256':bank_sha,
            'states':dict(Counter(r['status'] for r in results)),'inputs':inputs,'sourcePackages':packages,
            'actualOriginalPdfHashesVerified':source_hashes,'readerFiles':readers,'results':results,
            'newModelCalls':0,'newOcrCalls':0,'questionBankWrites':0,'teacherApproved':False})
    with process_lock(folder/'.writer.lock'):
        try:
            save('RUNNING')
            for code,row in sorted(wanted.items()):
                card=cards[code];source_sha=card['sourceSha256'];key=keys.get((source_sha,card['keyEvidenceSha256']));members=[];issues=[]
                if (not key or key['status']!='SOURCE_KEY_VERIFIED' or card['keyEvidenceSha256']!=key['keyEvidenceSha256']
                        or not any(a['number']==card['printedNumber'] and a['answer']==card['answer'] for a in key['sourceAnswers'])):
                    raise ValueError('Original diagnostic key binding changed')
                card['sourcePath']=key['sourcePath']
                if digest(card['image'])!=card['imageSha256']:raise ValueError('Prepared original source image changed')
                candidates=[(match,source,old) for match in row['exactTextCandidates']
                    if match['status']==('SOURCE_OR_SCOPE_REVIEW_REQUIRED' if args.source_exceptions else match_status)
                    for source,old in old_by_code[match['code']]]
                document(card['sourcePath'],source_sha)
                for match,source,old in candidates:document(source['sourcePath'],source['sourceSha256'])
                identity={'sourceImageSha256':card['imageSha256'],'sourceTextSha256':card['textSha256'],
                    'sourceKeyEvidenceSha256':card['keyEvidenceSha256'],'sourceQuestion':code,'readers':readers,
                    'originalLocators':[(s['sourceSha256'],o['sourceLocator'],o['currentQuestionStamp'],o['currentImageSha256']) for m,s,o in candidates],
                    'rendererVersion':pymupdf.VersionBind}
                cache=folder/(signature(identity)+'.json')
                cache=previous.get(cache_identity(identity),cache)
                if cache.is_file():
                    cached=read_json(cache)
                    if cache_identity(cached['identity'])!=cache_identity(identity):raise ValueError('Original source identity cache changed')
                    proven={p['canonicalCode'] for p in cached['result']['sourceIdentityProofs']}
                    for match,source,old in candidates:
                        if match['code'] in proven:prove_original_link(card,by_code[match['code']],old)
                        if digest(APP/'veri/resimler-pilot'/by_code[match['code']]['image'])!=old['currentImageSha256']:raise ValueError('Current canonical image changed')
                    results.append({**cached['result'],'evidencePath':str(cache),'evidenceSha256':digest(cache)});hits+=1;continue
                if args.limit is not None and new>=args.limit:break
                for match,source,old in candidates:
                    try:
                        current=by_code[match['code']];prove_original_link(card,current,old)
                        if digest(APP/'veri/resimler-pilot'/current['image'])!=old['currentImageSha256']:raise ValueError('Current canonical image changed')
                        if len(card.get('sourceRegions',[]))>1:raise ValueError('Shared/composite question needs its own complete source-region proof')
                        left=document(card['sourcePath'],source_sha)[card['pdfPage']-1]
                        right=document(source['sourcePath'],source['sourceSha256'])[old['originalOccurrence']['page_number']-1]
                        if args.mocks:
                            expected=int(card['sectionId'].split(':')[1])
                            if key['sectionId']!=card['sectionId'] or section_number(left.get_text(),card['exam'])!=expected or section_number(right.get_text(),card['exam'])!=expected:
                                raise ValueError('Actual source and original book printed section differ')
                        else:
                            expected={(card['exam'],key['testNumber'])}
                            if test_identities(left.get_text())!=expected or test_identities(right.get_text())!=expected:
                                raise ValueError('Actual printed source/book test identity differs')
                        a,coverage_a=page_geometry(left,source_sha);b,coverage_b=page_geometry(right,source['sourceSha256'])
                        first=[r for r in a if r['number']==card['printedNumber']];second=[r for r in b if r['number']==card['printedNumber']]
                        if coverage_a or coverage_b or len(first)!=1 or len(second)!=1:raise ValueError('Complete original page/body boundary proof required')
                        if first[0]['bboxPt']!=card['bboxPt'] or second[0]['bboxPt']!=card['bboxPt']:
                            raise ValueError('Exact original question bounding boxes differ')
                        proof=compare_question(left,right,card['bboxPt'])
                        if proof['status']!='INDIVIDUAL_ORIGINAL_NATIVE_AND_TWO_DPI_PIXELS_IDENTICAL':raise ValueError(proof['status'])
                        members.append({'canonicalCode':current['code'],'canonicalVersion':current['stamp'],
                            'canonicalImageSha256':old['currentImageSha256'],'officialBookSha256':source['sourceSha256'],
                            'officialPhysicalPage':right.number+1,'officialSourceLocator':old['sourceLocator'],
                            'printedNumber':card['printedNumber'],'printedAnswer':card['answer'],'questionBodyProof':proof})
                    except ValueError as exc:issues.append(str(exc))
                if not candidates:issues.append('NO_EXACT_OLD_OFFICIAL_BOOK_CANDIDATE_IDENTITY_REMAINS_UNRESOLVED')
                canonical={m['canonicalCode'] for m in members}
                status=('EXACT_OFFICIAL_QUESTION_NATIVE_TWO_DPI_AND_PRIOR_CANONICAL_LINK_KEEP_ID' if len(canonical)==1 else
                    'MULTIPLE_PROVEN_EXISTING_CANONICAL_IDS_KEEP_ALL_AND_REVIEW_MERGE' if args.mocks and len(canonical)>1 else
                    'MOCK_ORIGINAL_SOURCE_IDENTITY_REVIEW_REQUIRED' if args.mocks else 'DIAGNOSTIC_ORIGINAL_SOURCE_IDENTITY_REVIEW_REQUIRED')
                result={'sourceCode':code,'sourceSha256':source_sha,'status':status,
                    'canonicalCode':next(iter(canonical)) if len(canonical)==1 else None,'sourceIdentityProofs':members,'issues':issues,
                    'fineTopicAccepted':False,'newQuestionAdmissionAccepted':False,'teacherApproved':False}
                if args.mocks:
                    result['canonicalCodes']=sorted(canonical);result['sourceSubjectReviewRequired']=bool(args.combined or args.source_exceptions)
                write_json(cache,{'identity':identity,'result':result})
                results.append({**result,'evidencePath':str(cache),'evidenceSha256':digest(cache)});new+=1
                if len(results)%100==0:save('RUNNING');print('Diagnostic official source identities',len(results),'/',len(wanted),dict(Counter(r['status'] for r in results)),flush=True)
            after,_=live_bank(APP)
            if signature(after)!=bank_sha or any(digest(p)!=sha for p,sha in {**inputs,**packages,**source_hashes}.items()):raise ValueError('Current bank/source evidence changed during original identity proof')
            save('COMPLETE' if len(results)==len(wanted) else 'PARTIAL')
        except BaseException:save('INTERRUPTED');raise
        finally:
            for doc in documents.values():doc.close()
    print({k:v for k,v in read_json(folder/'report.json').items() if k not in ['results','inputs','sourcePackages','actualOriginalPdfHashesVerified','readerFiles']})


if __name__=='__main__':main()
