"""Prepare source-bound correction evidence without modifying questions or learner history."""
from collections import Counter
from datetime import datetime, timezone
import csv, hashlib, json
from pathlib import Path
from kaynakli_arastirma_db import db_connection, query

APP = Path(__file__).resolve().parents[1]
STATE = APP / 'veri/content-labels'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    report = json.loads((STATE / 'report.json').read_text(encoding='utf-8'))
    records = {}
    for path in sorted((APP / 'ornek-veri/etiketler').glob('*.csv')):
        with path.open(encoding='utf-8-sig', newline='') as stream:
            for row in csv.DictReader(stream):
                conflict = row.get('source_subject_conflict') == 'true' or 'possible_subject_error' in row.get('review_reason', '')
                cancelled = row.get('official_status') == 'cancelled'
                if not conflict and not cancelled:
                    continue
                key = f"{row['bank']}:{row['code']}"
                records[key] = {
                    'key': key, 'code': row['code'], 'bank': row['bank'],
                    'problem': 'OFFICIAL_CANCELLATION' if cancelled else 'SOURCE_SUBJECT_CONFLICT',
                    'state': 'REQUIRES_SEPARATE_CONTENT_DECISION',
                    'source': {k: row[k] for k in ['exam_type', 'subject', 'source_topic', 'source_file', 'source_page', 'evidence_ref', 'official_notice_url'] if row.get(k)},
                    'proposal': {'subject': row.get('suggested_subject') or ('Coğrafya' if 'geography_content_in_history_row' in row.get('review_reason', '') else None), 'topic': row['label']},
                    'evidence': {'file': path.relative_to(APP).as_posix(), 'sha256': digest(path), 'reason': row.get('review_reason')},
                    'teacherApproved': False,
                    'historyPolicy': 'Preserve answers, scores and event-time snapshots. Future exclusion or branch correction needs a versioned decision; recalculation is separate and explicit.',
                }
    observations_path = APP / 'ornek-veri/kaynakli-arastirma-gozlemleri.json'
    for observation in json.loads(observations_path.read_text(encoding='utf-8'))['observations']:
        if not observation['evidence'].get('excludeFromGuides'):
            continue
        bank, code = observation['key'].split(':', 1)
        answer_conflict = code == '3a-tyt-biyoloji-16-02'
        records[observation['key']] = {
            'key': observation['key'], 'bank': bank, 'code': code,
            'problem': 'ANSWER_CONFLICT' if answer_conflict else 'SOURCE_TOPIC_CONFLICT',
            'state': 'INDEPENDENT_EXPERT_REVIEW_REQUIRED',
            'proposal': {'answer': 'D'} if answer_conflict else {'excludeFromGuides': True},
            'evidence': observation['evidence'], 'note': observation['note'], 'teacherApproved': False,
            'historyPolicy': 'No answer-key update or silent rescoring. Preserve original evidence and event-time scores; assess affected attempts before any approved correction.',
        }
    official_path = APP / 'ornek-veri/resmi-soru-durumlari.json'
    for row in json.loads(official_path.read_text(encoding='utf-8'))['records']:
        cache = APP / row['noticeCache']
        records[row['bank'] + ':' + row['code']] = {
            'key': row['bank'] + ':' + row['code'], 'bank': row['bank'], 'code': row['code'],
            'problem': 'OFFICIAL_CANCELLATION', 'state': 'REQUIRES_SEPARATE_CONTENT_DECISION',
            'source': row, 'teacherApproved': False,
            'evidence': {'file': official_path.relative_to(APP).as_posix(), 'sha256': digest(official_path),
                         'noticeSha256': digest(cache)},
            'historyPolicy': row['historyPolicy'],
        }
    repair = json.loads((STATE / 'source-repair/applied.json').read_text(encoding='utf-8'))
    for row in repair['records']:
        code = row['key'].removeprefix('question:')
        records['OGM:' + code] = {
            'key': 'OGM:' + code, 'bank': 'OGM', 'code': code,
            'problem': row['sourceProblem'], 'state': row['state'],
            'evidence': row, 'teacherApproved': False,
            'historyPolicy': 'Hash-checked derived display only. Original file, question code, answer and learner history stay intact.',
        }
    codes = ','.join("'" + r['code'].replace("'", "''") + "'" for r in records.values())
    connection = db_connection('ivme')
    connection[1]['PGOPTIONS'] += ' -c default_transaction_read_only=on'
    if query(connection, 'SELECT run_key FROM learning_catalog.current_run').strip() != report['runKey']:
        raise ValueError('Local and published catalog versions differ; finish publication before preparing corrections')
    sql = """
        SELECT coalesce(json_agg(x),'[]') FROM (
          SELECT q.code,q.bank,q.subject,q.topic,q.active,q.correct_answer,
            extract(epoch from q.updated_at)::text AS source_stamp,
            i.data->>'sourceVersion' AS source_version,
            i.data->'automaticLabels'->'assignments' AS current_assignments,
            (SELECT count(*) FROM question_attempts a WHERE a.question_id=q.id AND a.event_type='ANSWER') AS answer_events,
            (SELECT count(*) FROM exam_questions e WHERE e.question_id=q.id) AS exam_references
          FROM questions q LEFT JOIN learning_catalog.current_items i ON i.item_key='question:'||q.code
          WHERE q.code IN (""" + codes + ') ) x'
    current = {(r['bank'], r['code']): r for r in json.loads(query(connection, sql))}
    csv_rows = {}
    for filename, bank in [('sorular-tum.csv', 'CIKMIS'), ('sorular-ogm.csv', 'OGM')]:
        with (APP / 'veri' / filename).open(encoding='utf-8-sig', newline='') as stream:
            for row in csv.DictReader(stream):
                if bank + ':' + row['code'] in records:
                    csv_rows[(bank, row['code'])] = row
    for row in records.values():
        row['currentBank'] = current.get((row['bank'], row['code']))
        source = csv_rows.get((row['bank'], row['code']))
        if source:
            relative = source.get('image', '')
            path = APP / 'veri/resimler-pilot' / relative
            crop = APP / 'veri/resimler-pilot/kirpilmis' / relative
            actual = crop if crop.is_file() else path
            row['originalImage'] = {'path': relative, 'sha256': digest(path) if path.is_file() else None,
                                    'displayCropSha256': digest(actual) if actual.is_file() else None}
        row['questionOrLearnerWrites'] = 0
    applied = {r['question_code']: r for r in json.loads(query(connection,
        "SELECT coalesce(json_agg(x),'[]') FROM (SELECT question_code,source_url,source_sha256,applied_at FROM learning_catalog.official_question_corrections)x"))}
    for row in records.values():
        if row['problem']=='OFFICIAL_CANCELLATION' and row['code'] in applied:
            row['state']='APPLIED_FUTURE_SELECTION_EXCLUSION'
            row['applicationEvidence']=applied[row['code']]
    timestamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    output = STATE / 'corrections' / (report['runKey'] + '-' + timestamp)
    output.mkdir(parents=True, exist_ok=False)
    (output / 'records.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in records.values()), encoding='utf-8')
    summary = {'version': 1, 'runKey': report['runKey'], 'createdAt': timestamp,
               'problems': dict(Counter(r['problem'] for r in records.values())),
               'states': dict(Counter(r['state'] for r in records.values())),
               'records': len(records), 'teacherApproved': 0, 'questionOrLearnerWrites': 0,
               'officialArchive': {'report': 'veri/content-labels/official-archive/report.json',
                                   'sha256': digest(STATE / 'official-archive/report.json')},
               'recordsSha256': digest(output / 'records.jsonl')}
    (output / 'report.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'output': output.relative_to(APP).as_posix(), **summary}, ensure_ascii=False))

if __name__ == '__main__':
    main()
