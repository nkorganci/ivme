"""Keep verified copies of the newest Contabo database backups on this computer.

The VPS writes one verified dump per project and weekday. This script downloads the
newest one when it is not already here, checks its SHA-256 and archive listing,
test-restores the small databases into the local fixture cluster, and keeps the
newest copies per project. The destination is `offsite_backup_dir` in local.json.
"""

import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone

from release import DEPLOY, SSH_OPTIONS, host_alias

# Local copies kept per project. Ivme dumps are about 2 GB each.
KEEP = {"ivme": 3, "wrestling": 14, "arapca": 14, "prepexpert": 14}
RESTORE_CHECK = {"wrestling", "arapca", "prepexpert"}
FIXTURE = "ivme-development-postgres"
PG_RESTORE = Path("C:/Program Files/PostgreSQL/18/bin/pg_restore.exe")
NEWEST = """set -eu
cd "/srv/$1/backup/daily"
name=$(ls -t -- *.dump | head -n 1)
printf '%s %s %s %s\\n' "$(stat -c %Y -- "$name")" "$(stat -c %s -- "$name")" \\
    "$(cut -d' ' -f1 "$name.sha256")" "$name"
"""


def destination():
    config = json.loads((DEPLOY / "local.json").read_text(encoding="utf-8-sig"))
    folder = config.get("offsite_backup_dir")
    if not folder:
        raise ValueError("Set offsite_backup_dir in deploy/local.json to a private folder.")
    root = Path(folder)
    if not root.exists():
        root.mkdir(parents=True)
        # Only this Windows account and SYSTEM can read the dumps.
        person = f"{os.environ['USERDOMAIN']}\\{os.environ['USERNAME']}"
        subprocess.run(["icacls", str(root), "/inheritance:r", "/grant:r",
                        f"{person}:(OI)(CI)F", "*S-1-5-18:(OI)(CI)F"],
                       check=True, stdout=subprocess.DEVNULL)
    return root


def known_hashes(folder):
    return {path.read_text(encoding="ascii").split()[0] for path in folder.glob("*.dump.sha256")}


def download(host, project, name, size, expected, target):
    if shutil.disk_usage(target.parent).free < size * 1.2 + 2**30:
        raise RuntimeError(f"Not enough free disk for {name}")
    partial = target.with_suffix(".partial")
    digest = hashlib.sha256()
    try:
        with partial.open("wb") as out, subprocess.Popen(
                ["ssh", *SSH_OPTIONS, host, f"cat /srv/{project}/backup/daily/{name}"],
                stdout=subprocess.PIPE) as source:
            while chunk := source.stdout.read(1 << 20):
                digest.update(chunk)
                out.write(chunk)
            if source.wait():
                raise RuntimeError(f"Download of {name} failed")
        if digest.hexdigest() != expected:
            # The nightly job may have replaced the file mid-transfer; the next run retries.
            raise RuntimeError(f"SHA-256 mismatch for {name}")
        if PG_RESTORE.exists():
            subprocess.run([str(PG_RESTORE), "--list", str(partial)], check=True, stdout=subprocess.DEVNULL)
        partial.replace(target)
    finally:
        partial.unlink(missing_ok=True)


def restore_check(project, dump):
    running = subprocess.run(["docker", "inspect", "-f", "{{.State.Running}}", FIXTURE],
                             stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    if running.stdout.strip() != "true":
        return "restore check skipped (local fixture container is not running)"
    scratch = f"restorecheck_{project}"

    def psql(statement, database="postgres"):
        return subprocess.run(["docker", "exec", "-i", "-e", "PGOPTIONS=-c client_min_messages=warning",
                               FIXTURE, "psql", "-XAtq", "-v", "ON_ERROR_STOP=1",
                               "-U", "postgres", "-d", database, "-c", statement],
                              check=True, stdout=subprocess.PIPE, text=True).stdout.strip()

    psql(f"DROP DATABASE IF EXISTS {scratch}")
    psql(f"CREATE DATABASE {scratch}")
    try:
        with dump.open("rb") as archive:
            subprocess.run(["docker", "exec", "-i", FIXTURE, "pg_restore", "--exit-on-error",
                            "--single-transaction", "--no-owner", "--no-privileges",
                            "-U", "postgres", "-d", scratch], stdin=archive, check=True)
        tables = int(psql("SELECT count(*) FROM pg_tables WHERE schemaname='public'", scratch))
        if tables == 0:
            raise RuntimeError(f"Restored {project} backup has no tables")
        return f"restored {tables} tables"
    finally:
        psql(f"DROP DATABASE IF EXISTS {scratch}")


def sync(host, root, project):
    # Bytes keep LF line endings; text mode on Windows would send CRLF to sh.
    output = subprocess.run(["ssh", *SSH_OPTIONS, host, f"sh -s -- {project}"], input=NEWEST.encode(),
                            check=True, stdout=subprocess.PIPE).stdout.decode().split()
    mtime, size, expected, name = int(output[0]), int(output[1]), output[2], output[3]
    if not (re.fullmatch(rf"{project}-[1-7]\.dump", name) and re.fullmatch("[0-9a-f]{64}", expected)):
        raise ValueError(f"Unexpected backup listing for {project}")
    folder = root / project
    folder.mkdir(exist_ok=True)
    if expected in known_hashes(folder):
        return f"{project}: newest backup already copied"
    stamp = datetime.fromtimestamp(mtime, timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target = folder / f"{project}-{stamp}.dump"
    download(host, project, name, size, expected, target)
    (folder / f"{target.name}.sha256").write_text(f"{expected}  {target.name}\n", encoding="ascii")
    note = restore_check(project, target) if project in RESTORE_CHECK else "archive listing verified"
    for old in sorted(folder.glob(f"{project}-*.dump"), reverse=True)[KEEP[project]:]:
        old.unlink()
        old.with_name(old.name + ".sha256").unlink(missing_ok=True)
    return f"{project}: copied {target.name} ({size / 2**20:.1f} MiB), {note}"


def main():
    host = host_alias()
    root = destination()
    failed = False
    for project in KEEP:
        try:
            print(datetime.now(timezone.utc).isoformat(timespec="seconds"), sync(host, root, project), flush=True)
        except Exception as error:
            failed = True
            print(datetime.now(timezone.utc).isoformat(timespec="seconds"), f"{project}: FAILED {error}", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
