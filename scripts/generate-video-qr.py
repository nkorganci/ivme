"""Generate local QR assets from the reviewed physics video catalogue.

Run with Python + qrcode==8.2 (no video download or external QR service).
Every QR encodes the exact URL used by the adjacent video link.
"""
import json
from pathlib import Path

import qrcode
from qrcode.image.svg import SvgPathFillImage

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = ROOT / "frontend/src/data/physicsVideos.json"
OUTPUT = ROOT / "frontend/public/ders-videolari/qr"


def main():
    catalogue = json.loads(CATALOGUE.read_text(encoding="utf-8"))
    videos = {video["id"]: video for topic in catalogue["topics"]
              for lesson in topic["lessons"] for video in lesson["videos"]}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for video in videos.values():
        expected = f'https://www.youtube.com/watch?v={video["id"]}'
        assert video["url"] == expected, video
        assert video["qr"] == f'/ders-videolari/qr/{video["id"]}.svg', video
        code = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=4, box_size=10)
        code.add_data(video["url"])
        code.make(fit=True)
        code.make_image(image_factory=SvgPathFillImage).save(OUTPUT / f'{video["id"]}.svg')
    print(f"Generated {len(videos)} local QR codes.")


if __name__ == "__main__":
    main()
