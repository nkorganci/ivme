"""Close page/key work on the user's provable subset; exclude, never rescue.

This gate verifies frozen pixels and two printed-key readings, not question
semantics, fine topics, novelty or publication. Existing IDs are preserved.
"""
import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
import shutil

from yks_birlestirme import Store, digest, read_json, write_json, signature
from yks_pilot_kaynaklari import APP
from yks_dogrulanabilir_secim import POLICY_PATH

FOLDER = 'selected-yks07-acceptance'


def key_identity(card):
    return (card['sourceSha256'], card.get('sectionId') or card.get('testId'), card['printedNumber'])


def source_problems(card, key):
    problems = list(card.get('reviewConcerns', [])) + list(card.get('sourceConcerns', []))
    if problems:
        return problems
    if not key or key['answer'] != card.get('answer', card.get('printedAnswer')):
        return ['TWO_INDEPENDENT_PRINTED_KEY_READINGS_NOT_BOUND']
    if card.get('keyEvidenceSha256') and card['keyEvidenceSha256'] != key['evidenceSha256']:
        return ['PRINTED_KEY_EVIDENCE_VERSION_DIFFERS']
    if card.get('sourceKeyPage', key['physicalKeyPage']) != key['physicalKeyPage'] or (
            card.get('sourceKeyDocumentSha256', key['keySourceSha256']) != key['keySourceSha256']):
        return ['PRINTED_KEY_PHYSICAL_LOCATION_DIFFERS']
    if not card.get('image') or not card.get('imageSha256') or not card.get('sourceRegions'):
        return ['COMPLETE_ORIGINAL_REGION_PIXEL_PROOF_UNAVAILABLE']
    if not card.get('pixelProof'):
        return ['ORIGINAL_REGION_PIXEL_PROOF_UNAVAILABLE']
    if card.get('optionCounts') and card['optionCounts'] != {c: 1 for c in 'ABCDE'}:
        return ['FIVE_ORIGINAL_OPTIONS_NOT_VERIFIABLE']
    return []


def scope_problems(row):
    if row and (row['sourceSubjectReviewRequired'] or row['examAssociationReviewRequired']
                or row.get('controlledCandidateState') == 'PRINTED_DISCIPLINE_RANGE_REVIEW_REQUIRED'):
        return ['SOURCE_SCOPE_NOT_YET_VERIFIABLE']
    return []


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--accept', action='store_true')
    args = parser.parse_args()
    store = Store(APP / 'veri/yks-birlestirme'); state = store.current()
    root = store.child(state['runId']); folder = root / FOLDER
    folder.mkdir(exist_ok=True)
    if args.accept:
        accept(store, state, root, folder)
        return
    build(root, folder)


