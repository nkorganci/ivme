r"""Read-only 12.03 pilot: inspect source text and build a review queue.

Run with the repository Python environment:
  ..\.venv\Scripts\python.exe scripts\soru-metin-pilotu.py
The JSON report is written to stdout; no source or student data is changed.
"""

import hashlib
import io
import json
import os
import re
import argparse
from collections import Counter
from difflib import SequenceMatcher
from functools import lru_cache
from pathlib import Path

import pymupdf
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
APP = Path(__file__).resolve().parents[1]
OUTGOING = ("TYT-0001", "TYT-0756", "AYT_EsitAgirlik-0189")
OGM_FILE = ROOT / "veri-hatti/ogm-sorular/kayit/yk-matematik-tyt-test-01.json"
OGM_IDS = ("yk-matematik-tyt-test-01-01-01", "yk-matematik-tyt-test-01-01-02")
CHOICES = re.compile(r"(?m)^\s*([A-E])\s*[).]\s*(.+?)(?=^\s*[A-E]\s*[).]|\Z)", re.S)
TESSDATA = Path(os.environ.get("IVME_TESSDATA", APP / "veri/tessdata"))


@lru_cache(maxsize=256)
def _sha256_cached(path, size, mtime_ns):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def sha256(path):
    stat = path.stat()
    return _sha256_cached(path, stat.st_size, stat.st_mtime_ns)


@lru_cache(maxsize=8)
def opened_pdf(path, checksum):
    """Reuse a PDF while its content checksum is unchanged in this process."""
    return pymupdf.open(path)


def normalized(value):
    return " ".join(value.split())


def ocr_image(image_path):
    """Run OCR on an isolated crop, so neighboring PDF questions cannot leak in."""
    with Image.open(image_path) as picture:
        buffer = io.BytesIO()
        picture.save(buffer, format="PNG")
    with pymupdf.open(stream=buffer.getvalue(), filetype="png") as raster:
        pdf_bytes = raster.convert_to_pdf()
    with pymupdf.open(stream=pdf_bytes, filetype="pdf") as pdf:
        page = pdf[0]
        textpage = page.get_textpage_ocr(language="tur", dpi=200, full=True,
                                         tessdata=str(TESSDATA))
        return page.get_text("text", textpage=textpage)


def inspect_question(code, source_path, image_path, page, rect, raw_text, answers, source_kind):
    reasons = []
    source = {"path": str(source_path.relative_to(ROOT)).replace("\\", "/"),
              "sha256": sha256(source_path)}
    image = {"path": str(image_path.relative_to(ROOT)).replace("\\", "/"),
             "sha256": sha256(image_path)}
    with Image.open(image_path) as picture:
        picture.verify()
    with Image.open(image_path) as picture:
        image["width_px"], image["height_px"] = picture.size

    pdf = opened_pdf(source_path, source["sha256"])
    if not isinstance(page, int) or not 1 <= page <= len(pdf):
        raise ValueError(f"{code}: invalid page {page}")
    extracted = pdf[page - 1].get_text("text", clip=pymupdf.Rect(rect)) if rect else ""
    if not rect:
        reasons.append("question_rect_missing")
    method = "pdf_text" if extracted.strip() and rect else None
    if not method:
        if (TESSDATA / "tur.traineddata").is_file():
            extracted = ocr_image(image_path)
            method = "ocr" if extracted.strip() else None
            reasons.append("ocr_needs_review")
        else:
            reasons.append("ocr_required")
    if not raw_text:
        reasons.append("question_text_missing")
    similarity = (SequenceMatcher(None, normalized(raw_text), normalized(extracted)).ratio()
                  if extracted.strip() and raw_text else None)
    if similarity is not None and similarity < 0.99:
        reasons.append("text_diff_needs_review")

    matches = CHOICES.findall(raw_text or "")
    choices = {label: normalized(value) for label, value in matches}
    if set(choices) != set("ABCDE") or len(matches) != 5:
        reasons.append("choices_need_review")
    if len(answers) != 1 or answers[0] not in set("ABCDE"):
        reasons.append("answer_missing_or_multiple")
    # Existing answer flags do not locate the printed key in the source PDF.
    reasons.append("answer_anchor_missing")
    if source_kind == "ogm":
        reasons.append("source_question_anchor_missing")

    return {"question_code": code, "source": source,
            "anchor": {"page": page, "rect_pt": rect}, "image": image,
            "text": {"method": method,
                     "extracted_length": len(normalized(extracted)),
                     "recorded_length": len(normalized(raw_text or "")),
                     "similarity_to_recorded": round(similarity, 3)
                     if similarity is not None else None},
            "choice_count": len(choices), "answer": answers[0] if len(answers) == 1 else None,
            "review": {"status": "needs_review", "reasons": sorted(set(reasons))}}


