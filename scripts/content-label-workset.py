"""Build a versioned identity inventory and processing queue without changing content.

The existing labels remain authoritative. Outputs are evidence for plan steps 1,
4-7, not another taxonomy or a claim of independently verified content accuracy.
"""
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse

APP = Path(__file__).resolve().parents[1]
STATE = APP / 'veri/content-labels'


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def latest_report(paths):
    # Run hashes do not sort chronologically. Only the trailing UTC timestamp does.
    return max(paths, key=lambda p: p.stem.rsplit('-', 1)[-1])


def unique(rows, field):
    result = {}
    for row in rows:
        if row[field] in result:
            raise ValueError(f'Duplicate identity: {row[field]}')
        result[row[field]] = row
    return result


def video_identity(url):
    parsed = urlparse(url)
    host = (parsed.hostname or '').lower()
    if host in {'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'}:
        code = parsed.path.strip('/').split('/')[-1] if host == 'youtu.be' or parsed.path.startswith(('/embed/', '/shorts/')) else parse_qs(parsed.query).get('v', [''])[0]
        if code:
            return f'youtube:{code}'
        playlist = parse_qs(parsed.query).get('list', [''])[0]
        if playlist:
            return f'youtube-playlist:{playlist}'
    # Never use a title as a video identity, or merge different providers.
    return f'url:{url}'


def resource_role(item):
    if item['kind'] == 'QUESTION':
        if item['key'].startswith('note-question:'):
            return 'NOTE_EXAMPLE'
        return 'ACTIVE_QUESTION' if item.get('studentVisible') else 'ARCHIVE_QUESTION'
    if item['kind'] == 'TOPIC':
        return 'CURRICULUM_REFERENCE'
    if item['automaticLabels'].get('contentFormat') == 'CEVAP_ANAHTARI':
        return 'ANSWER_KEY'
    return 'LEARNING_RESOURCE'


def missing_reasons(item, categories):
    labels = item['automaticLabels']
    assignments = labels.get('assignments', [])
    reasons = set(labels.get('reviewReasons', []))
    if not assignments:
        reasons.add('MISSING_LABEL')
    if assignments and all(categories[a['categoryId']]['topic'] == 'Dersin genel kapsamı' for a in assignments):
        reasons.add('BROAD_SCOPE')
    if labels.get('basis') == 'SOURCE_TITLE_ONLY' or all(e.get('type') == 'SOURCE_TITLE' for e in labels.get('evidence', [])):
        reasons.add('TITLE_ONLY')
    if any(not a.get('confidence') or not a.get('confidenceReason') for a in assignments):
        reasons.add('RELATION_CONFIDENCE_MISSING')
    if any(not any(e.get('association') == 'RELATION' for e in a.get('evidence', [])) for a in assignments):
        reasons.add('RELATION_EVIDENCE_MISSING')
    if item['kind'] in {'PDF', 'VIDEO'} and any(not a.get('locators') for a in assignments):
        reasons.add('PDF_PAGE_RANGE_MISSING' if item['kind'] == 'PDF' else 'VIDEO_TIME_RANGE_MISSING')
    if item.get('availability') == 'unverified':
        reasons.add('SOURCE_ACCESS_UNVERIFIED')
    elif item.get('availability') not in {'available', 'source_only'}:
        reasons.add('SOURCE_UNAVAILABLE_OR_BROKEN')
    if reasons & {'PREVIOUS_MODEL_LABEL', 'VISUAL_QUESTION', 'TITLE_ONLY', 'BROAD_SCOPE', 'AI_PROPOSAL_REQUIRES_TEACHER_REVIEW'}:
        reasons.add('CONTENT_READING_REQUIRED')
    return sorted(reasons)


def priority(item, reasons):
    if set(reasons) & {'SOURCE_SUBJECT_CONFLICT', 'INCOMPLETE_QUESTION_CROP', 'NEIGHBOR_QUESTION_IN_CROP', 'SOURCE_UNAVAILABLE_OR_BROKEN', 'APPROVAL_STALE'}:
        return 1
    return 2 if item.get('studentVisible') else 3


