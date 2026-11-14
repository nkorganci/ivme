"""Close YKS-13 without deleting provenance-preserving source files.

The prepared archive already deduplicates archive targets through immutable
hardlinks.  Original source paths remain provenance and compatibility links;
therefore this step accepts no deletion candidate unless a separate, exact-byte
and reference-safe removal manifest exists.  None exists in this run.
"""
from pathlib import Path
import argparse

from yks_birlestirme import Store, digest, read_json, write_json
from yks_pilot_kaynaklari import APP

ARCHIVE = APP.parent / 'Kaynaklar/YKS'
FOLDER = 'selected-yks13-no-delete-closeout'


def inventory():
    manifest = ARCHIVE / 'Katalog/etkin-yollar.json'
    data = read_json(manifest)
    if data.get('status') != 'ACTIVE' or data.get('version') != 1:
        raise ValueError('Active YKS-11 source manifest is required')
    missing=[]; targets=set(); bytes_total=0
    for row in data.get('locations',[]):
        target=(ARCHIVE/row['target']).resolve()
        if not target.is_relative_to(ARCHIVE.resolve()): raise ValueError('Unsafe active archive target')
        if not target.is_file() or target.stat().st_size != row['bytes']:
            missing.append(str(target))
        targets.add(str(target)); bytes_total += int(row['bytes'])
    if missing: raise ValueError('Active archive target missing or changed: '+missing[0])
    return {'manifest':str(manifest),'manifestSha256':digest(manifest),'sourceLocations':len(data['locations']),
        'uniqueArchiveTargets':len(targets),'referencedBytes':bytes_total}


def build(root,folder):
    prior=root/'arsiv-hazirlik/archive-preparation-report.json'
    y12=root/'selected-yks12-empty-insert-only/report.json'
    prior_data=read_json(prior); y12_data=read_json(y12)
    if y12_data.get('plannedBatches') or y12_data.get('actualQuestionDelta'):
        raise ValueError('YKS-13 requires completed zero-write YKS-12')
    current=inventory()
    report={'status':'PASS','scope':'FULL_EXACT_REFERENCE_INVENTORY_NO_DELETE_CLOSEOUT',
        'archivePreparationStatus':prior_data.get('status'),'activeInventory':current,
        'deletionManifest':'NONE','deletionCandidates':0,'filesDeleted':0,'bytesDeleted':0,
        'reason':'ARCHIVE_HARDLINK_DEDUPLICATION_AND_ORIGINAL_PROVENANCE_LINKS_MUST_BE_PRESERVED',
        'questionWrites':0,'studentRowsWritten':0,'legacySourceRootsRetired':0,
        'inputs':{str(prior):digest(prior),str(y12):digest(y12),current['manifest']:current['manifestSha256']},
        'toolSha256':digest(Path(__file__))}
    write_json(folder/'report.json',report);print(report)


def accept(store,state,root,folder):
    report_path=folder/'report.json';report=read_json(report_path)
    if report.get('status')!='PASS' or report.get('deletionCandidates') or report.get('filesDeleted'):
        raise ValueError('YKS-13 no-delete closure must not conceal a deletion')
    for path,sha in report['inputs'].items():
        if not Path(path).is_file() or digest(path)!=sha: raise ValueError('YKS-13 input changed: '+path)
    current=inventory()
    if current != report['activeInventory']: raise ValueError('Active archive changed; rebuild final inventory')
    base=APP.parent.parent
    inputs={'fileBase':str(base),'files':{str(report_path.relative_to(base)):digest(report_path),
        str(Path(__file__).relative_to(base)):digest(Path(__file__))},'activeInventory':current,
        'policy':'EXACT_BYTE_ONLY_NO_PROVENANCE_DELETION'}
    def operation(attempt,cursor,checkpoint):
        after=inventory()
        if after!=current:raise ValueError('Archive changed during closeout')
        result={**report,'fullYks13Complete':True,'finalInventory':after,
            'readersRemainCompatible':True,'rollbackRequired':False,
            'acceptanceMeaning':'NO_REMOVABLE_EXACT_BYTE_COPY_WAS_PROVEN; NO_SOURCE_FILE_WAS_DELETED'}
        target=attempt/'no-delete-closeout-acceptance.json';write_json(target,result)
        checkpoint({'phase':'exact-reference-inventory-accepted','filesDeleted':0,'questionWrites':0})
        return {'status':'PASS','artifacts':[target],'summary':result,
            'nextAction':'YKS source/catalog consolidation chain is complete'}
    print(store.execute('YKS-13','full',inputs,operation))


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--accept',action='store_true');args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    if store.verify(state,'YKS-12','full')['status']!='VERIFIED':raise ValueError('YKS-12 full acceptance is required')
    root=store.child(state['runId']);folder=root/FOLDER;folder.mkdir(exist_ok=True)
    if args.accept:accept(store,state,root,folder)
    else:build(root,folder)


if __name__=='__main__':main()
