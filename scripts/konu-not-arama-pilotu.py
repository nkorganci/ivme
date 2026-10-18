"""Search 13.02's local draft notes; return 1-3 source-linked passages."""

import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path

import pymupdf


APP = Path(__file__).resolve().parents[1]
CATALOG = APP / "veri/ogm-konu-pdf-katalog/entries"
SOURCE_ROOT = (APP.parent / "kaynaklar/ogm-materyal").resolve()


def fold(value):
    value = unicodedata.normalize("NFKD", value.casefold())
    return "".join(c for c in value if not unicodedata.combining(c))


def digest(path):
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def verify(note):
    if note["schema_version"] != 1:
        raise ValueError("unsupported_note_schema")
    source = note["source"]
    catalog_id = source["catalog_id"]
    catalog = json.loads((CATALOG / f"{catalog_id}.json").read_text(encoding="utf-8"))["result"]
    if (catalog["status"] != "available" or
            source["source_code"] != catalog["source_code"] or
            source["pdf_sha256"] != catalog["source_sha256"]):
        raise ValueError("catalog_version_mismatch")
    relative = catalog["relative_path"]
    part = Path(relative.replace("\\", "/"))
    if part.is_absolute() or ".." in part.parts or part.suffix.lower() != ".pdf":
        raise ValueError("unsafe_pdf_path")
    pdf_path = (SOURCE_ROOT / part).resolve()
    if not pdf_path.is_relative_to(SOURCE_ROOT) or digest(pdf_path) != source["pdf_sha256"]:
        raise ValueError("source_checksum_mismatch")
    with pymupdf.open(pdf_path) as pdf:
        first, last = note["pages"]["start"], note["pages"]["end"]
        if not 1 <= first <= last <= len(pdf) or len(pdf) != catalog["page_count"]:
            raise ValueError("page_out_of_range")
    key = "|".join(map(str, (catalog_id, source["pdf_sha256"], first, last,
                             "/".join(note["heading_path"]))))
    expected = "ogm-note:" + hashlib.sha256(
        unicodedata.normalize("NFC", key).encode("utf-8")).hexdigest()[:32]
    if note["note_id"] != expected:
        raise ValueError("note_id_mismatch")
    return f"/api/topic-pdfs/{catalog_id}/file#page={first}"


def snippet(text, query, width=190):
    compact = " ".join(text.split())
    folded = fold(compact)
    words = [fold(word) for word in re.findall(r"\w+", query) if len(word) > 1]
    positions = [folded.find(word) for word in words if word in folded]
    if not positions:
        return None
    start = max(0, min(positions) - 55)
    end = min(len(compact), start + width)
    return ("…" if start else "") + compact[start:end] + ("…" if end < len(compact) else "")


def search(rows, query, limit=3):
    if not 1 <= limit <= 3:
        raise ValueError("limit_must_be_1_to_3")
    terms = [fold(word) for word in re.findall(r"\w+", query) if len(word) > 1]
    if not terms:
        raise ValueError("query_requires_word")
    found = []
    for row in rows:
        note = row["note"]
        body = note["content"]["text"] or ""
        if not body:
            continue
        passage = snippet(body, query)
        if passage is None:
            continue
        # Source must still be the exact version that produced the note.
        source_url = verify(note)
        folded_body = fold(body)
        score = sum(folded_body.count(term) for term in set(terms))
        found.append((score, note["note_id"], {
            "note_id": note["note_id"],
            "review_status": note["review"]["status"],
            "catalog_id": note["source"]["catalog_id"],
            "pdf_sha256": note["source"]["pdf_sha256"],
            "page": note["pages"]["start"],
            "heading": note["heading_path"],
            "passage": passage,
            "pdf_url": source_url,
        }))
    found.sort(key=lambda item: (-item[0], item[1]))
    return [item[2] for item in found[:limit]]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("query")
    parser.add_argument("--limit", type=int, default=3)
    parser.add_argument("--input", type=Path, default=APP / "veri/pilot-13-02.json")
    args = parser.parse_args()
    rows = json.loads(args.input.read_text(encoding="utf-8"))["samples"]
    print(json.dumps({"query": args.query, "results": search(rows, args.query, args.limit)},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
