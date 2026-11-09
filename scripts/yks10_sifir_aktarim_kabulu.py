"""Accept the YKS-10 full transition only when there is nothing to transfer.

The bounded pilot remains evidence of rollback/idempotency.  This full path
does not open a production student database and cannot write a question.
"""
from pathlib import Path
import argparse
import shutil

from yks_birlestirme import Store, digest, read_json, signature, write_json
from yks_pilot_kaynaklari import APP
from yks_soru_pilotu import live_bank
from yks_izole_kanit import validate as validate_isolated_pilot
from yks_stages.stage_07 import quality_proof

FOLDER = 'selected-yks10-zero-transfer'


def build(root, folder):
    inputs = {}
    def load(relative):
        path = root / relative; inputs[str(path)] = digest(path); return read_json(path)
    package = load('selected-yks09-empty-package/report.json')
    manifest = load('selected-yks09-empty-package/unpublished-package.json')
    decision = load('selected-yks08-full-acceptance/report.json')
    pilot = validate_isolated_pilot(APP, root)
    questions, _ = live_bank(APP); bank_sha = signature(questions)
    if (package['status'] != 'PASS' or package['newQuestionsAccepted'] or package['resources']
            or package['questionBankWrites'] or manifest['resources'] or manifest['published']):
        raise ValueError('YKS-10 zero-transfer acceptance requires a genuinely empty unpublished package')
    if bank_sha != decision['currentBankSnapshotSha256'] or len(questions) != decision['currentBankImagesChecked']:
        raise ValueError('Current bank differs from the final YKS-08 read-only snapshot')
    if pilot['status'] != 'PASS' or pilot['productionQuestionWrites']:
        raise ValueError('Current isolated pilot proof is required')
    report = {
        'status': 'PASS', 'scope': 'FULL_ZERO_TRANSFER_TRANSITION_ACCEPTANCE',
        'currentBankQuestionsReadOnly': len(questions), 'currentBankSnapshotSha256': bank_sha,
        'packageResources': 0, 'newQuestionCodes': [], 'newQuestionsAccepted': 0,
        'productionQuestionWrites': 0, 'productionCatalogWrites': 0,
        'studentDatabaseOpened': False, 'studentDatabaseWrites': 0,
        'studentHistoryMutated': False, 'oldIdsMergedOrDeleted': 0,
        'isolatedPilotBackendTests': pilot['backendTests'],
        'isolatedPilotTemporaryDatabase': 'ivme_test',
        'isolatedPilotSecondImportInserted': 0,
        'isolatedPilotProofSha256': pilot['reportSha256'],
        'fullYks10ReadyForAcceptance': True, 'liveCutoverPerformed': False,
        'inputs': inputs, 'toolSha256': digest(Path(__file__)),
    }
    if any(digest(path) != sha for path, sha in inputs.items()):
        raise ValueError('No-transfer input changed during acceptance')
    write_json(folder / 'report.json', report)
    print({key: value for key, value in report.items() if key != 'inputs'})


def accept(store, state, root, folder):
    report_path = folder / 'report.json'; report = read_json(report_path)
    if report['status'] != 'PASS' or not report['fullYks10ReadyForAcceptance']:
        raise ValueError('Passing zero-transfer decision is required')
    for path, sha in report['inputs'].items():
        if not Path(path).is_file() or digest(path) != sha:
            raise ValueError('YKS-10 input changed: ' + path)
    quality, _ = quality_proof(APP, 'YKS-10')
    base = APP.parent.parent
    files = {str(Path(path).relative_to(base)): sha for path, sha in {
        **report['inputs'], str(report_path): digest(report_path),
        str(Path(__file__)): digest(Path(__file__)), str(quality): digest(quality),
    }.items()}
    inputs = {'fileBase': str(base), 'files': files,
              'scopePolicy': 'READ_ONLY_ZERO_TRANSFER_NO_PRODUCTION_STUDENT_DATABASE'}
    def operation(attempt, cursor, checkpoint):
        artifacts = []
        for source in [report_path, quality]:
            target = attempt / source.name; shutil.copyfile(source, target); artifacts.append(target)
        result = {**report, 'fullYks10Complete': True,
                  'acceptanceMeaning': 'EMPTY_PACKAGE_WAS_NOT_FORCED_THROUGH_A_LIVE_CUTOVER',
                  'liveCutoverMayProceed': False,
                  'remainingAcceptance': ['YKS-11 catalog/source transition must be separately prepared and authorized']}
        target = attempt / 'zero-transfer-acceptance.json'; write_json(target, result); artifacts.append(target)
        checkpoint({'phase': 'zero-transfer-accepted', 'productionWrites': 0, 'studentDatabaseOpened': False})
        return {'status': 'PASS', 'artifacts': artifacts, 'summary': result,
                'nextAction': 'YKS-11: prepare controlled catalog/source transition; no question transfer is pending'}
    print(store.execute('YKS-10', 'full', inputs, operation))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--accept', action='store_true'); args = parser.parse_args()
    store = Store(APP / 'veri/yks-birlestirme'); state = store.current()
    if store.verify(state, 'YKS-09', 'full')['status'] != 'VERIFIED':
        raise ValueError('YKS-09 full acceptance is required')
    root = store.child(state['runId']); folder = root / FOLDER; folder.mkdir(exist_ok=True)
    if args.accept: accept(store, state, root, folder)
    else: build(root, folder)


if __name__ == '__main__': main()