def build(data, questions, catalog, pdfs, review_rows=()):
    cats = unique(data['categories'], 'id')
    items = unique(data['items'], 'key')
    questions = unique(questions, 'code')
    catalog = unique(catalog, 'key')
    pdfs = unique(pdfs, 'key')
    reviews = unique(review_rows, 'item_key')
    entities = defaultdict(list)
    inventory, queue = [], []
    metrics = defaultdict(Counter)
    for key, item in sorted(items.items()):
        labels = item['automaticLabels']
        assignments = labels.get('assignments', [])
        for a in assignments:
            if a['categoryId'] not in cats:
                raise ValueError(f'Unknown category: {key}/{a["categoryId"]}')
        source = pdfs.get(key) or catalog.get(key) or questions.get(item.get('questionCode')) or {}
        entity = key
        access = item.get('availability', 'unknown')
        provenance = {'inputFingerprint': labels.get('inputFingerprint'), 'sourceUpdatedAt': item.get('sourceUpdatedAt')}
        if item['kind'] == 'PDF':
            provenance.update({'sha256': source.get('sourceSha256'), 'relativePath': source.get('relativePath'), 'sourceScope': source.get('sourceScope', 'OGM'), 'pageCount': source.get('pageCount')})
            # Equal bytes can share a physical asset. Catalog and edition identities survive.
            entity = 'sha256:' + source['sourceSha256'] if source.get('sourceSha256') else key
        elif item['kind'] == 'VIDEO':
            entity = video_identity(source.get('url', item.get('url', '')))
            access = item.get('remoteAvailability', 'REMOTE_NOT_CHECKED')
            provenance.update({'providerId': entity, 'url': source.get('url'), 'lastCatalogCheck': source.get('checkedOn')})
        elif item['kind'] == 'QUESTION' and source.get('code'):
            original = source.get('original', {})
            provenance.update({'databaseId': source.get('id'), 'questionCode': source['code'], 'recordRef': original.get('rawRef'), 'sourceFile': original.get('file'), 'sourcePage': original.get('page'), 'image': source.get('image')})
        reasons = missing_reasons(item, cats)
        review = reviews.get(key)
        # Compare only a stored inputFingerprint when available. Review API also
        # checks media bytes/category snapshots; absent evidence is never APPROVE.
        review_state = 'PENDING' if not review else 'REQUIRES_API_VALIDATION'
        if review:
            saved = review.get('snapshot', {}).get('automaticLabels', {}).get('inputFingerprint')
            if saved and saved != labels.get('inputFingerprint'):
                review_state = 'STALE'
                reasons = sorted(set(reasons) | {'APPROVAL_STALE'})
        row = {'itemKey': key, 'entityKey': entity, 'kind': item['kind'], 'role': resource_role(item),
               'sourceVersion': provenance, 'accessStatus': access, 'labelRef': key,
               'categoryIds': [a['categoryId'] for a in assignments], 'reviewState': review_state,
               'studentVisible': bool(item.get('studentVisible'))}
        inventory.append(row)
        entities[(item['kind'], entity)].append(key)
        if reasons:
            queue.append({'itemKey': key, 'kind': item['kind'], 'exam': item['exam'], 'subjectId': item['subjectId'],
                          'priority': priority(item, reasons), 'reasons': reasons,
                          'targetSteps': ['05' if item['kind'] == 'PDF' else '06' if item['kind'] == 'VIDEO' else '04', '07']})
        for dimension in [f'kind:{item["kind"]}', f'branch:{item["exam"]}:{item["subjectId"]}']:
            stat = metrics[dimension]
            stat['resources'] += 1
            stat['relations'] += len(assignments)
            stat['relationsWithConfidence'] += sum(bool(a.get('confidence') and a.get('confidenceReason')) for a in assignments)
            stat['relationsWithEvidence'] += sum(any(e.get('association') == 'RELATION' for e in a.get('evidence', [])) for a in assignments)
            stat['relationsWithLocatorStatus'] += sum(bool(a.get('locatorStatus')) for a in assignments)
            stat['relationsWithLocators'] += sum(bool(a.get('locators')) for a in assignments)
    queue.sort(key=lambda r: (r['priority'], r['itemKey']))
    shared = [{'kind': kind, 'entityKey': entity, 'itemKeys': keys, 'referenceCount': len(keys)}
              for (kind, entity), keys in sorted(entities.items()) if len(keys) > 1]
    return inventory, queue, {'resources': len(inventory), 'uniqueEntities': len(entities),
        'byKind': dict(Counter(r['kind'] for r in inventory)), 'byRole': dict(Counter(r['role'] for r in inventory)),
        'sharedEntities': shared, 'metrics': {k: dict(v) for k, v in sorted(metrics.items())},
        'queueSize': len(queue), 'reasons': dict(sorted(Counter(r for row in queue for r in row['reasons']).items())),
        'priorityCounts': dict(Counter(row['priority'] for row in queue)), 'teacherDecisions': len(reviews),
        'unmappedTeacherDecisions': sorted(reviews.keys() - items.keys())}


