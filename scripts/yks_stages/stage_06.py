"""Accept the organized inactive archive, preserving all originals and source IDs."""
import os
import shutil

from yks_birlestirme import digest,signature,read_json,write_json
from yks_arsiv_hazirla import TARGET
from yks_stages.stage_02 import tree_snapshot


def inputs(app,store,state):
    folder=store.child(state['runId']+'/arsiv-hazirlik')
    navigation=read_json(folder/'archive-navigation-report.json')
    if navigation['generatorSha256']!=digest(app/'scripts/yks_arsiv_gezinti.py'):raise ValueError('Archive navigation generator changed')
    generated=[]
    for row in navigation['files']:
        file=TARGET/row['path']
        if not file.resolve().is_relative_to(TARGET.resolve()) or digest(file)!=row['sha256']:
            raise ValueError('Prepared archive view changed/missing')
        generated.append([row['path'],row['sha256']])
    original,links=tree_snapshot(state['sourceRoots'])
    if signature([original,links])!=state['stages']['YKS-02:full']['inputs']['sourceTreeSignature']:
        raise ValueError('Original source inventory changed')
    origins=read_json(TARGET/'Katalog/kaynak-kokenleri.json')
    physical=[]
    for row in origins['resources']:
        file=TARGET/row['target']
        if not file.resolve().is_relative_to(TARGET.resolve()) or not file.is_file():raise ValueError('Missing/unsafe prepared object')
        if row['method']=='HARDLINK_IMMUTABLE':
            if not os.path.samefile(file,row['sourcePath']):raise ValueError('Immutable prepared object is no longer its verified original')
        elif digest(file)!=row['sha256']:raise ValueError('Prepared metadata checksum differs')
        stat=file.stat();physical.append([row['target'],row['sha256'],stat.st_size,stat.st_mtime_ns,stat.st_ino])
    return {'version':1,'fileBase':str(app),'files':{p:digest(app/p) for p in [
        'scripts/yks_stages/stage_06.py','scripts/yks_arsiv_gezinti.py','testler/yks-archive-navigation-ui.mjs']},
        'originalSourceSignature':signature([original,links]),'generatedViewSignature':signature(generated),
        'physicalTargetSignature':signature(physical),'resources':len(physical),
        'archiveCatalogs':{name:digest(TARGET/'Katalog'/name) for name in ['hazirlanan-yollar.json','kaynak-kokenleri.json','gezinti.json']},
        'reports':{name:digest(folder/name) for name in ['archive-preparation-report.json','archive-navigation-report.json','archive-navigation-ui-report.json']}}


def operation(app,store,state):
    expected=inputs(app,store,state)
    original=store.child(state['runId']+'/arsiv-hazirlik')
    def perform(folder,cursor,checkpoint):
        navigation=read_json(original/'archive-navigation-report.json')
        ui=read_json(original/'archive-navigation-ui-report.json')
        preparation=read_json(original/'archive-preparation-report.json')
        if navigation['status']!='PREPARED' or navigation['newBrokenLinks'] or preparation['status']!='PASS':raise ValueError('Incomplete archive preparation')
        if ui['status']!='PASS' or ui['sourceReportSha256']!=digest(original/'archive-navigation-report.json'):
            raise ValueError('Archive navigation UI evidence is not current')
        if {row['mobile'] for row in ui['checks']}!={True,False}:raise ValueError('Both archive viewport checks required')
        if read_json(TARGET/'Katalog/hazirlanan-yollar.json')['status']!='PREPARED':raise ValueError('Premature archive activation')
        proofs=[]
        for name in ['archive-preparation-report.json','archive-navigation-report.json','archive-navigation-ui-report.json']:
            shutil.copyfile(original/name,folder/name);proofs.append(folder/name)
        report={'status':'PASS','scope':'FULL_INACTIVE_ORGANIZED_ARCHIVE','uniqueOriginalObjects':preparation['resources'],
            'legacyOriginalFiles':7594,'originalControlExceptions':1,'providerCourses':navigation['courses'],
            'providerUnits':navigation['units'],'providerTopics':navigation['providerTopics'],
            'uniqueTopicContentViews':navigation['uniqueContentViews'],'generatedLocalLinks':navigation['generatedLocalLinks'],
            'newBrokenLinks':0,'desktopAndMobile':True,'allOriginalInputsPreserved':True,
            'physicalVerification':'ORIGINAL_FULL_SHA_INVENTORY_UNCHANGED; IMMUTABLE_SAME_OBJECT; FRESH_METADATA_SHA',
            'originalFilesMoved':0,'originalFilesDeleted':0,'archiveStatus':'PREPARED','catalogPublished':False,
            'questionBankWrites':0,'modelsCalled':0,'hardlinksAreBackups':False,
            'questionAnswerAcceptanceIncluded':False}
        if signature(inputs(app,store,state))!=signature(expected):raise ValueError('Archive inputs changed during acceptance')
        write_json(folder/'archive-acceptance-report.json',report);proofs.append(folder/'archive-acceptance-report.json')
        checkpoint({'phase':'complete-inactive-archive-accepted','sourceMutations':0})
        return {'status':'PASS','artifacts':proofs,'summary':report,'nextAction':'YKS-07 representative answer/question pilot; archive activation requires YKS-10'}
    return perform
