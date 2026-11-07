"""Capture a provider hierarchy and legacy identity crosswalk, without publishing."""
from collections import Counter
import json
from pathlib import Path

from yks_birlestirme import digest, signature, read_json, write_json
from yks_stages.database import Snapshot, connection
from yks_taxonomy import crosswalk


def catalog_snapshot(app):
    cmd, env = connection(app)
    with Snapshot(cmd, env) as snapshot:
        run = snapshot.execute('SELECT run_key FROM learning_catalog.current_run;')
        rows = json.loads(snapshot.execute("SELECT coalesce(json_agg(definition ORDER BY category_id),'[]') FROM learning_catalog.current_categories;"))
    if not run or not rows:
        raise ValueError('Published category snapshot is empty')
    return {'runKey': run, 'categories': rows, 'sha256': signature([run, rows]), 'readOnly': True}


def inputs(app, store, state):
    current = catalog_snapshot(app)
    mebi = Path(state['sourceRoots'][0]) / 'katalog.json'
    return {'version': 1, 'fileBase': str(app),
            'files': {p: digest(app / p) for p in ['scripts/yks_stages/stage_04.py', 'scripts/yks_taxonomy.py']},
            'catalogRunKey': current['runKey'], 'catalogSha256': current['sha256'],
            'providerCatalogSha256': digest(mebi)}


def assess(pages, categories):
    result = crosswalk(pages, categories)
    by_id = {c['id']: c for c in categories}
    for identity in result['legacyIdentities']:
        previous = by_id[identity['id']]
        in_scope = previous.get('exam') in ('TYT', 'AYT')
        identity.update(exam=previous.get('exam'), subjectId=previous.get('subjectId'),
                        displayName=previous.get('topic') or previous.get('unit'),
                        definitionSha256=signature(previous),
                        mappingStatus=('EXACT_NAME_CANDIDATE' if identity['newProviderNodes'] else
                                       'RETAIN_LEGACY_SCOPE_FOR_REVIEW' if in_scope else 'OUT_OF_SCOPE_UNCHANGED'),
                        explanation=('Existing identity and all saved references remain valid; '
                                     'provider order/name proposals do not redistribute saved progress.'))
    result['publicationGate'] = {'status': 'NOT_AUTHORIZED_BY_THIS_STAGE',
                                'requirements': ['Resolve semantic scope changes with source evidence',
                                                 'Verify generators/resolvers and pilot before YKS-11',
                                                 'Preserve existing learner and teacher references']}
    legacy = {r['id'] for r in result['legacyIdentities']}
    if legacy != set(by_id) or any(not r['explanation'] for r in result['legacyIdentities']):
        raise ValueError('A legacy identity was lost or unexplained')
    result['identityPreservationVerified'] = True
    return result


def operation(app, store, state):
    expected = inputs(app, store, state)
    def perform(folder, cursor, checkpoint):
        current = catalog_snapshot(app)
        source = Path(state['sourceRoots'][0]) / 'katalog.json'
        if current['sha256'] != expected['catalogSha256'] or digest(source) != expected['providerCatalogSha256']:
            raise ValueError('Taxonomy inputs changed')
        pages = read_json(source)['pages']
        candidate = assess(pages, current['categories'])
        if not candidate['providerNodes']:
            raise ValueError('No MEBI subject-detail nodes found')
        write_json(folder / 'published-category-snapshot.json', current)
        write_json(folder / 'taxonomy-crosswalk.json', candidate)
        report = {'status': 'PASS', 'scope': 'CANDIDATE_AND_IDENTITY_PRESERVATION_ONLY',
                  'providerTopics': len(candidate['providerNodes']), 'legacyCategoriesRetained': len(current['categories']),
                  'providerActions': dict(Counter(n['action'] for n in candidate['providerNodes'])),
                  'legacyMappings': dict(Counter(n['mappingStatus'] for n in candidate['legacyIdentities'])),
                  'reviewIssues': len(candidate['issues']), 'unmatchedLegacySelectable': len(candidate['unmatchedSelectableLegacyIds']),
                  'published': False, 'readyForPublication': False, 'studentRowsWritten': 0,
                  'newMaintenanceSource': 'MEBI provider node hierarchy plus explicit legacy crosswalk; Excel distributions retained',
                  'nextAction': 'YKS-05 path/resolver/generator compatibility; semantic review remains a publication gate'}
        write_json(folder / 'taxonomy-impact-report.json', report)
        after = catalog_snapshot(app)
        if after['sha256'] != current['sha256'] or digest(source) != expected['providerCatalogSha256']:
            raise ValueError('Published or provider catalog changed during proposal generation')
        checkpoint({'phase': 'provider-tree-and-legacy-identities-captured', 'published': False})
        return {'status': 'PASS', 'artifacts': [folder / p for p in [
                'published-category-snapshot.json', 'taxonomy-crosswalk.json', 'taxonomy-impact-report.json']],
                'summary': report, 'nextAction': report['nextAction']}
    return perform
