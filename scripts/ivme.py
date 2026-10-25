"""İvme'nin tekrar eden işleri için tek giriş komutu (Claude ve Codex aynı komutları kullanır).

AI'nın her oturumda aynı adımları yeniden kurması yerine bu alt komutlar çalıştırılır.
Yalnız standart kütüphane kullanır; PDF/OCR gibi işleri depo `.venv` Python'u ile çağırır.

  python scripts/ivme.py durum                 git, izleyici, 1010, katalog, Ollama ve devir özeti
  python scripts/ivme.py bekle                 izleyicinin derleme döngüsü bitene kadar bekle
  python scripts/ivme.py test [A,B]            backend testleri (geçici ivme_test DB); bilinen hatalar ayrılır
  python scripts/ivme.py sayfa /yol [...]      sayfayı aç, JSON denetim (ekran görüntüsü yalnız sorunda)
  python scripts/ivme.py ui <betik>            testler/ altındaki UI betiğini çalıştır (adsız: listele)
  python scripts/ivme.py kontrol [--hepsi]     commit öncesi kural denetimleri (pre-commit bunu çağırır)
  python scripts/ivme.py plan                  plan/bağlantı denetimi (plan-check.py)
  python scripts/ivme.py pdf sorular <pdf> ... PDF metin önce soru çıkarımı (scripts/pdf-metin.py)
  python scripts/ivme.py ollama ...            yerel model (scripts/ollama-sor.py)
  python scripts/ivme.py ogretim dogrula|aktar Akıllı Öğretmen içerikleri (scripts/ogretim-icerigi.py)
"""

import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

APP = Path(__file__).resolve().parents[1]
VENV_PY = APP.parent / ".venv/Scripts/python.exe"
STATUS = APP / "backend/target/live-watch.status"
WATCH_LOG = APP / "backend/target/live-watch.log"
KNOWN = APP / "testler/bilinen-hatalar.md"
HANDOFF = APP / "docs/plan/00_DEVAM.md"
URL = os.environ.get("IVME_URL", "http://127.0.0.1:1010")
MONTHS = "Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık"
DATED_LINE = re.compile(rf"\b\d{{1,2}}(?:[–-]\d{{1,2}})? (?:{MONTHS})\b")
DATED_DOCS_ALLOWED = {"docs/plan/00_DEVAM.md", "testler/bilinen-hatalar.md"}


def run(command, **kwargs):
    kwargs.setdefault("cwd", APP)
    return subprocess.run(command, text=True, encoding="utf-8", errors="replace", **kwargs)


def out(command):
    result = run(command, capture_output=True)
    return result.stdout.strip() if result.returncode == 0 else ""


def python_for_tools():
    return str(VENV_PY) if VENV_PY.exists() else sys.executable


# ---------------------------------------------------------------- izleyici

def fix_mojibake(line):
    if "Ã" in line or "Ä" in line or "Å" in line:
        try:
            return line.encode("cp1252").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            return line
    return line


def watcher_state():
    """İzleyici: PID canlı mı, son günlük satırı, derleme sürüyor mu."""
    state = {"calisiyor": False, "derleniyor": False, "son": None}
    if STATUS.exists():
        pid, _, beat = STATUS.read_text(encoding="ascii", errors="ignore").strip().partition("|")
        alive = pid.isdigit() and pid in out(["tasklist", "/FI", f"PID eq {pid}", "/NH"])
        state.update(pid=pid, nabiz=beat, calisiyor=alive)
    if WATCH_LOG.exists():
        lines = [fix_mojibake(l) for l in WATCH_LOG.read_text(encoding="utf-8", errors="replace").splitlines()[-40:] if l.strip()]
        if lines:
            state["son"] = lines[-1]
            last_event = next((l for l in reversed(lines) if "algılandı" in l or "yayımlandı" in l or "başarısız" in l), "")
            state["derleniyor"] = "algılandı" in last_event
            state["sonHata"] = "başarısız" in last_event
    return state


