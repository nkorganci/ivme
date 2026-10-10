"""Replace first-pass AI columns with a validated clearer-prompt pass; keep human fields."""

import argparse
import csv
import importlib.util
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


APP = Path(__file__).resolve().parents[1]
FIRST = APP / "ornek-veri/ai-etiket-qwen35-200.json"
SECOND = APP / "ornek-veri/ai-etiket-qwen35-v2-200.json"
BOUNDARY_PILOT = APP / "ornek-veri/ai-etiket-sinir-denemesi-6.json"


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


QUEUE = module("altin_ornek_kuyrugu", APP / "scripts/altin-ornek-kuyrugu.py")
AUDIT = module("ollama_etiket_denetle", APP / "scripts/ollama-etiket-denetle.py")
CATALOG = QUEUE.SOURCE_ROOT / "sorular_son.json"
QA_OVERRIDES = {
    "TYT-0002": ("sozcuk_baglam", "numaralanmış sözlerden hangisinin anlamı"),
    "TYT-0005": ("sozcuk_baglam", "altı çizili sözle asıl anlatılmak"),
    "TYT-0016": ("sozcuk_baglam", "altı çizili sözle anlatılmak"),
    "TYT-0027": ("sozcuk_baglam", "numaralanmış sözlerden hangisinin anlamı"),
    "TYT-0021": ("sozcuk_baglam", "altı çizili sözle anlatılmak"),
    "TYT-0032": ("sozcuk_baglam", "altı çizili sözle anlatılmak"),
    "TYT-0010": ("sozcuk_baglam", "altı çizili sözle anlatılmak"),
    "TYT-0034": ("cumle_yorum", "kişisel düşünce içermemektedir"),
    "TYT-0042": ("cumle_yorum", "hangi ikisi aynı düşünceyi"),
    "TYT-0350": ("ogeler", "yer tamlayıcısında"),
    "TYT-0353": ("ogeler", "öznesi"),
    "TYT-0355": ("ogeler", "yer tamlayıcılarıyla"),
    "TYT-0357": ("ogeler", "ögelerin dizilişi"),
    "TYT-0358": ("ogeler", "ögelerin dizilişi"),
    "TYT-0349": ("ogeler", "nesne, sadece isim tamlamasından"),
}
QA_RATIONALE = {
    "sozcuk_baglam": "Belirli sözün/sözlerin bağlamdaki anlamı soruluyor",
    "cumle_yorum": "Cümle yargısının anlamı veya cümleler arası düşünce ilişkisi soruluyor",
    "ogeler": "Özne, yüklem, nesne, yer tamlayıcısı veya öge dizilişi çözümleniyor",
}


