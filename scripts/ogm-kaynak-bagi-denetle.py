"""Read-only OGM source identity and page-text evidence audit.

Use --sample for a small cross-family check or --all --limit N --resume to scale.
Outputs stay below ignored uygulama/veri/ogm-kaynak-bagi.
"""

import argparse
import hashlib
import json
import os
import re
import unicodedata
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path

import pymupdf


APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
SOURCE_ROOT = ROOT / "kaynaklar/ogm-materyal"
CARD_ROOT = ROOT / "veri-hatti/ogm-sorular/kayit"
CATALOG = ROOT / "veri-hatti/ogm-indirme/katalog.json"
SB_CATALOG = ROOT / "veri-hatti/ogm-indirme/sb_katalog.json"
TAXONOMY = APP / "ornek-veri/taksonomi-tyt-turkce-v1.json"
OUTPUT = APP / "veri/ogm-kaynak-bagi"
SAMPLE = (
    "3a-tyt-turkce.json", "dd-tyt-turkce.json", "mt-tyt-turkce.json",
    "yk-turk-dili-ve-edebiyati-tyt-test-01.json", "mn-test-01.json",
)


@lru_cache(maxsize=256)
def digest(path, size, mtime_ns):
    hash_value = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            hash_value.update(block)
    return hash_value.hexdigest()


def sha256(path):
    stat = path.stat()
    return digest(path, stat.st_size, stat.st_mtime_ns)


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    try:
        temporary.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                        indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def relative_pdf(path_text):
    parts = Path(path_text.replace("\\", "/"))
    if parts.is_absolute() or ".." in parts.parts or parts.suffix.lower() != ".pdf":
        raise ValueError("unsafe_or_non_pdf_source_path")
    candidate = (SOURCE_ROOT / parts).resolve()
    if not candidate.is_relative_to(SOURCE_ROOT.resolve()):
        raise ValueError("source_path_outside_root")
    return candidate


def compact_text(value):
    return "".join(character for character in unicodedata.normalize(
        "NFKD", (value or "").casefold()) if character.isalpha())


def header_topic(header, mappings):
    cleaned = re.sub(r"\s+-\s*\d+\s*$", "", header or "").strip()
    return mappings.get(cleaned)


def page_evidence(pdf, question, topic_map, is_tyt_turkish):
    code = question.get("id")
    page = question.get("sayfa")
    text = compact_text(question.get("metin"))
    evidence = {"question_code": code, "page": page, "text_prefix_chars": 60,
                "page_text_match": False, "topic_code": None,
                "topic_evidence": None, "review_reasons": []}
    if not isinstance(page, int) or not 1 <= page <= len(pdf):
        evidence["review_reasons"].append("invalid_page")
    elif len(text) < 60:
        evidence["review_reasons"].append("question_text_too_short")
    else:
        found = text[:60] in compact_text(pdf[page - 1].get_text("text"))
        evidence["page_text_match"] = found
        if not found:
            evidence["review_reasons"].append("page_text_unverified")
    if is_tyt_turkish and evidence["page_text_match"]:
        evidence["topic_code"] = header_topic(question.get("konu_basligi"), topic_map)
        if evidence["topic_code"]:
            evidence["topic_evidence"] = "source_header_and_pdf_page_text"
    if not evidence["topic_code"]:
        evidence["review_reasons"].append("topic_identity_unverified")
    return evidence


def inspect(card_file, index, topic_map, catalog_sha, taxonomy_sha, script_sha,
            full=True):
    card = json.loads(card_file.read_text(encoding="utf-8"))
    source_name = card["dosya"].replace("\\", "/")
    candidates = index.get(source_name, [])
    source_path = relative_pdf(source_name)
    source_sha = sha256(source_path)
    input_data = {"script": script_sha, "catalog": catalog_sha,
                  "taxonomy": taxonomy_sha, "card": sha256(card_file),
                  "source": source_sha}
    fingerprint = hashlib.sha256(json.dumps(input_data, sort_keys=True).encode()).hexdigest()
    if not full:
        return fingerprint, None
    source_code = "ogm:" + hashlib.sha256(source_name.encode("utf-8")).hexdigest()[:16]
    reasons = []
    if len(candidates) == 0:
        reasons.append("source_not_in_download_catalog")
    elif len(candidates) > 1:
        reasons.append("source_catalog_ambiguous")
    if not card["kayitlar"]:
        reasons.append("no_question_records")
    ids = [item["id"] for item in card["kayitlar"]]
    if len(ids) != len(set(ids)):
        reasons.append("duplicate_question_ids")
    catalog_entry = candidates[0] if len(candidates) == 1 else None
    is_tyt_turkish = bool(catalog_entry and catalog_entry.get("sinav") == "TYT"
                          and catalog_entry.get("ders") == "turkce")
    sample = []
    with pymupdf.open(source_path) as pdf:
        for question in card["kayitlar"][:2]:
            sample.append(page_evidence(pdf, question, topic_map, is_tyt_turkish))
    result = {"source_code": source_code, "source_path": source_name,
              "source_sha256": source_sha, "card_file": card_file.name,
              "card_sha256": sha256(card_file), "catalog_ids": [x["id"] for x in candidates],
              "question_count": len(ids), "question_ids": ids,
              "sample_evidence": sample, "review_reasons": reasons}
    return fingerprint, result