def cmd_bekle(args):
    timeout = int(args[0]) if args else 600
    started = time.time()
    seen_building = False
    while time.time() - started < timeout:
        state = watcher_state()
        seen_building |= state["derleniyor"]
        if not state["derleniyor"]:
            print("İzleyici boşta: " + (state["son"] or "günlük yok"))
            return 1 if state.get("sonHata") else 0
        if not seen_building or int(time.time() - started) % 30 == 0:
            print("Derleme sürüyor…", flush=True)
        time.sleep(3)
    print(f"Zaman aşımı ({timeout} sn); izleyici hâlâ derliyor.")
    return 2


# ---------------------------------------------------------------- durum

def db_query(sql):
    script = (". ./yerel-ortam.ps1; $s = Get-IvmeLocalEnvironment; $env:PGPASSWORD = $s.DbPassword; "
              "$env:PGCLIENTENCODING = 'UTF8'; [Console]::OutputEncoding = [Text.Encoding]::UTF8; "
              f"& 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe' -X -h localhost -U $s.DbUser -d ivme -Atc \"{sql}\"")
    return out(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script])


def handoff_now():
    if not HANDOFF.exists():
        return []
    text = HANDOFF.read_text(encoding="utf-8")
    section = re.search(r"^## Şimdi\n(.*?)(?=^## )", text, re.S | re.M)
    return [l for l in (section.group(1) if section else "").splitlines() if l.startswith("| ") and "---" not in l][1:]


def cmd_durum(args):
    branch = out(["git", "branch", "--show-current"])
    ahead_behind = out(["git", "rev-list", "--left-right", "--count", "HEAD...ivme/main"]).split()
    changes = [l for l in run(["git", "status", "--porcelain"], capture_output=True).stdout.splitlines() if l.strip()]
    print(f"Git: {branch} · son commit {out(['git', 'log', '-1', '--format=%h %s'])}")
    if len(ahead_behind) == 2:
        print(f"     ivme/main'e göre {ahead_behind[0]} ileri, {ahead_behind[1]} geri (son fetch'e göre)")
    print(f"     commit'lenmemiş {len(changes)} dosya" + (": " + ", ".join(c[3:] for c in changes[:8]) if changes else ""))
    state = watcher_state()
    print(f"İzleyici: {'açık' if state['calisiyor'] else 'KAPALI'}"
          f"{' · derleniyor' if state['derleniyor'] else ''} · {state['son'] or '-'}")
    try:
        html = urlopen(URL + "/", timeout=5).read().decode("utf-8", "replace")
        asset = re.search(r"/assets/(index-[^\"']+\.js)", html)
        print(f"Uygulama: {URL} yanıt veriyor · {asset.group(1) if asset else 'asset bulunamadı'}")
    except (URLError, OSError) as error:
        print(f"Uygulama: {URL} yanıt vermiyor ({error})")
    if "--hizli" not in args:
        catalog = db_query("select run_key from learning_catalog.current_run")
        migration = db_query("select max(version::int) from flyway_schema_history where success")
        print(f"DB ivme: katalog {catalog or '?'} · göç V{migration or '?'}")
        # Akıllı Öğretmen'in istediği modeller (ortam değişkeni > application.yml varsayılanı) kurulu mu?
        config = (APP / "backend/src/main/resources/application.yml").read_text(encoding="utf-8")
        wanted = {name: os.environ.get(name) or default
                  for name, default in re.findall(r"\$\{(YKS_AI_[A-Z]+_MODEL):([^}]+)\}", config)}
        try:
            tags = json.load(urlopen("http://127.0.0.1:11434/api/tags", timeout=2))
            installed = {m["name"] for m in tags["models"]}
            missing = sorted({model for model in wanted.values() if model not in installed})
            print("Ollama: açık · " + ", ".join(sorted(installed))
                  + (f" · EKSİK (uygulama istiyor): {', '.join(missing)}" if missing else " · uygulama modelleri kurulu"))
        except (URLError, OSError):
            print("Ollama: kapalı (python scripts/ivme.py ollama durum başlatır)")
    print("Devir (docs/plan/00_DEVAM.md):")
    for line in handoff_now():
        cells = [c.strip() for c in line.strip("|").split("|")]
        print(f"  {cells[0]}: {cells[1] if len(cells) > 1 else ''}")
    return 0


