"""Accept the actual bounded isolated pilot, never full archive or live cutover."""
from pathlib import Path
import shutil

from yks_birlestirme import digest,signature,read_json,write_json
from yks_izole_kanit import validate
from yks_stages.stage_07 import quality_proof

FILES=['scripts/yks_stages/stage_10.py','scripts/yks_izole_kanit.py','scripts/yks_izole_prova.py',
    'scripts/yks-pilot-fixtures/YksSourcePilotTest.java','testler/yks-isolated-proof-test.py']


def inputs(app,store,state):
    root=store.child(state['runId']);proof=validate(app,root);quality={}
    for task in ['YKS-07','YKS-08','YKS-09','YKS-10']:
        path,_=quality_proof(app,task);quality[task]={'path':str(path),'sha256':digest(path)}
    risk=root/'pilot-riskleri/risk-matrix-report.json'
    return {'version':1,'fileBase':str(app),'files':{p:digest(app/p) for p in FILES},
        'actualIsolatedProof':proof,'quality':quality,'riskMatrixSha256':digest(risk),
        'sourceKeyPilotSignature':state['stages']['YKS-07:pilot']['inputSignature'],
        'duplicatePilotSignature':state['stages']['YKS-08:pilot']['inputSignature'],
        'sourcePackageSignature':state['stages']['YKS-09:pilot']['inputSignature']}


def operation(app,store,state):
    expected=inputs(app,store,state);root=store.child(state['runId'])
    def perform(folder,cursor,checkpoint):
        if folder.parent.name!='pilot':raise ValueError('Full archive/cutover acceptance is not implemented; bounded pilot only')
        risk=read_json(root/'pilot-riskleri/risk-matrix-report.json')
        if len(risk['risks'])<10:raise ValueError('Required representative source risks missing')
        for item in risk['sourceProofs'].values():
            if digest(root/item['path'])!=item['sha256']:raise ValueError('Pilot risk source evidence changed')
        artifacts=[]
        for name,data in expected['quality'].items():
            target=folder/(name+'-quality-report.json');shutil.copyfile(data['path'],target);artifacts.append(target)
        actual=read_json(root/'isolated-pilot/isolated-import-report.json')
        for source,name in [(root/'isolated-pilot/isolated-import-report.json','actual-isolated-import-report.json'),
                (Path(actual['testProofPath']),'actual-backend-proof.json'),(Path(actual['logPath']),'actual-isolated-import.log')]:
            target=folder/name;shutil.copyfile(source,target);artifacts.append(target)
        for i,path in enumerate(expected['actualIsolatedProof']['xmlAndRawLogHashes']):
            target=folder/(str(i+1)+'-'+Path(path).name);shutil.copyfile(path,target);artifacts.append(target)
        report={'status':'PASS','scope':'BOUNDED_ISOLATED_PILOT_ONLY','actualBackendTests':4,
            'sourceRiskClasses':len(risk['risks']),'existingQuestionIdsAndAnswersPreserved':12,
            'newQuestionsInTemporaryTestDatabase':3,'secondImportInserted':0,'studentAttemptAndProgressRowsPreserved':True,
            'invalidAnswerRejectsWholeBatch':True,'transactionRollbackRemovesQuestionAndIntakeRows':True,
            'realApiPreferredTopicCounts':[2,1],'newPreferredLeafTested':True,'studentResourceApiExposesAnswers':False,
            'temporaryDatabase':'ivme_test','temporaryDatabaseCleanupVerified':True,'productionQuestionWrites':0,
            'productionBankSnapshotUnchanged':True,'newModelCallsForAcceptance':0,'newOcrForAcceptance':0,
            'teacherApproved':False,'catalogPublished':False,'fullArchiveAccepted':False,'fullYks10Complete':False,
            'fullSourceScanMayProceed':True,'liveCutoverMayProceed':False,
            'remainingAcceptance':['YKS-07/08/09 full archive per-source/key/question reconciliation',
                'YKS-10 full source/path/history/UI/API acceptance before YKS-11',
                'YKS-11 controlled live catalog/source transition, YKS-12 new-only imports, YKS-13 proven duplicate cleanup']}
        if signature(inputs(app,store,state))!=signature(expected):raise ValueError('Isolated pilot acceptance inputs changed')
        target=folder/'isolated-pilot-acceptance.json';write_json(target,report);artifacts.append(target)
        checkpoint({'phase':'actual-isolated-pilot-verified','fullArchiveAccepted':False,'liveCutoverAllowed':False})
        return {'status':'PASS','artifacts':artifacts,'summary':report,
            'nextAction':'YKS-07.full: implement resumable full PDF/key coverage using valid existing observations and printed-source evidence; no live cutover yet'}
    return perform
