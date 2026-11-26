"""Refresh a local PostgreSQL copy of production activity over SSH."""

from datetime import datetime, timezone
import io
import json
import os
from pathlib import Path
import subprocess
import sys

from release import SSH_OPTIONS, host_alias

DATABASE = "production_izleme"
PURPOSE = "Ivme production activity mirror v1"
ROOT = Path(__file__).resolve().parent.parent
PSQL = Path("C:/Program Files/PostgreSQL/18/bin/psql.exe")

# Column allowlists keep credentials, session tokens, contact and health data out of the copy.
PROJECTS = {
    "ivme": ("ivme", "ivme_owner", {
        "users": "id username role enabled created_at last_login_at last_seen_at active_seconds",
        "questions": "id code exam_type subject topic bank active",
        "question_attempts": "id user_id question_id session_id event_type selected_answer is_correct active_seconds created_at",
        "exams": "id user_id exam_type subject status question_count started_at submitted_at correct_count wrong_count blank_count net",
        "study_sessions": "id user_id mode status started_at ended_at filter_exam_type filter_subject filter_topic",
    }),
    "wrestling": ("wrestling_club", "postgres", {
        "users": "id username role enabled last_login_at",
        "members": "id user_id first_name status joined_at",
        "attendance": "id session_id member_id status recorded_at",
        "weekly_student_progress": "member_id group_id week_start teamwork discipline updated_at",
        "home_activity_logs": "member_id activity_date activity_type minutes updated_at",
        "program_session_logs": "id program season session_no done done_on attendance updated_at",
    }),
    "arapca": ("arapca", "postgres", {
        "app_users": "id username display_name role last_seen_at",
        "daily_activity": "user_id day minutes answers correct points lessons_touched",
        "lesson_progress": "user_id lesson_id tier steps_done checkpoint_best best_quiz last_quiz last_studied_at",
        "question_attempts": "id user_id session_id question_id lesson_id mode correct response_ms created_at",
        "study_sessions": "id user_id kind lesson_id unit_id state total correct started_at ended_at",
    }),
    "prepexpert": ("sat", "postgres", {
        "users": "id role created_at",
        "learner_records": "user_id id kind updated_at",
        "qb2_sessions": "id user_id completed_at created_at",
    }),
}

TYPES = {
    "bool": "boolean", "int2": "smallint", "int4": "integer", "int8": "bigint",
    "float4": "real", "float8": "double precision", "numeric": "numeric",
    "bpchar": "text", "varchar": "text", "text": "text", "uuid": "uuid",
    "timestamp": "timestamp", "timestamptz": "timestamptz", "date": "date",
    "json": "jsonb", "jsonb": "jsonb", "_text": "text[]", "_varchar": "text[]",
    "_int4": "integer[]", "_int8": "bigint[]",
}


def sql_literal(value):
    return "'" + value.replace("'", "''") + "'"


def identifier(value):
    return '"' + value.replace('"', '""') + '"'


def local(database, sql):
    result = subprocess.run([str(PSQL), "-X", "-w", "-v", "ON_ERROR_STOP=1", "-Atq",
                             "-h", "127.0.0.1", "-U", os.environ["PGUSER"], "-d", database],
                            input=sql.encode(), stdout=subprocess.PIPE, check=True)
    return result.stdout.decode().strip()


def initialize():
    found = local("postgres", f"SELECT coalesce(shobj_description(oid, 'pg_database'), '') "
                              f"FROM pg_database WHERE datname={sql_literal(DATABASE)};")
    if not found:
        exists = local("postgres", f"SELECT 1 FROM pg_database WHERE datname={sql_literal(DATABASE)};")
        if exists:
            raise ValueError(f"Existing database {DATABASE} lacks the mirror marker")
        local("postgres", f"CREATE DATABASE {DATABASE}; COMMENT ON DATABASE {DATABASE} IS {sql_literal(PURPOSE)};")
    elif found != PURPOSE:
        raise ValueError(f"Existing database {DATABASE} has a different owner marker")
    local("postgres", f"ALTER DATABASE {DATABASE} SET default_transaction_read_only = on;")
    local("postgres", f"REVOKE CONNECT, TEMP ON DATABASE {DATABASE} FROM PUBLIC;")


