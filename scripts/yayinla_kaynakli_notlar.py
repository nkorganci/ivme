"""Öğretim taslaklarının PDF sayfasını, soru kimliğini ve yerel anahtarını denetler.

Kaynak metinleri yayımlamaz. Denetim kaynak bağını doğrular; bağımsız öğretmen
onayı veya tüm arşivin pedagojik analizi değildir. --check salt okunurdur.
"""

import argparse
import copy
import csv
import hashlib
import json
import re
import unicodedata
from pathlib import Path

import pymupdf

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
INPUT = APP / "ornek-veri/kaynakli-ders-notlari.json"
OUTPUT = APP / "frontend/public/kaynakli-notlar.json"
CATALOG = ROOT / "veri-hatti/ogm-indirme/katalog.json"
PDF_ROOT = ROOT / "Kaynaklar/ogm-materyal"
OBSERVATIONS = APP / "ornek-veri/kaynakli-arastirma-gozlemleri.json"


def load_observations():
    data = json.loads(OBSERVATIONS.read_text(encoding="utf-8"))
    if data.get("schemaVersion") != 1:
        raise ValueError("Desteklenmeyen gözlem şeması")
    found = {}
    for item in data["observations"]:
        evidence = item["evidence"]
        if (item["key"] in found or not item.get("note", "").strip()
                or evidence.get("teacher_approved") is not False
                or evidence.get("inspection") not in {"assistant_image_review", "assistant_text_review"}):
            raise ValueError(f"Geçersiz/yinelenen araştırma gözlemi: {item['key']}")
        found[item["key"]] = item
    return found


def check_example_review(key, observations):
    review = observations.get(":".join(key))
    if review and review["evidence"].get("excludeFromGuides"):
        raise ValueError(f"Araştırmada çelişkili/uygunsuz bulunan örnek: {key}")


def normalized(value):
    value = re.sub(r"(?<=\w)[\-\u00ad]\s*\n(?=\w)", "", value)
    value = unicodedata.normalize("NFKD", value.casefold().replace("ı", "i"))
    value = "".join(character for character in value if not unicodedata.combining(character))
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def digest(value):
    return hashlib.sha256(value).hexdigest()


def check_anchors(anchors, text, context):
    if not anchors or any(not normalized(anchor) or normalized(anchor) not in normalized(text)
                          for anchor in anchors):
        raise ValueError(f"Kaynak dayanağı bulunamadı: {context}: {anchors}")


def question_sources(wanted):
    records = {}
    paths = [(ROOT / "veri-hatti/ogm-yks-cikmis/ham/sorular.json", "CIKMIS"),
             (ROOT / "veri-hatti/ogm-yks-cikmis/ham/eski/questions.json", "CIKMIS")]
    paths.extend((path, "OGM") for path in
                 sorted((ROOT / "veri-hatti/ogm-sorular/kayit").glob("*.json")))
    for path, bank in paths:
        data = json.loads(path.read_text(encoding="utf-8"))
        rows = data if isinstance(data, list) else data.get("kayitlar", data.get("sorular", []))
        for row in rows:
            key = (bank, row.get("id"))
            if key not in wanted:
                continue
            # Aynı çıkmış kartın eski OCR kopyası yerine özgün PDF çıkarımını kullan.
            if key in records and bank == "CIKMIS":
                continue
            if key in records:
                raise ValueError(f"Yinelenen kaynak soru: {key}")
            records[key] = row
    return records


def check_comparison(lesson, banks):
    status = lesson.get("comparisonStatus", "both_banks")
    if status == "both_banks" and banks == {"CIKMIS", "OGM"}:
        return
    if (status == "past_question_not_found" and banks == {"OGM"}
            and lesson.get("comparisonNote", "").strip()):
        return
    raise ValueError(f"Çıkmış/OGM karşılaştırması eksik veya durumu geçersiz: {lesson['id']}")


