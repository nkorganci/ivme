"""Validate a teacher's offline decisions and optionally merge them into the review CSV."""

import argparse
import csv
import importlib.util
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


APP = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("ogretmen_inceleme_paketi", APP / "scripts/ogretmen-inceleme-paketi.py")
PACKAGE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PACKAGE)
QUEUE = PACKAGE.QUEUE


def read_decisions(path, rows):
    data = json.loads(path.read_text(encoding="utf-8"))
    if (data.get("schema") != "ivme-teacher-review-v1"
            or data.get("package_id") != PACKAGE.package_id(rows)
            or not isinstance(data.get("decisions"), list)):
        raise ValueError("Karar dosyasının biçimi veya paket kimliği uyuşmuyor")
    by_code = {row["question_code"]: row for row in rows}
    allowed = {node["code"] for node in json.loads(QUEUE.TAXONOMY.read_text(encoding="utf-8"))["nodes"]
               if node["kind"] == "QUESTION_TYPE"}
    decisions = {}
    for item in data["decisions"]:
        if not isinstance(item, dict):
            raise ValueError("Karar kayıt biçimi geçersiz")
        code = item.get("question_code")
        if code not in by_code or code in decisions or item.get("image_sha256") != by_code[code]["image_sha256"]:
            raise ValueError(f"Soru kodu veya görsel özeti geçersiz: {code}")
        status = item.get("review_status")
        reviewer = item.get("reviewer_id")
        stamp = item.get("reviewed_at_utc")
        label = item.get("reviewed_question_type_code")
        evidence = item.get("review_evidence")
        note = item.get("review_note")
        if (status not in {"approved", "uncertain", "rejected"}
                or not isinstance(reviewer, str) or not reviewer.strip() or len(reviewer) > 80
                or not isinstance(stamp, str)
                or not isinstance(label, str) or not isinstance(evidence, str)
                or not isinstance(note, str) or len(evidence) > 1000 or len(note) > 1000):
            raise ValueError(f"Karar alanları geçersiz: {code}")
        try:
            time = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
        except ValueError as error:
            raise ValueError(f"UTC zaman alanı geçersiz: {code}") from error
        if time.tzinfo is None or time.utcoffset() != timezone.utc.utcoffset(time):
            raise ValueError(f"UTC zaman alanı gerekli: {code}")
        if status == "approved" and (label not in allowed or not evidence.strip()):
            raise ValueError(f"Onay için izinli tip ve gerekçe gerekli: {code}")
        if status != "approved" and (label or evidence or not note.strip()):
            raise ValueError(f"Belirsizlik/ret için neden gerekli: {code}")
        decisions[code] = {
            "reviewer_id": reviewer.strip(), "reviewed_at_utc": time.isoformat(),
            "reviewed_question_type_code": label, "review_evidence": evidence.strip(),
            "review_status": status, "review_note": note.strip(),
        }
    return decisions


def merge(path, queue_path, apply, replace):
    if queue_path == QUEUE.OUTPUT:
        QUEUE.validate_review_file()
    with queue_path.open(encoding="utf-8", newline="") as stream:
        reader = csv.DictReader(stream)
        rows = list(reader)
        if reader.fieldnames != list(QUEUE.FIELDS) or len(rows) != 200:
            raise ValueError("İnceleme CSV biçimi geçersiz")
    decisions = read_decisions(path, rows)
    if not decisions:
        raise ValueError("Karar dosyasında incelenmiş soru yok")
    updated = 0
    for row in rows:
        incoming = decisions.get(row["question_code"])
        if not incoming:
            continue
        existing = {key: row[key] for key in incoming}
        if existing == incoming:
            continue
        if row["review_status"] in {"approved", "uncertain", "rejected"} and not replace:
            raise ValueError(f"Mevcut insan kararı korunuyor: {row['question_code']}; değiştirmek için --replace")
        row.update(incoming)
        updated += 1
    counts = Counter(item["review_status"] for item in decisions.values())
    if apply:
        temporary = queue_path.with_suffix(".teacher.tmp")
        with temporary.open("w", encoding="utf-8", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=QUEUE.FIELDS, lineterminator="\n")
            writer.writeheader()
            writer.writerows(rows)
        temporary.replace(queue_path)
        if queue_path == QUEUE.OUTPUT:
            QUEUE.validate_review_file()
    print(f"mode={'apply' if apply else 'dry-run'} reviewed={len(decisions)}/200 "
          f"approved={counts['approved']} uncertain={counts['uncertain']} "
          f"rejected={counts['rejected']} changed={updated}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path, help="Exported teacher decisions JSON")
    parser.add_argument("--queue", type=Path, default=QUEUE.OUTPUT,
                        help="Review CSV; default is the live 200-question queue")
    parser.add_argument("--apply", action="store_true", help="Write validated decisions to the CSV")
    parser.add_argument("--replace", action="store_true", help="Permit replacing an existing human decision")
    args = parser.parse_args()
    merge(args.file.resolve(), args.queue.resolve(), args.apply, args.replace)
