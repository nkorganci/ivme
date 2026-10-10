"""Validate the seven offline AI draft labels against the fixed source queue."""

import csv
import json
from collections import Counter
from pathlib import Path


APP = Path(__file__).resolve().parents[1]
QUEUE = APP / "ornek-veri/altin-ornek-inceleme-200.csv"
DRAFTS = APP / "ornek-veri/ai-etiket-pilot-7.json"
TAXONOMY = APP / "ornek-veri/taksonomi-tyt-turkce-v1.json"


def validate():
    with QUEUE.open(encoding="utf-8", newline="") as stream:
        questions = {row["question_code"]: row for row in csv.DictReader(stream)}
    taxonomy = json.loads(TAXONOMY.read_text(encoding="utf-8"))
    allowed = {node["code"] for node in taxonomy["nodes"]
               if node["kind"] == "QUESTION_TYPE"}
    data = json.loads(DRAFTS.read_text(encoding="utf-8"))
    assert data["schema_version"] == 1
    run = data["run"]
    assert run["id"] and run["model_family"] and run["prompt_version"]
    assert run["taxonomy_version"] == "tyt-turkce-v1"
    assert run["status"] == "draft"
    drafts = data["drafts"]
    assert len(drafts) == 7
    assert len({item["question_code"] for item in drafts}) == len(drafts)
    topics = Counter()
    for item in drafts:
        source = questions[item["question_code"]]
        topics[source["source_topic"]] += 1
        assert item["image_sha256"] == source["image_sha256"]
        assert isinstance(item["confidence"], (float, int)) and 0 <= item["confidence"] <= 1
        assert item["evidence"].strip()
        if item["abstain"]:
            assert item["question_type_code"] is None
        else:
            assert item["question_type_code"] in allowed
        assert item["confidence"] < 0.6 or not item["abstain"]
    assert len(topics) == 7 and all(count == 1 for count in topics.values())
    print(f"AI draft pilot PASS: {len(drafts)} questions, {len(topics)} source topics, "
          f"{sum(item['abstain'] for item in drafts)} abstain, 0 human approvals from this file")


if __name__ == "__main__":
    validate()