def build():
    observations = load_observations()
    official_statuses = json.loads((APP / 'ornek-veri/resmi-soru-durumlari.json').read_text(encoding='utf-8'))
    officially_cancelled = {(r['bank'], r['code']) for r in official_statuses['records'] if r['officialStatus'] == 'cancelled'}
    data = json.loads(INPUT.read_text(encoding="utf-8"))
    supplements = APP / "ornek-veri/kaynakli-notlar"
    for path in sorted(supplements.glob("*.json")):
        extra = json.loads(path.read_text(encoding="utf-8"))
        data["groups"].extend(extra.get("groups", []))
        for group in data["groups"]:
            for unit in group["units"]:
                additions = extra.get("outlineAdditions", {}).get(group["id"], {}).get(unit["name"], [])
                unit["topics"].extend(additions)
        if "groupId" in extra:
            group = next(group for group in data["groups"] if group["id"] == extra["groupId"])
            group["lessons"].extend(extra["lessons"])
        for group in data["groups"]:
            for lesson in group["lessons"]:
                if lesson["id"] in extra.get("patternsByLesson", {}):
                    lesson["patterns"] = extra["patternsByLesson"][lesson["id"]]
    if data["schemaVersion"] != 1:
        raise ValueError("Desteklenmeyen not şeması")
    result = copy.deepcopy(data)
    catalog = {row["id"]: row for row in json.loads(CATALOG.read_text(encoding="utf-8"))}
    labels = {}
    for path in sorted((APP / "ornek-veri/etiketler").glob("*.csv")):
        with path.open(encoding="utf-8-sig", newline="") as stream:
            for row in csv.DictReader(stream):
                key = (row["bank"], row["code"])
                if key in labels:
                    raise ValueError(f"Yinelenen etiket: {key}")
                labels[key] = row
    active = {}
    for filename, bank in (("sorular-tum.csv", "CIKMIS"), ("sorular-ogm.csv", "OGM")):
        with (APP / "veri" / filename).open(encoding="utf-8-sig", newline="") as stream:
            for row in csv.DictReader(stream):
                if row.get("active") == "true":
                    active[(bank, row["code"])] = row

    wanted = {(example["bank"], example["code"]) for group in data["groups"]
              for lesson in group["lessons"] for example in lesson["examples"]}
    questions = question_sources(wanted)
    group_ids = set()
    sources = {}
    for group in result["groups"]:
        if group["id"] in group_ids or not group["lessons"]:
            raise ValueError(f"Yinelenen/boş ders: {group['id']}")
        group_ids.add(group["id"])
        outline = [topic for unit in group["units"] for topic in unit["topics"]]
        if not outline or len(set(outline)) != len(outline):
            raise ValueError(f"Eksik/yinelenen konu dizini: {group['id']}")
        group["inventory"] = {
            bank: sum(row["exam_type"] == group["exam"] and row["subject"] == group["subject"]
                      and row["bank"] == bank for row in labels.values())
            for bank in ("CIKMIS", "OGM")
        }
        lesson_ids = set()
        for lesson in group["lessons"]:
            if lesson["id"] in lesson_ids:
                raise ValueError(f"Yinelenen ders notu: {lesson['id']}")
            lesson_ids.add(lesson["id"])
            if any(topic not in outline for topic in lesson["topics"]):
                raise ValueError(f"Konu diziniyle uyuşmayan ders notu: {lesson['id']}")
            for field in ("id", "title", "topics", "learn", "steps", "pitfall", "sources", "examples"):
                if not lesson.get(field):
                    raise ValueError(f"Eksik öğretim alanı: {lesson['id']} {field}")
            practice = lesson["practice"]
            if (not isinstance(practice["answer"], int)
                    or not 0 <= practice["answer"] < len(practice["choices"])
                    or len(practice["choices"]) < 2
                    or not practice.get("question") or not practice.get("explanation")):
                raise ValueError(f"Geçersiz özgün soru: {lesson['id']}")
            lesson["approvalStatus"] = "teacher_pending"
            if not lesson.get("patterns"):
                raise ValueError(f"Konuya ait soru kalıbı eksik: {lesson['id']}")
            pattern_ids = set()
            for pattern in lesson["patterns"]:
                if pattern["id"] in pattern_ids:
                    raise ValueError(f"Yinelenen soru kalıbı: {lesson['id']} {pattern['id']}")
                pattern_ids.add(pattern["id"])
                if not all(pattern.get(field) for field in ("title", "recognize", "logic", "tip", "trap")):
                    raise ValueError(f"Eksik kalıp rehberi: {lesson['id']} {pattern['id']}")
                if not pattern.get("mini", {}).get("question") or not pattern["mini"].get("answer"):
                    raise ValueError(f"Eksik düşünme örneği: {lesson['id']} {pattern['id']}")
            for source in lesson["sources"]:
                item = catalog[source["catalogId"]]
                relative = Path(item["dosya"])
                path = (PDF_ROOT / relative).resolve()
                if not path.is_relative_to(PDF_ROOT.resolve()):
                    raise ValueError("PDF kaynak kökü dışında")
                with pymupdf.open(path) as pdf:
                    if not 1 <= source["page"] <= len(pdf):
                        raise ValueError(f"Geçersiz PDF sayfası: {path} {source['page']}")
                    check_anchors(source.pop("anchors"), pdf[source["page"] - 1].get_text(),
                                  f"{lesson['id']} PDF {source['catalogId']} s. {source['page']}")
                    if str(item["id"]) not in sources:
                        sources[str(item["id"])] = {
                            "title": item["baslik"], "url": item["url"],
                            "sha256": digest(path.read_bytes()), "pageCount": len(pdf),
                            "fileUrl": f"/api/topic-pdfs/{item['id']}/file",
                        }
            example_banks = set()
            for example in lesson["examples"]:
                key = (example["bank"], example["code"])
                check_example_review(key, observations)
                if key in officially_cancelled:
                    raise ValueError(f"Resmî iptal bildirimi bulunan örnek: {key}")
                row = active[key]
                label = labels[key]
                if row["exam_type"] != group["exam"] or row["subject"] != group["subject"]:
                    raise ValueError(f"Örnek yanlış ders/sınavdan: {key}")
                if (label.get("official_status") == "cancelled"
                        or label.get("source_subject_conflict") == "true"
                        or "possible_subject_error" in label.get("review_reason", "")):
                    raise ValueError(f"İptal edilmiş/ders uyuşmazlığı olan örnek: {key}")
                if row["correct_answer"] != example["answer"]:
                    raise ValueError(f"Kaynak anahtarıyla uyuşmayan çözüm: {key}")
                question = questions[key]
                check_anchors(example.pop("anchors"), question.get("metin", ""), key)
                source_answers = question.get("cevaplar") or [question.get("cevap")]
                if source_answers != [None] and source_answers != [example["answer"]]:
                    raise ValueError(f"PDF/kayıt anahtarıyla uyuşmayan çözüm: {key}")
                example["year"] = row.get("year", "")
                example["sourceLabel"] = label["label"]
                example["evidenceRef"] = label["evidence_ref"]
                example["sourceFingerprint"] = digest(question.get("metin", "").encode("utf-8"))
                example_banks.add(example["bank"])
            check_comparison(lesson, example_banks)
    result["sources"] = sources
    analysis_path = APP / "ornek-veri/kaynakli-analiz-ozet.json"
    analysis = json.loads(analysis_path.read_text(encoding="utf-8"))
    for group in result["groups"]:
        matching = [item for item in analysis["groups"]
                    if item["exam"] == group["exam"] and item["subject"] == group["subject"]]
        topics = [topic for item in matching for topic in item["topics"]]
        group["analysis"] = {
            "sourceRecords": sum(topic["records"] for topic in topics),
            "missingText": sum(topic["missingText"] for topic in topics),
            "shortOrVisualText": sum(topic["shortOrVisualText"] for topic in topics),
            "sourceTopicCount": len(topics),
            "needsReview": sum(topic["needsReview"] for topic in topics),
        }
        group["readingSources"] = [
            {"catalogId": item["id"], "title": item["baslik"], "url": item["url"]}
            for item in catalog.values() if item["ders"] == group["curriculumId"]
            and item["sinav"] in {group["exam"], "TYT-AYT"}
            and item["id"] in {pdf["catalogId"] for pdf in analysis["primaryLessonPdfs"]}
        ]
        group["readyTopicCount"] = len({topic for lesson in group["lessons"] for topic in lesson["topics"]})
    subject_ids = {"Türkçe": "turkce", "Türk Dili ve Edebiyatı": "edebiyat", "Tarih": "tarih",
                   "Coğrafya": "cografya", "Felsefe": "felsefe", "Felsefe Grubu": "felsefe",
                   "Din Kültürü": "din", "Biyoloji": "biyoloji", "Kimya": "kimya",
                   "Fizik": "fizik", "Matematik": "matematik"}
    overview = []
    for item in analysis["groups"]:
        subject_id = subject_ids[re.sub(r"-[12]$", "", item["subject"])]
        ready = next((group for group in result["groups"]
                      if group["exam"] == item["exam"] and group["subject"] == item["subject"]), None)
        reading = [{"catalogId": source["id"], "title": source["baslik"], "url": source["url"]}
                   for source in catalog.values() if source["ders"] == subject_id
                   and source["sinav"] in {item["exam"], "TYT-AYT"}
                   and source["id"] in {pdf["catalogId"] for pdf in analysis["primaryLessonPdfs"]}]
        overview.append({"exam": item["exam"], "subject": item["subject"], "records": item["records"],
                         "displaySubject": ready.get("displaySubject", item["subject"]) if ready else item["subject"],
                         "needsVisualReview": sum(topic["missingText"] + topic["shortOrVisualText"] for topic in item["topics"]),
                         "guideId": ready["id"] if ready else None,
                         "readyTopics": ready["readyTopicCount"] if ready else 0, "sources": reading})
    result["subjectOverview"] = overview
    result["analysisSummary"] = {
        "records": analysis["records"], "primaryPdfs": len(analysis["primaryLessonPdfs"]),
        "primaryPdfPages": sum(pdf["pages"] for pdf in analysis["primaryLessonPdfs"]),
        "needsVisualReview": sum(item["needsVisualReview"] for item in overview),
    }
    result["lessonCount"] = sum(len(group["lessons"]) for group in result["groups"])
    result["patternCount"] = sum(len(lesson["patterns"]) for group in result["groups"] for lesson in group["lessons"])
    result["exampleCount"] = sum(len(lesson["examples"]) for group in result["groups"] for lesson in group["lessons"])
    return json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    content = build()
    if args.write:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(content, encoding="utf-8")
    elif not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != content:
        raise ValueError("Not yayını eksik veya eski; --write ile yeniden üretin.")
    result = json.loads(content)
    print(f"{len(result['groups'])} ders, {result['lessonCount']} öğretim taslağı; "
          f"PDF sayfaları ve {result['exampleCount']} kaynak soru bağı doğrulandı.")


if __name__ == "__main__":
    main()