def build(root, folder):
    tracked = {}
    def load(relative):
        path = root / relative; tracked[str(path)] = digest(path)
        return read_json(path)
    def unchanged(path, expected):
        path = Path(path)
        if str(path) not in tracked:
            if not path.is_file(): return False
            tracked[str(path)] = digest(path)
        return tracked[str(path)] == expected
    policy = read_json(POLICY_PATH); tracked[str(POLICY_PATH)] = digest(POLICY_PATH)
    if policy['unresolvedAction'] != 'EXCLUDE_NO_RETRY' or policy['retryKnownSourceExceptions']:
        raise ValueError('User exclusion/no-retry policy required')
    coverage = load('full-source-coverage/report.json')
    rows_path = root / 'full-source-coverage/sources.jsonl'
    if not unchanged(rows_path, coverage['sourcesJsonlSha256']):
        raise ValueError('Full per-PDF observations changed')
    sources = [json.loads(line) for line in rows_path.read_text(encoding='utf-8').splitlines()]
    if len({r['sourceSha256'] for r in sources}) != coverage['uniquePdfs']:
        raise ValueError('Every original PDF requires one unique disposition')
    by_sha = {r['sourceSha256']: r for r in sources}
    for r in sources:
        if r['pageCount'] < 1 or r['observedPages'] != r['pageCount']:
            raise ValueError('Full physical page observation required')
    if sum(r['observedPages'] for r in sources) != coverage['observedPages']:
        raise ValueError('Physical page coverage differs')
    summary = load('verified-source-selection/report.json')
    if not summary['summarySourceDispositionComplete'] or summary['remainingPrintedKeyCells']:
        raise ValueError('Summary dispositions must be complete')
    selected_summary = load('verified-source-selection/source-evidence-candidates.json')['cards']
    excluded_summary = load('verified-source-selection/exclusions.json')['results']
    summary_keys = load('physics-summary-effective-key-regions/report.json')
    queue = load('source-intake-queue/report.json')
    decisions = load('verified-source-selection/main-queue-policy.json')['results']
    actions = {r['sourceCode']: r['action'] for r in decisions}
    cards = {}
    for path, expected in queue['sourcePackages'].items():
        if not unchanged(path, expected): raise ValueError('Frozen original source package changed')
        for card in read_json(path)['cards']:
            cards[card['code']] = card
    amendments = load('din-question-amendments/report.json')
    if not unchanged(amendments['amendedPackage'], amendments['amendedPackageSha256']):
        raise ValueError('Frozen source amendment changed')
    for card in read_json(amendments['amendedPackage'])['cards']: cards[card['code']] = card
    if set(cards) != {r['sourceCode'] for r in queue['results']} or set(actions) != set(cards):
        raise ValueError('Every observed question must have exactly one disposition')
    keys = {}
    for r in load('pdf-on-tarama/full-mock-keys/progress.json')['results']:
        if r['status'] != 'SOURCE_MOCK_KEY_VERIFIED': continue
        for sec in r['sections']:
            if sec['status'] != 'TWO_PRINTED_SOURCE_READINGS_AGREE' or sec['answers'] != sec['independentAnswers']: continue
            if not unchanged(sec['evidencePath'], sec['keyEvidenceSha256']): continue
            if not unchanged(sec['cropPath'], sec['cropSha256']): continue
            for pair in sec['answers']:
                keys[(r['sourceSha256'], sec['sectionId'], pair['number'])] = {
                    'answer': pair['answer'], 'evidenceSha256': sec['keyEvidenceSha256'],
                    'physicalKeyPage': r['sourceKeyPage'], 'keySourcePath': r['sourcePath'],
                    'keySourceSha256': r['sourceSha256'], 'readingMethod': sec['readingMethod']}
    for r in load('new-book-keys/din/progress.json')['results']:
        if r.get('nativePrintedAnswers') != r.get('independentPrintedAnswers') or not r.get('independentPrintedAnswers'): continue
        if not unchanged(r['evidencePath'], r['evidenceSha256']) or not unchanged(r['cropPath'], r['cropSha256']): continue
        for pair in r['nativePrintedAnswers']:
            keys[(r['sourceSha256'], r['sectionId'], pair['number'])] = {
                'answer': pair['answer'], 'evidenceSha256': r['evidenceSha256'],
                'physicalKeyPage': r['physicalKeyPage'], 'keySourcePath': r['sourcePath'],
                'keySourceSha256': r['sourceSha256'], 'readingMethod': 'NATIVE_PLUS_INDEPENDENT_PRINTED_KEY_IMAGE'}
    for r in summary_keys['results']:
        if 'ACTUAL_ORIGINAL_STRIP_OCR_AND_QWEN_AGREE' not in r['sourceReadingMethods']: continue
        for pair in r['printedRegionAnswers']:
            keys[(r['sourceSha256'], None, pair['number'])] = {
                'answer': pair['answer'], 'evidenceSha256': tracked[str(root/'physics-summary-effective-key-regions/report.json')],
                'physicalKeyPage': 1, 'keySourcePath': r['sourcePath'],
                'keySourceSha256': r['sourceSha256'], 'readingMethod': 'ACTUAL_ORIGINAL_STRIP_OCR_AND_QWEN_AGREE'}
    results, selected = [], []
    def assess(card, row=None):
        code = card.get('code', card.get('sourceCode')); sha = card['sourceSha256']
        key = keys.get(key_identity(card)); problems = source_problems(card, key)
        if not problems: problems = scope_problems(row)
        if not problems:
            regions = card['sourceRegions']
            if any(not 1 <= p['pdfPage'] <= by_sha[sha]['pageCount'] for p in regions):
                problems = ['ORIGINAL_PHYSICAL_PAGE_OUT_OF_RANGE']
            elif not unchanged(card['image'], card['imageSha256']):
                problems = ['ORIGINAL_IMAGE_UNAVAILABLE_OR_CHANGED']
            elif not unchanged(key['keySourcePath'], key['keySourceSha256']):
                problems = ['ORIGINAL_KEY_SOURCE_UNAVAILABLE_OR_CHANGED']
            else:
                proof = card['pixelProof']
                if 'path' in proof:
                    if not unchanged(proof['path'], proof['sha256']):
                        problems = ['ORIGINAL_PIXEL_PROOF_UNAVAILABLE_OR_CHANGED']
                    else:
                        saved = read_json(proof['path'])
                        pixels = saved['pixelProof']
                        if saved.get('imageSha256') != card['imageSha256'] or not pixels.get('sourceAndPreparedPixelsEqual') or pixels.get('sourceRegions') != regions:
                            problems = ['ORIGINAL_PIXELS_OR_SOURCE_REGIONS_NOT_EQUAL']
                elif not card.get('originalSourcePixelsEqual') or not card.get('preparedCropActuallyRead'):
                    problems = ['ORIGINAL_SUMMARY_PIXELS_NOT_ACTUALLY_VERIFIED']
        action = 'EXCLUDE_NO_RETRY' if problems else 'PDF_BODY_AND_TWO_PRINTED_KEY_READINGS_VERIFIED'
        result = {'sourceCode': code, 'sourceSha256': sha, 'action': action, 'reasons': problems,
            'existingCanonicalCodes': [] if row is None else row['existingCanonicalCodes'],
            'learnerVisible': False, 'productionImportAllowed': False, 'retryAllowed': False}
        if not problems:
            selected.append({**card, 'sourceCode': code, 'printedAnswer': key['answer'],
                'sourceKeyProof': key, 'yks07SourceEvidenceVerified': True,
                'questionContentAccepted': False, 'fineTopicAccepted': False,
                'noveltyAccepted': False, 'learnerVisible': False,
                'productionImportAllowed': False, 'teacherApproved': False})
        results.append(result)
    for row in queue['results']:
        code = row['sourceCode']; action = actions[code]
        if action in {'ONE_PASS_SOURCE_CONTENT_AND_TOPIC_CHECK_ONLY_SKIP_IF_NOT_PROVABLE'}:
            assess(cards[code], row)
        else:
            results.append({'sourceCode': code, 'sourceSha256': row['sourceSha256'], 'action': action,
                'reasons': ['USER_POLICY_KEEP_EXISTING_ID_OR_FINAL_EXCLUSION'],
                'existingCanonicalCodes': row['existingCanonicalCodes'], 'learnerVisible': False,
                'productionImportAllowed': False, 'retryAllowed': False})
    for card in selected_summary: assess(card)
    results.extend(excluded_summary)
    if len({r['sourceCode'] for r in results}) != len(results):
        raise ValueError('A question identity cannot receive two dispositions')
    by_source = defaultdict(list)
    for card in selected: by_source[card['sourceSha256']].append(card)
    source_results, page_results = [], []
    for source in sources:
        sha = source['sourceSha256']; source_cards = by_source[sha]
        preserve = source['state'] == 'PRIOR_TRANSFER_CURRENT_LINKS_REVALIDATED_DO_NOT_REIMPORT'
        action = 'ONLY_EXPLICITLY_BOUND_QUESTIONS_SELECTED_OTHER_CONTENT_EXCLUDED_NO_RETRY' if source_cards else (
            'PRESERVE_EXISTING_IDS_NO_NEW_EXTRACTION' if preserve else 'EXCLUDE_NEW_EXTRACTION_NO_RETRY')
        source_results.append({'sourceSha256': sha, 'physicalPages': source['pageCount'],
            'observedPages': source['observedPages'], 'action': action,
            'previousObservationState': source['state'], 'selectedQuestions': len(source_cards),
            'absenceClaimed': False, 'sourceFileDeleted': False, 'retryAllowed': False,
            'existingIdsPreserved': True, 'learnerVisible': False, 'productionImportAllowed': False})
        for n in range(1, source['pageCount'] + 1):
            body_codes = [c['sourceCode'] for c in source_cards if any(p['pdfPage'] == n for p in c['sourceRegions'])]
            key_codes = [c['sourceCode'] for c in source_cards if c['sourceKeyProof']['physicalKeyPage'] == n
                         and c['sourceKeyProof']['keySourceSha256'] == sha]
            page_results.append({'sourceSha256': sha, 'pdfPage': n, 'sourceBodyCodes': body_codes,
                'printedKeyCodes': key_codes, 'action': 'SELECTED_EXPLICIT_BODY_OR_KEY_ONLY' if body_codes or key_codes else action,
                'otherContentAction': 'EXCLUDE_NEW_EXTRACTION_NO_RETRY', 'absenceClaimed': False})
    selected_path = folder/'source-candidates.json'; disposition_path = folder/'question-dispositions.json'
    sources_path = folder/'source-dispositions.json'; pages_path = folder/'page-dispositions.jsonl'
    write_json(selected_path, {'cards': selected, 'scope': 'PDF_BODY_KEY_EVIDENCE_ONLY_NO_CONTENT_OR_TOPIC_ACCEPTANCE'})
    write_json(disposition_path, {'results': results, 'retryAllowed': False, 'questionBankWrites': 0})
    write_json(sources_path, {'results': source_results, 'retryAllowed': False, 'sourceWrites': 0})
    pages_path.write_text(''.join(json.dumps(r, ensure_ascii=False)+'\n' for r in page_results), encoding='utf-8')
    outputs = {str(p): digest(p) for p in [selected_path, disposition_path, sources_path, pages_path]}
    report = {'status': 'PASS', 'scope': 'ALL_PDF_PAGE_DISPOSITIONS_USER_SELECTED_PROVABLE_BODY_KEY_SUBSET',
        'uniquePdfs': len(sources), 'observedPhysicalPages': len(page_results),
        'questionObservationsDisposed': len(results), 'selectedSourceEvidenceQuestions': len(selected),
        'questionActions': dict(Counter(r['action'] for r in results)),
        'sourceActions': dict(Counter(r['action'] for r in source_results)),
        'inputs': tracked, 'outputs': outputs, 'fullStageReadyForAcceptance': True,
        'newModelCalls': 0, 'newOcrCalls': 0, 'newRenders': 0, 'sourceRepairAttempts': 0,
        'sourceWrites': 0, 'questionBankWrites': 0, 'oldIdsMergedOrDeleted': 0,
        'newQuestionAdmissionAccepted': False, 'fullYks08Accepted': False, 'fullYks09Accepted': False,
        'teacherApproved': False, 'toolSha256': digest(Path(__file__))}
    write_json(folder/'report.json', report)
    print({k: v for k, v in report.items() if k not in ['inputs','outputs']})


