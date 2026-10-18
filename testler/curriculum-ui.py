"""Isolated browser check for the curriculum sheet. Run after frontend npm run build."""

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from playwright.sync_api import expect, sync_playwright


DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"
EDGE = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
progress = {}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def json(self, value):
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_PUT(self):
        path = urlparse(self.path).path
        if not path.startswith("/api/curriculum/progress/"):
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        completed = json.loads(self.rfile.read(length))["completed"]
        topic_id = path.rsplit("/", 1)[-1]
        if completed:
            progress[topic_id] = "2026-10-12T12:00:00Z"
        else:
            progress.pop(topic_id, None)
        self.json({"topicId": topic_id, "completedAt": progress.get(topic_id)})

    def do_GET(self):
        url = urlparse(self.path)
        path = url.path
        if path == "/api/auth/me":
            return self.json({"id": 1, "username": "student", "role": "USER", "contactComplete": True})
        if path == "/api/curriculum/progress":
            return self.json([{"topicId": key, "completedAt": value} for key, value in progress.items()])
        if path == "/api/topic-pdfs/curriculum":
            query = parse_qs(url.query)
            return self.json([{"topicId": "tyt.turkce.noktalama-isaretleri", "id": 1099,
                               "title": "Noktalama İşaretleri", "kind": "topic_summary"}]
                             if query.get("exam") == ["TYT"] and query.get("subject") == ["turkce"] else [])
        if path == "/api/questions/filters":
            bank = parse_qs(url.query).get("bank", [""])[0]
            if bank == "CIKMIS":
                return self.json([
                    {"examType": "TYT", "subject": "Türkçe", "topic": "Noktalama İşaretleri", "count": 18},
                    {"examType": "TYT", "subject": "Türkçe", "topic": "Paragraf", "count": 250},
                    {"examType": "AYT", "subject": "Türkçe", "topic": "Yazım Kuralları", "count": 9},
                    {"examType": "TYT", "subject": "Fizik", "topic": "Basınç", "count": 8},
                    {"examType": "AYT", "subject": "Fizik", "topic": "Vektörler", "count": 5},
                    {"examType": "AYT", "subject": "Fizik", "topic": "Kaynak etiketi", "count": 2},
                    {"examType": "TYT", "subject": "Fizik", "topic": "Dalgalar", "count": 0},
                ])
            if bank == "OGM":
                return self.json([
                    {"examType": "TYT", "subject": "Türkçe", "topic": "Noktalama İşaretleri", "count": 6},
                    {"examType": "TYT", "subject": "Tarih", "topic": "Noktalama İşaretleri", "count": 7},
                ])
        if path.startswith("/api/"):
            return self.json([])
        file = DIST / path.removeprefix("/")
        if not file.is_file() or not file.resolve().is_relative_to(DIST.resolve()):
            file = DIST / "index.html"
        body = file.read_bytes()
        kind = {".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml"}.get(file.suffix, "application/octet-stream")
        self.send_response(200)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def find_row(page, row_id):
    """Find a row through the grid's own scrolling, including virtualised rows."""
    viewport = page.locator('.curriculum-sheet .ag-grid-viewport')
    viewport.evaluate('e => e.scrollTop = 0')
    row = page.locator(f'.ag-row[row-id="{row_id}"]')
    for _ in range(100):
        if row.count():
            return row
        viewport.evaluate('e => e.scrollTop += Math.max(100, e.clientHeight * .8)')
        page.wait_for_timeout(30)
    raise AssertionError(f'Grid row not found: {row_id}')