def run(mode, limit, resume):
    if limit < 1:
        raise ValueError("limit must be positive")
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    index = defaultdict(list)
    for item in catalog:
        if item.get("dosya"):
            index[item["dosya"].replace("\\", "/")].append(item)
    taxonomy = json.loads(TAXONOMY.read_text(encoding="utf-8"))
    nodes = {node["code"]: node for node in taxonomy["nodes"]}
    topic_map = {}
    for mapping in taxonomy["source_topic_mappings"]:
        skill = nodes[mapping["question_type"]]["parent"]
        topic_map[mapping["source_topic"]] = nodes[skill]["parent"]
    selected = ([CARD_ROOT / name for name in SAMPLE] if mode == "sample" else
                sorted(path for path in CARD_ROOT.glob("*.json") if path.name != "sb.json")[:limit])
    stats = Counter()
    code_owner = {}
    duplicate_codes = []
    for card_file in selected:
        code = card_file.stem
        if not re.fullmatch(r"[a-zA-Z0-9_-]+", code):
            raise ValueError("unsafe card filename")
        destination = OUTPUT / "sources" / f"{code}.json"
        error_file = OUTPUT / "errors" / f"{code}.json"
        try:
            inputs = (card_file, index, topic_map, sha256(CATALOG),
                      sha256(TAXONOMY), sha256(Path(__file__)))
            fingerprint, _ = inspect(*inputs, full=False)
            if resume and destination.is_file():
                try:
                    old = json.loads(destination.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    old = {}
                if old.get("input_fingerprint") == fingerprint:
                    result = old["result"]
                    stats["skipped"] += 1
                else:
                    _, result = inspect(*inputs)
                    atomic_json(destination, {"input_fingerprint": fingerprint,
                                              "result": result})
                    stats["processed"] += 1
            else:
                _, result = inspect(*inputs)
                atomic_json(destination, {"input_fingerprint": fingerprint,
                                          "result": result})
                stats["processed"] += 1
            error_file.unlink(missing_ok=True)
            stats["question_count"] += result["question_count"]
            stats["page_text_matches"] += sum(x["page_text_match"] for x in result["sample_evidence"])
            stats["topic_matches"] += sum(x["topic_code"] is not None for x in result["sample_evidence"])
            for reason in result["review_reasons"]:
                stats[reason] += 1
            for evidence in result["sample_evidence"]:
                for reason in evidence["review_reasons"]:
                    stats[f"sample_{reason}"] += 1
            for question_code in result["question_ids"]:
                if question_code in code_owner:
                    duplicate_codes.append(question_code)
                else:
                    code_owner[question_code] = code
        except (OSError, ValueError, KeyError, IndexError, RuntimeError) as exc:
            destination.unlink(missing_ok=True)
            atomic_json(error_file, {"card_file": card_file.name,
                                     "error_type": type(exc).__name__,
                                     "message": str(exc)[:500]})
            stats["errors"] += 1
    sb_cards = json.loads((CARD_ROOT / "sb.json").read_text(encoding="utf-8"))
    sb_sources = json.loads(SB_CATALOG.read_text(encoding="utf-8"))
    sb_groups = defaultdict(list)
    for card in sb_cards:
        key = (card.get("ders_kod"), card.get("sinif"), card.get("unite_no"))
        sb_groups[key].append(card["id"])
    sb_review = {"schema": "12.05-sb-review-1",
                 "card_catalog_sha256": sha256(CARD_ROOT / "sb.json"),
                 "generated_pdf_catalog_sha256": sha256(SB_CATALOG),
                 "reason": "per_card_pdf_path_missing",
                 "groups": [{"subject": key[0], "grade": key[1],
                             "unit_number": key[2], "question_count": len(ids),
                             "sample_question_ids": ids[:5],
                             "status": "needs_source_link"}
                            for key, ids in sorted(sb_groups.items())]}
    atomic_json(OUTPUT / "sb_review_groups.json", sb_review)
    summary = {"schema": "12.05-source-audit-1", "mode": mode, "selected": len(selected),
               "download_catalog_entries": len(catalog),
               "regular_card_files": len(list(CARD_ROOT.glob("*.json"))) - 1,
               "sb_question_cards_without_pdf_path": len(sb_cards),
               "sb_generated_pdf_catalog_entries": len(sb_sources),
               "sb_review_groups": len(sb_groups),
               "cross_source_duplicate_question_codes": duplicate_codes[:20],
               "stats": dict(sorted(stats.items()))}
    atomic_json(OUTPUT / "summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    return 1 if stats["errors"] else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--sample", action="store_true")
    group.add_argument("--all", action="store_true")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--resume", action="store_true")
    options = parser.parse_args()
    raise SystemExit(run("sample" if options.sample else "all", options.limit, options.resume))


if __name__ == "__main__":
    main()
