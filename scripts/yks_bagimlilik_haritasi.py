"""Record source-path readers/writers and unresolved compatibility requirements."""
import json
from pathlib import Path
import re
from yks_birlestirme import Store,digest,write_json,read_json

APP=Path(__file__).resolve().parents[1]
PATTERN=re.compile(r'mebi-yks|ogm-materyal|yks-cikmis-sorular|Kaynaklar[/\\]mufredat|kaynaklar[/\\]mufredat',re.I)
ENUMERATORS={'content-label-audit.py','content-label-reconcile.py','content-label-refresh.py',
             'inspect-label-sources.py','pdf-bank-audit.py','pdf-source-copy.py','supplemental-pdf-inventory.py'}


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    folder=store.child(state['runId']+'/yol-uyumluluk');folder.mkdir(exist_ok=True)
    matrix=read_json(folder/'path-matrix-report.json') if (folder/'path-matrix-report.json').is_file() else {}
    prepared=matrix.get('status')=='PASS' and matrix.get('newBrokenLinks')==0
    roots=[APP/'scripts',APP/'backend/src/main/java',APP.parent/'veri-hatti',APP.parent/'pipeline']
    rows=[]
    for root in roots:
        for path in sorted(root.rglob('*')):
            if not path.is_file() or path.suffix not in ('.py','.mjs','.java','.ps1') or any(p in path.parts for p in ('node_modules','__pycache__','.venv','data','kayit')):
                continue
            lines=path.read_text(encoding='utf-8-sig',errors='replace').splitlines()
            refs=[i for i,line in enumerate(lines,1) if PATTERN.search(line)]
            if not refs:continue
            name=path.relative_to(APP.parent).as_posix()
            strategy=('PREPARED_TREE_EXCLUDED' if path.name in ENUMERATORS else
                      'CENTRAL_RESOLVER_PREPARED' if path.name in ('TopicPdfService.java','PdfReviewLabels.java') else
                      'EXPLICIT_MIGRATION_CONTROL' if path.name.startswith('yks_') or 'yks_stages' in path.parts else
                      'GENERATOR_AUTHORITY_ADAPTER_REQUIRED' if path.name.startswith('excel-curriculum-import') else
                      'WRITER_CHECKPOINT_AND_LEGACY_PATH_REQUIRED' if 'ogm-indirme' in path.parts else
                      'LEGACY_PATH_COMPATIBILITY_REQUIRED')
            acceptance=('PREPARED_EXACT_LEGACY_LAYOUT' if prepared and strategy.endswith('REQUIRED') else strategy)
            if strategy=='GENERATOR_AUTHORITY_ADAPTER_REQUIRED' and 'MEBI_PROVIDER' in (APP/'scripts/excel-curriculum-import.mjs').read_text(encoding='utf-8'):
                acceptance='MEBI_AUTHORITY_GUARD_INSTALLED'
            rows.append({'file':name,'sha256':digest(path),'referenceLines':refs,'strategy':strategy,
                'preparedAcceptance':acceptance,
                'writerCheckpointAtCutover':strategy=='WRITER_CHECKPOINT_AND_LEGACY_PATH_REQUIRED'})
    report={'status':'PASS','scope':'DEPENDENCY_INVENTORY_ONLY','files':rows,'fileCount':len(rows),
            'remainingCompatibilityFiles':sum(r['strategy'].endswith('REQUIRED') for r in rows),
            'remainingPreparationFiles':sum(r['preparedAcceptance'].endswith('REQUIRED') for r in rows),
            'preparedPathMatrixSha256':digest(folder/'path-matrix-report.json') if prepared else None,
            'liveSourceRootChanged':False,'readyForCutover':False,
            'requirements':['Keep every old source root/relative path valid until its consumers pass migration tests',
                            'Never let Excel regeneration replace an activated MEBI primary hierarchy',
                            'Checkpoint source writers before any YKS-11 path switch',
                            'Reuse existing PDF/source/answer IDs and shared catalog publication flow']}
    write_json(folder/'dependency-map.json',report)
    print(json.dumps({k:v for k,v in report.items() if k!='files'}))


if __name__=='__main__':main()