def pilot():
    base = ROOT / "veri-hatti/ogm-yks-cikmis/ham"
    raw = json.loads((base / "sorular.json").read_text(encoding="utf-8"))
    final = json.loads((base / "sorular_son.json").read_text(encoding="utf-8"))
    raw_by_id = {q["id"]: q for q in raw["sorular"]}
    final_by_id = {q["id"]: q for q in final["sorular"]}
    report = []
    for code in OUTGOING:
        source = raw_by_id[code]
        record = final_by_id[code]
        parts = source["parcalar"]
        if len(parts) != 1:
            raise ValueError(f"{code}: pilot expects one crop")
        page, rect = parts[0]
        report.append(inspect_question(code,
            ROOT / "kaynaklar/yks-cikmis-sorular/OGM Kitapciklari" / f"{source['kitap']}.pdf",
            base / source["gorsel"], page, rect, record.get("metin"),
            record.get("cevaplar", []), "outgoing"))

    ogm = json.loads(OGM_FILE.read_text(encoding="utf-8"))
    ogm_by_id = {q["id"]: q for q in ogm["kayitlar"]}
    for code in OGM_IDS:
        record = ogm_by_id[code]
        report.append(inspect_question(code, ROOT / "kaynaklar/ogm-materyal" / ogm["dosya"],
            ROOT / "icerik" / record["gorsel"], record["sayfa"], None,
            record.get("metin"), record.get("cevaplar", []), "ogm"))
    ocr_check = None
    if (TESSDATA / "tur.traineddata").is_file():
        code = OUTGOING[0]
        original = final_by_id[code]["metin"]
        ocr = ocr_image(base / raw_by_id[code]["gorsel"])
        ocr_check = {"question_code": code, "method": "ocr",
                     "language_model_sha256": sha256(TESSDATA / "tur.traineddata"),
                     "recognized_length": len(normalized(ocr)),
                     "similarity_to_pdf_text": round(SequenceMatcher(None,
                         normalized(original), normalized(ocr)).ratio(), 3),
                     "review": "needs_review"}
    print(json.dumps({"schema": "12.03-pilot-1", "records": report,
                      "ocr_check": ocr_check}, ensure_ascii=False, indent=2))


