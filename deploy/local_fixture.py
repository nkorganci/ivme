"""Create a writable local fixture. Re-runs preserve the preceding local database."""
import argparse
from datetime import datetime, timezone
import os
from pathlib import Path
import secrets
import subprocess

from export_fixture import TABLES
from release import SSH_OPTIONS, host_alias

CONTAINER = "ivme-development-postgres"
IMAGE = "pgvector/pgvector:0.8.7-pg18-trixie"
HERE = Path(__file__).resolve().parent


def run(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def sql(statement, database="postgres", role="postgres"):
    return run("docker", "exec", "-i", CONTAINER, "psql", "-XAtq", "-v", "ON_ERROR_STOP=1",
               "-U", role, "-d", database, input=statement.encode(), stdout=subprocess.PIPE).stdout.decode().strip()


def cluster():
    names = run("docker", "ps", "-a", "--format", "{{.Names}}", stdout=subprocess.PIPE).stdout.decode().splitlines()
    if CONTAINER not in names:
        run("docker", "run", "-d", "--name", CONTAINER, "--label", "dev.ivme.fixture=v1",
            "--restart", "unless-stopped", "-p", "127.0.0.1:55432:5432",
            "-v", "ivme-development-pg18:/var/lib/postgresql", "-e", "POSTGRES_PASSWORD", IMAGE,
            env={**os.environ, "POSTGRES_PASSWORD": secrets.token_hex(32)})
    marker = run("docker", "inspect", "-f", '{{ index .Config.Labels "dev.ivme.fixture" }}',
                 CONTAINER, stdout=subprocess.PIPE).stdout.strip()
    if marker != b"v1":
        raise ValueError("Unrecognized local fixture container")
    run("docker", "start", CONTAINER, stdout=subprocess.DEVNULL)
    run("docker", "exec", CONTAINER, "sh", "-ec",
        "for i in $(seq 1 60); do pg_isready -h 127.0.0.1 >/dev/null && exit 0; sleep 1; done; exit 1")


def ensure_role(role, key, directory):
    credential = directory / (key + ".credential")
    if not sql(f"select 1 from pg_roles where rolname='{role}';"):
        password = secrets.token_hex(32)
        run("powershell.exe", "-NoProfile", "-Command",
            "$ErrorActionPreference='Stop'; $s=ConvertTo-SecureString ([Console]::ReadLine()) -AsPlainText -Force; "
            "[IO.File]::WriteAllText($env:FIXTURE_CREDENTIAL, (ConvertFrom-SecureString $s))",
            input=(password+"\n").encode(), env={**{k: v for k, v in os.environ.items() if k.upper() != "PSMODULEPATH"}, "FIXTURE_CREDENTIAL": str(credential)})
        sql(f"CREATE ROLE {role} LOGIN PASSWORD '{password}';")
    if not credential.exists():
        raise ValueError("Local fixture credential is unavailable")


def refresh(project):
    database = TABLES[project][0] + "_local"
    role = "dev_" + project
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
    stage = "loading_" + project + "_" + stamp
    directory = Path(os.environ["LOCALAPPDATA"]) / "IvmeProductionMirror"
    directory.mkdir(exist_ok=True)
    ensure_role(role, project, directory)
    if project == "prepexpert":
        ensure_role("sat_qb2", "sat_qb2", directory)
    sql(f"CREATE DATABASE {stage} OWNER {role};")
    try:
        sql(f"REVOKE CONNECT ON DATABASE {stage} FROM PUBLIC; CREATE EXTENSION IF NOT EXISTS vector; "
            "CREATE EXTENSION IF NOT EXISTS pgcrypto;", stage)
        remote = ["ssh", *SSH_OPTIONS, host_alias(), f"python3 - {project}"]
        with (HERE / "export_fixture.py").open("rb") as script, subprocess.Popen(
                remote, stdin=script, stdout=subprocess.PIPE) as source:
            try:
                run("docker", "exec", "-i", CONTAINER, "psql", "-Xq", "-v", "ON_ERROR_STOP=1",
                    "-U", role, "-d", stage, stdin=source.stdout, stdout=subprocess.DEVNULL)
            finally:
                source.stdout.close()
            if source.wait() != 0:
                raise RuntimeError("Production export failed")
        sql((HERE / "fixture-sequences.sql").read_text(), stage, role)
        if project == "ivme":
            sql((HERE / "fixture-ivme-demo.sql").read_text(), stage, role)
        if project == "prepexpert":
            sql(f"GRANT CONNECT ON DATABASE {stage} TO sat_qb2; "
                "GRANT USAGE ON SCHEMA public TO sat_qb2; "
                "GRANT SELECT ON bank_sources, bank_questions, bank_revisions, bank_sessions, import_jobs, import_pages, test_reservations, users, auth_sessions TO sat_qb2; "
                "GRANT SELECT, INSERT ON audit_events, request_results TO sat_qb2; "
                "GRANT SELECT, INSERT, UPDATE, DELETE ON qb2_sources, qb2_items, qb2_revisions, qb2_overrides, qb2_reviews, qb2_sessions, qb2_jobs TO sat_qb2;", stage)
        exists = sql(f"select 1 from pg_database where datname='{database}';")
        rename = f"ALTER DATABASE {database} RENAME TO saved_{project}_{stamp};" if exists else ""
        sql(f"BEGIN; {rename} ALTER DATABASE {stage} RENAME TO {database}; COMMIT;")
    except BaseException:
        sql(f"DROP DATABASE {stage};")
        raise
    (directory / (project + ".ready")).write_text(stamp, encoding="ascii")
    print(f"{project}: ready on localhost:55432/{database}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", choices=list(TABLES))
    args = parser.parse_args()
    cluster()
    refresh(args.project)
