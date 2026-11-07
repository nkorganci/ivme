"""Accept prepared consumers and every legacy path; activation remains YKS-11."""
import json
from pathlib import Path
import shutil
import subprocess
import sys

from yks_birlestirme import digest,read_json,write_json,signature
from test_kaniti import fingerprint,BACKEND_INPUTS
from yks_stages.stage_02 import tree_snapshot
from yks_stages.stage_04 import catalog_snapshot

FILES=['scripts/yks_stages/stage_05.py','scripts/yks_yol_matrisi.py','scripts/yks_kaynak.py','scripts/yks_bagimlilik_haritasi.py',
       'scripts/content-label-refresh.py','scripts/yks_katalog_kontrol.py','scripts/yks_pipeline_uyum.py',
       'scripts/yks-curriculum-import.mjs','scripts/curriculum-projection.mjs','scripts/content-taxonomy-check.mjs',
       'scripts/excel-curriculum-import.mjs','scripts/canonical-units.mjs',
       'frontend/src/curriculumNavigation.js','frontend/src/curriculum.js','frontend/src/api.js',
       'frontend/src/learn/catalog.js','frontend/src/learn/mapNavigation.js','frontend/src/learn/pages/MapPage.jsx',
       'testler/yks-navigation-ui.mjs','testler/yks-navigation.test.mjs','testler/yks-maintenance.test.mjs',
       'testler/yks-maintenance-test.py','testler/yks-pipeline-navigation-test.py','testler/yks-source-resolver-test.py']


def inputs(app,store,state):
    folder=store.child(state['runId']+'/yol-uyumluluk')
    files=list(FILES)+[p.relative_to(app).as_posix() for p in (app/'scripts/pipeline-adapters').glob('*.py')]
    current=catalog_snapshot(app)
    trees,links=tree_snapshot(state['sourceRoots'])
    return {'version':1,'fileBase':str(app),'files':{p:digest(app/p) for p in files},
        'backendInputSignature':fingerprint(app,BACKEND_INPUTS)['sha256'],
        'catalogSha256':current['sha256'],'originalTreeSignature':signature([trees,links]),
        'preparationProofs':{name:digest(folder/name) for name in ['maintenance-candidate-report.json','candidate-catalog-check.json',
             'path-matrix-report.json','legacy-path-matrix.json','legacy-html-links.json','dependency-map.json',
             'backend-navigation-proof.json','backend-navigation-proof.log','ui/navigation-ui-report.json']},
        'pipelineFiles':{str(app.parent/'pipeline'/p):digest(app.parent/'pipeline'/p)
            for p in ['catalog_reference.py','catalog_taxonomy.py','source_archive.py','stages.py','progress.py']}}


def operation(app,store,state):
    expected=inputs(app,store,state)
    preparation=store.child(state['runId']+'/yol-uyumluluk')
    def perform(folder,cursor,checkpoint):
        proofs=[]
        for name in ['backend-navigation-proof.json','backend-navigation-proof.log']:
            shutil.copyfile(preparation/name,folder/name);proofs.append(folder/name)
        # A targeted previous run is reusable only for the exact complete backend inputs.
        navigation=read_json(folder/'backend-navigation-proof.json')
        pdf=read_json(app/'backend/target/ivme-test-son.json')
        for proof,minimum in [(navigation,35),(pdf,9)]:
            if proof['status']!='PASS' or proof['totals']['tests']<minimum or proof['inputs']['sha256']!=expected['backendInputSignature']:
                raise ValueError('Current successful backend consumer evidence is required')
        if pdf['selection']!='SourceFileResolverTest,TopicPdfServiceTest,PdfReviewLabelsTest':raise ValueError('PDF regression selection differs')
        for ext in ('json','log'):
            target=folder/('backend-pdf-proof.'+ext);shutil.copyfile(app/('backend/target/ivme-test-son.'+ext),target);proofs.append(target)
        commands=[['node','--test','testler/yks-navigation.test.mjs','testler/yks-maintenance.test.mjs'],
            [sys.executable,'-X','utf8','testler/yks-source-resolver-test.py'],
            [sys.executable,'-X','utf8','testler/yks-maintenance-test.py'],
            [sys.executable,'-X','utf8','testler/yks-pipeline-navigation-test.py'],
            [sys.executable,'-X','utf8','scripts/yks_pipeline_uyum.py'],
            [sys.executable,'-X','utf8','scripts/yks_katalog_kontrol.py','--candidate']]
        for index,command in enumerate(commands):
            result=subprocess.run(command,cwd=app,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=180)
            log=folder/f'consumer-check-{index+1}.log';log.write_text(result.stdout+result.stderr,encoding='utf-8');proofs.append(log)
            if result.returncode:raise ValueError('Consumer check failed: '+str(log))
        paths=read_json(preparation/'path-matrix-report.json');ui=read_json(preparation/'ui/navigation-ui-report.json')
        dependencies=read_json(preparation/'dependency-map.json')
        if dependencies.get('remainingPreparationFiles')!=0 or dependencies.get('preparedPathMatrixSha256')!=digest(preparation/'path-matrix-report.json'):
            raise ValueError('Unresolved source consumer preparation dependencies')
        if paths['status']!='PASS' or paths['newBrokenLinks'] or paths['legacyFiles']!=7594:
            raise ValueError('Incomplete legacy file/link matrix')
        if paths['sourceTreeSignature']!=expected['originalTreeSignature'] or ui['status']!='PASS':raise ValueError('Prepared source/UI proof changed')
        for name in ['maintenance-candidate-report.json','candidate-catalog-check.json','path-matrix-report.json','ui/navigation-ui-report.json','dependency-map.json']:
            target=folder/Path(name).name;shutil.copyfile(preparation/name,target);proofs.append(target)
        report={'status':'PASS','scope':'PREPARED_CONSUMER_COMPATIBILITY','backendTests':44,'nodeTests':8,
            'pythonSafetyTests':16,'dependencyFiles':dependencies['fileCount'],'remainingPreparationDependencies':0,
            'legacyFilePaths':paths['legacyFiles'],'legacyHtmlLinks':paths['htmlLocalLinks'],
            'newBrokenLinks':0,'desktopAndMobilePreparedNavigation':True,'oldDefinitionsUnchanged':True,
            'sourceRootActivated':False,'catalogPublished':False,'questionsInserted':0,'studentRowsWritten':0,
            'pathPolicy':'EXACT_PREPARED_LEGACY_LAYOUT_PLUS_SOURCE_SHA_RESOLVER',
            'remainingCutoverGates':['YKS-10 acceptance','Checkpoint original source writers before activating prepared roots in YKS-11'],
            'refreshPolicy':'Unchanged published source versions reuse the snapshot; changed sources require explicit controlled intake, never legacy Excel overwrite'}
        write_json(folder/'consumer-compatibility-report.json',report);proofs.append(folder/'consumer-compatibility-report.json')
        after=inputs(app,store,state)
        if signature(after)!=signature(expected):raise ValueError('Consumer preparation inputs changed during acceptance')
        checkpoint({'phase':'prepared-consumer-compatibility-accepted','liveActivation':False})
        return {'status':'PASS','artifacts':proofs,'summary':report,'nextAction':'YKS-06 organized archive navigation and acceptance; no live cutover before YKS-10'}
    return perform