def main():
    assert (DIST / "index.html").exists(), "Önce frontend içinde npm run build çalıştır."
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=str(EDGE), headless=True)
            try:
                for width in (1280, 390):
                    progress.clear()
                    page = browser.new_page(viewport={"width": width, "height": 900})
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    page.goto(base + "/dersler-ve-konular?sinav=TYT&ders=turkce")
                    row = page.locator(".ag-row", has_text="Noktalama işaretleri")
                    row.wait_for()
                    headers = [
                        "No", "Konu", "Ders anlatımı PDF",
                        "Soru bankası", "TYT Çıkmış Sorular", "Ders videosu · QR ve link", "Durum"]
                    assert page.locator(".ag-header-cell-text").all_text_contents() == headers
                    assert page.locator(".curriculum-overview").count() == 0
                    assert page.locator("#curriculum-search").count() == 0
                    assert page.locator(".curriculum-filters").count() == 0
                    assert page.locator(".curriculum-sheet.worksheet-frame .app-data-grid-worksheet").count() == 1
                    assert page.locator(".ag-header-cell-text").first.evaluate("""e => {
                        const swatch = document.createElement('span');
                        swatch.style.color = 'var(--surface)';
                        document.body.append(swatch);
                        const expected = getComputedStyle(swatch).color;
                        swatch.remove();
                        return getComputedStyle(e).color === expected;
                    }""")
                    assert row.locator('a[href="/konu-anlatimlari/1099"]').count() == 1
                    assert row.locator('a[href^="/cikmis-sorular?"]').count() == 1
                    assert row.locator('a[href^="/soru-bankasi?"]').count() == 1
                    assert "topic=Noktalama+%C4%B0%C5%9Faretleri" in row.locator('a[href^="/cikmis-sorular?"]').get_attribute("href")
                    assert "Bu konuda çıkmış soru yok" in page.locator(".ag-row", has_text="Paragrafta yapı").inner_text()
                    assert 'pdf yok' in page.locator('.ag-row[row-id="tyt.turkce.ses-bilgisi"] [col-id="pdfs"]').inner_text()
                    assert 'Bu konuda çıkmış soru yok' in page.locator('.ag-row[row-id="tyt.turkce.yazim-kurallari"] [col-id="cikmis"]').inner_text()
                    for link in page.locator('[col-id="cikmis"] a').all():
                        assert parse_qs(urlparse(link.get_attribute('href')).query)['examType'] == ['TYT']
                    source_row = page.locator(".ag-row", has_text="Paragraf").filter(
                        has=page.locator(".curriculum-source-mark"))
                    assert source_row.locator('a[href*="topic=Paragraf"]').count() == 1
                    assert "Kaynak konu etiketi" in source_row.inner_text()
                    assert row.locator("button.curriculum-done").inner_text() == "Bitti"
                    row.locator("button.curriculum-done").click(timeout=5000)
                    row.locator("button.curriculum-done.done").wait_for(timeout=5000)
                    assert "curriculum-row-done" in row.get_attribute("class")
                    assert "1 / 16 konu bitti" in page.locator(".curriculum-detail-head").inner_text()
                    page.reload()
                    row = page.locator(".ag-row", has_text="Noktalama işaretleri")
                    row.wait_for()
                    assert "curriculum-row-done" in row.get_attribute("class")
                    assert row.locator(".ag-cell").first.evaluate("""e => {
                        const swatch = document.createElement('div');
                        swatch.style.backgroundColor = 'var(--ok-soft)';
                        document.body.append(swatch);
                        const expected = getComputedStyle(swatch).backgroundColor;
                        swatch.remove();
                        return getComputedStyle(e).backgroundColor === expected;
                    }""")
                    viewport = page.locator('.curriculum-sheet .ag-grid-viewport')
                    assert viewport.evaluate('e => e.scrollHeight > e.clientHeight')
                    assert page.locator('.curriculum-sheet .app-data-grid-scrollable').count() == 1
                    assert page.locator('.curriculum-sheet').evaluate('e => e.clientHeight <= 680')
                    horizontal = page.locator('.curriculum-sheet .ag-body-horizontal-scroll-viewport')
                    if width == 390:
                        assert horizontal.evaluate('e => e.scrollWidth > e.clientWidth')
                    else:
                        assert horizontal.evaluate('e => e.scrollWidth <= e.clientWidth + 1')
                    viewport.scroll_into_view_if_needed()
                    viewport.hover()
                    window_y = page.evaluate('window.scrollY')
                    before = viewport.evaluate('e => e.scrollTop')
                    page.mouse.wheel(0, 250)
                    page.wait_for_function('(before) => document.querySelector(".curriculum-sheet .ag-grid-viewport").scrollTop > before', arg=before)
                    assert page.evaluate('window.scrollY') == window_y
                    viewport.evaluate('e => e.scrollTop = 0')
                    page.locator(".curriculum-exam", has_text="AYT").click()
                    page.locator(".curriculum-subject", has_text="Matematik").first.click()
                    page.locator(".ag-row", has_text="Fonksiyonlar").first.wait_for()
                    assert "AYT · Matematik" in page.locator(".curriculum-detail-head").inner_text()
                    headers[4] = 'AYT Çıkmış Sorular'
                    expect(page.locator('.ag-header-cell-text')).to_have_text(headers)
                    # Physics: real video subtopics, teacher filter, and local QR assets.
                    page.goto(base + "/dersler-ve-konular?sinav=TYT&ders=fizik")
                    parent = page.locator('.ag-row[row-id="tyt.fizik.madde-ve-ozellikleri"]')
                    parent.wait_for()
                    assert page.locator('[col-id="cikmis"] a[href*="examType=AYT"]').count() == 0
                    assert page.locator('[col-id="cikmis"] a[href*="topic=Dalgalar"]').count() == 0
                    expect(page.locator('.curriculum-video-child')).to_have_count(0)
                    parent.locator('[col-id="displayTitle"] button').click()
                    child = page.locator('.ag-row[row-id="tyt.fizik.madde-ve-ozellikleri.video-1"]')
                    child.wait_for()
                    assert "Kütle, hacim ve birim dönüşümleri" in child.inner_text()
                    expect(child.locator('.curriculum-video-teacher')).to_have_count(2)
                    for image in child.locator('.curriculum-video-qr img').all():
                        image.scroll_into_view_if_needed()
                        image.evaluate("img => img.decode()")
                        assert image.evaluate("img => img.naturalWidth > 0")
                        assert image.get_attribute('src').endswith('.svg')
                    page.wait_for_function("""() => [...document.querySelectorAll('.curriculum-video-child')].every(row => {
                        const list = row.querySelector('.curriculum-video-list');
                        return list && row.clientHeight >= list.clientHeight;
                    })""")
                    assert child.locator('.curriculum-video-link').first.get_attribute('href') == 'https://www.youtube.com/watch?v=Mhgsu-3ZLNA'
                    page.get_by_label('Video hocası').select_option('altug')
                    expect(child.locator('.curriculum-video-teacher')).to_have_count(1)
                    assert child.locator('.curriculum-teacher-name').inner_text() == 'Altuğ Güneş'
                    parent = find_row(page, 'tyt.fizik.madde-ve-ozellikleri')
                    parent.locator('button.curriculum-done').click()
                    child.locator('text=Üst konuyla birlikte ✓').wait_for()
                    assert '1 / 13 konu bitti' in page.locator('.curriculum-detail-head').inner_text()
                    page.get_by_label('Video hocası').select_option('all')
                    page.get_by_role('button', name='Tüm video alt konularını aç', exact=True).click()
                    expect(page.get_by_role('button', name='Video alt konularını kapat', exact=True)).to_be_visible()
                    assert page.locator('.curriculum-video-child').count() > 0
                    viewport = page.locator('.curriculum-sheet .ag-grid-viewport')
                    assert viewport.evaluate('e => e.scrollHeight > e.clientHeight')
                    page.get_by_role('button', name='Video alt konularını kapat', exact=True).click()
                    expect(page.locator('.curriculum-video-child')).to_have_count(0)
                    page.goto(base + '/dersler-ve-konular?sinav=AYT&ders=fizik')
                    parent = find_row(page, 'ayt.fizik.modern-fizige-giris')
                    parent.wait_for()
                    parent.locator('[col-id="displayTitle"] button').click()
                    child = find_row(page, 'ayt.fizik.modern-fizige-giris.video-5')
                    expect(child).to_contain_text('de Broglie dalga boyu ve madde dalgaları')
                    for exam_label in ("TYT", "AYT"):
                        page.locator(".curriculum-exam", has_text=exam_label).click()
                        for index in range(page.locator(".curriculum-subject").count()):
                            page.locator(".curriculum-subject").nth(index).click()
                            headers[4] = f'{exam_label} Çıkmış Sorular'
                            expect(page.locator('.ag-header-cell-text')).to_have_text(headers)
                            other_exam = 'AYT' if exam_label == 'TYT' else 'TYT'
                            expect(page.locator(f'[col-id="cikmis"] a[href*="examType={other_exam}"]')).to_have_count(0)
                            hrefs = page.locator('[col-id="cikmis"] a').evaluate_all('links => links.map(link => link.getAttribute("href"))')
                            assert all(parse_qs(urlparse(href).query)['examType'] == [exam_label] for href in hrefs)
                    assert not errors, errors
                    page.close()
                print("Curriculum UI OK: exam-specific headers and links, PDF empty state, compact desktop columns, internal scrolling, videos, saved progress, mobile")
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
