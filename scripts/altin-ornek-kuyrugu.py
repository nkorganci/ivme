"""Build, provisionally accept, or validate the offline 14.01 review queue."""

import argparse
import csv
import hashlib
import io
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


APP = Path(__file__).resolve().parents[1]
SOURCE_ROOT = APP.parent / "veri-hatti/ogm-yks-cikmis/ham"
CATALOG = SOURCE_ROOT / "sorular_son.json"
TAXONOMY = APP / "ornek-veri/taksonomi-tyt-turkce-v1.json"
OUTPUT = APP / "ornek-veri/altin-ornek-inceleme-200.csv"
QUOTAS = {
    "Paragrafta Anlam": 62,
    "Paragrafın Yapısı": 32,
    "Sözcükte Anlam": 30,
    "Cümlede Anlam": 28,
    "Yazım Kuralları": 18,
    "Noktalama İşaretleri": 18,
    "Cümlenin Ögeleri": 12,
}
FIELDS = (
    "question_code", "source_topic", "source_year", "source_image",
    "image_sha256", "taxonomy_version", "allowed_question_type_codes",
    "suggested_question_type_code", "suggestion_basis", "reviewer_id",
    "reviewed_at_utc", "reviewed_question_type_code", "review_evidence",
    "review_status", "review_note",
    "ai_reviewer_id", "ai_model_digest", "ai_reviewed_at_utc",
    "ai_question_type_code", "ai_confidence", "ai_review_evidence",
    "ai_review_note", "ai_human_review_priority",
)


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def render():
    taxonomy = json.loads(TAXONOMY.read_text(encoding="utf-8"))
    nodes = {node["code"]: node for node in taxonomy["nodes"]}
    allowed = sorted(code for code, node in nodes.items()
                     if node["kind"] == "QUESTION_TYPE")
    mappings = {item["source_topic"]: item["question_type"]
                for item in taxonomy["source_topic_mappings"]}
    assert set(QUOTAS) == set(mappings)
    assert sum(QUOTAS.values()) == 200
    assert all(code in allowed for code in mappings.values())
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))["sorular"]
    by_topic = defaultdict(lambda: defaultdict(list))
    for record in catalog:
        topic = record.get("konu")
        if record.get("exam_ders") != "Türkçe" or topic not in QUOTAS:
            continue
        if len(record.get("cevaplar", [])) != 1 or record["cevaplar"][0] not in "ABCDE":
            continue
        image = SOURCE_ROOT / record["gorsel"]
        if not image.is_file() or not image.resolve().is_relative_to(SOURCE_ROOT.resolve()):
            continue
        by_topic[topic][record["yil"]].append(record)

    rows = []
    for topic, quota in QUOTAS.items():
        by_year = by_topic[topic]
        for records in by_year.values():
            records.sort(key=lambda record: record["id"])
        selected = []
        while len(selected) < quota and any(by_year.values()):
            for year in sorted(by_year):
                if by_year[year] and len(selected) < quota:
                    selected.append(by_year[year].pop(0))
        assert len(selected) == quota, f"too few eligible questions: {topic}"
        for record in selected:
            image = SOURCE_ROOT / record["gorsel"]
            rows.append({
                "question_code": record["id"],
                "source_topic": topic,
                "source_year": record["yil"],
                "source_image": record["gorsel"].replace("\\", "/"),
                "image_sha256": sha256(image),
                "taxonomy_version": "tyt-turkce-v1",
                "allowed_question_type_codes": "|".join(allowed),
                "suggested_question_type_code": mappings[topic],
                "suggestion_basis": "source_topic_only",
                "reviewer_id": "",
                "reviewed_at_utc": "",
                "reviewed_question_type_code": "",
                "review_evidence": "",
                "review_status": "pending",
                "review_note": "",
                "ai_reviewer_id": "",
                "ai_model_digest": "",
                "ai_reviewed_at_utc": "",
                "ai_question_type_code": "",
                "ai_confidence": "",
                "ai_review_evidence": "",
                "ai_review_note": "",
                "ai_human_review_priority": "",
            })
    assert len(rows) == 200 and len({row["question_code"] for row in rows}) == 200
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=FIELDS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def validate_review_file():
    with OUTPUT.open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    assert len(rows) == 200
    assert len({row["question_code"] for row in rows}) == 200
    assert Counter(row["source_topic"] for row in rows) == Counter(QUOTAS)
    allowed = {node["code"] for node in json.loads(TAXONOMY.read_text(encoding="utf-8"))["nodes"]
               if node["kind"] == "QUESTION_TYPE"}
    approved = 0
    provisional = 0
    for row in rows:
        image = SOURCE_ROOT / row["source_image"]
        assert image.is_file() and image.resolve().is_relative_to(SOURCE_ROOT.resolve())
        assert sha256(image) == row["image_sha256"], row["question_code"]
        assert row["taxonomy_version"] == "tyt-turkce-v1"
        assert set(row["allowed_question_type_codes"].split("|")) == allowed
        assert row["suggested_question_type_code"] in allowed
        status = row["review_status"]
        assert status in {"pending", "provisional", "approved", "rejected", "uncertain"}
        if status == "approved":
            assert row["reviewed_question_type_code"] in allowed
            assert all(row[key].strip() for key in
                       ("reviewer_id", "reviewed_at_utc", "review_evidence"))
            assert datetime.fromisoformat(row["reviewed_at_utc"]).tzinfo == timezone.utc
            approved += 1
        elif status == "pending":
            assert not any(row[key].strip() for key in
                           ("reviewer_id", "reviewed_at_utc", "reviewed_question_type_code", "review_evidence"))
        elif status == "provisional":
            assert not any(row[key].strip() for key in
                           ("reviewer_id", "reviewed_at_utc", "reviewed_question_type_code", "review_evidence"))
            assert row["review_note"] == "Pilot use accepted by user; per-question human review pending"
            provisional += 1
        else:
            assert row["reviewer_id"].strip() and row["reviewed_at_utc"].strip()
            assert datetime.fromisoformat(row["reviewed_at_utc"]).tzinfo == timezone.utc
            assert row["review_note"].strip()
        if row["ai_reviewer_id"]:
            assert row["ai_reviewer_id"] in {"qwen3.5:4b (AI taslağı)",
                                              "qwen3.5:4b (AI taslağı v2)",
                                              "Codex AI QA + qwen3.5:4b (taslak v2)"}
            assert len(row["ai_model_digest"]) == 64
            assert datetime.fromisoformat(row["ai_reviewed_at_utc"]).tzinfo == timezone.utc
            assert row["ai_human_review_priority"] in {"normal", "oncelikli"}
            assert row["ai_review_note"].strip()
            if row["ai_question_type_code"]:
                assert row["ai_question_type_code"] in allowed
                assert 0 <= float(row["ai_confidence"]) <= 1
                assert row["ai_review_evidence"].strip()
        else:
            assert not any(row[key] for key in FIELDS[15:])
    print(f"review queue PASS: 200 unique; human approved={approved}; provisional={provisional}; pending={sum(r['review_status'] == 'pending' for r in rows)}")


def provisionally_accept():
    with OUTPUT.open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    assert len(rows) == 200 and all(row["review_status"] == "pending" for row in rows), \
        "provisional acceptance requires 200 untouched pending rows"
    for row in rows:
        row["review_status"] = "provisional"
        row["review_note"] = "Pilot use accepted by user; per-question human review pending"
    with OUTPUT.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    validate_review_file()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--provisional", action="store_true")
    args = parser.parse_args()
    if args.write:
        OUTPUT.write_text(render(), encoding="utf-8", newline="")
    elif args.provisional:
        provisionally_accept()
    else:
        # Source-derived columns must remain reproducible; reviewer columns may change.
        expected = list(csv.DictReader(io.StringIO(render())))
        with OUTPUT.open(encoding="utf-8", newline="") as stream:
            actual = list(csv.DictReader(stream))
        assert len(actual) == len(expected)
        source_fields = FIELDS[:10]
        for candidate, row in zip(expected, actual):
            assert all(candidate[key] == row[key] for key in source_fields), row["question_code"]
        validate_review_file()
    print(f"queue mode={'write' if args.write else 'provisional' if args.provisional else 'check'}")


if __name__ == "__main__":
    main()
