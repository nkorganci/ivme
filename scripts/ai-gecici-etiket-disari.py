"""Export AI question-type decisions for development without impersonating human review."""

import csv
import importlib.util
import json
from collections import Counter
from pathlib import Path


APP = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("altin_ornek_kuyrugu", APP / "scripts/altin-ornek-kuyrugu.py")
QUEUE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(QUEUE)
OUTPUT = APP / "veri/ai-gecici-etiket-200.csv"
FIELDS = ("question_code", "image_sha256", "taxonomy_version", "question_type_code",
          "reason", "model_digest", "ai_reviewer_id", "review_priority", "decision_origin", "usage_scope",
          "human_review_required")


def build(output=OUTPUT):
    QUEUE.validate_review_file()
    with QUEUE.OUTPUT.open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    allowed = {node["code"] for node in json.loads(QUEUE.TAXONOMY.read_text(encoding="utf-8"))["nodes"]
               if node["kind"] == "QUESTION_TYPE"}
    result = []
    for row in rows:
        if row["ai_question_type_code"] not in allowed or not row["ai_review_evidence"].strip():
            raise ValueError(f"AI etiketi veya gerekçesi eksik: {row['question_code']}")
        result.append({
            "question_code": row["question_code"],
            "image_sha256": row["image_sha256"],
            "taxonomy_version": row["taxonomy_version"],
            "question_type_code": row["ai_question_type_code"],
            "reason": row["ai_review_evidence"],
            "model_digest": row["ai_model_digest"],
            "ai_reviewer_id": row["ai_reviewer_id"],
            "review_priority": row["ai_human_review_priority"],
            "decision_origin": "AI_PROVISIONAL",
            "usage_scope": "DEVELOPMENT_ONLY",
            "human_review_required": "true",
        })
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(".tmp")
    with temporary.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(result)
    temporary.replace(output)
    priorities = Counter(row["review_priority"] for row in result)
    print(f"output={output} records={len(result)} provisional={len(result)} "
          f"human_approved=0 priority={priorities['oncelikli']}")


if __name__ == "__main__":
    build()
