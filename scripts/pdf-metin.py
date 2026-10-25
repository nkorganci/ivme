"""PDF'den metin önce: sayfa metni, soru sınırları ve yalnız gerekince kırpılmış görsel.

AI'ya tam sayfa ekran görüntüsü vermek yerine bu betik metin katmanını konumlarıyla
okur. Görsel yalnız şekil/tablo içeren veya metni çıkmayan soru için kırpılır ve
`gorselGerekli=true` ile işaretlenir. Özgün PDF yalnız okunur; sonuçlar PDF SHA-256 +
sayfa + sürüm anahtarıyla `veri/pdf-metin-onbellek/` altında önbelleğe alınır.

Kullanım (uygulama kökünden, depo Python'u ile ya da `python scripts/ivme.py pdf ...`):
  ..\\.venv\\Scripts\\python.exe scripts/pdf-metin.py sayfalar <pdf> [--sayfa 1-3]
  ..\\.venv\\Scripts\\python.exe scripts/pdf-metin.py sorular <pdf> [--sayfa 2] [--kirp <dizin>] [--metinsiz]

`sayfalar`: her sayfanın metin katmanı var mı, karakter sayısı, görsel/çizim sayısı ve
OCR gerekip gerekmediği. Metin katmanı olmayan sayfa için `scripts/pdf-page-ocr.py`
kullanılır; bu betik OCR yapmaz.
`sorular`: “1.”, “2)” gibi soru numarası çapalarından soru bölgeleri (iki sütun
desteklenir). Numara geriye dönünce yeni test bölümü (`bolum`) başlar; “12. C”
satırlarından oluşan sayfalar `cevapAnahtari` olarak ayrı okunur. `--kirp` yalnız `gorselGerekli` sorular için PNG üretir; `--hepsini-kirp`
hepsi için. Çıktı JSON'dur ve stdout'a yazılır.
"""

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

import numpy
import pymupdf

APP = Path(__file__).resolve().parents[1]
CACHE = APP / "veri/pdf-metin-onbellek"
VERSION = "pdf-metin-v3"
ANCHOR = re.compile(r"^\s*(\d{1,3})\s*[.)]\s*(\S.*)?$")
STEM = re.compile(r"^\s*\d{1,3}\s*\.?\s*[–-]\s*\d{1,3}\s*\.?\s*soru", re.I)
KEY_PAIR = re.compile(r"\b(\d{1,3})\s*[.)-]\s*([A-E])\b")
MIN_TEXT_CHARS = 25
INK_DPI = 50
INK_DARK = 110
INK_RATIO = 0.004


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def page_range(spec, count):
    if not spec:
        return list(range(1, count + 1))
    pages = []
    for part in spec.split(","):
        start, _, end = part.partition("-")
        pages += range(int(start), int(end or start) + 1)
    return [page for page in pages if 1 <= page <= count]


def cached(pdf_hash, page_no, kind, build):
    target = CACHE / pdf_hash[:2] / f"{pdf_hash}-{page_no}-{kind}-{VERSION}.json"
    if target.exists():
        return json.loads(target.read_text(encoding="utf-8"))
    value = build()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")
    return value


def page_summary(page):
    text = page.get_text("text")
    chars = len(text.strip())
    images = len(page.get_images(full=True))
    drawings = len(page.get_drawings())
    return {"page": page.number + 1, "chars": chars, "images": images, "drawings": drawings,
            "textLayer": chars >= MIN_TEXT_CHARS, "ocrGerekli": chars < MIN_TEXT_CHARS,
            "text": text.strip()}


def lines_of(page):
    """Metin satırları; üst/alt kenardaki kısa satırlar (sayfa no, kitapçık harfi) atlanır."""
    lines, height = [], page.rect.height
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            text = "".join(span["text"] for span in line["spans"]).strip()
            y0, y1 = line["bbox"][1], line["bbox"][3]
            if not text or (len(text) <= 6 and (y0 > height * 0.93 or y1 < height * 0.05)):
                continue
            lines.append({"text": text, "bbox": [round(v, 1) for v in line["bbox"]]})
    return lines


