"""Apply user-directed skip/exclude policy without model calls or source repair.

This is an unpublished selection boundary, not a production import. Previous
observations remain audit evidence; only eligible source cards enter its output.
"""
from collections import Counter
from pathlib import Path

from yks_birlestirme import Store, read_json, write_json, digest
from yks_pilot_kaynaklari import APP

POLICY_PATH = Path(__file__).with_name('yks-secim-politikasi.json')
SKIP_QUEUE_STATES = {
    'BLOCKED_SOURCE_OR_PRINTED_ANSWER_EXCEPTION',
    'MULTIPLE_CANONICAL_IDENTITIES_REVIEW_REQUIRED',
    'EXISTING_BANK_CANDIDATE_REVIEW_BEFORE_ANY_NEW_INTAKE',
}


def source_exclusion_reasons(card):
    reasons = [str(x) for x in card.get('sourceConcerns', [])
               if 'HOLD' in str(x) or 'REVIEW_REQUIRED' in str(x)]
    if card.get('sourceStatementMarkerReviewRequired'):
        reasons.append('UNRESOLVED_SOURCE_STATEMENT_MARKERS')
    if card.get('sourceError'):
        reasons.append('SOURCE_PROCESSING_ERROR')
    if card.get('printedAnswer') not in ['A', 'B', 'C', 'D', 'E']:
        reasons.append('NO_EXPLICIT_PRINTED_SOURCE_ANSWER')
    if not card.get('sourceSha256') or not card.get('image') or not card.get('sourceRegions'):
        reasons.append('MISSING_ORIGINAL_SOURCE_BINDING')
    return reasons


def partition_source_cards(cards):
    selected, excluded = [], []
    seen = set()
    for card in cards:
        code = card['sourceCode']
        if code in seen:
            raise ValueError('Duplicate source identity cannot pass selection')
        seen.add(code)
        reasons = source_exclusion_reasons(card)
        if reasons:
            excluded.append({'sourceCode': code, 'sourceSha256': card.get('sourceSha256'),
                'reasons': reasons, 'action': 'EXCLUDE_NO_RETRY',
                'learnerVisible': False, 'productionImportAllowed': False})
        else:
            selected.append({**card, 'selectionStage': 'SOURCE_EVIDENCE_ONLY',
                'learnerVisible': False, 'productionImportAllowed': False,
                'newQuestionAdmissionAccepted': False, 'teacherApproved': False})
    return selected, excluded


def queue_action(row):
    if row.get('blocks') or row['status'] in SKIP_QUEUE_STATES:
        return 'EXCLUDE_NO_RETRY'
    if row['status'] == 'KEEP_EXISTING_CANONICAL_ID_DO_NOT_REIMPORT':
        return 'PRESERVE_EXISTING_ID_NO_NEW_QUESTION'
    if row['status'] == 'SAME_SOURCE_QUESTION_GROUP_USE_PREFERRED_LOCATOR':
        return 'REUSE_PREFERRED_LOCATOR_NO_NEW_QUESTION'
    if row.get('isIsolatedPilotOnly'):
        return 'KEEP_ISOLATED_PROOF_NO_PRODUCTION'
    return 'ONE_PASS_SOURCE_CONTENT_AND_TOPIC_CHECK_ONLY_SKIP_IF_NOT_PROVABLE'


