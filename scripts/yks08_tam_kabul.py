"""Finalize YKS-08 with explicit preservation or exclusion, never a guessed NEW.

The user asked that unprovable source candidates leave the intake immediately.
This script turns the complete YKS-07 decision set into one immutable YKS-08
decision ledger. It changes neither the question bank nor prior identities.
"""
from collections import Counter
from pathlib import Path
import argparse
import shutil

from yks_birlestirme import Store, digest, read_json, signature, write_json
from yks_pilot_kaynaklari import APP
from yks_stages.stage_07 import quality_proof

FOLDER = 'selected-yks08-full-acceptance'
PROTECTED = {
    'PRESERVE_EXISTING_ID_NO_NEW_QUESTION',
    'REUSE_PREFERRED_LOCATOR_NO_NEW_QUESTION',
    'KEEP_ISOLATED_PROOF_NO_PRODUCTION',
}


def final_action(source_action, compared):
    if compared is not None:
        if compared['action'] != 'EXCLUDE_NO_RETRY':
            raise ValueError('Selected candidate cannot be silently admitted')
        return 'EXCLUDE_NO_RETRY', compared['reason']
    if source_action in PROTECTED:
        return source_action, 'PRESERVE_FROZEN_PREVIOUS_IDENTITY_OR_PILOT_PROOF'
    if source_action == 'EXCLUDE_NO_RETRY':
        return 'EXCLUDE_NO_RETRY', 'SOURCE_EVIDENCE_NOT_ELIGIBLE_FOR_NEW_INTAKE'
    raise ValueError('Every source disposition requires a final YKS-08 action')


def build(root, folder):
    inputs = {}
    def load(relative):
        path = root / relative
        inputs[str(path)] = digest(path)
        return read_json(path)
    source_stage = load('selected-yks07-acceptance/report.json')
    source_decisions = load('selected-yks07-acceptance/question-dispositions.json')['results']
    compared = load('selected-yks08-comparison/report.json')
    protected = load('selected-yks08-comparison/protected-identities.json')['results']
    queue = load('source-intake-queue/report.json')
    if source_stage['status'] != 'PASS' or source_stage['questionBankWrites']:
        raise ValueError('Current full source decision set is required')
    if compared['status'] != 'PASS' or compared['newQuestionsAccepted'] or compared['questionBankWrites']:
        raise ValueError('Read-only selected comparison is required')
    by_code = {row['sourceCode']: row for row in compared['results']}
    source_codes = {row['sourceCode'] for row in source_decisions}
    if len(source_codes) != len(source_decisions) or not set(by_code) <= source_codes:
        raise ValueError('Final comparison/source-decision identities differ')
    queue_by_code = {row['sourceCode']: row for row in queue['results']}
    if not {row['sourceCode'] for row in protected} <= set(queue_by_code):
        raise ValueError('Protected identity is absent from the original queue')
    decisions = []
    for row in source_decisions:
        action, reason = final_action(row['action'], by_code.get(row['sourceCode']))
        prior = queue_by_code.get(row['sourceCode'])
        # Summary exclusions predate the common source queue and therefore do
        # not have an old canonical-ID column. They are final exclusions, not
        # absent identities to reconstruct.
        existing = row.get('existingCanonicalCodes', [])
        if prior and existing != prior['existingCanonicalCodes']:
            raise ValueError('A prior canonical identity changed during YKS-08')
        decisions.append({
            'sourceCode': row['sourceCode'], 'sourceSha256': row['sourceSha256'],
            'action': action, 'reason': reason, 'existingCanonicalCodes': existing,
            'classification': ('EXISTING' if action == 'PRESERVE_EXISTING_ID_NO_NEW_QUESTION'
                               else 'PREFERRED_LOCATOR' if action == 'REUSE_PREFERRED_LOCATOR_NO_NEW_QUESTION'
                               else 'ISOLATED_PILOT_PROOF' if action == 'KEEP_ISOLATED_PROOF_NO_PRODUCTION'
                               else 'UNPROVEN_OR_AMBIGUOUS_EXCLUDED'),
            'retryAllowed': False, 'learnerVisible': False,
            'productionImportAllowed': False, 'newQuestionAccepted': False,
        })
    counts = Counter(row['action'] for row in decisions)
    if counts['EXCLUDE_NO_RETRY'] != source_stage['questionActions']['EXCLUDE_NO_RETRY'] + len(by_code):
        raise ValueError('Every selected source candidate must replace, rather than add to, a source disposition')
    if sum(counts.values()) != len(source_decisions):
        raise ValueError('YKS-08 must dispose every source decision once')
    for row in protected:
        decision = next(d for d in decisions if d['sourceCode'] == row['sourceCode'])
        if decision['action'] != row['action'] or decision['existingCanonicalCodes'] != row['existingCanonicalCodes']:
            raise ValueError('Existing identity or locator changed')
    out = folder / 'final-dispositions.json'
    write_json(out, {'results': decisions, 'retryAllowed': False,
                     'questionBankWrites': 0, 'oldIdsMergedOrDeleted': 0})
    report = {
        'status': 'PASS',
        'scope': 'ALL_SELECTED_YKS07_SOURCE_DECISIONS_CURRENT_BANK_DUPLICATE_VARIANT_AMBIGUITY_FINALIZED',
        'sourceDecisionObservations': len(decisions),
        'currentBankSnapshotSha256': compared['bankSnapshotSha256'],
        'currentBankImagesChecked': compared['currentBankImageStampsChecked'],
        'frozenComparisonsReused': compared['frozenSourceComparisonsReused'],
        'comparisonEvidenceMissingExcluded': compared['noComparisonProofExcluded'],
        'actions': dict(counts),
        'classifications': dict(Counter(row['classification'] for row in decisions)),
        'protectedIdentityObservations': len(protected),
        'noNewQuestions': True, 'newQuestionCodes': [],
        'newQuestionsAccepted': 0, 'questionBankWrites': 0,
        'oldIdsMergedOrDeleted': 0, 'sourceRepairAttempts': 0,
        'newModelCalls': 0, 'newOcrCalls': 0, 'newVisualEmbeddingCalls': 0,
        'learnerPublication': False, 'teacherApproved': False,
        'fullYks08ReadyForAcceptance': True,
        'inputs': inputs, 'finalDispositions': str(out),
        'finalDispositionsSha256': digest(out), 'toolSha256': digest(Path(__file__)),
    }
    if any(digest(path) != sha for path, sha in inputs.items()):
        raise ValueError('Inputs changed during full YKS-08 decision')
    write_json(folder / 'report.json', report)
    print({k: v for k, v in report.items() if k not in {'inputs'}})


