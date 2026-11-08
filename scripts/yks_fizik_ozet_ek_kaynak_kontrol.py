"""Compare only three summary cards with current prepared/original pending bodies.

Reuse the frozen pending text and current amended source versions. No old PDF
extraction, full source-cohort reprocessing, model call or novelty decision.
"""
from collections import defaultdict
import hashlib
import json
from pathlib import Path

from yks_birlestirme import Store,read_json,write_json,digest,signature
from yks_soru_pilotu import APP,live_bank
from yks_partiler_arasi_tekrar import body_identity
from yks_bekleyen_tekrar_kontrol import old_location_id,classify_relation


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);inputs={}
    def load(relative):
        path=root/relative;inputs[str(path)]=digest(path);return read_json(path)
    manifest=load('database-archive/manifest.json');archive=load('database-archive/archive-report.json')
    manifest_sha=hashlib.sha256((json.dumps(manifest,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()).hexdigest()
    if archive['status']!='PASS' or archive['secondSaveInsertedArtifacts']!=0 or manifest_sha!=archive['checkpoint']:
        raise ValueError('Finish the current archive readback before reusing its original pending observations')
    frozen={r['logicalPath']:r['sha256'] for r in manifest['files']}
    pending=load('pending-source-reuse/pending-source-observations.json')['results']
    pending_path=root/'pending-source-reuse/pending-source-observations.json'
    if digest(pending_path)!=frozen['run/pending-source-reuse/pending-source-observations.json']:raise ValueError('Archived original pending text changed')
    if len(pending)!=5303 or len({old_location_id(r) for r in pending})!=5303:raise ValueError('Original pending membership differs')
    intake=load('source-intake-queue/report.json');pilot=load('physics-summary-discovery/candidates.json')
    comparison=load('physics-summary-discovery/comparison-report.json')
    if intake['status']!='PASS' or comparison['status']!='PASS' or intake['bankSnapshotSha256']!=comparison['bankSnapshotSha256']:
        raise ValueError('Both source cohorts must use the same canonical bank')
    current={r['sourceCode']:r for r in intake['results']};cards={};packages={}
    for file,expected in intake['sourcePackages'].items():
        if digest(file)!=expected:raise ValueError('Prepared source package changed')
        packages[file]=expected
        for card in read_json(file)['cards']:
            selected=current.get(card['code'])
            if not selected or selected['sourceImageSha256']!=card['imageSha256'] or selected['sourceTextSha256']!=card['textSha256']:continue
            if hashlib.sha256(card['text'].encode()).hexdigest()!=card['textSha256']:raise ValueError('Current prepared source text differs')
            if card['code'] in cards and signature(cards[card['code']])!=signature(card):raise ValueError('Conflicting current source versions')
            cards[card['code']]=card
    if set(cards)!=set(current) or len(cards)!=12052:raise ValueError('Every main-cohort source must use its current amendment version')
    groups=defaultdict(list);old_groups=defaultdict(list);locations=defaultdict(list);unparsed=[];pending_parsed=0
    for code,card in cards.items():
        identity=body_identity(card['text'])
        if identity:groups[identity['identity']].append(card)
        else:unparsed.append(code)
    for old in pending:
        identity=body_identity(old['text'])
        if identity:old_groups[identity['identity']].append(old);pending_parsed+=1
        if len(old['printedNumbers'])==1:locations[old['sourceSha256'],old['physicalPage'],old['printedNumbers'][0]].append(old)
    results=[]
    for card in pilot['cards']:
        if card['code'] in cards or digest(card['image'])!=card['imageSha256']:raise ValueError('Separate summary version is already in the main cohort or changed')
        identity=body_identity(card['text'])
        if not identity:raise ValueError('All three source stems/five options must be complete')
        prepared=[]
        for other in groups.get(identity['identity'],[]):
            if digest(other['image'])!=other['imageSha256']:raise ValueError('Matched prepared source image changed')
            prepared.append({'sourceCode':other['code'],'sourceSha256':other['sourceSha256'],
                'status':'EXACT_BODY_CONTENT_CANDIDATE_ACTUAL_GRAPHICS_AND_KEY_REVIEW_REQUIRED',
                'existingCanonicalCodes':current[other['code']]['existingCanonicalCodes'],
                'printedAnswer':other['answer'],'sourceImageSha256':other['imageSha256'],'sourcePrintedNumber':other['printedNumber'],
                'sameSourceImageBytes':other['imageSha256']==card['imageSha256']})
        related={old_location_id(r):r for r in locations.get((card['sourceSha256'],card['pdfPage'],card['printedNumber']),[])}
        related.update({old_location_id(r):r for r in old_groups.get(identity['identity'],[])})
        old_relations=[r for r in (classify_relation(card,old) for old in related.values()) if r]
        results.append({'sourceCode':card['code'],'sourceSha256':card['sourceSha256'],
            'status':'REUSE_OR_REVIEW_EXISTING_PREPARED_OR_PENDING_SOURCE_BEFORE_ANY_NEW_INTAKE' if prepared or old_relations else 'NO_EXACT_BODY_OR_LOCATOR_MATCH_NOT_NOVELTY_ACCEPTANCE',
            'preparedSourceCandidates':prepared,'originalPendingRelations':old_relations,
            'noveltyAccepted':False,'newQuestionAdmissionAccepted':False,'teacherApproved':False})
    bank,_=live_bank(APP)
    if signature(bank)!=intake['bankSnapshotSha256'] or any(digest(p)!=sha for p,sha in {**inputs,**packages}.items()):raise ValueError('Source/archive/bank changed during incremental comparison')
    out=root/'physics-summary-additional-source-review/report.json'
    write_json(out,{'status':'PASS','scope':'ONLY_THREE_SUMMARY_SOURCES_VS_12052_CURRENT_PREPARED_AND_5303_ORIGINAL_PENDING_IDENTITIES',
        'summaryQuestionsCompared':len(results),'mainPreparedSourcesCompared':len(cards),'mainPreparedBodiesWithCompleteFiveOptions':len(cards)-len(unparsed),
        'mainPreparedUnparsedSourceCodes':unparsed,'originalPendingOccurrencesReused':len(pending),'originalPendingBodiesWithCompleteFiveOptions':pending_parsed,
        'preparedExactBodyRelations':sum(len(r['preparedSourceCandidates']) for r in results),'originalPendingRelations':sum(len(r['originalPendingRelations']) for r in results),
        'archiveCheckpointUsed':archive['checkpoint'],'bankSnapshotSha256':intake['bankSnapshotSha256'],'inputs':inputs,'sourcePackages':packages,
        'results':results,'oldSourceExtractionsRepeated':0,'newModelCalls':0,'newOcrCalls':0,'newRenders':0,
        'questionBankWrites':0,'noveltyAccepted':False,'newQuestionAdmissionAccepted':False,'teacherApproved':False,'toolSha256':digest(Path(__file__))})
    print({k:v for k,v in read_json(out).items() if k not in ['results','inputs','sourcePackages','mainPreparedUnparsedSourceCodes']})


if __name__=='__main__':main()