def columns(page, lines):
    """Çapalar sayfanın iki yarısında da varsa iki sütun kabul edilir."""
    mid = page.rect.width / 2
    left = [l for l in lines if ANCHOR.match(l["text"]) and l["bbox"][0] < mid - 20]
    right = [l for l in lines if ANCHOR.match(l["text"]) and l["bbox"][0] >= mid - 20]
    if left and right:
        return [(0, mid), (mid, page.rect.width)]
    return [(0, page.rect.width)]


def visual_inside(page, rect, lines):
    """Metin satırları beyazla örtülünce bölgede koyu mürekkep kalıyorsa şekil/tablo vardır.

    Görsel/çizim nesnesi saymak güvenilmez: bazı PDF'ler sayfayı küçük filigran
    karolarıyla kaplar. Açık gri filigran koyu eşik altında kalmaz.
    """
    pix = page.get_pixmap(clip=rect, dpi=INK_DPI, colorspace=pymupdf.csGRAY)
    ink = numpy.frombuffer(pix.samples, dtype=numpy.uint8).reshape(pix.height, pix.width, pix.n)[:, :, 0].copy()
    scale = INK_DPI / 72
    for line in lines:
        x0, y0, x1, y1 = line["bbox"]
        if x1 < rect.x0 or x0 > rect.x1 or y1 < rect.y0 or y0 > rect.y1:
            continue
        ink[max(0, int((y0 - rect.y0) * scale) - 1):int((y1 - rect.y0) * scale) + 2,
            max(0, int((x0 - rect.x0) * scale) - 1):int((x1 - rect.x0) * scale) + 2] = 255
    ratio = float((ink < INK_DARK).mean()) if ink.size else 0.0
    return ratio >= INK_RATIO, round(ratio, 4)


def questions(page):
    lines = lines_of(page)
    out = []
    for x0, x1 in columns(page, lines):
        col = sorted((l for l in lines if x0 - 1 <= l["bbox"][0] < x1), key=lambda l: (l["bbox"][1], l["bbox"][0]))
        if not col:
            continue
        # Çapa: satır numarayla başlar ve sütunun sol kenarına yakındır.
        left_edge = min(l["bbox"][0] for l in col)
        anchors = [i for i, l in enumerate(col) if ANCHOR.match(l["text"]) and l["bbox"][0] - left_edge < 30]
        numbers = [int(ANCHOR.match(col[i]["text"])[1]) for i in anchors]
        # Artan sıra bozuluyorsa (şık “1)” veya liste maddesi) o çapa atlanır.
        kept, last = [], 0
        for index, number in zip(anchors, numbers):
            if STEM.match(col[index]["text"]):
                kept.append((index, number))
            elif number > last:
                kept.append((index, number))
                last = number
        bottom = max(l["bbox"][3] for l in col)
        for k, (index, number) in enumerate(kept):
            end_index = kept[k + 1][0] if k + 1 < len(kept) else len(col)
            chunk = col[index:end_index]
            y0 = chunk[0]["bbox"][1] - 2
            y1 = (col[end_index]["bbox"][1] - 2) if end_index < len(col) else bottom + 2
            rect = pymupdf.Rect(x0, y0, x1, y1)
            text = "\n".join(l["text"] for l in chunk)
            visual, ink = visual_inside(page, rect, lines)
            stem = STEM.match(text)
            out.append({"number": number, "page": page.number + 1, "bbox": [round(v, 1) for v in rect],
                        "tur": "ortakOncul" if stem else "soru",
                        "chars": len(text), "ink": ink, "gorselGerekli": visual or len(text) < MIN_TEXT_CHARS,
                        "neden": "şekil/görsel" if visual else ("metin yok" if len(text) < MIN_TEXT_CHARS else None),
                        "text": text})
    return sorted(out, key=lambda q: q["number"])


