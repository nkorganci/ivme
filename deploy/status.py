"""Show where each of the four projects stands, from local commit to the live site.

One SSH call reads the live release, waiting or failed candidates and the newest
daily backup of every project. GitHub, the local repositories, the public sites,
the local backup copies and the Windows tasks are read from this computer.
Nothing is changed. Exit code 1 means at least one project needs attention.
"""

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

from release import DEPLOY, REPO, SSH_OPTIONS, host_alias

WORKSPACE = REPO.parent.parent
PROJECTS = {
    "ivme": (REPO, "net.ivme.dev"),
    "wrestling": (WORKSPACE / "wrestling", "wrestling.ivme.dev"),
    "arapca": (WORKSPACE / "Arapca", "arabic.ivme.dev"),
    "prepexpert": (WORKSPACE / "PrepExpert", "prepexpert.ivme.dev"),
}
TASKS = {"Ivme-OffsiteBackup": "1.1", "Ivme-ProductionDataMirror": "7.1"}
# Daily dumps run once a day; the local copy task runs every six hours.
SERVER_BACKUP_HOURS = 27
LOCAL_COPY_HOURS = 32
SERVER = """for p in ivme wrestling arapca prepexpert; do
  r=/srv/$p
  live=$(cat "$r/current.sha" 2>/dev/null || echo -)
  waiting=$(ls "$r/tested" 2>/dev/null | grep -v '[.]failed$' | tr '\\n' ',')
  failed=$(ls "$r/tested" 2>/dev/null | grep '[.]failed$' | sed 's/[.]failed$//' | tr '\\n' ',')
  newest=$(ls -t "$r"/backup/daily/*.dump 2>/dev/null | head -n 1)
  stamp=-
  [ -n "$newest" ] && stamp=$(stat -c %Y "$newest")
  echo "$p|$live|$waiting|$failed|$stamp"
done
df -h / | awk 'NR == 2 {print "disk|" $3 "|" $4 "|" $5}'
"""


def git(path, *args):
    result = subprocess.run(["git", "-C", str(path), *args], stdout=subprocess.PIPE,
                            stderr=subprocess.DEVNULL, text=True, encoding="utf-8",
                            env={**os.environ, "GIT_TERMINAL_PROMPT": "0"}, timeout=60)
    return result.stdout.strip() if result.returncode == 0 else None


def push_remote(path):
    for line in (git(path, "config", "--get-regexp", r"^remote\..*\.push$") or "").splitlines():
        key, value = line.split(" ", 1)
        if value.endswith(":refs/heads/production"):
            return key.split(".")[1]
    return None


def local_state(path):
    remote = push_remote(path)
    row = git(path, "ls-remote", "--exit-code", remote, "refs/heads/production") if remote else None
    production = row.split()[0] if row else None
    test = git(path, "rev-parse", "refs/heads/test")
    ahead = None
    # Counted only when a plain push can fast-forward GitHub to the local test branch.
    if production and test and git(path, "merge-base", "--is-ancestor", production, test) is not None:
        ahead = int(git(path, "rev-list", "--count", f"{production}..{test}") or 0)
    changes = git(path, "status", "--porcelain")
    return {"test": test, "production": production, "ahead": ahead,
            "uncommitted": len(changes.splitlines()) if changes else 0}


def server_state():
    try:
        output = subprocess.run(["ssh", *SSH_OPTIONS, host_alias(), "sh -s"], input=SERVER.encode(),
                                stdout=subprocess.PIPE, check=True, timeout=60).stdout.decode()
    except (subprocess.SubprocessError, OSError, ValueError):
        return None, None
    projects, disk = {}, None
    for line in output.splitlines():
        fields = line.split("|")
        if fields[0] == "disk":
            disk = fields[1:]
        elif fields[0] in PROJECTS and len(fields) == 5:
            projects[fields[0]] = {
                "live": fields[1], "waiting": [s for s in fields[2].split(",") if s],
                "failed": [s for s in fields[3].split(",") if s],
                "backup": int(fields[4]) if fields[4].isdigit() else None,
            }
    return projects, disk


def site(domain):
    request = urllib.request.Request(f"https://{domain}/", headers={"User-Agent": "ivme-status/1"})
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return str(response.status)
    except urllib.error.HTTPError as error:
        return str(error.code)
    except (urllib.error.URLError, OSError):
        return "yok"