def reconcile(queue_path):
    AUDIT.validate(FIRST)
    first = json.loads(FIRST.read_text(encoding="utf-8"))
    second = json.loads(SECOND.read_text(encoding="utf-8"))
    boundary_pilot = json.loads(BOUNDARY_PILOT.read_text(encoding="utf-8"))
    if (second["model"] != first["run"]["model_family"]
            or second["model_digest"] != first["run"]["model_version"]
            or second["prompt_version"] != "taxonomy-boundaries-v2"
            or second["prompt_sha256"] != boundary_pilot["prompt_sha256"]
            or second["errors"]):
        raise ValueError("İkinci AI geçişi model/prompt/hata denetimini geçmedi")
    initial = {item["question_code"]: item for item in first["drafts"]}
    updated = {item["question_code"]: item for item in second["results"]}
    with queue_path.open(encoding="utf-8", newline="") as stream:
        reader = csv.DictReader(stream)
        rows = list(reader)
        if reader.fieldnames != list(QUEUE.FIELDS):
            raise ValueError("İnceleme CSV sütunları beklenenden farklı")
    codes = {row["question_code"] for row in rows}
    if (len(rows) != 200 or len(initial) != 200 or len(updated) != 200
            or len(second["results"]) != 200
            or codes != set(initial) or codes != set(updated)
            or len(second["question_codes"]) != 200
            or set(second["question_codes"]) != codes):
        raise ValueError("İkinci AI geçişi 200 sorunun tamamını kapsamıyor")
    allowed = {node["code"] for node in json.loads(QUEUE.TAXONOMY.read_text(encoding="utf-8"))["nodes"]
               if node["kind"] == "QUESTION_TYPE"}
    catalog = {item["id"]: item for item in json.loads(CATALOG.read_text(encoding="utf-8"))["sorular"]}
    now = datetime.now(timezone.utc).isoformat()
    counts = Counter()
    for row in rows:
        code = row["question_code"]
        old, new = initial[code], updated[code]
        raw_label = new["clearer_prompt_type"]
        if (new["image_sha256"] != row["image_sha256"]
                or new["first_prompt_type"] != old["question_type_code"]
                or new["source_topic_type"] != row["suggested_question_type_code"]
                or (new["abstain"] and raw_label is not None)
                or (not new["abstain"] and raw_label not in allowed)
                or type(new["confidence"]) not in (int, float)
                or not 0 <= new["confidence"] <= 1
                or not isinstance(new["evidence"], str) or not new["evidence"].strip()):
            raise ValueError(f"İkinci AI sonucu kaynakla uyuşmuyor: {code}")
        reasons = []
        if raw_label != old["question_type_code"]:
            old_short = (old["question_type_code"] or "belirsiz").split(".")[-1]
            new_short = (raw_label or "belirsiz").split(".")[-1]
            reasons.append(f"İlk AI: {old_short}; ikinci AI: {new_short}")
            counts["changed"] += 1
        label = raw_label
        evidence = new["evidence"]
        reviewer = "qwen3.5:4b (AI taslağı v2)"
        if code in QA_OVERRIDES:
            target, phrase = QA_OVERRIDES[code]
            if " ".join(phrase.split()) not in " ".join(catalog[code]["metin"].lower().split()):
                raise ValueError(f"AI kalite kontrol kanıtı kaynak metinde yok: {code}")
            label = f"tyt.turkce.tip.{target}"
            if label not in allowed or label == raw_label:
                raise ValueError(f"AI kalite kontrol düzeltmesi geçersiz: {code}")
            evidence = f"Kaynak soru kökü: '{phrase}'. {QA_RATIONALE[target]}."
            reviewer = "Codex AI QA + qwen3.5:4b (taslak v2)"
            reasons.append(f"AI kalite kontrol düzeltmesi: {raw_label.split('.')[-1]} → {target}")
            counts["qa_override"] += 1
        if new["abstain"]:
            reasons.append("AI etiket seçemedi")
            counts["abstain"] += 1
        if raw_label and raw_label != row["suggested_question_type_code"]:
            counts["raw_source_conflict"] += 1
        if label and label != row["suggested_question_type_code"]:
            reasons.append("Kaynak konu önerisiyle hâlâ çelişiyor")
            counts["source_conflict"] += 1
        if code == "TYT-0100":
            reasons.append("İlk AI gerekçesinde soru yönü yanlıştı")
        if code in {"TYT-0118", "TYT-0199"}:
            reasons.append("Anlatım özelliği için taksonomi sınırı belirsiz")
        if reasons:
            note = "; ".join(reasons) + ". İnsan incelemesi gerekiyor."
            priority = "oncelikli"
        else:
            note = ("Açık tip kurallarıyla ikinci AI önerisi ilk AI ve kaynak konuyla uyumlu; "
                    "gerekçe bağımsız doğrulanmadı. Altın etiket için insan incelemesi gerekiyor.")
            priority = "normal"
        row.update(ai_reviewer_id=reviewer,
                   ai_model_digest=second["model_digest"], ai_reviewed_at_utc=now,
                   ai_question_type_code=label or "", ai_confidence=str(new["confidence"]),
                   ai_review_evidence=evidence, ai_review_note=note,
                   ai_human_review_priority=priority)
        counts[priority] += 1
    temporary = queue_path.with_suffix(".v2.tmp")
    with temporary.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=QUEUE.FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    temporary.replace(queue_path)
    if queue_path == QUEUE.OUTPUT:
        QUEUE.validate_review_file()
    print("AI v2 " + " ".join(f"{key}={value}" for key, value in sorted(counts.items()))
          + f" human_approved={sum(row['review_status'] == 'approved' for row in rows)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue", type=Path, default=QUEUE.OUTPUT)
    args = parser.parse_args()
    reconcile(args.queue.resolve())