# ---------------------------------------------------------------- test

def known_failures():
    if not KNOWN.exists():
        return set()
    return set(re.findall(r"^- `([A-Za-z0-9_]+\.[A-Za-z0-9_]+)`", KNOWN.read_text(encoding="utf-8"), re.M))


def cmd_test(args):
    tests = next((a for a in args if not a.startswith("-")), "")
    if watcher_state()["derleniyor"]:
        print("İzleyici derliyor; backend/target çakışmaması için bekleniyor…")
        cmd_bekle(["900"])
    command = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "testler/backend-test.ps1"]
    if tests:
        command += ["-Test", tests]
    print("Çalışıyor: " + " ".join(command[-3:] if tests else command[-1:]), flush=True)
    started = time.time()
    result = run(command, capture_output=True)
    # Odaklı çalıştırma -q ile özet yazmaz; sayıları bu çalıştırmanın surefire raporlarından al.
    reports = [p for p in (APP / "backend/target/surefire-reports").glob("TEST-*.xml") if p.stat().st_mtime >= started - 1]
    suite_totals = [0, 0, 0, 0]
    for report in reports:
        head = report.read_text(encoding="utf-8", errors="replace")[:2000]
        for i, key in enumerate(("tests", "failures", "errors", "skipped")):
            match = re.search(rf'<testsuite[^>]*\s{key}="(\d+)"', head)
            suite_totals[i] += int(match.group(1)) if match else 0
    text = result.stdout + result.stderr
    log = APP / "backend/target/ivme-test-son.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    log.write_text(text, encoding="utf-8")
    failed = set(re.findall(r"^\[ERROR\]\s+(?:com\.hedefyks\.)?([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)(?::\d+|\s+--|\s+»|\s+\S*Time)",
                            text, re.M))
    failed = {f"{cls}.{method}" for cls, method in failed if cls[0].isupper() and not method[0].isupper()}
    totals = re.findall(r"Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+)\s*$", text, re.M)
    known = known_failures()
    new = sorted(failed - known)
    fixed = sorted(name for name in known if name.split(".")[0] in text and name not in failed) if not tests else []
    if totals:
        run_, fail, err, skip = totals[-1]
        print(f"Toplam {run_} test · {fail} başarısız · {err} hata · {skip} atlandı")
    elif reports:
        print(f"Toplam {suite_totals[0]} test ({len(reports)} sınıf) · {suite_totals[1]} başarısız · "
              f"{suite_totals[2]} hata · {suite_totals[3]} atlandı")
    else:
        print("UYARI: hiç test raporu üretilmedi; test adlarını kontrol et (ör. tutor.TutorPolicyTest).")
    print(f"Bilinen hata: {len(failed & known)}  ·  YENİ hata: {len(new)}")
    for name in new:
        print("  YENİ  " + name)
    for name in fixed:
        print("  düzelmiş görünüyor (bilinen-hatalar.md'den silinebilir): " + name)
    if result.returncode and not failed:
        print("Testler derlenemedi veya ortam hatası; ayrıntı: " + str(log))
        print("\n".join(text.splitlines()[-25:]))
        return result.returncode
    print("Tam çıktı: " + str(log))
    return 1 if new else 0


# ---------------------------------------------------------------- kontrol

def staged_files(all_files):
    if all_files:
        return out(["git", "ls-files"]).splitlines()
    return out(["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"]).splitlines()


