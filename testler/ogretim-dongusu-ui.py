"""Akıllı öğretmen pilotunun canlı yerel sitede uçtan uca arayüz kabulü.

Yerel geliştirme girişleriyle (öğrenci + öğretmen) bir öğretim döngüsünü baştan sona oynar,
1280 ve 390 px ekran görüntüleri alır ve sonuçları veri/ogretim-pilotu/ui/<zaman>/report.json
dosyasına yazar. Çalışma sırasında oluşan öğretim kayıtları sonunda geri alınır; öğrencinin
önceden var olan beceri kaydı aynen geri yüklenir.

Kullanım: python -X utf8 testler/ogretim-dongusu-ui.py [--base http://localhost:5173] [--code TYT-0780]
"""

import argparse
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

APP = Path(__file__).resolve().parents[1]
EDGE = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
spec = importlib.util.spec_from_file_location("ogretim", APP / "scripts/ogretim-icerigi.py")
ogretim = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ogretim)

LOGIN = """async (path) => {
  await fetch('/api/auth/me', {credentials: 'same-origin'});
  const token = decodeURIComponent((document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN=')) || '=').split('=')[1]);
  const response = await fetch(path, {method: 'POST', credentials: 'same-origin', headers: {'X-XSRF-TOKEN': token}});
  return response.status;
}"""


def login(page, base, path):
    page.goto(base + "/giris")
    # Uygulama yerelde oturumsuz açılışta öğrenci girişini kendisi yapar; o bitmeden rol değiştirilmez.
    page.wait_for_load_state("networkidle")
    status = page.evaluate(LOGIN, path)
    assert status == 200, f"{path} girişi başarısız: {status}"


def snapshot(connection):
    raw = ogretim.query(connection, """
        SELECT json_build_object('user', (SELECT id FROM users WHERE username = 'nazile'),
          'skills', coalesce((SELECT json_agg(row_to_json(s)) FROM tutor_skill_states s
                              WHERE s.user_id = (SELECT id FROM users WHERE username = 'nazile')), '[]'::json),
          'sessions', coalesce((SELECT json_agg(id) FROM tutor_sessions
                                WHERE user_id = (SELECT id FROM users WHERE username = 'nazile')), '[]'::json),
          'queue', coalesce((SELECT json_agg(id) FROM tutor_teacher_queue), '[]'::json),
          'calls', coalesce((SELECT max(id) FROM tutor_model_calls), 0))""")
    return json.loads(raw)


def restore(connection, before):
    user = before["user"]
    keep = ",".join(str(i) for i in before["sessions"]) or "0"
    statements = [
        f"DELETE FROM tutor_model_calls WHERE id > {int(before['calls'])} AND (session_id IS NULL OR session_id IN "
        f"(SELECT id FROM tutor_sessions WHERE user_id = {user} AND id NOT IN ({keep})))",
        f"DELETE FROM tutor_sessions WHERE user_id = {user} AND id NOT IN ({keep})",
        f"DELETE FROM tutor_skill_states WHERE user_id = {user}",
    ]
    for row in before["skills"]:
        columns = ", ".join(row)
        values = ", ".join("NULL" if value is None else ogretim.sql_text(value) for value in row.values())
        statements.append(f"INSERT INTO tutor_skill_states({columns}) VALUES ({values})")
    ogretim.query(connection, "BEGIN; " + "; ".join(statements) + "; COMMIT")


def student_flow(page, base, code, shots, checks):
    page.goto(base + "/akilli-ogretmen")
    page.wait_for_selector(".tutor-grid")
    checks["catalogItems"] = page.locator(".tutor-item").count()
    checks["branchTabs"] = page.locator(".tutor-branches a").count()
    page.screenshot(path=str(shots / "katalog-1280.png"), full_page=True)
    page.goto(base + f"/akilli-ogretmen/{code}")
    page.wait_for_selector(".tutor-next")
    checks["firstStep"] = page.locator(".tutor-next h2").inner_text()
    checks["noAnswerBeforeAttempt"] = "Doğru cevap" not in page.content()
    page.screenshot(path=str(shots / "oturum-baslangic-1280.png"), full_page=True)
    next_button = page.locator(".tutor-next .btn-primary")
    if next_button.count() and "Büyük fikri" in next_button.first.inner_text():
        next_button.first.click()
        page.wait_for_selector(".tutor-card.pattern")
    page.locator(".tutor-card.prompt .tutor-option").first.click()
    page.wait_for_selector(".tutor-card.ok, .tutor-card.bad")
    page.locator(".tutor-actions .btn", has_text="İpucu").first.click()
    page.wait_for_selector(".tutor-card.hint")
    checks["hintCards"] = page.locator(".tutor-card.hint").count()
    return checks


