"""Attach validated local AI drafts to the review CSV without creating human approvals."""

import argparse
import csv
import importlib.util
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


APP = Path(__file__).resolve().parents[1]


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


QUEUE = load_module("altin_ornek_kuyrugu", APP / "scripts/altin-ornek-kuyrugu.py")
AUDIT = load_module("ollama_etiket_denetle", APP / "scripts/ollama-etiket-denetle.py")


def attach(draft_path, queue_path):
    AUDIT.validate(draft_path)
    import json
    data = json.loads(draft_path.read_text(encoding="utf-8"))
    if data["run"]["model_family"] != "qwen3.5:4b":
        raise ValueError("Bu CSV incelemesi qwen3.5:4b modeline ait olmalı")
    drafts = {item["question_code"]: item for item in data["drafts"]}
    errors = {item["question_code"]: item for item in data["errors"]}
    with queue_path.open(encoding="utf-8", newline="") as stream:
        reader = csv.DictReader(stream)
        rows = list(reader)
        if reader.fieldnames != list(QUEUE.FIELDS[:15]) and reader.fieldnames != list(QUEUE.FIELDS):
            raise ValueError("İnceleme CSV sütunları beklenenden farklı")
    if len(rows) != 200 or len(drafts) + len(errors) != 200:
        raise ValueError("200 sorunun tamamı için AI sonucu veya hata kaydı gerekli")
    if set(drafts) | set(errors) != {row["question_code"] for row in rows}:
        raise ValueError("AI sonucu ile inceleme kuyruğu eşleşmiyor")
    now = datetime.now(timezone.utc).isoformat()
    counts = Counter()
    for row in rows:
        code = row["question_code"]
        item = drafts.get(code)
        reasons = item["review_reasons"] if item else ["model_error"]
        if code == "TYT-0100":
            reasons = list(reasons) + ["pilot_evidence_polarity_error"]
        if code in {"TYT-0118", "TYT-0199"}:
            reasons = list(reasons) + ["taxonomy_boundary_unclear"]
        priority = "oncelikli" if reasons else "normal"
        if item is None:
            note = "AI çıktı hatası; insan incelemesi gerekiyor. " + errors[code]["error"][:300]
        elif reasons:
            labels = {
                "source_topic_conflict": "AI tipi kaynak konu önerisiyle çelişiyor",
                "abstain": "AI etiket seçemedi",
                "low_confidence": "AI güven beyanı düşük",
                "pilot_evidence_polarity_error": "Pilot denetimde gerekçenin soru yönünü ters anlattığı görüldü",
                "taxonomy_boundary_unclear": "Anlatım özelliği sorusunda mevcut tip sınırı açık değil",
            }
            note = "; ".join(labels[reason] for reason in reasons) + ". İnsan incelemesi gerekiyor."
        else:
            note = "AI tipi kaynak konu önerisiyle uyumlu; gerekçe bağımsız doğrulanmadı. Altın etiket için insan incelemesi gerekiyor."
        row.update(
            ai_reviewer_id="qwen3.5:4b (AI taslağı)",
            ai_model_digest=data["run"]["model_version"],
            ai_reviewed_at_utc=now,
            ai_question_type_code=item["question_type_code"] or "" if item else "",
            ai_confidence=str(item["confidence"]) if item else "",
            ai_review_evidence=item["evidence"] if item else "",
            ai_review_note=note,
            ai_human_review_priority=priority,
        )
        counts[priority] += 1
    temporary = queue_path.with_suffix(".ai.tmp")
    with temporary.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=QUEUE.FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    temporary.replace(queue_path)
    if queue_path == QUEUE.OUTPUT:
        QUEUE.validate_review_file()
    print(f"AI rows={len(rows)} priority={counts['oncelikli']} normal={counts['normal']} "
          f"human approved={sum(row['review_status'] == 'approved' for row in rows)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("draft_file", type=Path)
    parser.add_argument("--queue", type=Path, default=QUEUE.OUTPUT)
    args = parser.parse_args()
    attach(args.draft_file.resolve(), args.queue.resolve())