def cmd_kontrol(args):
    """Hızlı, deterministik kurallar. Yalnız değişen dosyalara bakar (`--hepsi` hariç)."""
    files = staged_files("--hepsi" in args)
    problems = []
    for name in files:
        path = APP / name
        if not path.exists():
            continue
        if name.startswith("frontend/src/") and name.endswith((".jsx", ".js", ".tsx")):
            text = path.read_text(encoding="utf-8", errors="replace")
            if re.search(r"<table[\s>]", text):
                problems.append(f"{name}: düz <table> yasak; DataGrid.jsx kullan (AGENTS.md)")
            for library in ("@tanstack/react-table", "@mui/x-data-grid", "ag-grid-enterprise"):
                if library in text:
                    problems.append(f"{name}: {library} yasak; yalnız AG Grid Community")
        # Renk kuralı yalnız yeni eklenen satırlara uygulanır; eski dosyalardaki değerler ayrı temizlik işidir.
        if ("--hepsi" not in args and name.startswith("frontend/src/") and name.endswith((".css", ".jsx", ".js"))
                and not name.endswith("theme.css")):
            diff = out(["git", "diff", "--cached", "-U0", "--", name])
            added = "\n".join(l for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++"))
            colors = re.findall(r"#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d", added)
            if colors:
                problems.append(f"{name}: yeni renk değeri {colors[:3]}; yalnız theme.css değişkenleri (AGENTS.md)")
        if name == "frontend/package.json":
            text = path.read_text(encoding="utf-8")
            for library in ("@tanstack/react-table", "@mui/x-data-grid", "ag-grid-enterprise"):
                if library in text:
                    problems.append(f"{name}: {library} bağımlılığı yasak")
        if name.endswith(".py"):
            result = run([sys.executable, "-m", "py_compile", name], capture_output=True)
            if result.returncode:
                problems.append(f"{name}: Python sözdizimi hatası\n{result.stderr.strip()[-400:]}")
        if name.endswith(".mjs"):
            result = run(["node", "--check", name], capture_output=True)
            if result.returncode:
                problems.append(f"{name}: JavaScript sözdizimi hatası\n{result.stderr.strip()[-400:]}")
    # Belgeler güncel durumu anlatır; tarihli iş dökümü commit mesajına gider (AGENTS.md “Belge düzeni”).
    for name in files:
        if not (name.endswith(".md") and (name.startswith("docs/") or name in ("AGENTS.md", "README.md"))):
            continue
        if name in DATED_DOCS_ALLOWED:
            continue
        lines = (APP / name).read_text(encoding="utf-8", errors="replace").splitlines() if "--hepsi" in args else [
            l[1:] for l in out(["git", "diff", "--cached", "-U0", "--", name]).splitlines()
            if l.startswith("+") and not l.startswith("+++")]
        dated = [l.strip() for l in lines if DATED_LINE.search(l) and not l.lstrip("|> ").startswith("Güncelleme:")]
        if dated:
            problems.append(f"{name}: tarihli iş dökümü eklenmiş ({len(dated)} satır), örn. “{dated[0][:90]}”. "
                            "Belge güncel durumu anlatır; tarihi/kanıtı commit mesajına veya 00_DEVAM.md'ye yaz")
    if any(name.startswith("docs/") or name in ("AGENTS.md", "README.md") for name in files) or "--hepsi" in args:
        result = run([sys.executable, "scripts/plan-check.py"], capture_output=True, env={**os.environ, "PYTHONIOENCODING": "utf-8"})
        if result.returncode:
            try:
                errors = json.loads(result.stdout.strip().splitlines()[-1])["errors"]
            except (ValueError, IndexError, KeyError):
                errors = [result.stdout[-400:] + result.stderr[-400:]]
            problems += ["plan-check: " + e for e in errors]
    code_changed = any(n.startswith(("frontend/src/", "backend/src/", "scripts/")) for n in files)
    if code_changed and "docs/plan/00_DEVAM.md" not in files and "--hepsi" not in args:
        print("Not: kod değişti ama docs/plan/00_DEVAM.md commit'te yok; yarım iş varsa devir dosyasını güncelle.")
    for problem in problems:
        print("✗ " + problem)
    print(f"Kontrol: {len(files)} dosya · {'GEÇTİ' if not problems else f'{len(problems)} sorun'}")
    return 1 if problems else 0


# ---------------------------------------------------------------- yönlendirmeler

def cmd_ui(args):
    scripts = sorted(p.name for p in (APP / "testler").glob("*") if p.suffix in (".mjs", ".py") and
                     ("-ui" in p.stem or p.stem.endswith("live-read")))
    if not args:
        print("UI betikleri:\n  " + "\n  ".join(scripts))
        print("Genel sayfa denetimi: python scripts/ivme.py sayfa /yol [--rol admin] [--mobil] [--tablo-tara]")
        return 0
    name = args[0] if Path(args[0]).suffix else next((s for s in scripts if s.startswith(args[0])), args[0])
    path = APP / "testler" / name
    command = (["node", str(path)] if path.suffix == ".mjs" else [python_for_tools(), str(path)]) + args[1:]
    return run(command).returncode


def cmd_sayfa(args):
    return run(["node", "testler/sayfa-denetle.mjs", *args]).returncode


def cmd_plan(args):
    return run([sys.executable, "scripts/plan-check.py"], env={**os.environ, "PYTHONIOENCODING": "utf-8"}).returncode


def cmd_pdf(args):
    return run([python_for_tools(), "scripts/pdf-metin.py", *args]).returncode


def cmd_ollama(args):
    return run([sys.executable, "scripts/ollama-sor.py", *(args or ["durum"])]).returncode


def cmd_ogretim(args):
    return run([python_for_tools(), "scripts/ogretim-icerigi.py", *args],
               env={**os.environ, "PYTHONIOENCODING": "utf-8"}).returncode


def cmd_devir_kontrol(args):
    """Claude Code Stop kancası: kod/belge değişmiş ama devir dosyası güncellenmemişse bir kez hatırlatır."""
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except ValueError:
        payload = {}
    if payload.get("stop_hook_active"):
        return 0
    changed = [l[3:].strip().strip('"') for l in run(["git", "status", "--porcelain"], capture_output=True).stdout.splitlines() if l.strip()]
    work = [n for n in changed if n.startswith(("frontend/src/", "backend/src/", "scripts/", "testler/", "docs/"))
            and n != "docs/plan/00_DEVAM.md"]
    if not work or "docs/plan/00_DEVAM.md" in changed:
        return 0
    print(f"Commit'lenmemiş {len(work)} dosya var ({', '.join(work[:5])}) ama docs/plan/00_DEVAM.md güncellenmedi. "
          "İş yarımsa devir dosyasındaki 'Şimdi' tablosunu (yarım iş, sıradaki komut) güncelle; iş bittiyse "
          "yerel commit at ve 'Son kapanan iş' satırını yaz. Bilinçli olarak bırakıyorsan bunu kullanıcıya söyle.",
          file=sys.stderr)
    return 2


COMMANDS = {"devir-kontrol": cmd_devir_kontrol, "durum": cmd_durum, "bekle": cmd_bekle, "test": cmd_test, "kontrol": cmd_kontrol, "ui": cmd_ui,
            "sayfa": cmd_sayfa, "plan": cmd_plan, "pdf": cmd_pdf, "ollama": cmd_ollama, "ogretim": cmd_ogretim}


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    if not argv or argv[0] not in COMMANDS:
        print(__doc__)
        return 0 if not argv else 2
    return COMMANDS[argv[0]](argv[1:]) or 0


if __name__ == "__main__":
    sys.exit(main())