def candidates(source_kind):
    """Yield stable, read-only work units from existing intermediate catalogs."""
    if source_kind == "outgoing":
        base = ROOT / "veri-hatti/ogm-yks-cikmis/ham"
        raw = json.loads((base / "sorular.json").read_text(encoding="utf-8"))
        final = json.loads((base / "sorular_son.json").read_text(encoding="utf-8"))
        raw_by_id = {item["id"]: item for item in raw["sorular"]}
        for record in final["sorular"]:
            code = record["id"]
            if code not in raw_by_id:
                yield code, None, "source_crop_missing"
                continue
            item = raw_by_id[code]
            parts = item.get("parcalar", [])
            if len(parts) != 1:
                yield code, None, "multiple_or_missing_question_crops"
                continue
            page, rect = parts[0]
            yield code, (code,
                ROOT / "kaynaklar/yks-cikmis-sorular/OGM Kitapciklari" / f"{item['kitap']}.pdf",
                base / item["gorsel"], page, rect, record.get("metin"),
                record.get("cevaplar", []), "outgoing"), None
    elif source_kind == "ogm":
        directory = ROOT / "veri-hatti/ogm-sorular/kayit"
        for catalog in sorted(directory.glob("*.json")):
            data = json.loads(catalog.read_text(encoding="utf-8"))
            if "dosya" not in data or "kayitlar" not in data:
                continue
            for item in data["kayitlar"]:
                code = item["id"]
                yield code, (code, ROOT / "kaynaklar/ogm-materyal" / data["dosya"],
                    ROOT / "icerik" / item["gorsel"], item["sayfa"], None,
                    item.get("metin"), item.get("cevaplar", []), "ogm"), None
    else:
        raise ValueError(source_kind)


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    try:
        temporary.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                        indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def fingerprint(args):
    code, source_path, image_path, page, rect, raw_text, answers, source_kind = args
    model = TESSDATA / "tur.traineddata"
    inputs = {"script": sha256(Path(__file__)), "code": code,
              "source_sha256": sha256(source_path), "image_sha256": sha256(image_path),
              "page": page, "rect": rect, "text": raw_text, "answers": answers,
              "source_kind": source_kind,
              "ocr_model_sha256": sha256(model) if model.is_file() else None}
    return hashlib.sha256(json.dumps(inputs, ensure_ascii=False, sort_keys=True,
                                     separators=(",", ":")).encode("utf-8")).hexdigest()


def batch(source_kind, limit, output_dir, resume):
    if limit < 1:
        raise ValueError("--limit must be positive")
    if not output_dir.resolve().is_relative_to((APP / "veri").resolve()):
        raise ValueError("batch output must be inside ignored application veri")
    selected = processed = skipped = errors = 0
    reasons = Counter()
    seen = set()
    for code, args, catalog_error in candidates(source_kind):
        if selected >= limit:
            break
        selected += 1
        if code in seen or not re.fullmatch(r"[A-Za-z0-9_-]+", code):
            raise ValueError(f"duplicate or unsafe question code: {code}")
        seen.add(code)
        record_path = output_dir / "records" / f"{code}.json"
        error_path = output_dir / "errors" / f"{code}.json"
        try:
            if catalog_error:
                raise ValueError(catalog_error)
            current_fingerprint = fingerprint(args)
            if resume and record_path.is_file():
                try:
                    old = json.loads(record_path.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    old = {}
                if old.get("input_fingerprint") == current_fingerprint:
                    skipped += 1
                    reasons.update(old["result"]["review"]["reasons"])
                    continue
            result = inspect_question(*args)
            atomic_json(record_path, {"input_fingerprint": current_fingerprint,
                                      "result": result})
            error_path.unlink(missing_ok=True)
            reasons.update(result["review"]["reasons"])
            processed += 1
        except (OSError, ValueError, KeyError, IndexError, RuntimeError) as exc:
            record_path.unlink(missing_ok=True)
            atomic_json(error_path, {"question_code": code,
                                     "error_type": type(exc).__name__,
                                     "message": str(exc)[:500]})
            errors += 1
    summary = {"schema": "12.04-batch-1", "source": source_kind, "limit": limit,
               "selected": selected, "processed": processed, "skipped": skipped,
               "errors": errors, "review_reasons": dict(sorted(reasons.items()))}
    atomic_json(output_dir / "summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    return 1 if errors else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--batch", choices=("outgoing", "ogm"))
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--resume", action="store_true")
    options = parser.parse_args()
    if options.batch:
        destination = options.output_dir or APP / "veri/pilot-12-04" / options.batch
        raise SystemExit(batch(options.batch, options.limit, destination, options.resume))
    if options.output_dir or options.resume:
        parser.error("--output-dir and --resume require --batch")
    pilot()


if __name__ == "__main__":
    main()
