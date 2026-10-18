"""Check offline package integrity and teacher decision import on temporary files."""

import csv
import importlib.util
import json
import shutil
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path


APP = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


package = load("ogretmen_inceleme_paketi", APP / "scripts/ogretmen-inceleme-paketi.py")
reader = load("ogretmen_inceleme_aktar", APP / "scripts/ogretmen-inceleme-aktar.py")
with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    archive_path = root / "teacher.zip"
    package.build(archive_path)
    with zipfile.ZipFile(archive_path) as archive:
        names = archive.namelist()
        assert len(names) == 202 and names.count("index.html") == 1
        assert sum(name.startswith("images/") for name in names) == 200
        assert b"__PACKAGE_DATA__" not in archive.read("index.html")
    queue_path = root / "review.csv"
    shutil.copyfile(package.QUEUE.OUTPUT, queue_path)
    with queue_path.open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    stamp = datetime.now(timezone.utc).isoformat()
    decisions = [
        {"question_code": rows[0]["question_code"], "image_sha256": rows[0]["image_sha256"],
         "reviewer_id": "turkce-ogretmeni", "reviewed_at_utc": stamp,
         "reviewed_question_type_code": rows[0]["suggested_question_type_code"],
         "review_evidence": "Soru kökündeki anlam ilişkisi", "review_status": "approved",
         "review_note": ""},
        {"question_code": rows[1]["question_code"], "image_sha256": rows[1]["image_sha256"],
         "reviewer_id": "turkce-ogretmeni", "reviewed_at_utc": stamp,
         "reviewed_question_type_code": "", "review_evidence": "",
         "review_status": "uncertain", "review_note": "Tip sınırı belirsiz"},
    ]
    submission = root / "teacher.json"
    submission.write_text(json.dumps({"schema": "ivme-teacher-review-v1",
                                      "package_id": package.package_id(rows),
                                      "decisions": decisions}, ensure_ascii=False), encoding="utf-8")
    reader.merge(submission, queue_path, False, False)
    with queue_path.open(encoding="utf-8", newline="") as stream:
        assert sum(row["review_status"] == "approved" for row in csv.DictReader(stream)) == 0
    reader.merge(submission, queue_path, True, False)
    with queue_path.open(encoding="utf-8", newline="") as stream:
        result = list(csv.DictReader(stream))
    assert sum(row["review_status"] == "approved" for row in result) == 1
    assert sum(row["review_status"] == "uncertain" for row in result) == 1
    assert all(old["ai_question_type_code"] == new["ai_question_type_code"]
               for old, new in zip(rows, result))
    reader.merge(submission, queue_path, True, False)
    decisions[0]["image_sha256"] = "0" * 64
    submission.write_text(json.dumps({"schema": "ivme-teacher-review-v1",
                                      "package_id": package.package_id(rows),
                                      "decisions": decisions}, ensure_ascii=False), encoding="utf-8")
    try:
        reader.read_decisions(submission, result)
        raise AssertionError("Changed image digest was accepted")
    except ValueError:
        pass
print("teacher package PASS: 200 images, offline HTML, dry-run, import, idempotency, checksum rejection")
