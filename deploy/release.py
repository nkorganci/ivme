"""Commit selected changes, build a Linux image, and publish the same Git SHA."""

import argparse
from hashlib import file_digest
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile


DEPLOY = Path(__file__).resolve().parent
REPO = DEPLOY.parent
BRANCH = "refs/heads/production"
SSH_OPTIONS = ("-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes",
               "-o", "ConnectTimeout=10", "-o", "ServerAliveInterval=15")


def run(*command, **kwargs):
    return subprocess.run(command, cwd=REPO, check=True, **kwargs)


def read(*command):
    return run(*command, stdout=subprocess.PIPE, text=True, encoding="utf-8").stdout.strip()


def git(*args):
    return read("git", *args)


def host_alias():
    config = DEPLOY / "local.json"
    if not config.is_file():
        raise ValueError("Create deploy/local.json from local.json.example and configure its OpenSSH Host.")
    host = json.loads(config.read_text(encoding="utf-8-sig"))["ssh_host"]
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9.-]*", host):
        raise ValueError("ssh_host must be an OpenSSH alias.")
    return host


def ssh(host, command, **kwargs):
    run("ssh", *SSH_OPTIONS, host, command, **kwargs)


def server(host, operation, revision=None):
    command = f"sh -s -- {operation}" + (f" {revision}" if revision else "")
    ssh(host, command, input=(DEPLOY / "vps.sh").read_bytes())


def remote_name():
    names = git("remote").splitlines()
    if "ivme" in names:
        return "ivme"
    if "origin" in names:
        return "origin"
    raise ValueError("Configure the Ivme GitHub remote.")


def check_public_paths(paths):
    for path in paths.split("\0"):
        parts = Path(path).parts
        if not parts:
            continue
        name = parts[-1].lower()
        environment_file = (name.startswith(".env") or name.endswith(".env")) and not name.endswith(".example")
        if ({"veri", "yedekler", "kaynaklar"} & {part.lower() for part in parts}
                or environment_file or name.endswith((".dump", ".sql.gz", ".pem", ".key", ".p12"))
                or name in ("local.json", "local-environment.json")):
            raise ValueError(f"Private or generated path in public Git history: {path}")


