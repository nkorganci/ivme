"""Reuse explicit agent visual readings where a local key reader missed labels.

These are AI source-image readings, never human teacher approvals. Actual
letters were transcribed from the full original table images listed below.
Old failed receipts remain unchanged; question bodies still need admission.
"""
import argparse
import hashlib
import json
import subprocess
import sys
import time
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json,process_lock

OUT=BASE/'source-identity-recovery'
OBSERVED={
 'İTME VE ÇİZGİSEL MOMENTUM':{
  'image':'three-step-all-bodies-v2/6ff16b987842d8dc-178702005a-key.png',
  'rows':{'1':'AEDCECABAC','2A':'BDBEDCDACCC','2B':'CBBCADAA','3':'EDABAAACAC'}},
 'ELEKTRİKSEL KUVVET VE ELEKTRİK ALAN':{
  'image':'three-step-all-bodies-v2/6ff16b987842d8dc-ab352d4dbf-key.png',
  'rows':{'1':'DDAABEDA','2':'ECCBEEAE','2B':'DABBBBCAB','3':'ACACDBCD'}},
 'ELEKTRİKSEL POTANSİYEL':{
  'image':'three-step-all-bodies-v2/6ff16b987842d8dc-cce0d4f66f-key.png',
  'rows':{'1':'CBCCACEEED','2A':'CABBACACA','2B':'CCCDCCBD','3':'DDDDCEBDBC'}},
 'MANYETİZMA':{
  'image':'three-step-all-bodies-v2/6ff16b987842d8dc-732fb4921b-key.png',
  'rows':{'1':'CCBACBCD','2A':'CAEDCBCDDD','2B':'ECDDCBBA','3':'ACAAADBA'}},
 'ALTERNATİF AKIM - TRANSFORMATÖR':{
  'image':'three-step-all-bodies-v2/6ff16b987842d8dc-15a2de2057-key.png',
  'rows':{'1':'DDECAADEBD','2A':'DEEBCBDDE','2B':'CDEADECEB','3':'ACEDEDEB'}},
}


def record_readings():
    OUT.mkdir(exist_ok=True);folder=OUT/'independent-keys';folder.mkdir(exist_ok=True)
    package=json.loads((BASE/'curated-chapter-expansion/chapter-packages.json').read_text(encoding='utf8'))
    groups=package['keyGroups'];count=0
    for chapter,observed in OBSERVED.items():
        full=[g for g in groups if g['keyImage']==observed['image']]
        if len(full)!=1:raise ValueError('Observed original image is not unique')
        full=full[0];path=BASE/observed['image']
        if hashlib.sha256(path.read_bytes()).hexdigest()!=full['keyImageSha256']:raise ValueError('Visually read source table changed')
        if normalize(chapter)!=normalize(full['chapter']):raise ValueError('Observed chapter title differs')
        for g in groups:
            if g['sourceSha256']!=full['sourceSha256'] or normalize(g['chapter'])!=normalize(chapter):continue
            token=g['stepToken']
            if token not in observed['rows']:continue
            letters=observed['rows'][token];answers={str(i):letter for i,letter in enumerate(letters,1)}
            if answers!=g['answers']:raise ValueError('Independent visual transcription differs: '+chapter+' '+token)
            if not (g['keyPage']==full['keyPage'] and g['keyClip'][0]>=full['keyClip'][0]-.01 and g['keyClip'][1]>=full['keyClip'][1]-.01
                and g['keyClip'][2]<=full['keyClip'][2]+.01 and g['keyClip'][3]<=full['keyClip'][3]+.01):raise ValueError('Target key is outside the observed full table')
            value={'status':'AGREES','imageSha256':g['keyImageSha256'],'answers':answers,
                'method':'INDEPENDENT_AGENT_VISUAL_ORIGINAL_TABLE_CHAPTER_ROW_AND_NUMBERED_ANSWERS',
                'observedFullTableImage':observed['image'],'observedFullTableImageSha256':full['keyImageSha256'],
                'observedChapter':chapter,'observedStepToken':token,'sourceSha256':g['sourceSha256'],
                'sourcePage':g['keyPage'],'observedSourceClip':full['keyClip'],'teacherApproved':False,'questionWrites':0}
            target=folder/(g['groupId']+'.json')
            if target.exists():
                if json.loads(target.read_text(encoding='utf8'))!=value:raise ValueError('Existing independent visual reading differs')
            else:write_json(target,value)
            count+=1
    print(json.dumps({'status':'INDEPENDENT_SOURCE_TABLE_VISUAL_READINGS_RECORDED','keyGroups':count,'teacherApprovalsCreated':0,'questionWrites':0}),flush=True)


def prepare_waiting(publish=False):
    dependency=BASE/'curated-chapter-expansion/pass-result.json';last=0
    while not dependency.exists():
        now=time.monotonic()
        if not last or now-last>=300:
            print(json.dumps({'stage':'WAITING_FOR_PARENT_PASS_TO_SELECT_RECOVERED_BODY_CANDIDATES','estimatedRemainingSeconds':None}),flush=True);last=now
        time.sleep(5)
    manifest=OUT/'chapter-packages.json'
    if not manifest.exists():
        package=json.loads((BASE/'curated-chapter-expansion/chapter-packages.json').read_text(encoding='utf8'));groups={g['groupId']:g for g in package['keyGroups']}
        items={}
        for path in sorted((BASE/'curated-chapter-expansion').glob('part-*/source-pixel-acceptance.json')):
            for row in json.loads(path.read_text(encoding='utf8'))['reviewQueueAdditions']:
                if row.get('reasons')!=['INDEPENDENT_SOURCE_KEY_READING_UNRESOLVED']:continue
                proof=OUT/'independent-keys'/(row['groupId']+'.json')
                if proof.exists():items[row['code']]={**row,'status':'RECOVERED_SOURCE_IDENTITY_BODY_REVIEW_REQUIRED','productionImportAllowed':False}
        used={r['groupId'] for r in items.values()}
        write_json(manifest,{'status':'VISUALLY_RECOVERED_KEY_BODY_CANDIDATES_NOT_IMPORTED','items':list(items.values()),
            'keyGroups':[groups[g] for g in sorted(used)],'candidateBodies':len(items),'questionWrites':0,'teacherApprovalsCreated':0})
    if publish:
        subprocess.run([sys.executable,'-u','scripts/mebi_pratik2_arsiv_kabul.py','--package-dir','source-identity-recovery',
            '--first-batch','35','--wait-for','four-square-expansion/pass-result.json','--chunk-size','500','--publish'],cwd=APP,check=True)


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--wait-and-publish',action='store_true');a=p.parse_args()
    with process_lock(BASE/'.jobs/source-identity-recovery-preparation.lock'):
        record_readings()
        if a.wait_and_publish:prepare_waiting(True)
