"""Close YKS-09 when YKS-08 has no eligible new source question.

This is deliberately an unpublished, empty package.  It records why no item
can enter a package instead of turning an excluded candidate into content.
"""
from pathlib import Path
import argparse
import shutil

from yks_birlestirme import Store, digest, read_json, signature, write_json
from yks_pilot_kaynaklari import APP
from yks_stages.stage_07 import quality_proof

FOLDER = 'selected-yks09-empty-package'


def build(root, folder, state, store):
    inputs = {}
    def load(relative):
        path = root / relative
        inputs[str(path)] = digest(path)
        return read_json(path)
    decision = load('selected-yks08-full-acceptance/report.json')
    dispositions = load('selected-yks08-full-acceptance/final-dispositions.json')['results']
    pilot_status = store.verify(state, 'YKS-09', 'pilot')['status']
    if (decision['status'] != 'PASS' or not decision['noNewQuestions']
            or decision['newQuestionCodes'] or decision['newQuestionsAccepted']):
        raise ValueError('An empty YKS-09 package is valid only after a zero-new YKS-08 decision')
    if any(row['newQuestionAccepted'] or row['productionImportAllowed'] for row in dispositions):
        raise ValueError('Final exclusions/identity preservation must prohibit import')
    manifest = {
        'schema': 'YKS-09-UNPUBLISHED-EMPTY-PACKAGE-v1',
        'scope': 'FULL_SELECTED_YKS08_DECISION_LEDGER',
        'resources': [], 'sourceCards': [], 'answerReadings': [], 'controlledLabels': [],
        'published': False, 'teacherApproved': False, 'questionBankWrites': 0,
        'excludedLedger': {
            'path': 'selected-yks08-full-acceptance/final-dispositions.json',
            'sha256': inputs[str(root / 'selected-yks08-full-acceptance/final-dispositions.json')],
            'excludedObservations': decision['actions']['EXCLUDE_NO_RETRY'],
        },
        'preservedIdentityObservations': decision['protectedIdentityObservations'],
        'separateBoundedPilotStatus': pilot_status,
        'reason': 'NO_SOURCE_CANDIDATE_HAS_POSITIVE_CURRENT_CONTENT_NOVELTY_AND_TOPIC_ADMISSION_PROOF',
    }
    target = folder / 'unpublished-package.json'; write_json(target, manifest)
    report = {
        'status': 'PASS', 'scope': 'FULL_SELECTED_SCOPE_ZERO_ELIGIBLE_NEW_QUESTIONS',
        'newQuestionCodes': [], 'newQuestionsAccepted': 0, 'resources': 0,
        'sourceCards': 0, 'twoAnswerReadings': 0, 'controlledCategories': 0,
        'questionBankWrites': 0, 'catalogPublished': False, 'teacherApproved': False,
        'sourceRepairAttempts': 0, 'newModelCalls': 0, 'newOcrCalls': 0,
        'learnerPublication': False, 'fullYks09ReadyForAcceptance': True,
        'manifest': str(target), 'manifestSha256': digest(target),
        'separateBoundedPilotStatus': pilot_status,
        'decisionLedgerSha256': manifest['excludedLedger']['sha256'],
        'excludedObservations': manifest['excludedLedger']['excludedObservations'],
        'reason': manifest['reason'], 'inputs': inputs, 'toolSha256': digest(Path(__file__)),
    }
    if any(digest(path) != sha for path, sha in inputs.items()):
        raise ValueError('YKS-08 decision changed during package closure')
    write_json(folder / 'report.json', report)
    print({key: value for key, value in report.items() if key != 'inputs'})


def accept(store, state, root, folder):
    report_path = folder / 'report.json'; report = read_json(report_path)
    if report['status'] != 'PASS' or not report['fullYks09ReadyForAcceptance']:
        raise ValueError('Passing empty-package closure is required')
    for path, sha in report['inputs'].items():
        if not Path(path).is_file() or digest(path) != sha:
            raise ValueError('YKS-09 input changed: ' + path)
    if digest(report['manifest']) != report['manifestSha256']:
        raise ValueError('YKS-09 package manifest changed')
    quality, _ = quality_proof(APP, 'YKS-09')
    base = APP.parent.parent
    files = {str(Path(path).relative_to(base)): sha for path, sha in {
        **report['inputs'], str(report_path): digest(report_path),
        str(Path(report['manifest'])): digest(report['manifest']),
        str(Path(__file__)): digest(Path(__file__)), str(quality): digest(quality),
    }.items()}
    inputs = {'fileBase': str(base), 'files': files,
              'scopePolicy': 'EMPTY_UNPUBLISHED_PACKAGE_WHEN_NO_NEW_ITEM_IS_PROVEN'}
    def operation(attempt, cursor, checkpoint):
        artifacts = []
        for source in [report_path, Path(report['manifest']), quality]:
            target = attempt / source.name; shutil.copyfile(source, target); artifacts.append(target)
        result = {**report, 'fullYks09Complete': True,
                  'acceptanceMeaning': 'NO_UNPROVEN_SOURCE_CANDIDATE_WAS_PACKAGED_OR_PUBLISHED',
                  'productionImportAllowed': False,
                  'remainingAcceptance': ['YKS-10 full no-transfer acceptance']}
        target = attempt / 'empty-package-acceptance.json'; write_json(target, result); artifacts.append(target)
        checkpoint({'phase': 'no-eligible-new-package-recorded', 'resources': 0, 'published': False})
        return {'status': 'PASS', 'artifacts': artifacts, 'summary': result,
                'nextAction': 'YKS-10 full: accept a zero-transfer transition without touching a student database'}
    print(store.execute('YKS-09', 'full', inputs, operation))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--accept', action='store_true'); args = parser.parse_args()
    store = Store(APP / 'veri/yks-birlestirme'); state = store.current()
    if store.verify(state, 'YKS-08', 'full')['status'] != 'VERIFIED':
        raise ValueError('YKS-08 full acceptance is required')
    root = store.child(state['runId']); folder = root / FOLDER; folder.mkdir(exist_ok=True)
    if args.accept: accept(store, state, root, folder)
    else: build(root, folder, state, store)


if __name__ == '__main__': main()