def candidate(remote, message, preview, use_local_production, committed):
    if git("branch", "--show-current") != "test":
        raise ValueError("Start the release from the local test branch.")
    staged = bool(git("diff", "--cached", "--name-only"))
    dirty = bool(git("status", "--porcelain", "--untracked-files=normal"))
    if not preview and not committed and not staged and dirty:
        raise ValueError("Stage the release files, or use --committed to publish the current commit.")
    if staged and not (preview or committed):
        check_public_paths(git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"))
        print(git("diff", "--cached", "--stat"), flush=True)
        run("git", "diff", "--cached", "--check")
        run("git", "commit", "-m", message or time.strftime("Ivme release %Y-%m-%d %H:%M"))
    if git("status", "--porcelain", "--untracked-files=normal"):
        print("Other working files stay in the local checkout. The image uses the Git commit only.", flush=True)
    if not use_local_production:
        run("git", "fetch", remote, f"{BRANCH}:refs/remotes/{remote}/production")
    production = git("rev-parse", "production" if use_local_production else f"{remote}/production")
    tested = git("rev-parse", "HEAD")
    check_public_paths(git("log", "--format=", "--name-only", "--diff-filter=ACMR", "-z",
                           f"{production}..{tested}"))
    if subprocess.run(("git", "merge-base", "--is-ancestor", production, tested), cwd=REPO).returncode == 0:
        return tested
    if subprocess.run(("git", "merge-base", "--is-ancestor", tested, production), cwd=REPO).returncode == 0:
        return production
    tree = run("git", "merge-tree", "--write-tree", production, tested, stdout=subprocess.PIPE)
    revision_tree = tree.stdout.decode("ascii").strip()
    return git("commit-tree", revision_tree, "-p", production, "-p", tested,
               "-m", f"Publish tested Ivme {tested[:12]}")


def build(revision):
    tag = f"ivme-app:{revision}"
    with tempfile.TemporaryDirectory(prefix="ivme-release-") as temporary:
        bundle = Path(temporary) / "release.zip"
        source = Path(temporary) / "src"
        run("git", "archive", "--format=zip", f"--output={bundle}", revision)
        with zipfile.ZipFile(bundle) as archive:
            archive.extractall(source)
        options = ("--platform", "linux/amd64", "--build-arg", f"IVME_REVISION={revision}", str(source))
        run("docker", "build", "--target", "release-check", *options)
        run("docker", "build", "--tag", tag, *options)
    return tag


def send_image(host, image):
    with subprocess.Popen(("docker", "image", "save", image), cwd=REPO, stdout=subprocess.PIPE) as export:
        try:
            ssh(host, "docker image load", stdin=export.stdout)
        finally:
            export.stdout.close()
        if export.wait() != 0:
            raise RuntimeError("Docker could not export the release image.")


def media(host, manifest):
    rclone = shutil.which("rclone")
    if rclone is None:
        winget = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft/WinGet"
        installed = sorted(winget.glob("Packages/Rclone.Rclone_*/*/rclone.exe"))
        if installed:
            rclone = str(installed[-1])
    if rclone is None:
        raise ValueError("Install rclone with winget install Rclone.Rclone.")
    required = ("assets.files", "assets.sha256", "production-paths.json", "missing-pdfs.json")
    if not all((manifest / name).is_file() for name in required):
        raise ValueError("Provide the directory produced by deploy/assets.py.")
    if json.loads((manifest / "missing-pdfs.json").read_text(encoding="utf-8")):
        raise ValueError("The media list has missing PDFs. Review the references and regenerate it.")
    target = ":sftp:/srv/ivme"
    # OpenSSH checks the host key when rclone delegates the connection.
    transport = ("--sftp-ssh", " ".join(("ssh", *SSH_OPTIONS, host)),
                 "--sftp-known-hosts-file", "none", "--sftp-disable-hashcheck")
    stamp = f"media-{time.time_ns()}"
    ssh(host, f"umask 077; mkdir /srv/ivme/incoming/{stamp}")
    run(rclone, "copy", str(REPO.parent), f"{target}/data", "--files-from0",
        str(manifest / "assets.files"), "--progress", *transport)
    for name in ("assets.sha256", "production-paths.json"):
        run(rclone, "copyto", str(manifest / name), f"{target}/incoming/{stamp}/{name}", *transport)
    ssh(host, f"set -eu; cd /srv/ivme/data; umask 022; "
        f"sha256sum -c --quiet ../incoming/{stamp}/assets.sha256; "
        f"mkdir -p Kaynaklar/Katalog; "
        f"cp ../incoming/{stamp}/production-paths.json Kaynaklar/Katalog/production-paths.json.new; "
        f"mv Kaynaklar/Katalog/production-paths.json.new Kaynaklar/Katalog/production-paths.json")
    print("Media verified. The running app reads the new PDF catalogue when it next restarts.", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--preview", action="store_true", help="Build committed code without SSH or push.")
    mode.add_argument("--media", nargs="?", const="", help="Upload a verified media manifest separately.")
    parser.add_argument("--local-production", action="store_true", help="Use the local production ref for offline preview.")
    parser.add_argument("--committed", action="store_true", help="Publish HEAD and leave all staged and unstaged files local.")
    parser.add_argument("--message", help="Message for the staged commit.")
    parser.add_argument("--restore", type=Path, help="First install only. Send and restore a verified PostgreSQL dump.")
    args = parser.parse_args()
    if args.local_production and not args.preview:
        parser.error("--local-production requires --preview")
    if args.restore and (args.preview or args.media is not None):
        parser.error("--restore is for the first full release")
    try:
        if not args.preview:
            host = host_alias()
            server(host, "check")
            if args.media is not None:
                path = args.media or input("Media manifest folder: ").strip().strip('"')
                if not path:
                    raise ValueError("Select a media manifest folder.")
                media(host, Path(path).resolve())
                return 0
        remote = remote_name()
        revision = candidate(remote, args.message, args.preview, args.local_production, args.committed)
        restore = None
        if args.restore:
            dump = args.restore.resolve()
            restore = (dump, verify_dump(dump, revision))
        print(f"Release {revision}", flush=True)
        image = build(revision)
        if not args.preview:
            send_image(host, image)
            run("git", "push", remote, f"{revision}:{BRANCH}")
            if restore:
                send_database(host, *restore, revision)
            server(host, "release", revision)
        return 0
    except subprocess.CalledProcessError as error:
        if error.stdout:
            print(error.stdout.decode("utf-8", errors="replace") if isinstance(error.stdout, bytes)
                  else error.stdout, file=sys.stderr)
        print(f"Stopped at {error.cmd[0]} (exit {error.returncode}).", file=sys.stderr)
        return 1
    except (ValueError, KeyError, OSError, RuntimeError) as error:
        print(f"Stopped: {error}", file=sys.stderr)
        return 1


def verify_dump(dump, revision):
    recorded = dump.with_name(dump.name + ".sha256").read_text(encoding="ascii").split()[0]
    with dump.open("rb") as archive:
        sha = file_digest(archive, "sha256").hexdigest()
    if sha != recorded.lower():
        raise ValueError("The PostgreSQL dump does not match its SHA-256 file.")
    restore = shutil.which("pg_restore") or r"C:\Program Files\PostgreSQL\18\bin\pg_restore.exe"
    rows = read(restore, "--data-only", "--table=flyway_schema_history", "--file=-", str(dump))
    applied = set(re.findall(r"(?m)^\d+\t([\d.]+)\t[^\r\n]*\tt$", rows))
    paths = git("ls-tree", "-r", "--name-only", revision, "--", "backend/src/main/resources/db/migration")
    supported = set(re.findall(r"/V([\d.]+)__", paths))
    if not applied or applied - supported:
        raise ValueError(f"The release does not contain the dump's Flyway history. Missing versions: "
                         f"{', '.join(sorted(applied - supported)) or 'history unreadable'}.")
    return sha


def send_database(host, dump, sha, revision):
    run("scp", *SSH_OPTIONS, str(dump), f"{host}:/srv/ivme/incoming/{sha}.dump")
    ssh(host, f"sh -s -- restore {revision} {sha}", input=(DEPLOY / "vps.sh").read_bytes())


if __name__ == "__main__":
    raise SystemExit(main())
