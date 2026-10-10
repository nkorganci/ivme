"""Check whether a draft hint has current, independently approved sources."""

import argparse
import csv
import hashlib
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path


APP = Path(__file__).resolve().parents[1]
QUEUE = APP / "ornek-veri/altin-ornek-inceleme-200.csv"
NOTES = APP / "veri/pilot-13-02.json"
TAXONOMY = APP / "ornek-veri/taksonomi-tyt-turkce-v1.json"
IMAGE_ROOT = (APP.parent / "veri-hatti/ogm-yks-cikmis/ham").resolve()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def checked_hint(hint_path, queue_path=QUEUE, notes_path=NOTES, taxonomy_path=TAXONOMY):
    hint = json.loads(Path(hint_path).read_text(encoding="utf-8"))
    require(hint.get("schema_version") == 1, "İpucu şema sürümü geçersiz")
    for part, fields in {
        "question": ("code", "image_sha256", "taxonomy_version", "question_type_code"),
        "note": ("note_id", "review_version", "catalog_id", "pdf_sha256", "page"),
        "content": ("pre_answer_hint", "post_submission_explanation"),
        "review": ("status", "version", "reviewer_id", "reviewed_at_utc", "answer_leak_checked"),
    }.items():
        require(isinstance(hint.get(part), dict) and all(key in hint[part] for key in fields),
                f"İpucu {part} alanları eksik")
    question, source, content, review = (hint[key] for key in ("question", "note", "content", "review"))
    require(review["status"] == "approved", "İpucu insan onaylı değil")
    require(isinstance(review["version"], int) and review["version"] >= 1,
            "İpucu inceleme sürümü geçersiz")
    require(isinstance(review["reviewer_id"], str) and review["reviewer_id"].strip(),
            "İpucu inceleyeni eksik")
    require(review["answer_leak_checked"] is True, "Cevap sızıntısı kontrolü eksik")
    require(all(isinstance(content[key], str) and content[key].strip() for key in content),
            "İpucu veya teslim sonrası açıklama eksik")
    require(len(content["pre_answer_hint"]) <= 500 and
            len(content["post_submission_explanation"]) <= 1000, "İpucu metni fazla uzun")
    try:
        reviewed_at = datetime.fromisoformat(review["reviewed_at_utc"].replace("Z", "+00:00"))
    except (AttributeError, ValueError) as error:
        raise ValueError("İpucu onay zamanı geçersiz") from error
    require(reviewed_at.tzinfo is not None and reviewed_at.utcoffset() == timezone.utc.utcoffset(reviewed_at),
            "İpucu onay zamanı UTC olmalı")

    with Path(queue_path).open(encoding="utf-8", newline="") as stream:
        matches = [row for row in csv.DictReader(stream) if row["question_code"] == question["code"]]
    require(len(matches) == 1, "Soru kaynak kuyruğunda tekil değil")
    row = matches[0]
    require(row["review_status"] == "approved" and row["reviewer_id"].strip()
            and row["review_evidence"].strip(), "Soru insan onaylı değil")
    for key, column in (("image_sha256", "image_sha256"),
                        ("taxonomy_version", "taxonomy_version"),
                        ("question_type_code", "reviewed_question_type_code")):
        require(question[key] == row[column], f"Soru {key} güncel insan kararıyla uyuşmuyor")
    image = (IMAGE_ROOT / row["source_image"]).resolve()
    require(image.is_relative_to(IMAGE_ROOT) and image.is_file() and
            hashlib.sha256(image.read_bytes()).hexdigest() == question["image_sha256"],
            "Kaynak soru görseli değişmiş")

    records = json.loads(Path(notes_path).read_text(encoding="utf-8"))
    if isinstance(records, dict) and "samples" in records:
        notes = [sample["note"] for sample in records["samples"]]
    else:
        notes = records
    require(isinstance(notes, list), "Not deposu biçimi geçersiz")
    matches = [note for note in notes if note["note_id"] == source["note_id"]]
    require(len(matches) == 1, "Kaynak not tekil değil")
    note = matches[0]
    require(note["review"]["status"] == "approved" and
            note["topic"]["status"] == "verified" and
            isinstance(note["content"]["text"], str) and note["content"]["text"].strip(),
            "Kaynak not insan onaylı, konu doğrulanmış ve metni dolu olmalı")
    require(note["review"]["version"] == source["review_version"], "Kaynak not sürümü değişmiş")
    for key, value in (("catalog_id", note["source"]["catalog_id"]),
                       ("pdf_sha256", note["source"]["pdf_sha256"])):
        require(source[key] == value, f"Kaynak {key} değişmiş")
    require(isinstance(source["page"], int) and
            note["pages"]["start"] <= source["page"] <= note["pages"]["end"],
            "Kaynak sayfası notun dışında")
    spec = importlib.util.spec_from_file_location("konu_not_arama_pilotu", APP / "scripts/konu-not-arama-pilotu.py")
    passage = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(passage)
    passage.verify(note)
    nodes = {node["code"]: node for node in json.loads(Path(taxonomy_path).read_text(encoding="utf-8"))["nodes"]}
    require(question["question_type_code"] in nodes and
            nodes[question["question_type_code"]]["kind"] == "QUESTION_TYPE",
            "Soru tipi taksonomide yok")
    ancestor = question["question_type_code"]
    ancestors = set()
    while ancestor is not None:
        require(ancestor in nodes and ancestor not in ancestors, "Taksonomi bağı bozuk")
        ancestors.add(ancestor)
        ancestor = nodes[ancestor]["parent"]
    require(note["topic"]["code"] in ancestors, "Notun doğrulanmış konusu soru tipiyle uyuşmuyor")
    return {"hint_id": hint["hint_id"], "question_code": question["code"],
            "note_id": source["note_id"], "source_page": source["page"]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("hint", type=Path)
    parser.add_argument("--queue", type=Path, default=QUEUE)
    parser.add_argument("--notes", type=Path, default=NOTES)
    parser.add_argument("--taxonomy", type=Path, default=TAXONOMY)
    args = parser.parse_args()
    try:
        print(json.dumps(checked_hint(args.hint, args.queue, args.notes, args.taxonomy), ensure_ascii=False))
    except (ValueError, OSError, KeyError) as error:
        parser.exit(1, f"yayın engellendi: {error}\n")