def accept(store, state, root, folder):
    from yks_stages.stage_07 import quality_proof
    file = folder/'report.json'; report = read_json(file)
    if report['status'] != 'PASS' or not report['fullStageReadyForAcceptance']:
        raise ValueError('Actual selected full-scope evidence required')
    for p, sha in {**report['inputs'], **report['outputs']}.items():
        if not Path(p).is_file() or digest(p) != sha: raise ValueError('Selected source evidence changed: '+p)
    quality_path, _ = quality_proof(APP, 'YKS-07')
    base = APP.parent.parent
    files = {str(Path(p).relative_to(base)): sha for p, sha in {**report['inputs'], **report['outputs'],
        str(file): digest(file), str(Path(__file__)): digest(Path(__file__)), str(quality_path): digest(quality_path)}.items()}
    inputs = {'fileBase': str(base), 'files': files,
        'scopePolicy': 'USER_SELECTED_PROVABLE_SUBSET_WITH_FINAL_NO_RETRY_EXCLUSIONS'}
    def operation(attempt, cursor, checkpoint):
        result = {**report, 'fullYks07Complete': True,
            'acceptanceMeaning': 'EVERY_PDF_PAGE_DISPOSED_ONLY_BOUND_PIXELS_AND_TWO_SOURCE_KEY_READINGS_ADVANCE',
            'remainingAcceptance': ['YKS-08 current bank duplicate/variant/novelty decisions',
                'YKS-09 actual content and controlled fine-topic acceptance', 'YKS-10 full transition acceptance'],
            'questionContentAccepted': False, 'productionImportAllowed': False}
        artifacts = []
        for source in [file, quality_path] + [Path(p) for p in report['outputs']]:
            target = attempt/source.name; shutil.copyfile(source, target); artifacts.append(target)
        target = attempt/'selected-full-source-acceptance.json'; write_json(target, result); artifacts.append(target)
        checkpoint({'phase': 'selected-full-source-page-body-key-evidence-complete', 'questionBankWrites': 0})
        return {'status': 'PASS', 'artifacts': artifacts, 'summary': result,
            'nextAction': 'Continue YKS-08 using selected source-candidates.json; never re-open excluded sources'}
    print(store.execute('YKS-07', 'full', inputs, operation))


if __name__ == '__main__': main()
