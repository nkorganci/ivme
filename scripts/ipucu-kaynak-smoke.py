"""Exercise the hint publication gate with temporary human-approved sources."""

import csv
import importlib.util
import json
import tempfile
from pathlib import Path


APP = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("ipucu_kaynak_denetle", APP / "scripts/ipucu-kaynak-denetle.py")
GATE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GATE)


def fails(hint, queue, notes):
    try:
        GATE.checked_hint(hint, queue, notes)
    except ValueError:
        return
    raise AssertionError("Onaysız veya eskimiş ipucu kabul edildi")


def main():
    with tempfile.TemporaryDirectory() as folder:
        root = Path(folder)
        hint_path, queue_path, notes_path = [root / name for name in ("hint.json", "queue.csv", "notes.json")]
        hint = json.loads((APP / "docs/semalar/kaynakli-ipucu-v1.ornek.json").read_text(encoding="utf-8"))
        with (APP / "ornek-veri/altin-ornek-inceleme-200.csv").open(encoding="utf-8", newline="") as stream:
            reader = csv.DictReader(stream)
            fields, rows = reader.fieldnames, list(reader)
        note = json.loads((APP / "veri/pilot-13-02.json").read_text(encoding="utf-8"))["samples"][0]["note"]

        def write():
            hint_path.write_text(json.dumps(hint, ensure_ascii=False), encoding="utf-8")
            notes_path.write_text(json.dumps([note], ensure_ascii=False), encoding="utf-8")
            with queue_path.open("w", encoding="utf-8", newline="") as stream:
                writer = csv.DictWriter(stream, fieldnames=fields)
                writer.writeheader()
                writer.writerows(rows)

        write()
        fails(hint_path, queue_path, notes_path)
        row = next(item for item in rows if item["question_code"] == hint["question"]["code"])
        row.update(review_status="approved", reviewer_id="ogretmen-ornek",
                   review_evidence="Noktalama işareti kullanımı soruluyor.",
                   reviewed_question_type_code=hint["question"]["question_type_code"])
        note["review"]["status"] = "approved"
        note["topic"]["status"] = "verified"
        hint["review"].update(status="approved", reviewer_id="editor-ornek",
                              reviewed_at_utc="2026-10-09T12:00:00Z", answer_leak_checked=True)
        hint["content"].update(pre_answer_hint="Noktalama işaretinin cümledeki görevini düşün.",
                               post_submission_explanation="Kuralı ilgili ders notunun ilk sayfasında karşılaştır.")
        write()
        assert GATE.checked_hint(hint_path, queue_path, notes_path)["source_page"] == 1

        hint["note"]["review_version"] += 1
        write()
        fails(hint_path, queue_path, notes_path)
        hint["note"]["review_version"] -= 1
        row["image_sha256"] = "0" * 64
        write()
        fails(hint_path, queue_path, notes_path)
        row["image_sha256"] = hint["question"]["image_sha256"]
        hint["review"]["answer_leak_checked"] = False
        write()
        fails(hint_path, queue_path, notes_path)
    print("ipucu kaynak kapisi: olumlu yol ve uc ret gecti")


if __name__ == "__main__":
    main()
