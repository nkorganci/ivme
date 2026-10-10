"""Read-only, four-page OGM note extraction pilot for plan step 13.02."""

import hashlib
import json
import os
import unicodedata
from pathlib import Path

import pymupdf


APP = Path(__file__).resolve().parents[1]
CATALOG = APP / "veri/ogm-konu-pdf-katalog/entries"
SOURCE_ROOT = (APP.parent / "kaynaklar/ogm-materyal").resolve()
TESSDATA = Path(os.environ.get("IVME_TESSDATA", APP / "veri/tessdata"))
SAMPLES = (
    (1099, 1, None),
    (1237, 1, "formula"),
    (2138, 2, "formula"),
    (2138, 3, "table"),
)


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def source_path(relative):
    if not isinstance(relative, str):
        raise ValueError("missing_pdf_path")
    part = Path(relative.replace("\\", "/"))
    if part.is_absolute() or ".." in part.parts or part.suffix.lower() != ".pdf":
        raise ValueError("unsafe_pdf_path")
    path = (SOURCE_ROOT / part).resolve()
    if not path.is_relative_to(SOURCE_ROOT):
        raise ValueError("pdf_outside_root")
    return path


def note_id(source, page, heading):
    key = "|".join(map(str, (source["catalog_id"], source["source_sha256"],
                             page, page, heading)))
    digest = hashlib.sha256(unicodedata.normalize("NFC", key).encode("utf-8"))
    return "ogm-note:" + digest.hexdigest()[:32]


def extract(catalog_id, page_number, element_kind):
    source = json.loads((CATALOG / f"{catalog_id}.json").read_text(encoding="utf-8"))["result"]
    if source["status"] != "available" or not source["source_sha256"]:
        raise ValueError("pdf_not_available")
    path = source_path(source["relative_path"])
    if sha256(path) != source["source_sha256"]:
        raise ValueError("pdf_checksum_mismatch")
    with pymupdf.open(path) as pdf:
        if not 1 <= page_number <= len(pdf) or len(pdf) != source["page_count"]:
            raise ValueError("pdf_page_mismatch")
        page = pdf[page_number - 1]
        layer_text = page.get_text(sort=True).strip()
        method = "pdf_text"
        text = layer_text
        if len(layer_text) < 120:
            if not (TESSDATA / "tur.traineddata").is_file():
                method, text = "pending", None
            else:
                ocr_page = page.get_textpage_ocr(language="tur", dpi=200, full=True,
                                                  tessdata=str(TESSDATA))
                method, text = "ocr", page.get_text(textpage=ocr_page, sort=True).strip()
        heading = source["title"]
        elements = ([] if element_kind is None else [{
            "kind": element_kind, "page": page_number,
            "reference": f"pdf-page:{page_number}"}])
        note = {
            "schema_version": 1,
            "note_id": note_id(source, page_number, heading),
            "source": {"catalog_id": catalog_id,
                       "source_code": source["source_code"],
                       "pdf_sha256": source["source_sha256"]},
            "pages": {"start": page_number, "end": page_number},
            "heading_path": [heading],
            "topic": {"code": source["topic_code"], "status":
                      "candidate" if source["topic_code"] else "unverified"},
            "content": {"text": text or None, "method": method if text else "pending",
                        "elements": elements},
            "review": {"status": "needs_review", "version": 1},
        }
        return {"note": note, "metrics": {
            "pdf_text_characters": len(layer_text),
            "extracted_characters": len(text or ""),
            "embedded_image_count": len(page.get_images()),
            "reason": ("formula_or_table_needs_visual_review" if element_kind
                       else "text_needs_source_review") if text else "ocr_required"
        }}


def main():
    rows = [extract(*sample) for sample in SAMPLES]
    print(json.dumps({"schema": "13.02-note-pilot-1", "samples": rows},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
