"""Accept only the representative source/key pilot; full PDF acceptance stays closed."""
from pathlib import Path
import shutil

from yks_birlestirme import digest,signature,read_json,write_json
from yks_pilot_kaynaklari import source_keys
from kalite import load_profile,inputs_for


FILES=['scripts/yks_stages/stage_07.py','scripts/yks_anahtar_gorsel.py','scripts/yks_pilot_kaynaklari.py',
    'scripts/yks_ayri_anahtar.py','scripts/yks_pilot_sorular.py','scripts/yks_pilot_kirpim_kontrol.py',
    'scripts/yks_deneme_anahtar_pilotu.py','scripts/yks_ortak_paragraf_pilotu.py',
    'scripts/yks_secenek_degisimi.py','scripts/yks_taranmis_zip_pilotu.py','scripts/yks_pilot_riskleri.py']
REPORTS=['pdf-on-tarama/key-cohort/source-key-scope-report.json',
    'pdf-on-tarama/key-cohort/visual-resolution-report.json',
    'pdf-on-tarama/key-cohort/separate-key/separate-key-report.json',
    'pdf-on-tarama/mock-key-pilot/mock-key-report.json','question-cohort/source-crop-report.json',
    'question-cohort/crop-integrity-report.json','pilot-riskleri/risk-matrix-report.json',
    'pilot-riskleri/shared-passage/shared-passage-report.json','pilot-riskleri/scanned-question/scanned-question-report.json',
    'pilot-riskleri/option-permutation-report.json','pilot-riskleri/zip-duplicate-report.json']


def quality_proof(app,task):
    root=app/'veri/kalite'/task;pointer=read_json(root/'son.json');file=(root/pointer['report']).resolve()
    if not file.is_relative_to(root.resolve()):raise ValueError('Quality evidence escapes task directory')
    report=read_json(file);_,checks=load_profile(app,task)
    if report['status']!='PASS' or report['inputs']['sha256']!=inputs_for(app,checks)['sha256']:
        raise ValueError('Current successful '+task+' quality proof required')
    for check in report['checks']:
        if check['status']!='PASS' or digest(file.parent/check['log'])!=check['logSha256']:
            raise ValueError('Quality check/log changed or failed')
    return file,report


def inputs(app,store,state):
    root=store.child(state['runId']);risk=read_json(root/'pilot-riskleri/risk-matrix-report.json')
    source_files={}
    for report_name in ['pdf-on-tarama/key-cohort/source-key-scope-report.json','pdf-on-tarama/mock-key-pilot/mock-key-report.json']:
        for row in read_json(root/report_name)['results']:
            source_files[row['sourcePath']]=digest(row['sourcePath'])
            if row.get('sourceKeyPath'):source_files[row['sourceKeyPath']]=digest(row['sourceKeyPath'])
    quality={}
    for task in ('YKS-07','YKS-08'):
        path,report=quality_proof(app,task);quality[task]={'path':str(path),'sha256':digest(path)}
    for item in risk['sourceProofs'].values():
        if digest(root/item['path'])!=item['sha256']:raise ValueError('Real pilot risk evidence changed')
    crops=read_json(root/'question-cohort/crop-integrity-report.json')
    for row in crops['results']:
        if digest(row['pixelProofPath'])!=row['pixelProofSha256']:raise ValueError('Pixel proof changed')
    return {'version':1,'fileBase':str(app),'files':{name:digest(app/name) for name in FILES},
        'scopePolicy':'PILOT_ONLY_NO_FULL_ARCHIVE_ACCEPTANCE',
        'reports':{name:digest(root/name) for name in REPORTS},'sourceFiles':source_files,'quality':quality,
        'sourceKeyScopeSignature':signature(source_keys(root/'pdf-on-tarama/key-cohort'))}


def operation(app,store,state):
    expected=inputs(app,store,state);root=store.child(state['runId'])
    def perform(folder,cursor,checkpoint):
        if folder.parent.name!='pilot':raise ValueError('YKS-07 full executor is not accepted; complete YKS-10.pilot and full per-PDF reconciliation first')
        keys=read_json(root/REPORTS[0]);mock=read_json(root/REPORTS[3]);crops=read_json(root/REPORTS[5]);risk=read_json(root/REPORTS[6])
        if keys['verifiedAnswers']!=387 or mock['verifiedPrintedAnswers']!=291 or mock['pendingSections']:
            raise ValueError('Representative source key counts differ')
        if crops['questions']!=387 or crops['uncoveredNativeBodyLines'] or not crops['sourceAndPreparedCropPixelsEqual']:
            raise ValueError('Source crop completeness/pixel equality failed')
        proofs=[]
        for name in REPORTS:
            target=folder/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(root/name,target);proofs.append(target)
        for task,data in expected['quality'].items():
            target=folder/(task+'-quality-report.json');shutil.copyfile(data['path'],target);proofs.append(target)
        report={'status':'PASS','scope':'REPRESENTATIVE_SOURCE_KEY_AND_PAGE_OBSERVATION_PILOT',
            'diagnosticDocumentsAssessed':20,'diagnosticDocumentsWithVerifiedKeys':19,'excludedDiagnosticVersionVariants':1,
            'diagnosticSourceAnswers':387,'mockDocuments':2,'mockKeySections':8,'mockSourceAnswers':291,
            'sourceQuestionCropsChecked':387,'sourceBodyPagesChecked':97,'uncoveredNativeBodyLines':0,
            'realRiskClasses':len(risk['risks']),'sharedPassageQuestions':2,'scannedQuestionKeyStillRequired':True,
            'newQuestionsAccepted':0,'questionBankWrites':0,'catalogPublished':False,'teacherApproved':False,
            'fullYks07Complete':False,'remainingAcceptance':['YKS-08 current duplicate acceptance',
                'YKS-09 complete graphical content/fine topic/source assignment',
                'YKS-10 isolated pilot/import/rollback checks','All full-archive per-PDF/page/key exceptions remain open']}
        if signature(inputs(app,store,state))!=signature(expected):raise ValueError('Pilot source evidence changed during acceptance')
        write_json(folder/'source-key-pilot-acceptance.json',report);proofs.append(folder/'source-key-pilot-acceptance.json')
        checkpoint({'phase':'representative-source-key-and-page-pilot-verified','fullStageAccepted':False})
        return {'status':'PASS','artifacts':proofs,'summary':report,'nextAction':'YKS-08.pilot duplicate and content review, then YKS-09.pilot fine-topic/source acceptance'}
    return perform
