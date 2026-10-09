"""Build a read-only, resumable OGM topic-PDF metadata catalog."""

import argparse
import hashlib
import json
import os
import re
import unicodedata
from collections import Counter
from functools import lru_cache
from pathlib import Path

import pymupdf


APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
SOURCE_ROOT = ROOT / "kaynaklar/ogm-materyal"
CATALOG = ROOT / "veri-hatti/ogm-indirme/katalog.json"
TAXONOMY = APP / "ornek-veri/taksonomi-tyt-turkce-v1.json"
OUTPUT = APP / "veri/ogm-konu-pdf-katalog"
KINDS = {"MEBİ Konu Özeti": "mebi_summary",
         "Konu Anlatımı (Video + PDF)": "video_notes"}


def kind_for(source):
    name = source["kaynak"]
    if name in KINDS:
        return KINDS[name]
    if name.startswith("Konu Özetleri ("):
        return "topic_summary"
    if name.startswith("Ders Anlatım Sunuları ("):
        return "presentation"
    return None


@lru_cache(maxsize=256)
def _digest(path, size, mtime_ns):
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def sha256(path):
    stat = path.stat()
    return _digest(path, stat.st_size, stat.st_mtime_ns)


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    try:
        temporary.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                        indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def source_path(relative):
    value = Path(relative.replace("\\", "/"))
    if value.is_absolute() or ".." in value.parts or value.suffix.lower() != ".pdf":
        raise ValueError("unsafe_or_non_pdf_source_path")
    path = (SOURCE_ROOT / value).resolve()
    if not path.is_relative_to(SOURCE_ROOT.resolve()):
        raise ValueError("source_path_outside_root")
    return path


def normalized(value):
    value = unicodedata.normalize("NFKD", value.casefold())
    return " ".join("".join(character if character.isalnum() else " "
                    for character in value if not unicodedata.combining(character)).split())


def topic_map():
    taxonomy = json.loads(TAXONOMY.read_text(encoding="utf-8"))
    nodes = {item["code"]: item for item in taxonomy["nodes"]}
    result = {}
    for item in taxonomy["source_topic_mappings"]:
        skill = nodes[item["question_type"]]["parent"]
        result[normalized(item["source_topic"])] = nodes[skill]["parent"]
    return result


def row(source, kind, topics, source_sha, page_count):
    relative = (source.get("dosya") or "").replace("\\", "/")
    grade_match = re.search(r"\((\d+)\. Sınıf\)", source["kaynak"])
    grade = int(grade_match.group(1)) if grade_match else None
    title = source["baslik"]
    title_key = re.sub(r"\s+\d+$", "", normalized(title))
    topic_code = (topics.get(title_key) if source["ders"] == "turkce"
                  and source["sinav"] == "TYT" else None)
    status = ("video_only" if not relative else
              "missing_file" if source_sha is None else "available")
    return {"source_code": "ogm:" + hashlib.sha256(relative.encode("utf-8")).hexdigest()[:16]
            if relative else f"ogm:catalog:{source['id']}",
            "catalog_id": source["id"], "kind": kind, "grade": grade,
            "exam": source["sinav"], "subject": source["ders"],
            "title": title, "topic_code": topic_code,
            "topic_status": "candidate_title_match" if topic_code else "unverified",
            "relative_path": relative or None, "source_sha256": source_sha,
            "page_count": page_count, "status": status}


def process(source, kind, topics, script_sha, resume):
    relative = source.get("dosya")
    path = source_path(relative) if relative else None
    file_sha = sha256(path) if path and path.is_file() else None
    file_size = path.stat().st_size if path and path.is_file() else None
    inputs = {"script_sha256": script_sha, "source": source,
              "file_sha256": file_sha, "file_size": file_size,
              "taxonomy_sha256": sha256(TAXONOMY)}
    fingerprint = hashlib.sha256(json.dumps(inputs, ensure_ascii=False,
                                      sort_keys=True).encode("utf-8")).hexdigest()
    destination = OUTPUT / "entries" / f"{source['id']}.json"
    if resume and destination.is_file():
        try:
            old = json.loads(destination.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            old = {}
        if old.get("input_fingerprint") == fingerprint:
            return "skipped", old["result"]
    page_count = None
    if file_sha:
        with pymupdf.open(path) as pdf:
            page_count = len(pdf)
            if page_count < 1:
                raise ValueError("empty_pdf")
    result = row(source, kind, topics, file_sha, page_count)
    if file_size is not None:
        result["size_bytes"] = file_size
    atomic_json(destination, {"input_fingerprint": fingerprint, "result": result})
    return "processed", result


def run(sample, limit, resume):
    if limit < 1:
        raise ValueError("limit must be positive")
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    eligible = [(item, kind_for(item)) for item in catalog if kind_for(item)]
    if sample:
        selected = []
        for kind in ("mebi_summary", "video_notes", "topic_summary", "presentation"):
            selected.append(next(pair for pair in eligible
                                 if pair[1] == kind and pair[0].get("dosya")))
        selected.append(next(pair for pair in eligible if not pair[0].get("dosya")))
        selected.append(next(pair for pair in eligible if pair[0]["id"] == 2088))
    else:
        selected = eligible[:limit]
    topics = topic_map()
    script_sha = sha256(Path(__file__))
    counts = Counter()
    errors = []
    for source, kind in selected:
        destination = OUTPUT / "entries" / f"{source['id']}.json"
        try:
            action, result = process(source, kind, topics, script_sha, resume)
            counts[action] += 1
            counts[f"kind_{kind}"] += 1
            counts[f"status_{result['status']}"] += 1
            if result["topic_code"]:
                counts["topic_candidates"] += 1
        except (OSError, ValueError, KeyError, RuntimeError) as exc:
            destination.unlink(missing_ok=True)
            error = {"catalog_id": source["id"], "error_type": type(exc).__name__,
                     "message": str(exc)[:500]}
            atomic_json(OUTPUT / "errors" / f"{source['id']}.json", error)
            errors.append(error)
    summary = {"schema": "13.04-topic-pdf-1", "mode": "sample" if sample else "batch",
               "eligible_entries": len(eligible), "selected": len(selected),
               "counts": dict(sorted(counts.items())), "errors": errors[:20]}
    atomic_json(OUTPUT / "summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    return 1 if errors else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", action="store_true")
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--resume", action="store_true")
    options = parser.parse_args()
    raise SystemExit(run(options.sample, options.limit, options.resume))


if __name__ == "__main__":
    main()
