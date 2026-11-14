"""Close YKS-12 with a current read-only INSERT_ONLY admission snapshot.

The selected YKS-09 package is deliberately empty.  This command records that
fact against the active YKS-11 catalog and a fresh bank snapshot.  It never
opens a student database and has no SQL write path.
"""
from pathlib import Path
import hashlib
import json

from kaynakli_arastirma_db import db_connection, query
from yks_birlestirme import Store, digest, read_json, write_json
from yks_pilot_kaynaklari import APP

FOLDER = 'selected-yks12-empty-insert-only'


def bank_snapshot():
    command, environment, _ = db_connection('ivme')
    raw = query((command, environment, None), """SELECT json_build_object(
      'questions',count(*),
      'fingerprint',md5(coalesce(string_agg(code||':'||extract(epoch from updated_at)::text,'|' ORDER BY code),'')),
      'currentCatalogRun',(SELECT run_key FROM learning_catalog.current_run)) FROM questions""")
    return json.loads(raw)


def build(root, folder):
    package_path = root / 'selected-yks09-empty-package/unpublished-package.json'
    decision_path = root / 'selected-yks09-empty-package/report.json'
    package, decision = read_json(package_path), read_json(decision_path)
    if (decision.get('status') != 'PASS' or decision.get('newQuestionsAccepted') != 0
            or decision.get('resources') != 0 or package.get('resources') or package.get('published')):
        raise ValueError('YKS-12 requires the verified empty unpublished YKS-09 package')
    current = bank_snapshot()
    report = {'status':'PASS','scope':'FULL_CURRENT_EMPTY_INSERT_ONLY_ACCEPTANCE',
        'selectedPackages':1,'plannedBatches':0,'plannedQuestionCodes':[],
        'insertOnly':True,'upsertOrMergeAllowed':False,'questionBankSnapshot':current,
        'expectedQuestionDelta':0,'actualQuestionDelta':0,'sourceLocationLinksAdded':0,
        'studentDatabaseOpened':False,'studentRowsWritten':0,'questionWrites':0,
        'idempotentSecondRunExpectedDelta':0,'excludedPolicy':'EXCLUDE_NO_RETRY',
        'inputs':{str(package_path):digest(package_path),str(decision_path):digest(decision_path)},
        'toolSha256':digest(Path(__file__))}
    write_json(folder/'report.json', report)
    print(report)


def accept(store, state, root, folder):
    report_path=folder/'report.json'; report=read_json(report_path)
    if report.get('status')!='PASS' or report['plannedBatches'] or report['plannedQuestionCodes']:
        raise ValueError('Only an empty, explicit INSERT_ONLY plan may close YKS-12')
    if any(not Path(path).is_file() or digest(path)!=sha for path,sha in report['inputs'].items()):
        raise ValueError('YKS-12 source decision changed')
    before=bank_snapshot()
    if before != report['questionBankSnapshot']:
        raise ValueError('Bank/catalog changed; rebuild the YKS-12 snapshot')
    base=APP.parent.parent
    inputs={'fileBase':str(base),'files':{
        str(report_path.relative_to(base)):digest(report_path),
        str(Path(__file__).relative_to(base)):digest(Path(__file__))},
        'bankSnapshot':before,'policy':'EMPTY_INSERT_ONLY_NO_DATABASE_WRITES'}
    def operation(attempt,cursor,checkpoint):
        after=bank_snapshot()
        if after!=before: raise ValueError('Bank/catalog changed during read-only acceptance')
        result={**report,'fullYks12Complete':True,'firstRunQuestionDelta':0,
            'secondRunQuestionDelta':0,'bankSnapshotAfter':after,
            'acceptanceMeaning':'NO_UNPROVEN_SOURCE_CANDIDATE_WAS_FORCED_INTO_THE_BANK'}
        target=attempt/'empty-insert-only-acceptance.json';write_json(target,result)
        checkpoint({'phase':'empty-insert-only-accepted','questionWrites':0,'studentRowsWritten':0})
        return {'status':'PASS','artifacts':[target],'summary':result,
            'nextAction':'YKS-13: final exact-byte source inventory and no-delete closure'}
    print(store.execute('YKS-12','full',inputs,operation))


def main():
    import argparse
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--accept',action='store_true');args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    if store.verify(state,'YKS-11','full')['status']!='VERIFIED': raise ValueError('YKS-11 full acceptance is required')
    if store.verify(state,'YKS-09','full')['status']!='VERIFIED': raise ValueError('YKS-09 full acceptance is required')
    root=store.child(state['runId']);folder=root/FOLDER;folder.mkdir(exist_ok=True)
    if args.accept:accept(store,state,root,folder)
    else:build(root,folder)


if __name__=='__main__':main()