def extract(host, project, database, user, tables):
    commands = ["BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;"]
    for table, fields in tables.items():
        columns = ", ".join(identifier(col) for col in fields.split())
        # Expose only stable underlying column types that can be recreated locally.
        commands.append(f"""
            SELECT json_build_object('table', {sql_literal(table)}, 'types', (
                SELECT json_object_agg(a.attname, t.typname)
                FROM pg_attribute a JOIN pg_type t ON t.oid=a.atttypid
                WHERE a.attrelid='public.{table}'::regclass AND a.attnum>0 AND NOT a.attisdropped
            ), 'rows', coalesce(json_agg(row_to_json(r)), '[]'::json))
            FROM (SELECT {columns} FROM public.{identifier(table)}) r;
        """)
    commands.append("COMMIT;")
    # All arguments come from the allowlist above. SQL is passed to psql on stdin.
    invoke = f"docker exec -i {project}-production-db-1 psql -X -Atq -v ON_ERROR_STOP=1 -U {user} -d {database}"
    result = subprocess.run(["ssh", *SSH_OPTIONS, host, invoke], input="\n".join(commands).encode(),
                            stdout=subprocess.PIPE, check=True, timeout=600)
    return [json.loads(line) for line in result.stdout.splitlines()]


def refresh(host, project, database, user, tables):
    snapshots = extract(host, project, database, user, tables)
    if [snapshot["table"] for snapshot in snapshots] != list(tables):
        raise ValueError(f"Incomplete production extract for {project}")
    schema = identifier(project)
    sql = io.StringIO()
    sql.write(f"BEGIN READ WRITE;\nDROP SCHEMA IF EXISTS {schema} CASCADE;\nCREATE SCHEMA {schema};\n")
    total = 0
    for snapshot in snapshots:
        table = snapshot["table"]
        fields = tables[table].split()
        columns = ", ".join(f"{identifier(col)} {TYPES[snapshot['types'][col]]}" for col in fields)
        qualified = f"{schema}.{identifier(table)}"
        sql.write(f"CREATE TABLE {qualified} ({columns});\n")
        rows = snapshot["rows"]
        total += len(rows)
        for start in range(0, len(rows), 2000):
            data = json.dumps(rows[start:start + 2000], ensure_ascii=False, separators=(",", ":"))
            sql.write(f"INSERT INTO {qualified} SELECT * FROM jsonb_populate_recordset(NULL::{qualified}, "
                      f"{sql_literal(data)}::jsonb);\n")
    if project == "ivme":
        sql.write("""
            CREATE VIEW ivme.ogrenci_cozumleri AS
            SELECT a.id, a.user_id, u.username, q.code AS question_code, q.exam_type,
                   q.subject, q.topic, a.selected_answer, a.is_correct, a.active_seconds, a.created_at
            FROM ivme.question_attempts a
            LEFT JOIN ivme.users u ON u.id = a.user_id
            LEFT JOIN ivme.questions q ON q.id = a.question_id;
        """)
    sql.write(f"""
        CREATE TABLE {schema}.sync_status (synced_at timestamptz NOT NULL, imported_rows bigint NOT NULL);
        INSERT INTO {schema}.sync_status VALUES (clock_timestamp(), {total});
        COMMIT;
    """)
    local(DATABASE, sql.getvalue())
    print(f"{datetime.now(timezone.utc).isoformat(timespec='seconds')} {project}: {total} rows", flush=True)


def main():
    os.environ["PGCLIENTENCODING"] = "UTF8"
    os.environ["PGOPTIONS"] = "-c standard_conforming_strings=on -c client_min_messages=warning"
    os.environ["PGCONNECT_TIMEOUT"] = "10"
    settings = ROOT / ".codex/local-environment.json"
    config = json.loads(settings.read_text(encoding="utf-8-sig")) if settings.exists() else {}
    os.environ["PGUSER"] = config.get("DbUser", "root")
    os.environ["PGPASSWORD"] = config.get("DbPassword", "root")
    initialize()
    host = host_alias()
    failed = False
    for project, (database, user, tables) in PROJECTS.items():
        try:
            refresh(host, project, database, user, tables)
        except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
            print(f"{project}: refresh failed ({type(error).__name__}). Previous copy kept.", file=sys.stderr)
            failed = True
    return int(failed)


if __name__ == "__main__":
    raise SystemExit(main())
