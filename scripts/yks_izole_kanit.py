"""Revalidate actual isolated import evidence without repeating an unchanged DB test."""
import hashlib
from pathlib import Path
import re

from yks_birlestirme import Store,digest,signature,read_json
from test_kaniti import BACKEND_INPUTS,fingerprint,assess_backend
from yks_soru_pilotu import APP,live_bank

NODE_INPUTS=['scripts/resource-intake.mjs','scripts/content-taxonomy.mjs','scripts/learning-resource-contract.mjs',
    'frontend/src/resourceMetadata.js']


def bound_file(root,name,expected):
    path=Path(name).resolve()
    if not path.is_relative_to(root.resolve()) or not path.is_file() or digest(path)!=expected:
        raise ValueError('Bound proof file missing, outside run, or changed')
    return path


def validate(app,root):
    folder=root/'isolated-pilot';path=folder/'isolated-import-report.json';report=read_json(path)
    if report['status']!='PASS' or report['tests']!={'tests':4,'failures':0,'errors':0,'skipped':0}:
        raise ValueError('Four real successful isolated tests required')
    if report['productionQuestionWrites']!=0 or report['productionCatalogPublished'] or report['teacherApproved']:
        raise ValueError('Pilot evidence crossed its production/review boundary')
    snapshot=Path(report['sourceSnapshot']).resolve()
    if not snapshot.is_relative_to(folder.resolve()) or snapshot==app.resolve():raise ValueError('Isolated source snapshot required')
    proof_path=bound_file(root,report['testProofPath'],report['testProofSha256']);proof=read_json(proof_path)
    log=bound_file(root,report['logPath'],report['logSha256'])
    if proof['selection']!='YksSourcePilotTest' or proof['status']!='PASS':raise ValueError('Unexpected backend proof')
    identity=report['identity'];candidate=root/'yol-uyumluluk/maintenance-candidate.json'
    if digest(candidate)!=identity['candidateSha256'] or digest(snapshot/'backend/src/main/resources/content-taxonomy.json')!=identity['candidateSha256']:
        raise ValueError('Candidate maintenance taxonomy differs from the one actually tested')
    template=app/'scripts/yks-pilot-fixtures/YksSourcePilotTest.java'
    if digest(template)!=identity['testTemplateSha256'] or digest(snapshot/'backend/src/test/java/com/hedefyks/YksSourcePilotTest.java')!=digest(template):
        raise ValueError('Isolated test case source changed')
    if digest(app/'scripts/yks_izole_prova.py')!=identity['runnerSha256']:raise ValueError('Isolated test runner changed')
    # git archive uses LF; the Windows checkout may use CRLF. Compare actual
    # source bytes after that sole line-ending normalization, never ignore code.
    files=fingerprint(app,BACKEND_INPUTS)['files']
    for name in [*files,*NODE_INPUTS]:
        if name=='backend/src/main/resources/content-taxonomy.json':continue
        original=(app/name).read_bytes();copy=(snapshot/name).read_bytes()
        if original.replace(b'\r\n',b'\n')!=copy.replace(b'\r\n',b'\n'):
            raise ValueError('Current application source differs from the tested isolated copy: '+name)
    if fingerprint(snapshot,BACKEND_INPUTS)!=proof['inputs']:raise ValueError('Actual backend test inputs changed')
    raw=snapshot/'backend/target/ivme-test-son.log'
    cleanup=re.search(r'^IVME_TEST_RESULT=0\s*$',raw.read_text(encoding='utf-8'),re.M) is not None
    xml=[snapshot/'backend/target-tests/surefire-reports'/name for name in proof['reports']]
    actual=assess_backend(xml,set(),0,cleanup,'YksSourcePilotTest')
    if actual['status']!='PASS' or actual['totals']!=report['tests']:raise ValueError('Actual XML or temporary DB cleanup is not successful')
    current=Store(app/'veri/yks-birlestirme').current()
    package=next((root/a['path']).parent for a in current['stages']['YKS-09:pilot']['artifacts'] if a['path'].endswith('bounded-source-package-acceptance.json'))
    if digest(package/'bounded-source-package-acceptance.json')!=identity['sourcePackageSha256']:
        raise ValueError('Current pilot package content differs from the actual import test')
    original_package=Path(report['sourcePackage'])
    for name in ['pilot-insert-only.csv','pilot-resources-v2.json','source-cards-and-decisions.json']:
        if digest(package/name)!=digest(original_package/name):raise ValueError('Source package content changed after actual test')
    questions,_=live_bank(app)
    if signature(questions)!=identity['bankSnapshotSha256'] or not report['productionBankSnapshotUnchanged']:
        raise ValueError('Production bank comparison is stale')
    return {'status':'PASS','backendTests':4,'testProofSha256':digest(proof_path),'reportSha256':digest(path),
        'logSha256':digest(log),'xmlAndRawLogHashes':{str(p):digest(p) for p in [*xml,raw]},
        'originalApplicationInputsSha256':fingerprint(app,BACKEND_INPUTS)['sha256'],
        'candidateSha256':digest(candidate),'sourcePackageSha256':identity['sourcePackageSha256'],
        'bankSnapshotSha256':identity['bankSnapshotSha256'],'newDatabaseTestRuns':0,'productionQuestionWrites':0,'teacherApproved':False}


if __name__=='__main__':
    store=Store(APP/'veri/yks-birlestirme');state=store.current();print(validate(APP,store.child(state['runId'])))
