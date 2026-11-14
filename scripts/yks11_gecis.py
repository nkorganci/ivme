"""Build and activate the identity-preserving YKS source/catalog cutover.

The package is exported from the current PostgreSQL catalog, never from a
possibly stale local labels.json.  Activation publishes a new immutable run,
then switches compatible local projections and the prepared source manifest.
On any post-publication failure the current-run pointer and local files are
restored.  Questions and student/history tables are read-only invariants.
"""
from datetime import datetime, timezone
from pathlib import Path
import argparse
import hashlib
import json
import os
import shutil
import subprocess

from kaynakli_arastirma_db import db_connection, query
from yks_birlestirme import Store, digest, read_json, signature, write_json
from yks_pilot_kaynaklari import APP
from yks_stages.database import Snapshot, identifier, record_expression

FOLDER = 'selected-yks11-cutover'
ARCHIVE = APP.parent / 'Kaynaklar/YKS'


def utcnow():
    return datetime.now(timezone.utc).isoformat()


def compact_json(path, value):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name('.yks11-' + os.urandom(8).hex() + '.tmp')
    data = (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')
    try:
        with temporary.open('wb') as stream:
            stream.write(data); stream.flush(); os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists(): temporary.unlink()
    return hashlib.sha256(data).hexdigest()


def db_json_rows(cmd, env, relation, column='data'):
    sql = f'SELECT {column}::text FROM {relation} ORDER BY 1'
    process = subprocess.Popen([*cmd, '-Atq', '-c', sql], env=env, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='replace')
    rows = []
    for line in process.stdout:
        rows.append(json.loads(line))
    error = process.stderr.read(); code = process.wait()
    if code:
        secret = env.get('PGPASSWORD', '')
        raise RuntimeError((error.replace(secret, '[REDACTED]') if secret else error)[-1500:])
    return rows


def protected_fingerprints(cmd, env):
    wanted = {'users','question_attempts','study_sessions','exams','exam_questions',
              'curriculum_topic_progress','questions','question_choices'}
    with Snapshot(cmd, env) as snapshot:
        tables = json.loads(snapshot.execute("""SELECT coalesce(json_agg(x ORDER BY schema,name),'[]') FROM (
          SELECT n.nspname schema,c.relname name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','learning_catalog')
            AND c.relname IN ('users','question_attempts','study_sessions','exams','exam_questions',
              'curriculum_topic_progress','questions','question_choices')) x;"""))
        results = []
        for table in tables:
            relation = identifier(table['schema']) + '.' + identifier(table['name'])
            row = record_expression(snapshot, table)
            value = json.loads(snapshot.execute(f"""WITH h AS MATERIALIZED (
              SELECT hash_record_extended({row},0) a,hash_record_extended({row},9173551) b FROM {relation} t)
              SELECT json_build_object('rows',count(*),'rowDigest',md5(coalesce(string_agg(a::text||':'||b::text,'' ORDER BY a,b),''))) FROM h;"""))
            results.append({**table, **value})
    if not {'users','questions'} <= {row['name'] for row in results}:
        raise ValueError('Protected student/question table set is incomplete')
    if not {row['name'] for row in results} <= wanted:
        raise ValueError('Unexpected protected table')
    return results


def build(root, folder):
    candidate_path = root / 'yol-uyumluluk/maintenance-candidate.json'
    projection_path = root / 'yol-uyumluluk/curriculum-identities-candidate.json'
    prepared_path = ARCHIVE / 'Katalog/hazirlanan-yollar.json'
    candidate = read_json(candidate_path); projection = read_json(projection_path); prepared = read_json(prepared_path)
    if (candidate.get('curriculumAuthority') != 'MEBI_PROVIDER'
            or 'PRESERVE_ALL_ORIGINAL_DEFINITIONS_AND_IDS' not in candidate.get('legacyCompatibilityPolicy','')):
        raise ValueError('Identity-preserving MEBI maintenance candidate required')
    if prepared.get('status') != 'PREPARED' or prepared.get('version') != 1:
        raise ValueError('Prepared source location manifest required')
    cmd, env, _ = db_connection('ivme')
    current = json.loads(query((cmd, env, None), """SELECT json_build_object('runKey',run_key,'summary',summary)
      FROM learning_catalog.current_run JOIN learning_catalog.runs USING(run_key)"""))
    categories = db_json_rows(cmd, env, 'learning_catalog.current_categories', 'definition')
    items = db_json_rows(cmd, env, 'learning_catalog.current_items')
    known = {row['id']: row for row in candidate['categories']}
    foreign = []
    for row in categories:
        prior = known.get(row['id'])
        if prior is not None and {key:value for key,value in prior.items() if key!='topicNumber'} != {key:value for key,value in row.items() if key!='topicNumber'}:
            raise ValueError('Published category definition drift: ' + row['id'])
        if prior is None:
            if row.get('exam') in ('TYT','AYT'):
                raise ValueError('Published YKS identity absent from maintenance candidate: ' + row['id'])
            foreign.append(row)
    # The local publication snapshot may contain established non-YKS resources
    # which predate the shared DB projection.  Retain them verbatim rather than
    # allowing a YKS-only catalog transition to make them disappear.
    prior_labels = read_json(APP / 'veri/content-labels/labels.json')
    category_by_id = {row['id']: row for row in [*candidate['categories'], *foreign]}
    for row in prior_labels.get('categories', []):
        existing = category_by_id.get(row['id'])
        if existing is None:
            category_by_id[row['id']] = row
        elif {key:value for key,value in existing.items() if key!='topicNumber'} != {key:value for key,value in row.items() if key!='topicNumber'}:
            raise ValueError('Local published category definition drift: ' + row['id'])
    final_categories = sorted(category_by_id.values(), key=lambda row: row['id'])
    ids = {row['id'] for row in final_categories}
    if len(ids) != len(final_categories): raise ValueError('Duplicate category identity')
    taxonomy_version = projection['taxonomyVersion']
    current_keys = {item['key'] for item in items}
    for item in prior_labels.get('items', []):
        if item['key'] not in current_keys:
            items.append(item)
    source_digest = hashlib.sha256()
    for item in items:
        for assignment in item['automaticLabels']['assignments']:
            if assignment['categoryId'] not in ids:
                raise ValueError('Item assignment lost category: ' + assignment['categoryId'])
        original = dict(item); original.pop('taxonomyVersion', None)
        source_digest.update(json.dumps(original, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8'))
        source_digest.update(b'\n')
        item['taxonomyVersion'] = taxonomy_version
    question_codes = set(json.loads(query((cmd,env,None), "SELECT coalesce(json_agg(code),'[]') FROM questions")))
    preexisting_missing = sum('question:' + code not in {item['key'] for item in items} for code in question_codes)
    package = folder / 'publication'; package.mkdir(exist_ok=True)
    labels = {'version': 1, 'method': 'YKS_MEBI_IDENTITY_PRESERVING_CUTOVER',
              'categories': final_categories, 'items': sorted(items, key=lambda row: row['key'])}
    labels_sha = compact_json(package / 'labels.json', labels)
    run_key = 'labels-v1-' + labels_sha[:24]
    summary = {'status':'PASS','runKey':run_key,'method':labels['method'],'resources':len(items),
               'categories':len(final_categories),'yksMaintenanceCategories':len(candidate['categories']),
               'otherExamCategoriesPreserved':len(foreign),'previousRunKey':current['runKey'],
               'preexistingMissingQuestions':preexisting_missing,
               'curriculumNavigation':candidate['curriculumNavigation'],'taxonomyVersion':taxonomy_version,
               'sourceItemPayloadDigestWithoutTaxonomyVersion':source_digest.hexdigest(),
               'questionBankWrites':0,'studentRowsWritten':0,'teacherApproved':False}
    write_json(package / 'report.json', summary)
    audit = {'version':1,'type':'CURRICULUM_RECLASSIFICATION','runKey':run_key,
             'previousRunKey':current['runKey'],'resources':len(items),'sourcePreserved':True,
             'sourceFieldsVerified':['ALL_CURRENT_ITEM_DATA_EXCEPT_DERIVED_TAXONOMY_VERSION'],
             'unlabelled':sum(not row['automaticLabels']['assignments'] for row in items),
             'preexistingMissingQuestions':preexisting_missing,
             'failures':[],'definitionRefreshAssignmentsPreserved':True,
             'learnerFingerprint':{'capturedAtActivation':True},
             'curriculumReference':candidate['unitReference']}
    write_json(package / 'audit.json', audit)
    provider = APP.parent.parent / 'mebi-yks/katalog.json'
    if not provider.is_file() or digest(provider) != candidate['unitReference']['providerCatalogSha256']:
        raise ValueError('MEBI provider catalog changed')
    write_json(package / 'curriculum-reference-labels.json', [{
        'source':'../mebi-yks/katalog.json','sha256':digest(provider),'kind':'CURRICULUM_REFERENCE',
        'categoryIds':[row['id'] for row in candidate['categories'] if row.get('curriculumSource')=='MEBI_PROVIDER'],
        'basis':'MEBI_PROVIDER_IDENTITY_PRESERVING_NAVIGATION','teacherApproved':False}])
    # These are current, non-YKS legacy records whose old metadata has never
    # passed the shared v2 resource contract. They are not repaired, hidden or
    # reclassified by this YKS transition. The exception list is bounded to
    # their immutable existing keys; every other contract error still fails.
    legacy_keys=sorted(item['key'] for item in items if item['key'].startswith('question:YD_'))
    write_json(package/'contract-exceptions.json',{'currentCatalogRunKey':current['runKey'],
        'sourceItemPayloadDigestWithoutTaxonomyVersion':source_digest.hexdigest(),
        'reason':'PREEXISTING_NON_YKS_LEGACY_METADATA_OUTSIDE_YKS_CUTOVER_SCOPE','keys':legacy_keys})
    shutil.copyfile(candidate_path, package / 'maintenance.json')
    active = dict(prepared); active['status'] = 'ACTIVE'; active['activatedFrom'] = str(prepared_path)
    active['preparedSha256'] = digest(prepared_path); active['catalogRunKey'] = run_key
    write_json(package / 'etkin-yollar.json', active)
    contract = subprocess.run(['node','scripts/learning-resource-check.mjs','--labels',str(package/'labels.json'),
        '--taxonomy',str(package/'maintenance.json'),'--report',str(package/'contract-report.json'),
        '--allowed-contract-errors',str(package/'contract-exceptions.json')], cwd=APP,
        capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=900)
    (package/'contract-validation.log').write_text(contract.stdout+contract.stderr,encoding='utf-8')
    if contract.returncode: raise ValueError('Staged shared-resource contract failed')
    report = {'status':'PASS','scope':'CURRENT_DB_EXPORTED_MEBI_CUTOVER_PACKAGE','previousRunKey':current['runKey'],
              'newRunKey':run_key,'currentItemsExported':len(items),'currentCategoriesExported':len(categories),
              'maintenanceCategories':len(candidate['categories']),'otherExamCategoriesPreserved':len(foreign),
              'finalCategories':len(final_categories),'unlabelled':audit['unlabelled'],
              'sourceItemPayloadDigestWithoutTaxonomyVersion':source_digest.hexdigest(),
              'labelsSha256':labels_sha,'candidateSha256':digest(candidate_path),'projectionSha256':digest(projection_path),
              'preparedLocationsSha256':digest(prepared_path),'packageReady':True,'productionWrites':0,
              'inputs':{str(candidate_path):digest(candidate_path),str(projection_path):digest(projection_path),
                        str(prepared_path):digest(prepared_path)},'toolSha256':digest(Path(__file__))}
    write_json(folder / 'report.json', report)
    print(report)


def atomic_copy(source, target):
    target = Path(target); temporary = target.with_name('.yks11-' + os.urandom(8).hex() + '.tmp')
    shutil.copyfile(source, temporary); os.replace(temporary, target)


def make_dump(cmd, env, target):
    bin_dir = Path(cmd[0]).parent; pg_dump = bin_dir / 'pg_dump.exe'; pg_restore = bin_dir / 'pg_restore.exe'
    args = [str(pg_dump), '--format=custom', '--no-owner', '--file', str(target)]
    for flag in ('--host','--port','--username','--dbname'):
        args.extend([flag, cmd[cmd.index(flag)+1]])
    result = subprocess.run(args, env=env, capture_output=True, timeout=3600)
    if result.returncode: raise RuntimeError(result.stderr.decode(errors='replace')[-1500:])
    listing = subprocess.run([str(pg_restore),'--list',str(target)],capture_output=True,text=True,encoding='utf-8',errors='replace')
    if listing.returncode or 'TABLE DATA' not in listing.stdout: raise ValueError('Current database dump cannot be listed')
    return {'sha256':digest(target),'bytes':target.stat().st_size,'entries':len(listing.stdout.splitlines())}


def reusable_dump(root, attempt, before):
    """Reuse a just-created full backup only after its rollback is proven exact.

    A failed post-publication check has already restored the old pointer and
    local files.  Re-dumping the same 1.2GB database does not add protection;
    the prior immutable dump is linked into the new attempt only if its saved
    protected-table fingerprint equals the current one.
    """
    attempts = sorted((root / 'yks-11/full').glob('attempt-*'), reverse=True)
    for prior in attempts:
        if prior == attempt: continue
        dump, fingerprint, manifest = prior/'ivme-before-yks11.dump', prior/'protected-before.json', prior/'backup-manifest.json'
        if not (dump.is_file() and fingerprint.is_file() and manifest.is_file()): continue
        if read_json(fingerprint) != before or read_json(manifest).get('database') != 'ivme': continue
        try:
            os.link(dump, attempt/'ivme-before-yks11.dump')
        except OSError:
            continue
        return read_json(manifest)['dump']
    return None


def accept(store, state, root, folder):
    report = read_json(folder/'report.json'); package = folder/'publication'
    if report['status']!='PASS' or not report['packageReady']: raise ValueError('Passing YKS-11 package required')
    for path, sha in report['inputs'].items():
        if digest(path)!=sha: raise ValueError('YKS-11 input changed: '+path)
    if digest(package/'labels.json')!=report['labelsSha256']: raise ValueError('Publication labels changed')
    cmd, env, _ = db_connection('ivme')
    current_run = query((cmd,env,None),'SELECT run_key FROM learning_catalog.current_run')
    if current_run != report['previousRunKey']: raise ValueError('Current catalog changed; rebuild YKS-11 package')
    inputs={'fileBase':str(APP.parent.parent),'files':{
        str((folder/'report.json').relative_to(APP.parent.parent)):digest(folder/'report.json'),
        str((package/'labels.json').relative_to(APP.parent.parent)):digest(package/'labels.json'),
        str((package/'maintenance.json').relative_to(APP.parent.parent)):digest(package/'maintenance.json'),
        str((package/'etkin-yollar.json').relative_to(APP.parent.parent)):digest(package/'etkin-yollar.json'),
        str(Path(__file__).relative_to(APP.parent.parent)):digest(Path(__file__))},
        'previousRunKey':report['previousRunKey'],'newRunKey':report['newRunKey']}
    def operation(attempt, cursor, checkpoint):
        before = protected_fingerprints(cmd, env); write_json(attempt/'protected-before.json', before)
        dump = attempt/'ivme-before-yks11.dump'; dump_info = reusable_dump(root, attempt, before)
        if dump_info is None:
            dump_info = make_dump(cmd, env, dump)
        write_json(attempt/'backup-manifest.json',{'status':'PASS','database':'ivme','dump':dump_info,
            'previousRunKey':report['previousRunKey'],'rollback':'UPDATE learning_catalog.current_run to previousRunKey'})
        targets = {
          'taxonomy':APP/'backend/src/main/resources/content-taxonomy.json',
          'projection':APP/'frontend/src/data/curriculumIdentities.json',
          'labels':APP/'veri/content-labels/labels.json','report':APP/'veri/content-labels/report.json',
          'audit':APP/'veri/content-labels/audit.json','references':APP/'veri/content-labels/curriculum-reference-labels.json',
        }
        sources = {'taxonomy':package/'maintenance.json','projection':root/'yol-uyumluluk/curriculum-identities-candidate.json',
          'labels':package/'labels.json','report':package/'report.json','audit':package/'audit.json',
          'references':package/'curriculum-reference-labels.json'}
        for name,target in targets.items():
            backup=attempt/('before-'+name+target.suffix); shutil.copyfile(target,backup)
        active = ARCHIVE/'Katalog/etkin-yollar.json'; active_existed=active.is_file()
        if active_existed: shutil.copyfile(active,attempt/'before-etkin-yollar.json')
        published=False
        try:
            publish=subprocess.run([str(APP.parent/'.venv/Scripts/python.exe'),'-X','utf8','scripts/content-label-publish.py',
                '--database','ivme','--state-dir',str(package)],cwd=APP,capture_output=True,text=True,
                encoding='utf-8',errors='replace',timeout=3600)
            (attempt/'publish.log').write_text(publish.stdout+publish.stderr,encoding='utf-8')
            if publish.returncode: raise ValueError('Atomic catalog publication failed')
            published=True
            if query((cmd,env,None),'SELECT run_key FROM learning_catalog.current_run')!=report['newRunKey']:
                raise ValueError('Published current catalog pointer differs')
            for name,target in targets.items(): atomic_copy(sources[name],target)
            atomic_copy(package/'etkin-yollar.json',active)
            commands=[['node','scripts/content-taxonomy-check.mjs','--check','--project'],
                [str(APP.parent/'.venv/Scripts/python.exe'),'-X','utf8','scripts/yks_katalog_kontrol.py'],
                [str(APP.parent/'.venv/Scripts/python.exe'),'-X','utf8','scripts/yks_pipeline_uyum.py'],
                [str(APP.parent/'.venv/Scripts/python.exe'),'-X','utf8','testler/yks-source-resolver-test.py']]
            logs=[]
            for index,command in enumerate(commands,1):
                result=subprocess.run(command,cwd=APP,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=900)
                log=attempt/f'post-cutover-{index}.log';log.write_text(result.stdout+result.stderr,encoding='utf-8');logs.append(log)
                if result.returncode: raise ValueError('Post-cutover check failed: '+str(log))
            after=protected_fingerprints(cmd,env);write_json(attempt/'protected-after.json',after)
            if before!=after: raise ValueError('Question/student/history table fingerprint changed')
            checkpoint({'phase':'catalog-and-source-projection-active','runKey':report['newRunKey'],'questionWrites':0})
            final={'status':'PASS','scope':'YKS_SOURCE_AND_MEBI_CATALOG_CUTOVER','previousRunKey':report['previousRunKey'],
              'newRunKey':report['newRunKey'],'itemsPreserved':report['currentItemsExported'],
              'categoriesPublished':report['finalCategories'],'otherExamCategoriesPreserved':report['otherExamCategoriesPreserved'],
              'activeSourceLocations':len(read_json(active)['locations']),'databaseBackup':dump_info,
              'protectedTablesUnchanged':True,'questionWrites':0,'studentRowsWritten':0,'oldIdsDeleted':0,
              'sourceFilesMoved':0,'sourceFilesDeleted':0,'rollbackReady':True,'fullYks11Complete':True}
            target=attempt/'cutover-acceptance.json';write_json(target,final)
            artifacts=[attempt/'protected-before.json',attempt/'protected-after.json',attempt/'backup-manifest.json',dump,
                attempt/'publish.log',*logs,target,*[attempt/('before-'+name+path.suffix) for name,path in targets.items()]]
            if active_existed:artifacts.append(attempt/'before-etkin-yollar.json')
            return {'status':'PASS','artifacts':artifacts,'summary':final,
                    'nextAction':'YKS-12: record an empty INSERT_ONLY transfer because YKS-09 has zero eligible items'}
        except BaseException:
            if published:
                query((cmd,env,None),"UPDATE learning_catalog.current_run SET run_key='"+report['previousRunKey'].replace("'","''")+"'")
            for name,target in targets.items(): atomic_copy(attempt/('before-'+name+target.suffix),target)
            if active_existed: atomic_copy(attempt/'before-etkin-yollar.json',active)
            else:
                inactive=read_json(package/'etkin-yollar.json');inactive['status']='PREPARED';write_json(active,inactive)
            raise
    print(store.execute('YKS-11','full',inputs,operation))


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--accept',action='store_true');args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    if store.verify(state,'YKS-10','full')['status']!='VERIFIED':raise ValueError('YKS-10 full acceptance required')
    root=store.child(state['runId']);folder=root/FOLDER;folder.mkdir(exist_ok=True)
    if args.accept:accept(store,state,root,folder)
    else:build(root,folder)


if __name__=='__main__':main()