def main():
    policy = read_json(POLICY_PATH)
    if policy['unresolvedAction'] != 'EXCLUDE_NO_RETRY' or policy['retryKnownSourceExceptions']:
        raise ValueError('Explicit user skip policy required')
    store = Store(APP / 'veri/yks-birlestirme')
    root = store.child(store.current()['runId'])
    folder = root / 'verified-source-selection'
    folder.mkdir(exist_ok=True)
    inputs = {str(POLICY_PATH): digest(POLICY_PATH)}
    cards = []
    def load(relative):
        path = root / relative
        inputs[str(path)] = digest(path)
        return read_json(path)
    for relative in ['physics-summary-bound-bodies/actual-crop-review.json',
                     'physics-summary-bound-bodies-02/actual-crop-review.json']:
        report = load(relative)
        if report['status'] != 'PASS':
            raise ValueError('Actually read source crops required')
        for card in report['results']:
            if not card['preparedCropActuallyRead'] or not card['originalSourcePixelsEqual'] or card.get('visibleBodyOptionCuts'):
                raise ValueError('Original complete crop evidence required')
            cards.append(card)
    five = load('physics-summary-five-body-preparation-v2/candidates.json')
    five_review = load('physics-summary-five-body-preparation-v2/report.json')
    if not five_review['cropImagesActuallyRead']:
        raise ValueError('Earlier five source image readings required')
    cards.extend(five['cards'])
    mirrors = load('physics-summary-discovery/candidates.json')
    for c in mirrors['cards']:
        cards.append({**c, 'sourceCode': c['code'], 'printedAnswer': c['answer']})
    selected, excluded = partition_source_cards(cards)
    # Do not re-read or rerender excluded images. Selected image proof must
    # still refer to exactly the saved original pixels.
    valid = []
    for c in selected:
        path = Path(c['image'])
        if not path.is_file() or digest(path) != c['imageSha256']:
            excluded.append({'sourceCode': c['sourceCode'], 'sourceSha256': c['sourceSha256'],
                'reasons': ['SAVED_SOURCE_IMAGE_UNAVAILABLE_OR_CHANGED'],
                'action': 'EXCLUDE_NO_RETRY', 'learnerVisible': False, 'productionImportAllowed': False})
            continue
        valid.append(c)
    selected_path = folder / 'source-evidence-candidates.json'
    write_json(selected_path, {'policyId': policy['policyId'],
        'scope': 'VERIFIED_SUMMARY_SOURCE_BODY_KEY_EVIDENCE_NOT_TOPIC_OR_IMPORT_ACCEPTANCE',
        'cards': valid, 'questionBankWrites': 0, 'teacherApproved': False})
    excluded_path = folder / 'exclusions.json'
    write_json(excluded_path, {'policyId': policy['policyId'], 'results': excluded,
        'retryAllowed': False, 'learnerVisible': False, 'questionBankWrites': 0})
    queue = load('source-intake-queue/report.json')
    decisions = [{'sourceCode': r['sourceCode'], 'sourceSha256': r['sourceSha256'],
        'previousStatus': r['status'], 'action': queue_action(r),
        'existingCanonicalCodes': r['existingCanonicalCodes'], 'learnerVisible': False,
        'productionImportAllowed': False} for r in queue['results']]
    queue_path = folder / 'main-queue-policy.json'
    write_json(queue_path, {'policyId': policy['policyId'], 'results': decisions,
        'retryKnownExceptions': False, 'questionBankWrites': 0})
    known = {c['sourceSha256'] for c in cards}
    keys = load('physics-summary-effective-key-regions/report.json')
    remaining = [r for r in keys['results'] if r['contiguousPrintedNumbers'] and r['sourceSha256'] not in known]
    gaps = [r['sourceSha256'] for r in keys['results'] if not r['contiguousPrintedNumbers']]
    remaining_path = folder / 'remaining-sources.json'
    write_json(remaining_path, {'scope': 'UNREAD_CLEAR_KEY_SOURCES_ONE_PASS_ONLY_SKIP_ON_ERROR',
        'results': remaining, 'knownNumberGapSourcesExcludedNoRetry': gaps,
        'sourceRepairAttempts': 0, 'questionBankWrites': 0})
    report = {'status': 'PASS', 'policyId': policy['policyId'],
        'scope': 'USER_VERIFIABLE_ONLY_PREPARATION_POLICY_NO_PRODUCTION_WRITE',
        'sourceBodiesAssessed': len(cards), 'sourceEvidenceCandidates': len(valid),
        'sourceQuestionsExcludedNoRetry': len(excluded),
        'summarySourceDocumentsAssessed': len(known),
        'remainingContiguousSummaryDocuments': len(remaining),
        'remainingPrintedKeyCells': sum(len(r['printedRegionAnswers']) for r in remaining),
        'knownNumberGapSourcesExcludedNoRetry': gaps,
        'mainQueueQuestions': len(decisions), 'mainQueueActions': dict(Counter(r['action'] for r in decisions)),
        'selectedPackage': str(selected_path), 'selectedPackageSha256': digest(selected_path),
        'exclusions': str(excluded_path), 'exclusionsSha256': digest(excluded_path),
        'queuePolicy': str(queue_path), 'queuePolicySha256': digest(queue_path),
        'remainingSources': str(remaining_path), 'remainingSourcesSha256': digest(remaining_path),
        'inputs': inputs, 'sourceRepairAttempts': 0, 'newOcrCalls': 0, 'newModelCalls': 0,
        'learnerPublication': False, 'productionImportAllowed': False,
        'questionBankWrites': 0, 'teacherApproved': False, 'fullStageAccepted': False,
        'toolSha256': digest(Path(__file__))}
    write_json(folder / 'report.json', report)
    print({k: v for k, v in report.items() if k not in ['inputs', 'knownNumberGapSourcesExcludedNoRetry']
           and not k.endswith('Sha256') and k not in ['selectedPackage', 'exclusions', 'queuePolicy', 'remainingSources']})


if __name__ == '__main__':
    main()