def local_copy_time(project):
    config = DEPLOY / "local.json"
    folder = json.loads(config.read_text(encoding="utf-8-sig")).get("offsite_backup_dir") if config.is_file() else None
    if not folder:
        return None
    names = sorted(Path(folder, project).glob(f"{project}-*.dump"))
    match = re.search(r"-(\d{8}T\d{6}Z)\.dump$", names[-1].name) if names else None
    if not match:
        return None
    return datetime.strptime(match.group(1), "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc).timestamp()


def hours(stamp):
    return None if stamp is None else (time.time() - stamp) / 3600


def short(sha):
    return sha[:7] if sha and re.fullmatch("[0-9a-f]{40}", sha) else "-"


def verdict(local, server):
    test, production = local["test"], local["production"]
    if server is None:
        return "BİLİNMİYOR", "sunucuya bağlanılamadı (rehber 5.2)"
    if production and production in server["failed"] and server["live"] != production:
        return "HATA", f"sunucu {short(production)} sürümünü başlatamadı, önceki sürüm çalışıyor (rehber 5.4)"
    if test and server["live"] == test:
        return "TAMAM", "canlı sürüm yerel test dalıyla aynı"
    if production is None:
        return "BİLİNMİYOR", "GitHub okunamadı (rehber 5.2)"
    if production == test and production in server["waiting"]:
        return "BEKLİYOR", "sunucu bu sürümü yaklaşık bir dakika içinde başlatır"
    if production == test:
        return "HAZIRLIK YOK", "GitHub'da var ama test edilmiş imaj sunucuda yok (rehber 5.3)"
    if local["ahead"]:
        return "PUSH BEKLİYOR", f"{local['ahead']} commit henüz gönderilmedi (rehber 3, adım 6)"
    return "FARKLI", "GitHub production dalı yerel test dalında yok (rehber 5.5)"


def main():
    servers, disk = server_state()
    attention = False
    rows, notes = [], []
    for project, (path, domain) in PROJECTS.items():
        local = local_state(path)
        server = servers.get(project) if servers is not None else None
        status, reason = verdict(local, server)
        attention |= status != "TAMAM"
        server_backup = hours(server["backup"]) if server else None
        local_copy = hours(local_copy_time(project))
        rows.append((project, short(local["test"]), short(local["production"]),
                     short(server["live"]) if server else "-", site(domain), str(local["uncommitted"]),
                     "-" if server_backup is None else f"{server_backup:.0f} sa",
                     "-" if local_copy is None else f"{local_copy:.0f} sa"))
        notes.append(f"  {project:<11} {status}: {reason}.")
        if local["uncommitted"]:
            notes.append(f"  {'':<11} {local['uncommitted']} dosya commit edilmemiş; bunlar yayına girmez (rehber 1.2).")
        if server and (server_backup is None or server_backup > SERVER_BACKUP_HOURS):
            attention = True
            notes.append(f"  {'':<11} UYARI: sunucudaki günlük yedek eski veya yok (rehber 6).")
        if local_copy is None or local_copy > LOCAL_COPY_HOURS:
            attention = True
            notes.append(f"  {'':<11} UYARI: bilgisayardaki yedek kopyası eski veya yok (rehber 1.1).")
    header = ("Proje", "Yerel test", "GitHub", "Canlı", "Site", "Commit'siz", "VPS yedeği", "PC kopyası")
    widths = [max(len(row[i]) for row in [header, *rows]) for i in range(len(header))]
    for row in [header, *rows]:
        print("  ".join(cell.ljust(width) for cell, width in zip(row, widths)).rstrip())
    print("\nDurum:")
    print("\n".join(notes))
    if disk:
        print(f"\nSunucu diski: {disk[0]} dolu, {disk[1]} boş ({disk[2]}).")
    for task, section in TASKS.items():
        installed = subprocess.run(["schtasks", "/Query", "/TN", task], stdout=subprocess.DEVNULL,
                                   stderr=subprocess.DEVNULL).returncode == 0
        if not installed:
            attention = True
            print(f"Windows görevi {task} kurulu değil (rehber {section}).")
    return 1 if attention else 0


if __name__ == "__main__":
    sys.exit(main())
