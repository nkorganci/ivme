"""Publish one tested project from Windows to its Contabo Compose project."""

import argparse
from hashlib import file_digest
from pathlib import Path
import subprocess
import tempfile
import zipfile

from release import SSH_OPTIONS, send_image, ssh

PROJECTS = {
    "wrestling": ("wrestling", {"wrestling-app": "web", "wrestling-backend": "backend"}),
    "arapca": ("Arapca", {"arapca-app": None}),
    "prepexpert": ("PrepExpert", {"prepexpert-app": None}),
}
ROOT = Path(__file__).resolve().parents[3]
DEPLOY = Path(__file__).resolve().parent
BRANCH = "refs/heads/production"


def publish(project, committed, restore, preview, workspace):
    folder, images = PROJECTS[project]
    repo = workspace / folder
    remote = f"/srv/{project}"
    host = "ivme-vps"

    def run(*args, **kwargs):
        return subprocess.run(args, cwd=repo, check=True, **kwargs)

    def git(*args):
        return run("git", *args, stdout=subprocess.PIPE, text=True, encoding="utf-8").stdout.strip()

    if git("branch", "--show-current") != "test":
        raise ValueError("Open the project's local test branch.")
    if not (committed or preview):
        staged = git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z")
        if staged or git("diff", "--cached", "--name-only"):
            for name in staged.split("\0"):
                parts = Path(name).parts
                if not parts:
                    continue
                filename = parts[-1].lower()
                private = {"private", "backups", "uploads", "yedekler"}.intersection(part.lower() for part in parts)
                environment = filename.startswith(".env") and not filename.endswith(".example")
                if private or environment or filename.endswith((".dump", ".pem", ".key", ".sqlite", ".db")) or (
                    project == "prepexpert" and parts[0] == "question-bank" and filename.endswith(".pdf")
                ):
                    raise ValueError(f"Private data cannot go to Git: {name}")
            run("git", "diff", "--cached", "--check")
            run("git", "commit", "-m", f"Publish tested {project} update")
        elif git("status", "--porcelain"):
            raise ValueError("Stage the release files or use --committed.")
    revision = git("rev-parse", "HEAD")
    if not preview:
        production = git("ls-remote", "origin", BRANCH)
        if production:
            run("git", "fetch", "origin", BRANCH)
            run("git", "merge-base", "--is-ancestor", production.split()[0], revision)
    with tempfile.TemporaryDirectory(prefix=f"{project}-release-") as temporary:
        path = Path(temporary)
        archive = path / "code.zip"
        run("git", "archive", "--format=zip", f"--output={archive}", revision)
        source = path / "source"
        with zipfile.ZipFile(archive) as bundle:
            bundle.extractall(source)
        compose = source / "deploy/compose.yaml"
        for image, target in images.items():
            target_flags = ("--target", target) if target else ()
            tag = f"{image}:{revision}"
            run("docker", "build", "--platform", "linux/amd64", *target_flags,
                "--label", f"org.opencontainers.image.revision={revision}", "-t", tag, str(source))
            if not preview:
                send_image(host, tag)
        if preview:
            return
        ssh(host, f"umask 077; mkdir -p {remote}/releases/{revision}")
        run("scp", *SSH_OPTIONS, str(compose), f"{host}:{remote}/releases/{revision}/compose.yaml")
    run("git", "push", "origin", f"{revision}:{BRANCH}")
    server = (DEPLOY / "project-server.sh").read_bytes()
    if restore:
        archive = restore.resolve()
        with archive.open("rb") as stream:
            sha = file_digest(stream, "sha256").hexdigest()
        run("scp", *SSH_OPTIONS, str(archive), f"{host}:{remote}/incoming/{sha}.dump")
        ssh(host, f"sh -s -- {project} {revision} restore {sha}", input=server)
    ssh(host, f"sh -s -- {project} {revision} release", input=server)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", choices=PROJECTS)
    parser.add_argument("--workspace", type=Path, default=ROOT)
    parser.add_argument("--committed", action="store_true")
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("--restore", type=Path)
    args = parser.parse_args()
    try:
        publish(args.project, args.committed, args.restore, args.preview, args.workspace.resolve())
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"Release stopped: {error}\n")
