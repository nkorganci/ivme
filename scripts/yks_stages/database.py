"""Local PostgreSQL snapshot/backup helpers. Credentials stay in child environments."""
import json
import os
from pathlib import Path
import queue
import shutil
import subprocess
import threading
import time

RESERVE = 20 * 1024**3


def identifier(value):
    if not value or '\x00' in value:
        raise ValueError('Invalid SQL identifier')
    return '"' + value.replace('"', '""') + '"'


def connection(app, database='ivme'):
    if database == 'ivme':
        from kaynakli_arastirma_db import db_connection
        cmd, env, _ = db_connection('ivme')
        return cmd, env
    if database != 'ogm_ders':
        raise ValueError('Unexpected source database')
    instance = json.loads((app.parent / 'pipeline/data/postgres_instance.json').read_text())
    settings = {}
    for line in (app.parent / 'pipeline/.env').read_text(encoding='utf-8-sig').splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            settings[key.strip()] = value.strip().strip('"\'')
    host = settings.get('PGHOST', instance['host'])
    if host not in ('127.0.0.1', 'localhost', '::1'):
        raise ValueError('Only loopback PostgreSQL is permitted')
    env = os.environ.copy()
    env.update(PGPASSWORD=settings['PGPASSWORD'], PGCLIENTENCODING='UTF8', PGCONNECT_TIMEOUT='5')
    cmd = [str(Path(instance['bin']) / 'psql.exe'), '-X', '--no-password', '--set=ON_ERROR_STOP=1',
           '--host', host, '--port', settings.get('PGPORT', str(instance['port'])),
           '--username', settings['PGUSER'], '--dbname', database]
    return cmd, env


def for_database(cmd, name):
    value = list(cmd)
    value[value.index('--dbname') + 1] = name
    return value


def query(cmd, env, sql, timeout=120):
    result = subprocess.run([*cmd, '-Atq', '-c', sql], env=env, capture_output=True,
                            encoding='utf-8', errors='replace', timeout=timeout)
    if result.returncode:
        secret = env.get('PGPASSWORD', '')
        message = result.stderr.replace(secret, '[REDACTED]') if secret else result.stderr
        raise RuntimeError('PostgreSQL query failed: ' + message[-1500:])
    return result.stdout.strip()


class Snapshot:
    def __init__(self, cmd, env):
        self.cmd, self.env = cmd, env
        self.lines = queue.Queue()

    def __enter__(self):
        self.process = subprocess.Popen([*self.cmd, '-Atq'], env=self.env, stdin=subprocess.PIPE,
                                        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                        text=True, encoding='utf-8', errors='replace', bufsize=1)
        def read():
            for line in self.process.stdout:
                self.lines.put(line.rstrip('\r\n'))
            self.lines.put(None)
        self.reader = threading.Thread(target=read, daemon=True)
        self.reader.start()
        self.execute("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL timezone='UTC';")
        return self

    def execute(self, sql, timeout=900):
        import uuid
        marker = 'YKS_END_' + uuid.uuid4().hex
        self.process.stdin.write(sql + "\nSELECT '" + marker + "';\n")
        self.process.stdin.flush()
        result = []
        deadline = time.monotonic() + timeout
        while True:
            try:
                line = self.lines.get(timeout=max(0.01, deadline - time.monotonic()))
            except queue.Empty:
                raise TimeoutError('PostgreSQL snapshot query timed out') from None
            if line is None:
                raise RuntimeError('PostgreSQL snapshot session closed unexpectedly')
            if line == marker:
                return '\n'.join(result)
            result.append(line)

    def __exit__(self, *args):
        if self.process.poll() is None:
            try:
                self.process.stdin.write('ROLLBACK;\n\\q\n')
                self.process.stdin.flush()
                self.process.wait(timeout=10)
            except (OSError, subprocess.TimeoutExpired):
                self.process.kill()
                self.process.wait()
        self.reader.join(timeout=2)
        for stream in (self.process.stdin, self.process.stdout):
            try:
                stream.close()
            except OSError:
                pass


TABLES_SQL = """SELECT coalesce(json_agg(x ORDER BY schema,name),'[]') FROM (
 SELECT n.nspname schema,c.relname name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
 AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%') x;"""


def record_expression(snapshot, table):
    # Built-in hashable values avoid expanding enormous JSONB histories to text.
    # User-defined/unsupported types (enum OIDs, vector, json, arrays) use text so
    # restored type OIDs cannot change the logical fingerprint.
    relation = identifier(table['schema']) + '.' + identifier(table['name'])
    literal = relation.replace("'", "''")
    sql = f"""SELECT json_agg(x ORDER BY position) FROM (
      SELECT a.attnum position,a.attname name,
       n.nspname='pg_catalog' AND EXISTS(
        SELECT 1 FROM pg_opclass oc JOIN pg_am am ON am.oid=oc.opcmethod
        WHERE am.amname='hash' AND oc.opcintype=a.atttypid) native
      FROM pg_attribute a JOIN pg_type t ON t.oid=a.atttypid
      JOIN pg_namespace n ON n.oid=t.typnamespace
      WHERE a.attrelid='{literal}'::regclass AND a.attnum>0 AND NOT a.attisdropped) x;"""
    columns = json.loads(snapshot.execute(sql))
    values = ['t.' + identifier(c['name']) + ('' if c['native'] else '::text') for c in columns]
    if not values:
        raise ValueError('Table has no fingerprintable columns')
    return 'ROW(' + ','.join(values) + ')'