def accept(store, state, root, folder):
    report_path = folder / 'report.json'
    report = read_json(report_path)
    if report['status'] != 'PASS' or not report['fullYks08ReadyForAcceptance']:
        raise ValueError('Final YKS-08 decision ledger required')
    for path, sha in report['inputs'].items():
        if not Path(path).is_file() or digest(path) != sha:
            raise ValueError('YKS-08 source changed: ' + path)
    if digest(report['finalDispositions']) != report['finalDispositionsSha256']:
        raise ValueError('Final YKS-08 decision ledger changed')
    quality, _ = quality_proof(APP, 'YKS-08')
    base = APP.parent.parent
    files = {str(Path(path).relative_to(base)): sha for path, sha in {
        **report['inputs'], str(report_path): digest(report_path),
        str(Path(report['finalDispositions'])): digest(report['finalDispositions']),
        str(Path(__file__)): digest(Path(__file__)), str(quality): digest(quality),
    }.items()}
    inputs = {'fileBase': str(base), 'files': files,
              'scopePolicy': 'PRESERVE_PROVEN_IDENTITIES_AND_EXCLUDE_UNPROVEN_NEW_INTAKE'}
    def operation(attempt, cursor, checkpoint):
        artifacts = []
        for source in [report_path, Path(report['finalDispositions']), quality]:
            target = attempt / source.name
            shutil.copyfile(source, target)
            artifacts.append(target)
        result = {**report, 'fullYks08Complete': True,
                  'acceptanceMeaning': 'EVERY_SOURCE_DECISION_IS_PRESERVED_OR_EXCLUDED;_NO_NEW_QUESTION_ENTERED',
                  'remainingAcceptance': ['YKS-09 has zero eligible new-question packages',
                                          'YKS-10 no-transfer transition acceptance'],
                  'productionImportAllowed': False}
        target = attempt / 'full-duplicate-decision-acceptance.json'
        write_json(target, result); artifacts.append(target)
        checkpoint({'phase': 'all-current-source-decisions-finalized', 'questionBankWrites': 0,
                    'newQuestionCodes': []})
        return {'status': 'PASS', 'artifacts': artifacts, 'summary': result,
                'nextAction': 'YKS-09 full: record the empty, unpublished package and exclusions'}
    print(store.execute('YKS-08', 'full', inputs, operation))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--accept', action='store_true')
    args = parser.parse_args()
    store = Store(APP / 'veri/yks-birlestirme'); state = store.current()
    if store.verify(state, 'YKS-07', 'full')['status'] != 'VERIFIED':
        raise ValueError('YKS-07 selected full acceptance is required')
    root = store.child(state['runId']); folder = root / FOLDER; folder.mkdir(exist_ok=True)
    if args.accept: accept(store, state, root, folder)
    else: build(root, folder)


if __name__ == '__main__': main()