def finish_loop(page, shots, checks, wrong, right):
    page.locator(f".tutor-question .choice[aria-label^='Şık {wrong}']").click()
    page.wait_for_selector(".tutor-card.bad >> text=şıkkı")
    page.locator(f".tutor-question .choice[aria-label^='Şık {right}']").click()
    page.wait_for_selector(".tutor-card.ok >> text=Doğru cevap")
    page.screenshot(path=str(shots / "oturum-dogru-cevap-1280.png"), full_page=True)
    if page.locator(".tutor-card.prompt .tutor-option").count():
        page.locator(".tutor-card.prompt .tutor-option").first.click()
        page.wait_for_timeout(400)
    if page.locator(".tutor-predict .btn").count():
        page.locator(".tutor-predict .btn").first.click()
        page.wait_for_selector(".tutor-frames")
        for _ in range(4):
            button = page.locator(".tutor-frame-buttons .btn-primary")
            if button.is_disabled():
                break
            button.click()
            page.wait_for_timeout(250)
        page.locator("#tutor-visual").screenshot(path=str(shots / "gorsel-1280.png"))
        checks["visualRendered"] = page.locator("#tutor-visual svg, #tutor-visual .ag-root").count() > 0
    page.locator(".tutor-card.level, .tutor-card.ok").last.wait_for()
    level = page.locator(".tutor-card.ok .btn", has_text="Sezgi")
    if level.count():
        level.first.click()
        page.wait_for_selector(".tutor-card.level")
    twin = page.locator("#tutor-twin .tutor-twin-choices .btn")
    if twin.count():
        twin.first.click()
        page.wait_for_timeout(500)
    page.locator(".tutor-actions .btn", has_text="Bitir").click()
    page.wait_for_selector(".tutor-card.summary")
    checks["summary"] = page.locator(".tutor-card.summary h3").first.inner_text()
    page.screenshot(path=str(shots / "oturum-ozet-1280.png"), full_page=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:5173")
    parser.add_argument("--code", default="TYT-0780")
    parser.add_argument("--wrong", default="B")
    parser.add_argument("--right", default="A")
    args = parser.parse_args()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target = APP / "veri/ogretim-pilotu/ui" / stamp
    target.mkdir(parents=True, exist_ok=True)
    connection = ogretim.db_connection("ivme")
    before = snapshot(connection)
    checks = {}
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=str(EDGE), headless=True)
            context = browser.new_context(viewport={"width": 1280, "height": 900})
            page = context.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            login(page, args.base, "/api/auth/dev-login")
            student_flow(page, args.base, args.code, target, checks)
            finish_loop(page, target, checks, args.wrong, args.right)
            mobile = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
            phone = mobile.new_page()
            phone.on("pageerror", lambda error: errors.append(str(error)))
            login(phone, args.base, "/api/auth/dev-login")
            phone.goto(args.base + "/akilli-ogretmen")
            phone.wait_for_selector(".tutor-grid")
            phone.screenshot(path=str(target / "katalog-390.png"), full_page=True)
            phone.goto(args.base + f"/akilli-ogretmen/{args.code}")
            phone.wait_for_selector(".tutor-card.summary, .tutor-next")
            phone.screenshot(path=str(target / "oturum-390.png"), full_page=True)
            checks["mobileOverflow"] = phone.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
            teacher_context = browser.new_context(viewport={"width": 1280, "height": 900})
            teacher = teacher_context.new_page()
            teacher.on("pageerror", lambda error: errors.append(str(error)))
            login(teacher, args.base, "/api/auth/dev-teacher-review-login")
            teacher.goto(args.base + "/akilli-ogretmen-inceleme")
            teacher.wait_for_selector(".tutor-content-grid .ag-row")
            checks["reviewRows"] = teacher.locator(".tutor-content-grid .ag-row").count()
            teacher.locator(".tutor-content-grid .ag-row").first.click()
            teacher.wait_for_selector(".tutor-review-detail")
            expect(teacher.locator(".tutor-review-form")).to_be_visible()
            teacher.screenshot(path=str(target / "inceleme-1280.png"), full_page=True)
            browser.close()
    finally:
        restore(connection, before)
    after = snapshot(connection)
    report = {"createdAt": stamp, "base": args.base, "code": args.code, "checks": checks, "pageErrors": errors,
              "restored": after["sessions"] == before["sessions"] and after["skills"] == before["skills"],
              "screenshots": sorted(path.name for path in target.glob("*.png"))}
    (target / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    assert not errors, errors
    assert report["restored"], "Öğretim kayıtları geri alınamadı"
    assert not checks.get("mobileOverflow"), "390 px'te yatay taşma var"


if __name__ == "__main__":
    main()
