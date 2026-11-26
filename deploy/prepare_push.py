"""Prepare the exact production ref Git intends to push. Activation happens on the VPS."""
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import zipfile

from release import SSH_OPTIONS, check_public_paths, host_alias, ssh

PROJECTS = {
    "ivme": ("ivme", {"ivme-app": None}),
    "wrestling": ("wrestling-club", {"wrestling-app": "web", "wrestling-backend": "backend"}),
    "arapca": ("Arapca", {"arapca-app": None}),
    "prepexpert": ("PrepExpert", {"prepexpert-app": None}),
}


def run(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def prepare(project, revision, previous):
    repository, images = PROJECTS[project]
    if not re.fullmatch("[0-9a-f]{40}", revision) or revision == "0" * 40:
        raise ValueError("Expected a production commit")
    run("git", "merge-base", "--is-ancestor", previous, revision)
    names = run("git", "log", "--format=", "--diff-filter=ACMR", "--name-only", "-z",
                f"{previous}..{revision}", stdout=subprocess.PIPE).stdout.decode()
    check_public_paths(names)
    for name in names.split("\0"):
        parts = [p.lower() for p in Path(name.strip()).parts]
        if set(parts) & {"private", "backups", "uploads"} or (parts and (
                parts[-1].endswith((".sqlite", ".db", ".pgpass", ".pfx")) or
                (project == "prepexpert" and parts[-1].endswith(".pdf")))):
            raise ValueError(f"Private file in release: {name}")
    host = host_alias()
    with tempfile.TemporaryDirectory(prefix="tested-release-") as tmp:
        archive = Path(tmp) / "source.zip"
        run("git", "archive", "--format=zip", f"--output={archive}", revision)
        source = Path(tmp) / "source"
        with zipfile.ZipFile(archive) as files:
            files.extractall(source)
        build = ["docker", "build", "--platform", "linux/amd64",
                 "--label", f"org.opencontainers.image.revision={revision}"]
        if project == "ivme":
            build.extend(["--build-arg", f"IVME_REVISION={revision}"])
        if project in ("ivme", "wrestling"):
            run(*build, "--target", "release-check", str(source))
        for image, target in images.items():
            tag = f"{image}:{revision}"
            run(*build, *(["--target", target] if target else []), "-t", tag, str(source))
        if project == "prepexpert":
            run(sys.executable, str(source / "deploy/check-image.py"), f"prepexpert-app:{revision}")
        for image in images:
            tag = f"{image}:{revision}"
            with subprocess.Popen(["docker", "save", tag], stdout=subprocess.PIPE) as stream:
                try:
                    run("ssh", "-C", *SSH_OPTIONS, host, "docker image load", stdin=stream.stdout)
                finally:
                    stream.stdout.close()
                if stream.wait():
                    raise RuntimeError(f"Could not export {tag}")
        remote = f"/srv/{project}"
        if project != "ivme":
            folder = f"{remote}/releases/{revision}"
            ssh(host, f"umask 077; mkdir -p {folder}")
            run("scp", *SSH_OPTIONS, str(source / "deploy/compose.yaml"), f"{host}:{folder}/compose.yaml")
        ssh(host, f"umask 077; mkdir -p {remote}/tested && touch {remote}/tested/{revision}")
    # Cleanup is housekeeping: a failure must not block the tested release.
    pruned = subprocess.run(["ssh", *SSH_OPTIONS, host, f"sh -s -- {project}"],
                            input=(Path(__file__).with_name("prune-server.sh")).read_bytes())
    if pruned.returncode:
        print(f"Warning: release cleanup on the server failed for {project}.", file=sys.stderr)


def main():
    project, url = sys.argv[1:]
    for update in sys.stdin:
        local_ref, revision, remote_ref, previous = update.split()
        if remote_ref != "refs/heads/production":
            continue
        repo = PROJECTS[project][0]
        if url.removesuffix(".git") != f"https://github.com/nkorganci/{repo}":
            raise ValueError("Unexpected production remote")
        head = run("git", "rev-parse", "refs/heads/test", stdout=subprocess.PIPE).stdout.decode().strip()
        if revision != head:
            raise ValueError("Publish the tip of the local test branch")
        prepare(project, revision, previous)


if __name__ == "__main__":
    main()
