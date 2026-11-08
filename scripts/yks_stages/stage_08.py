"""Accept a bounded duplicate pilot; all other cohort questions stay deferred."""
import shutil
from pathlib import Path

from yks_birlestirme import digest,signature,read_json,write_json
from yks_pilot_kabul_secimi import prepare
from yks_stages.stage_07 import quality_proof

FILES=['scripts/yks_stages/stage_08.py','scripts/yks_pilot_kabul_secimi.py',
    'scripts/yks_soru_yenilik_kontrol.py','scripts/yks_soru_pilotu.py','scripts/yks_pilot_tekrar_incele.py']
REPORTS=['question-cohort/bank-comparison.json','question-cohort/controlled-repeat-review.json',
    'question-cohort/cohort-comparison-report.json','question-cohort/bounded-pilot-selection.json',
    'question-topics/din/secondary-bank-comparison.json',
    'soru-pilotu/008ffec26b7803aa/exact-reuse-report.json']


def inputs(app,store,state):
    root=store.child(state['runId']);selection=prepare(root)
    saved=read_json(root/REPORTS[3])
    if signature(selection)!=signature(saved):raise ValueError('Bounded pilot selection must match current source readings')
    quality,_=quality_proof(app,'YKS-08')
    return {'version':1,'fileBase':str(app),'files':{p:digest(app/p) for p in FILES},
        'reports':{p:digest(root/p) for p in REPORTS},'bankSnapshotSha256':selection['bankSnapshotSha256'],
        'selectionSha256':signature(selection),'qualityPath':str(quality),'qualitySha256':digest(quality)}


def operation(app,store,state):
    expected=inputs(app,store,state);root=store.child(state['runId'])
    def perform(folder,cursor,checkpoint):
        if folder.parent.name!='pilot':raise ValueError('Full duplicate acceptance is not implemented; bounded pilot only')
        selection=read_json(root/REPORTS[3]);reused=selection['reusedQuestions'];new=selection['newPilotQuestions']
        codes=[r['sourceCode'] for r in reused+new]
        if len(reused)!=12 or len(new)!=3 or len(set(codes))!=15:raise ValueError('Bounded pilot membership differs')
        if len(selection['deferredSourceQuestions'])!=selection['sourceCohortQuestions']-15:
            raise ValueError('Unselected source questions must stay explicitly deferred')
        artifacts=[]
        for name in REPORTS:
            target=folder/Path(name).name;shutil.copyfile(root/name,target);artifacts.append(target)
        target=folder/'quality-report.json';shutil.copyfile(expected['qualityPath'],target);artifacts.append(target)
        report={'status':'PASS','scope':selection['scope'],'sourceCohortQuestions':selection['sourceCohortQuestions'],
            'existingQuestionsReused':12,'newQuestionsForIsolatedPilot':3,'deferredQuestions':len(selection['deferredSourceQuestions']),
            'bankQuestionsCompared':80230,'bankQuestionsWithProseEvidence':80229,'bankTextExceptionsVisuallyDistinguishedForNewPilot':1,
            'selectionSha256':signature(selection),'bankSnapshotSha256':selection['bankSnapshotSha256'],
            'questionBankWrites':0,'teacherApproved':False,'fullYks08Complete':False,
            'remainingAcceptance':['All other 372 cohort questions remain deferred',
                'Full archive extraction and duplicate reconciliation remain open']}
        if signature(inputs(app,store,state))!=signature(expected):raise ValueError('Pilot duplicate inputs changed')
        target=folder/'bounded-duplicate-pilot-acceptance.json';write_json(target,report);artifacts.append(target)
        checkpoint({'phase':'bounded-duplicate-pilot-accepted','fullStageAccepted':False})
        return {'status':'PASS','artifacts':artifacts,'summary':report,
            'nextAction':'YKS-09.pilot: package only three source-read new questions; reuse twelve old IDs'}
    return perform
