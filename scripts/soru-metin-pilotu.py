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
from difflib import SequenceMatcher
from pathlib import Path

import pymupdf
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
OUTGOING = ("TYT-0001", "TYT-0756", "AYT_EsitAgirlik-0189")
OGM_FILE = ROOT / "veri-hatti/ogm-sorular/kayit/yk-matematik-tyt-test-01.json"
OGM_IDS = ("yk-matematik-tyt-test-01-01-01", "yk-matematik-tyt-test-01-01-02")
CHOICES = re.compile(r"(?m)^\s*([A-E])\s*[).]\s*(.+?)(?=^\s*[A-E]\s*[).]|\Z)", re.S)
TESSDATA = Path(os.environ.get("IVME_TESSDATA", ROOT / "uygulama/veri/tessdata"))


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


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

    with pymupdf.open(source_path) as pdf:
        if not isinstance(page, int) or not 1 <= page <= len(pdf):
            raise ValueError(f"{code}: invalid page {page}")
        clip = pymupdf.Rect(rect) if rect else None
        extracted = pdf[page - 1].get_text("text", clip=clip)
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


def main():
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
            ROOT / "site" / record["gorsel"], record["sayfa"], None,
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


if __name__ == "__main__":
    main()
