"""Package only the bounded three source-read new questions; never publish/import."""
import csv
from pathlib import Path
import shutil
import subprocess

from yks_birlestirme import digest,signature,read_json,write_json
from yks_pilot_kabul_secimi import prepare
from yks_stages.stage_07 import quality_proof

FILES=['scripts/yks_stages/stage_09.py','scripts/yks-pilot-package.mjs','scripts/learning-resource-contract.mjs',
    'scripts/yks_pilot_kabul_secimi.py','scripts/yks_konu_icerik_incele.py','scripts/yks_konu_anlam_kontrol.py']


def inputs(app,store,state):
    root=store.child(state['runId']);selection=prepare(root);tree=state['stages']['YKS-04:full']
    tree_file=next(root/a['path'] for a in tree['artifacts'] if a['path'].endswith('navigation-candidate.json'))
    saved=root/'question-cohort/bounded-pilot-selection.json'
    if signature(read_json(saved))!=signature(selection):raise ValueError('Bounded selection is stale')
    quality,_=quality_proof(app,'YKS-09')
    return {'version':1,'fileBase':str(app),'files':{p:digest(app/p) for p in FILES},
        'selectionPath':str(saved),'selectionSha256':digest(saved),'treePath':str(tree_file),'treeSha256':digest(tree_file),
        'bankSnapshotSha256':selection['bankSnapshotSha256'],'qualityPath':str(quality),'qualitySha256':digest(quality)}


def operation(app,store,state):
    expected=inputs(app,store,state)
    def perform(folder,cursor,checkpoint):
        if folder.parent.name!='pilot':raise ValueError('Full source question acceptance is not implemented; bounded pilot only')
        selection=read_json(expected['selectionPath']);codes={r['sourceCode'] for r in selection['newPilotQuestions']};cards=[]
        for path,sha in selection['sourcePackages'].items():
            if digest(path)!=sha:raise ValueError('Source package changed')
            cards.extend(c for c in read_json(path)['cards'] if c['code'] in codes)
        if {c['code'] for c in cards}!=codes or len(cards)!=3:raise ValueError('Source-bound pilot card set differs')
        source=folder/'source-cards-and-decisions.json';write_json(source,{'selection':selection,'cards':cards})
        resources=folder/'pilot-resources-v2.json';log=folder/'contract-validation.log'
        result=subprocess.run(['node','scripts/yks-pilot-package.mjs',str(source),expected['treePath'],str(resources)],
            cwd=app,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=90)
        log.write_text(result.stdout+result.stderr,encoding='utf-8')
        if result.returncode:raise ValueError('Shared v2 pilot resource contract failed: '+str(log))
        by_code={r['questionCode']:r for r in read_json(resources)['resources']};artifacts=[source,resources,log]
        csv_file=folder/'pilot-insert-only.csv'
        with csv_file.open('w',encoding='utf-8',newline='') as stream:
            writer=csv.DictWriter(stream,fieldnames=['code','exam_type','subject','topic','source','image','correct_answer','choice_count','active','bank'])
            writer.writeheader()
            for card in cards:
                item=by_code[card['code']];relative=item['sourceImage']['reference'];image=folder/'images'/relative
                image.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(card['image'],image)
                if digest(image)!=card['imageSha256']:raise ValueError('Packaged source crop bytes differ')
                artifacts.append(image)
                writer.writerow({'code':card['code'],'exam_type':card['exam'],'subject':card['subject'],'topic':item['topic'],
                    'source':'MEBİ AYT Tarama 8','image':relative,'correct_answer':card['answer'],'choice_count':5,'active':'true','bank':'OGM'})
        artifacts.append(csv_file)
        quality=folder/'quality-report.json';shutil.copyfile(expected['qualityPath'],quality);artifacts.append(quality)
        report={'status':'PASS','scope':'THREE_NEW_QUESTIONS_UNPUBLISHED_ISOLATED_PILOT_PACKAGE',
            'newQuestionCodes':sorted(codes),'existingQuestionIdsToReuse':[r['canonicalQuestionCode'] for r in selection['reusedQuestions']],
            'resources':3,'newPreferredLeafCategories':1,'sourceAnswers':[{'code':c['code'],'answer':c['answer'],
                'keyPdfSha256':c['sourceKeyDocumentSha256'],'keyPhysicalPage':c['sourceKeyPage'],'printedNumber':c['printedNumber'],
                'independentReadingMethods':c['answerReadingMethods'],'sourceKeyEvidenceSha256':c['keyEvidenceSha256']} for c in cards],
            'sourceSelectionSha256':expected['selectionSha256'],'bankSnapshotSha256':expected['bankSnapshotSha256'],
            'csvSha256':digest(csv_file),'resourcesSha256':digest(resources),'questionBankWrites':0,
            'catalogPublished':False,'teacherApproved':False,'fullYks09Complete':False,
            'remainingAcceptance':['YKS-10 isolated import/repeat/rollback with exact controlled category IDs',
                'Other 372 cohort questions and full archive remain outside this package']}
        if signature(inputs(app,store,state))!=signature(expected):raise ValueError('Source acceptance evidence changed during packaging')
        target=folder/'bounded-source-package-acceptance.json';write_json(target,report);artifacts.append(target)
        checkpoint({'phase':'three-source-bound-v2-pilot-resources-packaged','published':False})
        return {'status':'PASS','artifacts':artifacts,'summary':report,'nextAction':'YKS-10.pilot isolated importer/category/API/idempotency/rollback checks; no full-archive rollout yet'}
    return perform
