"""Compare only newly keyed/amended sources with the already archived pending queue."""
from collections import defaultdict,Counter
import hashlib
import json
from pathlib import Path
from yks_birlestirme import Store,read_json,write_json,digest,signature
from yks_soru_pilotu import APP,live_bank
from yks_partiler_arasi_tekrar import body_identity
from yks_bekleyen_tekrar_kontrol import old_location_id,classify_relation


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);archive=root/'database-archive'
    manifest=read_json(archive/'manifest.json');verified=read_json(archive/'archive-report.json')
    sha=hashlib.sha256((json.dumps(manifest,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()).hexdigest()
    if verified['status']!='PASS' or verified.get('secondSaveInsertedArtifacts')!=0 or sha!=verified['checkpoint']:
        raise ValueError('A fully read-back archived pending proof is required')
    frozen={f['logicalPath']:f['sha256'] for f in manifest['files']}
    old_path=root/'pending-source-reuse/pending-source-observations.json';base_path=root/'pending-source-reuse/report.json'
    for p in [old_path,base_path]:
        if digest(p)!=frozen['run/'+p.relative_to(root).as_posix()]:raise ValueError('Previously archived original pending evidence changed')
    pending=read_json(old_path)['results'];base=read_json(base_path);groups=defaultdict(list);locations=defaultdict(list)
    for old in pending:
        identity=body_identity(old['text'])
        if identity:groups[identity['identity']].append(old)
        if len(old['printedNumbers'])==1:locations[old['sourceSha256'],old['physicalPage'],old['printedNumbers'][0]].append(old)
    cards={};packages={};inputs={str(old_path):digest(old_path),str(base_path):digest(base_path)}
    for name in ['partial-chemistry-comparison','partial-chemistry-visual-comparison','din-amendment-comparison']:
        path=root/name/'comparison-report.json';report=read_json(path)
        if report['status']!='PASS' or report['bankSnapshotSha256']!=base['bankSnapshotSha256']:raise ValueError('Additional source comparison is not current')
        inputs[str(path)]=digest(path)
        for file,expected in report['sourcePackages'].items():
            if digest(file)!=expected:raise ValueError('Additional source question package changed')
            packages[file]=expected
            for card in read_json(file)['cards']:
                if card['code'] in cards:raise ValueError('Additional source versions have duplicate codes')
                cards[card['code']]=card
    results=[]
    for card in cards.values():
        identity=body_identity(card['text']);related={old_location_id(r):r for r in locations.get((card['sourceSha256'],card['pdfPage'],card['printedNumber']),[])}
        if identity:related.update({old_location_id(r):r for r in groups.get(identity['identity'],[])})
        relations=[r for r in (classify_relation(card,old) for old in related.values()) if r]
        results.append({'sourceCode':card['code'],'sourceSha256':card['sourceSha256'],
            'status':'KEEP_ORIGINAL_PENDING_LOCATOR_NO_NEW_INTAKE' if relations else 'NO_EXACT_PENDING_MATCH_FOUND_NOT_NEW_ADMISSION',
            'oldPendingRelations':relations,'newQuestionAccepted':False,'teacherApproved':False})
    bank,_=live_bank(APP)
    if signature(bank)!=base['bankSnapshotSha256'] or any(digest(p)!=s for p,s in {**inputs,**packages}.items()):
        raise ValueError('Source/pending/current bank changed during incremental pending comparison')
    output={'status':'PASS','scope':'ONLY_542_ADDITIONAL_KEYED_CHEMISTRY_AND_FOUR_AMENDED_SOURCE_VERSIONS_VS_ARCHIVED_5303_PENDING',
        'archiveCheckpointUsed':sha,'originalPendingOccurrencesReused':len(pending),'originalPendingSourceExtractionsRepeated':0,
        'preparedQuestionsCompared':len(results),'preparedQuestionsWithOldPendingRelations':sum(bool(r['oldPendingRelations']) for r in results),
        'relationStates':dict(Counter(r['status'] for q in results for r in q['oldPendingRelations'])),
        'bankSnapshotSha256':base['bankSnapshotSha256'],'inputs':inputs,'sourcePackages':packages,'results':results,
        'toolSha256':digest(Path(__file__)),'newModelCalls':0,'newOcrCalls':0,'newRenders':0,'questionBankWrites':0,'teacherApproved':False}
    write_json(root/'pending-source-reuse/additional-keyed-sources/report.json',output)
    print({k:v for k,v in output.items() if k not in ['results','inputs','sourcePackages']})


if __name__=='__main__':main()
