"""Separate identical PDF bytes from existing bank coverage; never delete sources."""
from collections import Counter, defaultdict
import json
from pathlib import Path

from yks_birlestirme import digest, read_json, write_json
from yks_stages.database import Snapshot, connection


def pdf_observation(row):
    return row.get('kind') == 'ZIP_PDF' or row.get('kind') == 'FILE' and Path(row['path']).suffix.lower() == '.pdf'


def coverage_candidate(previous):
    if previous is None:
        return 'NOT_PREVIOUSLY_ASSESSED'
    state = previous['coverageState']
    expected = previous.get('expectedQuestions')
    linked = previous.get('linkedQuestions', 0)
    pending = previous.get('pendingOccurrences', 0)
    if state == 'NO_QUESTIONS' and expected == 0 and linked == 0 and pending == 0:
        return 'REUSE_NO_QUESTIONS_EVIDENCE_CANDIDATE'
    if state == 'VERIFIED' and expected and linked >= expected and pending == 0:
        return 'REUSE_TRANSFER_EVIDENCE_CANDIDATE'
    return 'PARTIAL_OR_REVIEW_REQUIRED'


def group_sources(observations, prior, mebi_metadata=None):
    groups = defaultdict(list)
    metadata = mebi_metadata or {}
    for row in observations:
        if pdf_observation(row):
            groups[row['sha256']].append(row)
    results = []
    for sha, occurrences in sorted(groups.items()):
        def preference(row):
            return (row['kind'] != 'FILE', Path(row['root']).name != 'mebi-yks',
                    row['path'] not in metadata, len(row['path']), row['path'])
        physical = [r for r in occurrences if r['kind'] == 'FILE']
        identities = {(r.get('device'), r.get('inode') or (r['root'], r['path'])) for r in physical}
        canonical = min(occurrences, key=preference)
        existing = prior.get(sha)
        mebi = [metadata[r['path']] for r in occurrences if Path(r['root']).name == 'mebi-yks' and r['path'] in metadata]
        results.append({'sha256': sha, 'canonicalCandidate': canonical, 'occurrences': occurrences,
                        'physicalPaths': len(physical), 'zipOccurrences': len(occurrences) - len(physical),
                        'distinctPhysicalFiles': len(identities),
                        'removableCopyCandidates': max(0, len(identities) - 1),
                        'alternatePaths': max(0, len(physical) - 1),
                        'metadata': mebi, 'previousEvidence': existing,
                        'processingCandidate': coverage_candidate(existing),
                        'contentApproval': 'NOT_CHANGED', 'deletionAuthorizedByStage': False})
    return results


def inventory_path(store, state):
    record = state['stages'].get('YKS-02:full', {})
    for item in record.get('artifacts', []):
        if item['path'].replace('\\', '/').endswith('/inventory.jsonl'):
            return store.child(state['runId'] + '/' + item['path'])
    raise ValueError('Verified source inventory is required')


def bank_stamp(snapshot):
    return snapshot.execute("SELECT md5(coalesce(string_agg(code||':'||correct_answer||':'||active::text||':'||coalesce(image,'')||':'||updated_at::text,'|' ORDER BY code),'')) FROM questions WHERE exam_type IN ('TYT','AYT');")


def database_evidence(app):
    cmd, env = connection(app)
    with Snapshot(cmd, env) as snapshot:
        stamp = bank_stamp(snapshot)
        rows = snapshot.execute("""WITH o AS (
          SELECT source_sha256,count(DISTINCT question_code) FILTER(WHERE status='LINKED') linked,
           count(*) FILTER(WHERE status IN ('CANDIDATE','NEEDS_REVIEW')) pending
          FROM learning_catalog.pdf_question_occurrences GROUP BY source_sha256)
          SELECT coalesce(json_agg(json_build_object('sha256',s.source_sha256,'pageCount',s.page_count,
           'contentFormat',s.content_format,'coverageState',s.coverage_state,
           'expectedQuestions',s.expected_questions,'linkedQuestions',coalesce(o.linked,0),
           'pendingOccurrences',coalesce(o.pending,0),'extractorVersion',s.extractor_version,
           'coverageEvidence',s.coverage_evidence)) ORDER BY s.source_sha256),'[]')
          FROM learning_catalog.pdf_sources s LEFT JOIN o USING(source_sha256);""")
    return {'bankStamp': stamp, 'sources': json.loads(rows), 'sourceReadOnly': True}


def inputs(app, store, state):
    cmd, env = connection(app)
    with Snapshot(cmd, env) as snapshot:
        stamp = bank_stamp(snapshot)
    path = inventory_path(store, state)
    mebi = Path(state['sourceRoots'][0]) / 'dosya-listesi.json'
    return {'version': 1, 'fileBase': str(app), 'files': {'scripts/yks_stages/stage_03.py': digest(Path(__file__))},
            'inventorySha256': digest(path), 'bankStamp': stamp, 'mebiMetadataSha256': digest(mebi)}


def operation(app, store, state):
    expected = inputs(app, store, state)
    def perform(folder, cursor, checkpoint):
        path = inventory_path(store, state)
        if digest(path) != expected['inventorySha256']:
            raise ValueError('Inventory evidence changed')
        observations = [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines()]
        evidence = database_evidence(app)
        if evidence['bankStamp'] != expected['bankStamp']:
            raise ValueError('Question bank changed before source reconciliation')
        mebi_metadata = {}
        for item in read_json(Path(state['sourceRoots'][0]) / 'dosya-listesi.json'):
            for location in [item['path'], *item.get('aliases', [])]:
                mebi_metadata[location.replace('\\', '/')] = {k: item.get(k) for k in ['name', 'source', 'metadata', 'references']}
        groups = group_sources(observations, {p['sha256']: p for p in evidence['sources']}, mebi_metadata)
        if digest(Path(state['sourceRoots'][0]) / 'dosya-listesi.json') != expected['mebiMetadataSha256']:
            raise ValueError('MEBI metadata changed during grouping')
        output = folder / 'pdf-groups.jsonl'
        with output.open('w', encoding='utf-8') as stream:
            for group in groups:
                stream.write(json.dumps(group, ensure_ascii=False) + '\n')
        write_json(folder / 'existing-source-evidence.json', evidence)
        report = {'status': 'PASS', 'uniquePdfs': len(groups),
                  'pdfOccurrences': sum(len(g['occurrences']) for g in groups),
                  'exactPhysicalCopyCandidates': sum(g['removableCopyCandidates'] for g in groups),
                  'processingCandidates': dict(Counter(g['processingCandidate'] for g in groups)),
                  'sourcesDeleted': 0, 'questionsInserted': 0, 'modelsCalled': 0,
                  'note': 'Coverage is a reuse candidate, not renewed content approval. Near-identical PDFs remain distinct.'}
        write_json(folder / 'duplicate-coverage-report.json', report)
        checkpoint({'groups': len(groups), 'phase': 'exact-identity-and-prior-coverage-complete'})
        return {'status': 'PASS', 'artifacts': [output, folder / 'existing-source-evidence.json', folder / 'duplicate-coverage-report.json'],
                'summary': report, 'nextAction': 'YKS-04 MEBI taxonomy crosswalk preserving existing IDs'}
    return perform
