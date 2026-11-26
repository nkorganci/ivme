"""Stream a consistent, minimized fixture from the VPS. Executed via SSH without a remote file."""
import re
import subprocess
import sys

# Only tables needed for these local learning and club scenarios enter a fixture.
TABLES = {
    "ivme": ("ivme", "ivme_owner", "flyway_schema_history questions exam_tracks user_exam_tracks exams exam_questions study_sessions session_questions question_attempts"),
    "wrestling": ("wrestling_club", "postgres", "flyway_schema_history weight_classes training_schedules training_groups group_members training_sessions membership_plans attendance"),
    "arapca": ("arapca", "postgres", "schema_migrations curriculum_lessons question_bank lesson_questions study_sessions question_attempts lesson_progress daily_activity"),
    "prepexpert": ("sat", "postgres", "schema_migrations"),
}
MASKED = {
    "ivme": {"users": "id 'test-'||id 'test-'||id||'@example.invalid' '!' role enabled created_at password_change_required site_manager approved active_seconds last_login_at last_seen_at"},
    "wrestling": {
        "users": "id 'test-'||id||'@example.invalid' '!' role enabled last_login_at created_at updated_at 'test-'||id",
        "members": "id user_id guardian_user_id 'member-'||id 'Test' id::text date'2000-01-01' gender false false status joined_at created_at updated_at",
        "coaches": "id user_id 'coach-'||id 'Test' id::text display_order active created_at updated_at",
    },
    "arapca": {"app_users": "id 'test-'||id 'test-'||id '!' created_at role 'Test-'||id last_seen_at"},
    "prepexpert": {"users": "id 'test-'||id||'@example.invalid' '!' role created_at"},
}
COLUMNS = {
    "ivme": {"users": "id username email password_hash role enabled created_at password_change_required site_manager approved active_seconds last_login_at last_seen_at"},
    "wrestling": {
        "users": "id email password_hash role enabled last_login_at created_at updated_at username",
        "members": "id user_id guardian_user_id slug first_name last_name birth_date gender public_profile parental_consent status joined_at created_at updated_at",
        "coaches": "id user_id slug first_name last_name display_order active created_at updated_at",
    },
    "arapca": {"app_users": "id username username_key password_hash created_at role display_name last_seen_at"},
    "prepexpert": {"users": "id email password_hash role created_at"},
}


def export(project):
    database, user, tables = TABLES[project]
    docker = ["docker", "exec", "-i", f"{project}-production-db-1"]
    psql = docker + ["psql", "-XAtq", "-v", "ON_ERROR_STOP=1", "-U", user, "-d", database]
    dump = docker + ["pg_dump", "-U", user, "-d", database, "--no-owner", "--no-acl", "--no-comments"]
    with subprocess.Popen(psql, stdin=subprocess.PIPE, stdout=subprocess.PIPE) as lock:
        try:
            lock.stdin.write(b"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT pg_export_snapshot();\n")
            lock.stdin.flush()
            snapshot = lock.stdout.readline().decode().strip()
            if not re.fullmatch("[A-Fa-f0-9-]+", snapshot):
                raise RuntimeError("Snapshot unavailable")
            dump += ["--snapshot", snapshot]
            subprocess.run(dump + ["--section=pre-data"], check=True)
            for table, fields in MASKED[project].items():
                cols = ", ".join(COLUMNS[project][table].split())
                select = ", ".join(fields.split())
                print(f"COPY public.{table} ({cols}) FROM stdin;", flush=True)
                sql = (f"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET TRANSACTION SNAPSHOT '{snapshot}'; "
                       f"COPY (SELECT {select} FROM public.{table}) TO STDOUT; COMMIT;")
                subprocess.run(psql + ["-c", sql], check=True)
                print(r"\.", flush=True)
            seq = subprocess.check_output(psql + ["-c", "select quote_ident(schemaname)||'.'||quote_ident(sequencename) from pg_sequences"]).decode().splitlines()
            selected = ["public." + name for name in tables.split()] + seq
            args = [arg for name in selected for arg in ("--table", name)]
            subprocess.run(dump + ["--data-only", *args], check=True)
            subprocess.run(dump + ["--section=post-data"], check=True)
        finally:
            lock.stdin.close()
            lock.wait()


if __name__ == "__main__":
    export(sys.argv[1])