def answer_key(found, page):
    """Çapaların çoğu yalnız “12. C” ise sayfa cevap anahtarıdır; soru sayılmaz."""
    short = [item for item in found if len(ANCHOR.sub(r"\2", item["text"].split("\n")[0]).strip()) <= 3]
    if len(found) < 10 or len(short) < 0.8 * len(found):
        return None
    answers = {}
    for number, letter in KEY_PAIR.findall(page.get_text("text")):
        answers.setdefault(number, letter)
    return answers or None


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("komut", choices=["sayfalar", "sorular"])
    parser.add_argument("pdf")
    parser.add_argument("--sayfa", help="1 tabanlı fiziksel sayfa: 3 veya 2-5 veya 1,4")
    parser.add_argument("--kirp", help="gorselGerekli sorular için PNG çıktısı dizini")
    parser.add_argument("--hepsini-kirp", action="store_true", help="--kirp ile bütün soruları kırp")
    parser.add_argument("--metinsiz", action="store_true", help="JSON'a metni koyma (yalnız sayı/konum)")
    parser.add_argument("--dpi", type=int, default=150)
    args = parser.parse_args(argv)
    path = Path(args.pdf).resolve()
    pdf_hash = sha256(path)
    doc = pymupdf.open(path)
    result = {"pdf": str(path), "sha256": pdf_hash, "pages": doc.page_count, "version": VERSION}
    pages = page_range(args.sayfa, doc.page_count)
    if args.komut == "sayfalar":
        items = [cached(pdf_hash, n, "sayfa", lambda n=n: page_summary(doc[n - 1])) for n in pages]
        result["ocrGerekenSayfalar"] = [item["page"] for item in items if item["ocrGerekli"]]
        result["items"] = items
    else:
        items, answer_keys = [], []
        for n in pages:
            found = cached(pdf_hash, n, "soru", lambda n=n: questions(doc[n - 1]))
            key = answer_key(found, doc[n - 1])
            if key:
                answer_keys.append({"page": n, "answers": key})
            else:
                items += found
        # Numara geriye dönünce yeni test bölümü başlar (ör. Genel Yetenek 1–60, Genel Kültür 1–60).
        section, last = 1, 0
        for item in items:
            if item["tur"] != "soru":
                item["bolum"] = section
                continue
            if item["number"] < last:
                section += 1
            item["bolum"], last = section, item["number"]
        result["cevapAnahtari"] = answer_keys
        if args.kirp:
            target = Path(args.kirp)
            target.mkdir(parents=True, exist_ok=True)
            for item in items:
                if item["gorselGerekli"] or args.hepsini_kirp:
                    png = target / f"{path.stem}-s{item['page']:03d}-q{item['number']:03d}.png"
                    if not png.exists():
                        doc[item["page"] - 1].get_pixmap(clip=pymupdf.Rect(item["bbox"]), dpi=args.dpi).save(png)
                    item["png"] = str(png)
        sections = []
        for number in sorted({item["bolum"] for item in items}):
            numbers = [item["number"] for item in items if item["bolum"] == number and item["tur"] == "soru"]
            sections.append({"bolum": number, "questions": len(numbers), "ilk": min(numbers), "son": max(numbers),
                             "eksikNumaralar": sorted(set(range(min(numbers), max(numbers) + 1)) - set(numbers)),
                             "tekrarNumaralar": sorted({n for n in numbers if numbers.count(n) > 1})})
        result["summary"] = {"questions": sum(i["tur"] == "soru" for i in items),
                             "ortakOncul": sum(i["tur"] == "ortakOncul" for i in items), "gorselGerekli": sum(i["gorselGerekli"] for i in items),
                             "cevapAnahtariSayfalari": [key["page"] for key in answer_keys], "bolumler": sections}
        result["items"] = items
    if args.metinsiz:
        for item in result["items"]:
            item.pop("text", None)
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
