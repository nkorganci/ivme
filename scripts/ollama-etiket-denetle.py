"""Validate a saved Ollama draft batch and report measurable pilot totals."""

import argparse
import csv
import hashlib
import importlib.util
import json
from collections import Counter
from pathlib import Path


APP = Path(__file__).resolve().parents[1]
QUEUE = APP / "ornek-veri/altin-ornek-inceleme-200.csv"
TAXONOMY = APP / "ornek-veri/taksonomi-tyt-turkce-v1.json"


def validate(path):
    with QUEUE.open(encoding="utf-8", newline="") as stream:
        sources = {row["question_code"]: row for row in csv.DictReader(stream)}
    taxonomy = json.loads(TAXONOMY.read_text(encoding="utf-8"))
    allowed = {node["code"] for node in taxonomy["nodes"]
               if node["kind"] == "QUESTION_TYPE"}
    data = json.loads(path.read_text(encoding="utf-8"))
    run = data["run"]
    assert data["schema_version"] == 1 and run["status"] == "draft"
    assert run["source"] == "local Ollama vision"
    assert run["taxonomy_version"] == "tyt-turkce-v1"
    assert len(run["model_version"]) == 64
    assert all(char in "0123456789abcdef" for char in run["model_version"])
    assert len(run["prompt_sha256"]) == 64
    assert run["prompt_version"] and run["model_family"]
    spec = importlib.util.spec_from_file_location("ollama_etiket_pilotu", APP / "scripts/ollama-etiket-pilotu.py")
    pilot = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(pilot)
    _, _, _, prompt_hash, request_hash = pilot.build_spec()
    assert run["prompt_sha256"] == prompt_hash
    assert run["request_sha256"] == request_hash
    seen = set()
    topics = Counter()
    for item in data["drafts"]:
        code = item["question_code"]
        assert code not in seen and code in sources
        seen.add(code)
        source = sources[code]
        topics[source["source_topic"]] += 1
        image_root = (APP.parent / "veri-hatti/ogm-yks-cikmis/ham").resolve()
        image = (image_root / source["source_image"]).resolve()
        assert image.is_relative_to(image_root) and image.is_file()
        assert hashlib.sha256(image.read_bytes()).hexdigest() == item["image_sha256"]
        assert item["image_sha256"] == source["image_sha256"]
        confidence = item["confidence"]
        assert type(confidence) in (float, int) and 0 <= confidence <= 1
        assert isinstance(item["evidence"], str) and item["evidence"].strip()
        assert isinstance(item["abstain"], bool)
        if item["abstain"]:
            assert item["question_type_code"] is None
        else:
            assert item["question_type_code"] in allowed
        reasons = []
        if item["abstain"]:
            reasons.append("abstain")
        if confidence < 0.65:
            reasons.append("low_confidence")
        if item["question_type_code"] and item["question_type_code"] != source["suggested_question_type_code"]:
            reasons.append("source_topic_conflict")
        assert item["review_reasons"] == reasons
        assert all(type(item[key]) is int and item[key] >= 0 for key in
                   ("prompt_tokens", "output_tokens", "total_duration_ns"))
    assert not set(error["question_code"] for error in data["errors"]) & seen
    print(f"PASS: drafts={len(seen)}, errors={len(data['errors'])}, topics={len(topics)}, "
          f"conflicts={sum('source_topic_conflict' in item['review_reasons'] for item in data['drafts'])}, "
          f"abstain={sum(item['abstain'] for item in data['drafts'])}, "
          f"tokens={sum(item['prompt_tokens'] for item in data['drafts'])}/"
          f"{sum(item['output_tokens'] for item in data['drafts'])}, "
          f"model_time_s={sum(item['total_duration_ns'] for item in data['drafts']) / 1e9:.1f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path)
    args = parser.parse_args()
    validate(args.file)
