"""Import the existing audited PDF snapshot into PostgreSQL without rereading PDFs."""
import gzip
import hashlib
import json
import subprocess
from pathlib import Path

from kaynakli_arastirma_db import db_connection, query

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'backend/src/main/resources/pdf-bank-audit.json.gz'


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def main():
    connection = db_connection('ivme')
    if query(connection, "SELECT to_regclass('learning_catalog.pdf_audit_rows') IS NOT NULL") != 't':
        raise RuntimeError('V77 database migration has not run')
    if query(connection, 'SELECT count(*) FROM learning_catalog.pdf_audit_rows') != '0':
        raise RuntimeError('PDF audit rows already exist; preserve current database edits')
    with gzip.open(SOURCE, 'rt', encoding='utf-8') as stream:
        snapshot = json.load(stream)
    rows = snapshot.pop('pdfs')
    ids = [row['id'] for row in rows]
    if snapshot['version'] != 1 or len(rows) != 2708 or len(ids) != len(set(ids)):
        raise RuntimeError('Unexpected PDF audit snapshot')
    snapshot['snapshotSha256'] = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    statements = ['BEGIN;',
        'INSERT INTO learning_catalog.pdf_audit_state(id,metadata) VALUES '
        f"(true,{literal(json.dumps(snapshot, ensure_ascii=False))}::jsonb);" ]
    statements.extend('INSERT INTO learning_catalog.pdf_audit_rows(catalog_id,data) VALUES '
                      f"({row['id']},{literal(json.dumps(row, ensure_ascii=False))}::jsonb);" for row in rows)
    statements.append('COMMIT;')
    command, env, _ = connection
    result = subprocess.run([*command, '--set=ON_ERROR_STOP=1'], input='\n'.join(statements),
                            env=env, capture_output=True, text=True, encoding='utf-8')
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    stored = query(connection, 'SELECT count(*) FROM learning_catalog.pdf_audit_rows')
    if stored != str(len(rows)):
        raise RuntimeError(f'Only {stored} of {len(rows)} PDF rows were stored')
    print(json.dumps({'database': 'ivme', 'rows': len(rows), 'snapshotSha256': snapshot['snapshotSha256']}))


if __name__ == '__main__':
    main()
