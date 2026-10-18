"""Read-only reconciliation of question label versions and preserved note links.

Archive labels are evidence, not a second effective taxonomy. Current human
decisions are applied by ContentReviewService; this report never writes reviews,
questions, answers or research history. Content uncertainty stays in the shared
quality queue, independently of a successful consistency check.
"""
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

from kaynakli_arastirma_db import db_connection, query
from yayinla_kaynakli_etiketler import payloads

APP = Path(__file__).resolve().parents[1]
STATE = APP / 'veri/content-labels'


def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def text_hash(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def research_state(saved, current, image_digest=None):
    if current is None:
        return 'RESEARCH_SOURCE_REMOVED'
    if current.get('intake'):
        return 'RESEARCH_REQUIRES_REBINDING'
    text = current.get('original', {}).get('text')
    if text is None:
        return 'RESEARCH_SOURCE_UNAVAILABLE'
    if saved['text_sha256'] != text_hash(text):
        return 'STALE_RESEARCH_TEXT'
    if saved.get('inspection_status') == 'ASSISTANT_IMAGE_REVIEWED':
        if not image_digest or saved.get('image_sha256') != image_digest:
            return 'STALE_RESEARCH_IMAGE'
    return 'CURRENT_SOURCE_EVIDENCE'


def main():
    data = load(STATE / 'labels.json')
    run = load(STATE / 'report.json')['runKey']
    inventory = load(STATE / 'source-inventory.json')
    questions = {q['code']: q for q in inventory['questions']}
    items = {i['key']: i for i in data['items']}
    cats = {c['id']: c for c in data['categories']}
    failures, differences = [], []
    issues = defaultdict(set)
    def problem(key, reason):
        issues[key].add(reason)
    # The old student JSON must still be an exact projection of its CSV source.
    files, groups = payloads()
    for name, expected in files.items():
        path = APP / 'frontend/public/kaynakli-etiketler' / name
        if not path.is_file() or path.read_text(encoding='utf-8') != expected:
            failures.append({'source': name, 'reason':'ARCHIVE_PROJECTION_STALE'})
    counts = Counter()
    for q in questions.values():
        item = items.get('question:' + q['code'])
        if not item or not item['automaticLabels']['assignments']:
            failures.append({'key':'question:' + q['code'], 'reason':'QUESTION_LABEL_MISSING'})
            continue
        if item['sourceVersion'] != q['inputFingerprint']:
            failures.append({'key':item['key'], 'reason':'QUESTION_SOURCE_VERSION_MISMATCH'})
        labels = item['automaticLabels']
        if any(not a.get('confidenceReason') or not a.get('locatorReason') for a in labels['assignments']):
            failures.append({'key':item['key'], 'reason':'UNCERTAINTY_REASON_MISSING'})
        if not item.get('sourceRecordRef'):
            failures.append({'key':item['key'], 'reason':'SOURCE_REFERENCE_MISSING'})
        archive = q.get('archive', {})
        current_ids = [a['categoryId'] for a in labels['assignments']]
        current_titles = {cats[c]['subtopic'] or cats[c]['topic'] for c in current_ids}
        if archive.get('label') and archive['label'] not in current_titles:
            reason = 'SOURCE_READING_PROPOSAL' if labels['basis']=='AI_SOURCE_ANALYSIS' else 'SOURCE_METADATA_TO_CONTROLLED_CATEGORY'
            differences.append({'key':item['key'], 'sourceVersion':item['sourceVersion'], 'reason':reason,
                                'archiveLabel':archive['label'], 'categoryIds':current_ids})
            counts[reason] += 1
        counts['questionsWithNumbers'] += bool(q.get('original', {}).get('questionNumbers'))
        counts['questionsWithImageReference'] += bool(item.get('sourceImage'))
        counts['questionsWithPdfPage'] += item.get('sourceLocationStatus')=='ESTIMATED'
    connection = db_connection()
    connection[1]['PGOPTIONS'] += ' -c default_transaction_read_only=on'
    research_run = query(connection, "SELECT run_key FROM source_research.runs ORDER BY created_at DESC,run_key LIMIT 1")
    research_counts = Counter()
    if research_run:
        # No answer data, private source text or learner data is selected.
        rows = json.loads(query(connection, """SELECT coalesce(json_agg(q),'[]') FROM
          (SELECT bank,code,text_sha256,image_sha256,inspection_status FROM source_research.question_evidence
           WHERE run_key=(SELECT run_key FROM source_research.runs ORDER BY created_at DESC,run_key LIMIT 1)) q"""))
        for saved in rows:
            q = questions.get(saved['code'])
            image_digest = None
            if q and saved['inspection_status']=='ASSISTANT_IMAGE_REVIEWED' and q.get('image'):
                image = APP / 'veri/resimler-pilot' / q['image']
                if image.is_file():
                    image_digest = hashlib.sha256(image.read_bytes()).hexdigest()
            state = research_state(saved, q, image_digest)
            research_counts[state] += 1
            if state != 'CURRENT_SOURCE_EVIDENCE':
                problem('question:' + saved['code'], state)
    reviews = json.loads(query(connection, """SELECT coalesce(json_agg(q),'[]') FROM
        (SELECT item_key,revision,decision->>'verdict' AS verdict,
          snapshot->'automaticLabels'->>'inputFingerprint' AS source_version FROM content_reviews) q"""))
    review_counts = Counter()
    for review in reviews:
        item = items.get(review['item_key'])
        state = 'REQUIRES_API_VALIDATION'
        if not item or review['source_version'] and review['source_version'] != item['sourceVersion']:
            state = 'STALE'
            problem(review['item_key'], 'APPROVAL_STALE')
        review_counts[state] += 1
    example_counts = Counter()
    for item in items.values():
        if item['kind']=='NOTE' or item['key'].startswith('note-question:'):
            for example in item.get('exampleSources', []):
                linked = items.get(example['sourceKey'])
                q = questions.get(example['locator']['questionCode'])
                if not linked or linked.get('bank') != example['bank']:
                    failures.append({'key':item['key'], 'sourceKey':example['sourceKey'], 'reason':'EXAMPLE_IDENTITY_MISSING'})
                    continue
                current = bool(q and example['sourceFingerprint']==text_hash(q.get('original', {}).get('text', '')))
                example_counts['CURRENT' if current else 'STALE'] += 1
                if not current:
                    problem(item['key'], 'NOTE_EXAMPLE_SOURCE_CHANGED')
    destination = STATE / 'question-checks' / run
    destination.mkdir(parents=True, exist_ok=True)
    with (destination / 'differences.jsonl').open('w', encoding='utf-8') as stream:
        for row in differences:
            stream.write(json.dumps(row, ensure_ascii=False)+'\n')
    report = {'version':1, 'runKey':run, 'status':'PASS' if not failures else 'FAIL',
              'questions':len(questions), 'archiveGroups':len(groups), 'archiveProjectionFiles':len(files),
              'sourceCounts':dict(counts), 'explainedDifferences':len(differences),
              'researchRunKey':research_run, 'researchCounts':dict(research_counts),
              'humanDecisions':len(reviews), 'reviewStates':dict(review_counts),
              'decisionPrecedence':'CURRENT_HUMAN_REVIEW_THEN_AUTOMATIC; STALE_REVIEWS_EXCLUDED_BY_API',
              'noteExampleLinks':dict(example_counts), 'failures':failures,
              'issues':{key:sorted(reasons) for key,reasons in sorted(issues.items())},
              'contentAccuracyVerified':False, 'learnerOrQuestionWrites':0}
    output = json.dumps(report, ensure_ascii=False, indent=2)+'\n'
    (destination / 'report.json').write_text(output, encoding='utf-8')
    (STATE / 'question-check.json').write_text(output, encoding='utf-8')
    print(json.dumps({key:value for key,value in report.items() if key!='issues'}, ensure_ascii=False))
    if failures:
        raise SystemExit('Question label consistency failed')


if __name__=='__main__':
    main()
