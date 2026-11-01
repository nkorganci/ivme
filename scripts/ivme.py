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
  python scripts/ivme.py kalite plan|calistir|durum TAS-12   görev bazlı test ve sürümlü kanıt
  python scripts/ivme.py pdf sorular <pdf> ... PDF metin önce soru çıkarımı (scripts/pdf-metin.py)
  python scripts/ivme.py pdf kanit olustur|toplu|dogrula|goster|ozet|karar|pilot ...   sürümlü PDF kanıt paketi (scripts/pdf_kanit_paketi.py)
  python scripts/ivme.py ollama ...            yerel model (scripts/ollama-sor.py)
  python scripts/ivme.py ogretim dogrula|aktar Akıllı Öğretmen içerikleri (scripts/ogretim-icerigi.py)
  python scripts/ivme.py icerik durum|calistir|kontrol <kavram>   TAS-09 kaynaklı konu içerik hattı (scripts/icerik_hatti.py)
  python scripts/ivme.py video durum|calistir|kontrol <gorev>    TAS-11 zamanlı metin/kare/ipucu paketi (scripts/video_hatti.py)
"""

import json
import os
import re
import subprocess
import sys
import time

from test_kaniti import BACKEND_INPUTS, assess_backend, fingerprint, write_json
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

APP = Path(__file__).resolve().parents[1]
VENV_PY = APP.parent / ".venv/Scripts/python.exe"
STATUS = APP / "backend/target/live-watch.status"
WATCH_LOG = APP / "backend/target/live-watch.log"
KNOWN = APP / "testler/bilinen-hatalar.md"
HANDOFF = APP / "docs/devam.md"
URL = os.environ.get("IVME_URL", "http://127.0.0.1:1010")
MONTHS = "Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık"
DATED_LINE = re.compile(rf"\b\d{{1,2}}(?:[–-]\d{{1,2}})? (?:{MONTHS})\b")
DATED_DOCS_ALLOWED = {"docs/devam.md", "testler/bilinen-hatalar.md"}


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
    print("Devir (docs/devam.md):")
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
    if tests and not re.fullmatch(r"[A-Za-z0-9_.*]+(?:,[A-Za-z0-9_.*]+)*", tests):
        print("Test seçimi virgülle ayrılmış sınıf adları olmalı (paket veya * kullanılabilir).")
        return 2
    command = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "testler/backend-test.ps1"]
    if tests:
        command += ["-Test", tests]
    patterns = BACKEND_INPUTS
    inputs = fingerprint(APP, patterns)
    report_dir = APP / "backend/target-tests/surefire-reports"
    before = {p.name: (p.stat().st_mtime_ns, p.stat().st_size) for p in report_dir.glob("TEST-*.xml")}
    started = datetime.now(timezone.utc).isoformat()
    print("Çalışıyor: " + " ".join(command[-3:] if tests else command[-1:]), flush=True)
    try:
        result = run(command, capture_output=True)
    except OSError as error:
        result = subprocess.CompletedProcess(command, 1, "", str(error))
    reports = [p for p in report_dir.glob("TEST-*.xml")
               if before.get(p.name) != (p.stat().st_mtime_ns, p.stat().st_size)]
    output = result.stdout + result.stderr
    log = APP / "backend/target/ivme-test-son.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    log.write_text(output, encoding="utf-8")
    cleanup_ok = re.search(rf"^IVME_TEST_RESULT={result.returncode}\s*$", result.stdout, re.M) is not None
    evidence = assess_backend(reports, known_failures(), result.returncode, cleanup_ok, tests)
    if inputs != fingerprint(APP, patterns):
        evidence["status"] = "FAIL"
        evidence["problems"].append("Test sırasında kaynak değişti; kanıt geçerli değil.")
    evidence.update(schemaVersion=1, startedAt=started, finishedAt=datetime.now(timezone.utc).isoformat(),
                    command=command, selection=tests or "ALL", inputs=inputs,
                    commit=out(["git", "rev-parse", "HEAD"]), processExitCode=result.returncode,
                    reports=[p.name for p in reports], log=str(log.relative_to(APP)))
    target = APP / "backend/target/ivme-test-son.json"
    write_json(target, evidence)
    counts = evidence["totals"]
    print(f"Toplam {counts['tests']} test · {counts['failures']} başarısız · "
          f"{counts['errors']} hata · {counts['skipped']} atlandı")
    print(f"Sonuç: {evidence['status']} · bilinen {len(evidence['knownFailures'])} · yeni {len(evidence['newFailures'])}")
    for problem in evidence["problems"]:
        print("  " + problem)
    print("Kanıt: " + str(target))
    print("Tam çıktı: " + str(log))
    return 0 if evidence["status"] in ("PASS", "KNOWN_FAILURES") else 1


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
                            "Belge güncel durumu anlatır; tarihi/kanıtı commit mesajına veya devam.md'ye yaz")
    if any(name.startswith("docs/") or name in ("AGENTS.md", "README.md") for name in files) or "--hepsi" in args:
        result = run([sys.executable, "scripts/plan-check.py"], capture_output=True, env={**os.environ, "PYTHONIOENCODING": "utf-8"})
        if result.returncode:
            try:
                errors = json.loads(result.stdout.strip().splitlines()[-1])["errors"]
            except (ValueError, IndexError, KeyError):
                errors = [result.stdout[-400:] + result.stderr[-400:]]
            problems += ["plan-check: " + e for e in errors]
    # Ders/not cevabı değişince sunucu puanlama anahtarı da aynı commit'te yenilenmeli (TAS-04).
    if "--hepsi" in args or any(n.startswith("frontend/src/learn/content/dersler/") or n in (
            "frontend/public/kaynakli-notlar.json", "backend/src/main/resources/learn/answer-keys.json") for n in files):
        if run(["node", "scripts/cevap-anahtari.mjs", "--kontrol"], capture_output=True).returncode:
            problems.append("cevap anahtarı güncel değil: node scripts/cevap-anahtari.mjs çalıştır ve dosyayı ekle")
    # Banka değişince aynı görselli kitapçık kopyaları yeniden hesaplanmalı (TAS-05 ikiz görsel haritası).
    bank_changed = any(n.startswith("frontend/src/learn/bank/") and not n.rsplit("/", 1)[-1].startswith("_") for n in files)
    if bank_changed and "frontend/src/learn/bank/_gorsel.json" not in files:
        # Yalnız soru tipi değişmişse yeniden üretilen ikiz haritasının baytları aynı kalabilir.
        # Dosyada yapay bir fark istemek yerine gerçek banka/görsel güncelliğini doğrula.
        if run(["node", "scripts/ortak-set-tani.mjs", "--kontrol"], capture_output=True).returncode:
            problems.append("ikiz görsel haritası güncel değil: node scripts/ortak-set-tani.mjs --yaz çalıştır ve çıktıyı ekle")
    # TAS-12: doğrulama aracının yanlış başarı üretmesini commit öncesi engelle.
    if "--hepsi" in args or any(n in ("scripts/ivme.py", "scripts/test_kaniti.py", "scripts/kalite.py",
            "testler/kalite-profilleri.json", "testler/backend-test.ps1", "testler/test-kaniti-test.py",
            "testler/kalite-test.py") for n in files):
        for test in ("testler/test-kaniti-test.py", "testler/kalite-test.py"):
            result = run([sys.executable, "-X", "utf8", test], capture_output=True)
            if result.returncode:
                problems.append(f"Test kanıtı regresyonu başarısız: {test}\n{result.stdout[-500:]}\n{result.stderr[-1500:]}")
    # TAS-11: video kanıt hattı ve pilot iddiaları değişince dar kabul yeniden çalışır.
    if "--hepsi" in args or any(n.startswith("video-hatti/") or n in (
            "scripts/video_hatti.py", "scripts/video-content-probe.py", "testler/video-hatti-test.py",
            "testler/video-content-probe-test.py", "testler/tek-cift-video-pilot-test.py") for n in files):
        for test in ("testler/video-hatti-test.py", "testler/video-content-probe-test.py", "testler/tek-cift-video-pilot-test.py"):
            result = run([python_for_tools(), "-X", "utf8", test], capture_output=True)
            if result.returncode:
                problems.append(f"Video kanıt/ipucu denetimi başarısız: {test}\n{result.stdout[-1000:]}\n{result.stderr[-1500:]}")
    if "--hepsi" in args or any(n.startswith("video-hatti/") or n in (
            "scripts/video-protips.py", "frontend/src/learn/content/video-protips.json") for n in files):
        result = run([python_for_tools(), "-X", "utf8", "scripts/video-protips.py", "--kontrol"], capture_output=True)
        if result.returncode:
            problems.append("Video protip görünümü güncel değil:\n" + result.stdout[-1000:] + result.stderr[-1000:])
    # TAS-09: kaynaklı konu içeriği değişince eski kanıtla kabul edilmesin.
    tasks = sorted((APP / "icerik-hatti/gorevler").glob("*.json"))
    specs = [s for s in (json.loads(p.read_text(encoding="utf-8")) for p in tasks) if (APP / s["output"]).is_file()]
    content_inputs = {"frontend/src/learn/engine/sharedSet.js", "frontend/src/learn/engine/selection.js",
                      "frontend/src/learn/content/evidence.js", "frontend/src/learn/content/parser.js",
                      "frontend/src/learn/bank/_gorsel.json", "scripts/icerik_hatti.py", "scripts/icerik-hatti-ders.mjs",
                      "testler/icerik-hatti.test.mjs", "scripts/ivme.py"}
    for spec in specs:
        content_inputs |= {spec["lesson"], spec["output"], f"frontend/src/learn/bank/{spec['conceptId']}.json", *spec.get("tests", [])}
    content_changed = any(n in content_inputs or n.startswith(("icerik-hatti/", "frontend/src/learn/content/kanit/"))
                          or (n.startswith("frontend/src/learn/content/") and n.endswith("-exams.js")) for n in files)
    if "--hepsi" in args or content_changed:
        tests = ["testler/icerik-hatti.test.mjs", *sorted({t for spec in specs for t in spec.get("tests", [])})]
        result = run(["node", "--test", *tests], capture_output=True)
        if result.returncode:
            problems.append("İçerik hattı kanıtı/kabulü başarısız:\n" + result.stdout[-3000:] + result.stderr[-500:])
    # Görev tanımı, insan kararı veya hat kodu değişince kanıt yerel kaynaktan yeniden hesaplanır (yazmadan).
    if "--hepsi" in args or any(n.startswith("icerik-hatti/") or n in ("scripts/icerik_hatti.py", "scripts/icerik-hatti-ders.mjs")
                                for n in files):
        result = run([python_for_tools(), "-X", "utf8", "scripts/icerik_hatti.py", "kontrol"], capture_output=True)
        if result.returncode:
            problems.append("İçerik hattı çıktısı girdilerle doğrulanamadı (yerel kaynak yoksa: "
                            "python scripts/ivme.py icerik calistir <kavram>):\n" + result.stdout[-1500:] + result.stderr[-500:])
    code_changed = any(n.startswith(("frontend/src/", "backend/src/", "scripts/")) for n in files)
    if code_changed and "docs/devam.md" not in files and "--hepsi" not in args:
        print("Not: kod değişti ama docs/devam.md commit'te yok; yarım iş varsa devir dosyasını güncelle.")
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
    if args[:1] == ["kanit"]:
        return run([python_for_tools(), "-X", "utf8", "scripts/pdf_kanit_paketi.py", *args[1:]]).returncode
    return run([python_for_tools(), "scripts/pdf-metin.py", *args]).returncode


def cmd_ollama(args):
    return run([sys.executable, "scripts/ollama-sor.py", *(args or ["durum"])]).returncode


def cmd_ogretim(args):
    return run([python_for_tools(), "scripts/ogretim-icerigi.py", *args],
               env={**os.environ, "PYTHONIOENCODING": "utf-8"}).returncode


def cmd_icerik(args):
    return run([python_for_tools(), "-X", "utf8", "scripts/icerik_hatti.py", *(args or ["durum"])]).returncode


def cmd_video(args):
    if args[:1] == ["protips"]:
        return run([python_for_tools(), "-X", "utf8", "scripts/video-protips.py", *args[1:]]).returncode
    return run([python_for_tools(), "-X", "utf8", "scripts/video_hatti.py", *(args or ["durum"])]).returncode


def cmd_kalite(args):
    return run([python_for_tools(), "-X", "utf8", "scripts/kalite.py", *args]).returncode


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
            and n != "docs/devam.md"]
    if not work or "docs/devam.md" in changed:
        return 0
    print(f"Commit'lenmemiş {len(work)} dosya var ({', '.join(work[:5])}) ama docs/devam.md güncellenmedi. "
          "İş yarımsa devir dosyasındaki 'Şimdi' tablosunu (yarım iş, sıradaki komut) güncelle; iş bittiyse "
          "yerel commit at ve 'Son kapanan iş' satırını yaz. Bilinçli olarak bırakıyorsan bunu kullanıcıya söyle.",
          file=sys.stderr)
    return 2


COMMANDS = {"devir-kontrol": cmd_devir_kontrol, "durum": cmd_durum, "bekle": cmd_bekle, "test": cmd_test, "kontrol": cmd_kontrol, "ui": cmd_ui,
            "sayfa": cmd_sayfa, "plan": cmd_plan, "pdf": cmd_pdf, "ollama": cmd_ollama, "ogretim": cmd_ogretim,
            "icerik": cmd_icerik, "video": cmd_video, "kalite": cmd_kalite}


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
