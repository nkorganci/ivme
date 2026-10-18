"""Copy missing production student accounts into development without replacing dev records.

Default: preview. --apply takes a dev users backup and inserts only missing students.
Production is read through a read-only connection. No account fields are logged.
"""
import argparse
import csv
import io
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from kaynakli_arastirma_db import db_connection

APP = Path(__file__).resolve().parents[1]


def run_sql(connection, sql):
    command, env, _ = connection
    result = subprocess.run([*command, '-q', '-A', '-t'], input=sql, env=env,
                            text=True, encoding='utf-8', capture_output=True)
    if result.returncode:
        raise RuntimeError('Database operation failed; account values are omitted from diagnostics.')
    return result.stdout.strip()


def missing_accounts(source, destination):
    names = {str(row['username']).casefold(): row for row in destination}
    emails = {str(row['email']).casefold(): row for row in destination if row.get('email')}
    missing = []
    for account in source:
        by_name = names.get(str(account['username']).casefold())
        by_email = emails.get(str(account['email']).casefold()) if account.get('email') else None
        if by_name or by_email:
            if not (by_name and by_email and by_name['id'] == by_email['id']):
                raise ValueError('An account identity conflicts with a development account; nothing was changed.')
            continue
        missing.append(account)
    return missing


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    production = db_connection('ivme')
    production[1]['PGOPTIONS'] += ' -c default_transaction_read_only=on'
    development = db_connection('ivme_dev')
    source = json.loads(run_sql(production, """SELECT json_build_object(
        'database', current_database(), 'readOnly', current_setting('transaction_read_only'),
        'columns', (SELECT json_agg(json_build_object('name',attname,'type',format_type(atttypid,atttypmod)) ORDER BY attnum)
          FROM pg_attribute WHERE attrelid='public.users'::regclass AND attnum>0 AND NOT attisdropped),
        'accounts', (SELECT coalesce(json_agg(row_to_json(u)), '[]') FROM users u
          WHERE role='USER' AND archived_at IS NULL));"""))
    target = json.loads(run_sql(development, """SELECT json_build_object(
        'database',current_database(),
        'columns',(SELECT json_agg(json_build_object('name',attname,'type',format_type(atttypid,atttypmod)) ORDER BY attnum)
          FROM pg_attribute WHERE attrelid='public.users'::regclass AND attnum>0 AND NOT attisdropped),
        'accounts',(SELECT coalesce(json_agg(json_build_object('id',id,'username',username,'email',email)),'[]') FROM users));"""))
    if source['database'] != 'ivme' or source['readOnly'] != 'on' or target['database'] != 'ivme_dev':
        raise ValueError('Unexpected source/target database or production is not read-only.')
    if source['columns'] != target['columns']:
        raise ValueError('Account schemas differ; migrate development before copying accounts.')
    missing = missing_accounts(source['accounts'], target['accounts'])
    report = {'mode':'APPLY' if args.apply else 'PREVIEW', 'productionReadOnly':True,
              'sourceStudents':len(source['accounts']), 'missingStudents':len(missing),
              'existingDevAccounts':len(target['accounts']), 'existingDevAccountsPreserved':True}
    if args.apply and missing:
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        backup = APP / 'veri/yedek' / f'dev-users-before-sync-{stamp}.dump'
        backup.parent.mkdir(parents=True, exist_ok=True)
        command, env, _ = development
        executable = str(Path(command[0]).with_name('pg_dump.exe'))
        connection_args = command[command.index('--host'):]
        saved = subprocess.run([executable,*connection_args,'--format=custom','--table=public.users','--file',str(backup)],
                               env=env,text=True,capture_output=True)
        if saved.returncode:
            raise RuntimeError('Development account backup failed; no accounts were imported.')
        columns = [entry['name'] for entry in source['columns'] if entry['name'] != 'id']
        quoted = ','.join('"'+name.replace('"','""')+'"' for name in columns)
        selected = ','.join('s."'+name.replace('"','""')+'"' for name in columns)
        rows = io.StringIO(newline='')
        writer = csv.writer(rows, lineterminator='\n')
        for account in missing:
            writer.writerow([json.dumps(account,ensure_ascii=False)])
        sql = """BEGIN;
        DO $$ BEGIN IF current_database()<>'ivme_dev' THEN RAISE EXCEPTION 'Wrong target'; END IF; END $$;
        LOCK TABLE public.users IN SHARE ROW EXCLUSIVE MODE;
        CREATE TEMP TABLE protected_accounts ON COMMIT DROP AS SELECT id,md5(row_to_json(u)::text) digest FROM users u;
        CREATE TEMP TABLE imported_accounts(payload jsonb) ON COMMIT DROP;
        COPY imported_accounts(payload) FROM STDIN WITH (FORMAT csv);
        """.rstrip() + '\n' + rows.getvalue() + '\\.\n'
        sql += """DO $$ BEGIN
          PERFORM setval(pg_get_serial_sequence('public.users','id'),
            GREATEST(coalesce((SELECT max(id) FROM users),1),
              coalesce(pg_sequence_last_value(pg_get_serial_sequence('public.users','id')::regclass),1)),true);
        END $$;
        """
        sql += f"""INSERT INTO public.users ({quoted}) SELECT {selected}
          FROM imported_accounts i CROSS JOIN LATERAL json_populate_record(NULL::public.users,i.payload::json) s
          WHERE s.role='USER' AND s.archived_at IS NULL AND NOT EXISTS
            (SELECT 1 FROM users d WHERE lower(d.username)=lower(s.username) OR lower(d.email)=lower(s.email));
        """
        sql += """DO $$ BEGIN IF EXISTS (
          SELECT 1 FROM protected_accounts p LEFT JOIN users u ON u.id=p.id
          WHERE u.id IS NULL OR p.digest<>md5(row_to_json(u)::text)) THEN
          RAISE EXCEPTION 'Existing development accounts changed'; END IF; END $$;
        SELECT json_build_object('insertedStudents',(SELECT count(*) FROM users)-(SELECT count(*) FROM protected_accounts),
          'developmentStudents',(SELECT count(*) FROM users WHERE role='USER' AND archived_at IS NULL),
          'existingDevAccountsPreserved',true);
        COMMIT;
        """
        report.update(json.loads(run_sql(development,sql)))
        report['backup'] = str(backup.relative_to(APP))
    else:
        report['insertedStudents'] = 0
    output = APP / 'veri/content-labels/integration/production-dev-sync-20261018'
    output.mkdir(parents=True,exist_ok=True)
    (output/('accounts-apply.json' if args.apply else 'accounts-preview.json')).write_text(
        json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