def write_jsonl(path, rows):
    with path.open('w', encoding='utf-8', newline='\n') as stream:
        for row in rows:
            stream.write(json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reconciliation', type=Path, help='Successful current 01.01 report (default: latest)')
    args = parser.parse_args()
    evidence = args.reconciliation or latest_report((STATE / 'reconciliation').glob('*.json'))
    reconciliation = read(evidence)
    labels_path = STATE / 'labels.json'
    if reconciliation['status'] != 'MATCH' or reconciliation['local']['labelsSha256'] != digest(labels_path):
        raise ValueError('A matching reconciliation of these labels is required')
    for name in ['content-label-reconcile', 'kaynakli_arastirma_db']:
        spec = importlib.util.spec_from_file_location(name, APP / f'scripts/{name}.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        if name == 'content-label-reconcile':
            connection = module.readonly_connection(None)
        else:
            reviews = json.loads(module.query(connection, "SELECT coalesce(json_agg(r),'[]'::json) FROM (SELECT item_key,snapshot FROM content_reviews ORDER BY item_key) r"))
    inventory, queue, summary = build(read(labels_path), read(STATE / 'source-inventory.json')['questions'],
        read(APP / 'backend/src/main/resources/content-review-catalog.json')['items'],
        read(APP / 'backend/src/main/resources/pdf-review-labels.json')['items'], reviews)
    audit = read(STATE / 'audit.json')
    if audit['failures'] or audit['runKey'] != reconciliation['local']['runKey']:
        raise ValueError('Source coverage audit is missing or stale')
    output = STATE / 'inventory' / (audit['runKey'] + '-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    output.mkdir(parents=True, exist_ok=False)
    write_jsonl(output / 'resources.jsonl', inventory)
    write_jsonl(output / 'gaps.jsonl', queue)
    summary.update({'version': 1, 'tasks': ['01.02', '01.03'], 'runKey': audit['runKey'],
        'status': 'PASS', 'createdAt': datetime.now(timezone.utc).isoformat(),
        'reconciliation': evidence.relative_to(APP).as_posix(),
        'sourceCoverage': {k: audit[k] for k in ['sourceFiles', 'accountedSourceFiles', 'unaccountedSourceFiles', 'physicalPdfs', 'coveredPhysicalPdfs']},
        'nonEducationalExclusions': audit['nonEducationalExclusions'],
        'referenceFile': 'veri/content-labels/curriculum-reference-labels.json',
        'referenceFileSha256': digest(STATE / 'curriculum-reference-labels.json'),
        'duplicateHeaderFragments': audit['duplicateHeaderFragments'],
        'additionalDynamicCategories': reconciliation['api']['additionalDynamicCategories'],
        'outputs': {p.name: digest(p) for p in output.iterdir()},
        'limits': ['Remote video availability is not implied by a catalog entry.',
                   'Matching hashes do not merge catalog, edition or student identities.',
                   'Relation coverage is not a content accuracy or teacher approval measurement.']})
    (output / 'report.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'report': (output / 'report.json').relative_to(APP).as_posix(), 'resources': len(inventory), 'queueSize': len(queue), 'status': 'PASS'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
