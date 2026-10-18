"""Decode every shipped QR asset and compare it with the actual lesson link.

Requires the existing local Playwright/Edge setup, Pillow and zxing-cpp, after npm run build.
"""
import base64
import importlib.util
import json
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

import io
import zxingcpp
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("curriculum_ui", Path(__file__).with_name("curriculum-ui.py"))
ui = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ui)


def main():
    catalogue = json.loads((ROOT / 'frontend/src/data/physicsVideos.json').read_text(encoding='utf-8'))
    videos = {v['id']: v for topic in catalogue['topics'] for lesson in topic['lessons'] for v in lesson['videos']}
    server = ThreadingHTTPServer(('127.0.0.1', 0), ui.Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=str(ui.EDGE), headless=True)
            try:
                page = browser.new_page()
                page.goto(f'http://127.0.0.1:{server.server_port}/')
                rendered = page.evaluate('''async videos => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const results = [];
                    for (const video of videos) {
                        const img = new Image(); img.src = video.qr; await img.decode();
                        for (const size of [410, 96]) {
                            canvas.width = canvas.height = size;
                            ctx.fillStyle = 'white'; ctx.fillRect(0, 0, size, size);
                            ctx.drawImage(img, 0, 0, size, size);
                            results.push({ id: video.id, size, data: canvas.toDataURL('image/png').split(',')[1] });
                        }
                    }
                    return results;
                }''', list(videos.values()))
                for item in rendered:
                    image = Image.open(io.BytesIO(base64.b64decode(item['data'])))
                    decoded = zxingcpp.read_barcode(image)
                    assert decoded is not None and decoded.text == videos[item['id']]['url'], (item['id'], item['size'])
                print(f"QR OK: all {len(videos)} shipped SVGs decode to their adjacent video links.")
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
