"""Build/check a deterministic, proposed 50-question TYT Turkish taxonomy sample."""

import argparse
import csv
import io
import json
from collections import defaultdict
from pathlib import Path


APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
TAXONOMY = APP / "ornek-veri/taksonomi-tyt-turkce-v1.json"
CATALOG = ROOT / "veri-hatti/ogm-yks-cikmis/ham/sorular_son.json"
OUTPUT = APP / "ornek-veri/turkce-taksonomi-ornek-50.csv"
FIELDS = ("question_code", "exam_code", "subject_code", "topic_code",
          "subtopic_code", "skill_code", "question_type_code", "source_topic",
          "source_year", "source_image", "label_status", "review_reason")
PARENT_KIND = {"SUBJECT": "EXAM", "TOPIC": "SUBJECT", "SUBTOPIC": "TOPIC",
               "SKILL": "SUBTOPIC", "QUESTION_TYPE": "SKILL"}


def validate(taxonomy):
    assert taxonomy["schema_version"] == 1
    nodes = {node["code"]: node for node in taxonomy["nodes"]}
    assert len(nodes) == len(taxonomy["nodes"]), "duplicate taxonomy code"
    for node in nodes.values():
        kind = node["kind"]
        if kind == "EXAM":
            assert node["parent"] is None
        else:
            assert node["parent"] in nodes
            assert nodes[node["parent"]]["kind"] == PARENT_KIND[kind]

    def ancestors(code):
        result = []
        while code is not None:
            assert code not in result, "taxonomy parent cycle"
            result.append(code)
            code = nodes[code]["parent"]
        return result

    for code in nodes:
        ancestors(code)
    graph = defaultdict(list)
    for edge in taxonomy["prerequisites"]:
        skill, requirement = edge["skill"], edge["requires"]
        assert skill != requirement
        assert nodes[skill]["kind"] == nodes[requirement]["kind"] == "SKILL"
        graph[skill].append(requirement)

    def visit(code, active, done):
        assert code not in active, "prerequisite cycle"
        if code in done:
            return
        for prerequisite in graph[code]:
            visit(prerequisite, active | {code}, done)
        done.add(code)

    done = set()
    for code in list(graph):
        visit(code, set(), done)
    topics = [item["source_topic"] for item in taxonomy["source_topic_mappings"]]
    assert len(topics) == len(set(topics))
    assert sum(item["sample_count"] for item in taxonomy["source_topic_mappings"]) == 50
    for item in taxonomy["source_topic_mappings"]:
        assert nodes[item["question_type"]]["kind"] == "QUESTION_TYPE"
        assert item["sample_count"] > 0
    return nodes, ancestors


def choose(records, topic, count):
    by_year = defaultdict(list)
    for record in records:
        if record.get("exam_ders") != "Türkçe" or record.get("konu") != topic:
            continue
        if len(record.get("cevaplar", [])) != 1:
            continue
        if record["cevaplar"][0] not in set("ABCDE"):
            continue
        if not (ROOT / "veri-hatti/ogm-yks-cikmis/ham" / record["gorsel"]).is_file():
            continue
        by_year[record["yil"]].append(record)
    for items in by_year.values():
        items.sort(key=lambda item: item["id"])
    result = []
    while len(result) < count and any(by_year.values()):
        for year in sorted(by_year):
            if by_year[year] and len(result) < count:
                result.append(by_year[year].pop(0))
    assert len(result) == count, f"too few source questions for {topic}"
    return result


def render():
    taxonomy = json.loads(TAXONOMY.read_text(encoding="utf-8"))
    nodes, ancestors = validate(taxonomy)
    records = json.loads(CATALOG.read_text(encoding="utf-8"))["sorular"]
    rows = []
    for mapping in taxonomy["source_topic_mappings"]:
        for record in choose(records, mapping["source_topic"], mapping["sample_count"]):
            question_type, skill, subtopic, topic, subject, exam = ancestors(mapping["question_type"])
            rows.append({"question_code": record["id"], "exam_code": exam,
                         "subject_code": subject, "topic_code": topic,
                         "subtopic_code": subtopic, "skill_code": skill,
                         "question_type_code": question_type,
                         "source_topic": record["konu"], "source_year": record["yil"],
                         "source_image": record["gorsel"], "label_status": "proposed",
                         "review_reason": "topic_only_mapping"})
    assert len(rows) == 50 and len({row["question_code"] for row in rows}) == 50
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=FIELDS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    options = parser.parse_args()
    content = render()
    if options.write:
        OUTPUT.write_text(content, encoding="utf-8", newline="")
    else:
        assert OUTPUT.read_text(encoding="utf-8") == content, "sample differs from sources"
    print(f"taxonomy sample PASS: 50 unique questions, 7 source topics, mode={'write' if options.write else 'check'}")


if __name__ == "__main__":
    main()
