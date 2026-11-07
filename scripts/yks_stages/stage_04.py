"""Capture a provider hierarchy and legacy identity crosswalk, without publishing."""
from collections import Counter
import json
from pathlib import Path
import subprocess

from yks_birlestirme import digest, signature, read_json, write_json
from yks_stages.database import Snapshot, connection
from yks_taxonomy import crosswalk, scope_candidates
from yks_konu_agaci import compile_tree


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
            'files': {p: digest(app / p) for p in ['scripts/yks_stages/stage_04.py', 'scripts/yks_taxonomy.py',
                      'scripts/yks_konu_agaci.py','scripts/yks-konu-agaci-kontrol.mjs',
                      'scripts/content-taxonomy.mjs','backend/src/main/resources/content-taxonomy.json']},
            'catalogRunKey': current['runKey'], 'catalogSha256': current['sha256'],
            'providerCatalogSha256': digest(mebi),'inventorySha256':digest(source_inventory_path(store,state))}


def source_inventory_path(store,state):
    return next(store.child(state['runId']+'/'+a['path']) for a in state['stages']['YKS-02:full']['artifacts']
                if a['path'].replace('\\','/').endswith('/inventory.jsonl'))


def assess(pages, categories):
    result = crosswalk(pages, categories)
    by_id = {c['id']: c for c in categories}
    for identity in result['legacyIdentities']:
        previous = by_id[identity['id']]
        in_scope = previous.get('exam') in ('TYT', 'AYT')
        scopes = scope_candidates(previous, result['providerNodes'], categories) if previous.get('canonicalUnit') else []
        identity.update(exam=previous.get('exam'), subjectId=previous.get('subjectId'),
                        displayName=previous.get('topic') or previous.get('unit'),
                        definitionSha256=signature(previous),
                        providerScopeCandidates=scopes,
                        mappingStatus=('EXACT_NAME_CANDIDATE' if identity['newProviderNodes'] else
                                       'WIDER_OR_COUNTERPART_SCOPE_CANDIDATE' if scopes else
                                       'RETAIN_LEGACY_SCOPE_FOR_REVIEW' if in_scope else 'OUT_OF_SCOPE_UNCHANGED'),
                        explanation=('Existing identity and all saved references remain valid; '
                                     'provider order/name proposals do not redistribute saved progress.'))
    result['publicationGate'] = {'status': 'DEPENDENT_STAGES_REQUIRED',
                                'requirements': ['Keep unresolved legacy definitions/IDs valid; no semantic merge is authorized by an uncertain match',
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
        inventory_path=source_inventory_path(store,state)
        if digest(inventory_path)!=expected['inventorySha256']:
            raise ValueError('Verified physical source inventory changed')
        files=[json.loads(line) for line in inventory_path.read_text(encoding='utf-8').splitlines()]
        navigation=compile_tree(candidate,current['categories'],files)
        navigation['legacyCompatibilityPolicy']='PRESERVE_ALL_ORIGINAL_DEFINITIONS_AND_IDS; UNRESOLVED_SCOPES_REMAIN_UNMERGED'
        navigation['legacyScopeDispositions']=candidate['legacyIdentities']
        write_json(folder/'navigation-candidate.json',navigation)
        validation=subprocess.run(['node','scripts/yks-konu-agaci-kontrol.mjs',str(folder/'navigation-candidate.json')],
                 cwd=app,capture_output=True,text=True,encoding='utf-8',check=True)
        schema=read_json(folder/'navigation-schema-report.json')
        if schema['status']!='PASS' or not navigation['originalDefinitionsPreserved']:
            raise ValueError('Controlled hierarchy or legacy definitions failed acceptance')
        report = {'status': 'PASS', 'scope': 'PROVIDER_NAVIGATION_AND_LEGACY_COMPATIBILITY_POLICY',
                  'providerTopics': len(candidate['providerNodes']), 'legacyCategoriesRetained': len(current['categories']),
                  'providerActions': dict(Counter(n['action'] for n in candidate['providerNodes'])),
                  'legacyMappings': dict(Counter(n['mappingStatus'] for n in candidate['legacyIdentities'])),
                  'reviewIssues': len(candidate['issues']), 'unmatchedLegacySelectable': len(candidate['unmatchedSelectableLegacyIds']),
                  'legacySelectableWithoutScopeCandidate': sum(r['currentlySelectable'] and r['exam'] in ('TYT','AYT')
                       and not r['newProviderNodes'] and not r['providerScopeCandidates'] for r in candidate['legacyIdentities']),
                  'published': False, 'readyForPublication': False, 'studentRowsWritten': 0,
                  'legacyDefinitionsUnchanged':True,'navigationCourses':len(navigation['navigation']),
                  'navigationUnits':sum(len(c['units']) for c in navigation['navigation']),
                  'newControlledCategoryIds':len(navigation['newCategoryIds']),
                  'controlledSchemaVerified':True,'unresolvedScopesMerged':0,
                  'identityPolicyAccepted':True,
                  'newMaintenanceSource': 'MEBI provider node hierarchy plus explicit legacy crosswalk; Excel distributions retained',
                  'nextAction': 'YKS-05 publish/navigation consumer compatibility; unresolved old scopes retain their exact definitions/IDs'}
        write_json(folder / 'taxonomy-impact-report.json', report)
        after = catalog_snapshot(app)
        if after['sha256'] != current['sha256'] or digest(source) != expected['providerCatalogSha256'] or digest(inventory_path)!=expected['inventorySha256']:
            raise ValueError('Published or provider catalog changed during proposal generation')
        checkpoint({'phase': 'provider-tree-and-legacy-identities-captured', 'published': False})
        return {'status': 'PASS', 'artifacts': [folder / p for p in [
                'published-category-snapshot.json', 'taxonomy-crosswalk.json', 'taxonomy-impact-report.json',
                'navigation-candidate.json','navigation-schema-report.json']],
                # Include the hierarchy/controlled validation in the same stage
                # proof; standalone preparation is not the source of truth.
                'summary': report, 'nextAction': report['nextAction']}
    return perform