def table_fingerprints(snapshot):
    tables = json.loads(snapshot.execute(TABLES_SQL))
    results = []
    for table in tables:
        name = identifier(table['schema']) + '.' + identifier(table['name'])
        row = record_expression(snapshot, table)
        sql = f"""WITH h AS MATERIALIZED (
          SELECT hash_record_extended({row},0) a,hash_record_extended({row},9173551) b FROM {name} t)
          SELECT json_build_object('rows',count(*),'rowDigest',md5(coalesce(string_agg(a::text||':'||b::text,'' ORDER BY a,b),''))) FROM h;"""
        results.append({**table, **json.loads(snapshot.execute(sql))})
    return results


def run_logged(arguments, env, log, timeout=3600):
    log.parent.mkdir(parents=True, exist_ok=True)
    with log.open('wb') as stream:
        process = subprocess.Popen(arguments, env=env, stdout=stream, stderr=subprocess.STDOUT)
        deadline = time.monotonic() + timeout
        try:
            while process.poll() is None:
                if time.monotonic() > deadline:
                    raise TimeoutError('PostgreSQL operation exceeded its time limit')
                if shutil.disk_usage(log.parent).free < RESERVE or shutil.disk_usage(Path.home()).free < RESERVE:
                    raise RuntimeError('Disk reserve reached during backup/restore')
                time.sleep(1)
            if process.returncode:
                raise RuntimeError('PostgreSQL operation failed; inspect ' + str(log))
        finally:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()


def backup_and_restore(app, database, folder, checkpoint):
    from yks_birlestirme import digest, read_json, write_json
    cmd, env = connection(app, database)
    admin = for_database(cmd, 'postgres')
    bin_dir = Path(cmd[0]).parent
    arguments = []
    for flag in ('--host', '--port', '--username'):
        arguments.extend([flag, cmd[cmd.index(flag) + 1]])
    existing = query(admin, env, "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname='ivme_test')")
    if existing != 'f':
        raise RuntimeError('Existing ivme_test is protected; do not replace it')
    report_path = folder / (database + '-restore.json')
    dump = folder / (database + '.dump')
    if report_path.exists():
        previous = read_json(report_path)
        if previous.get('status') == 'PASS' and dump.is_file() and digest(dump) == previous['dumpSha256']:
            return previous
    print('Baseline: snapshot/fingerprints for ' + database, flush=True)
    with Snapshot(cmd, env) as source:
        source_size = int(source.execute('SELECT pg_database_size(current_database());'))
        if shutil.disk_usage(folder).free < RESERVE + source_size * 1.2:
            raise RuntimeError('Not enough backup disk headroom for ' + database)
        if shutil.disk_usage(Path.home()).free < RESERVE + source_size * 1.2:
            raise RuntimeError('Not enough restore disk headroom for ' + database)
        snapshot_id = source.execute('SELECT pg_export_snapshot();')
        tables = table_fingerprints(source)
        snapshot_path = folder / (database + '-snapshot.json')
        write_json(snapshot_path, {'database': database, 'snapshot': snapshot_id, 'tables': tables})
        checkpoint({'database': database, 'phase': 'snapshot-complete'})
        print('Baseline: dumping ' + database, flush=True)
        run_logged([str(bin_dir / 'pg_dump.exe'), '--no-password', '--format=custom', '--compress=3',
                    *arguments, '--dbname', database, '--snapshot', snapshot_id, '--file', str(dump)],
                   env, folder / (database + '-dump.log'))
    checkpoint({'database': database, 'phase': 'dump-complete'})
    print('Baseline: restoring ' + database + ' into isolated ivme_test', flush=True)
    created_oid = None
    try:
        # CREATE fails if another test process won the race; no existing DB is dropped.
        query(admin, env, 'CREATE DATABASE ivme_test')
        created_oid = query(admin, env, "SELECT oid FROM pg_database WHERE datname='ivme_test'")
        write_json(folder / (database + '-restore-owner.json'), {'database': 'ivme_test', 'oid': created_oid, 'source': database})
        run_logged([str(bin_dir / 'pg_restore.exe'), '--no-password', '--no-owner', '--no-privileges',
                    '--exit-on-error', '--jobs=4', *arguments, '--dbname', 'ivme_test', str(dump)],
                   env, folder / (database + '-restore.log'))
        with Snapshot(for_database(cmd, 'ivme_test'), env) as restored:
            after = table_fingerprints(restored)
        if tables != after:
            write_json(folder / (database + '-restore-difference.json'), {'expected': tables, 'actual': after})
            raise ValueError('Restored table identities/counts/digests differ')
        report = {'status': 'PASS', 'sourceDatabase': database, 'sourceBytes': source_size,
                  'sourceSnapshot': snapshot_id, 'dumpPath': str(dump), 'dumpBytes': dump.stat().st_size,
                  'dumpSha256': digest(dump), 'tablesVerified': len(tables), 'restoredRowsAndDigestsEqual': True,
                  'sourceReadOnly': True, 'testDatabase': 'ivme_test', 'testDatabaseRemoved': False}
    finally:
        if created_oid:
            actual = query(admin, env, "SELECT oid FROM pg_database WHERE datname='ivme_test'")
            if actual != created_oid:
                raise RuntimeError('Restore DB identity changed; cleanup refused')
            query(admin, env, 'DROP DATABASE ivme_test')
    report['testDatabaseRemoved'] = True
    write_json(report_path, report)
    checkpoint({'database': database, 'phase': 'restore-verified'})
    return report
