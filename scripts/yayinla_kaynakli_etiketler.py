"""Kaynaklı etiket CSV'lerini ayrı, salt okunur öğrenci dizinine hazırlar.

`--write` statik JSON dosyalarını üretir. `--check` üretilecek içeriği mevcut
dosyalarla karşılaştırır. Her iki mod da kaynak CSV kapsamını yeniden denetler.
Mevcut soru CSV'leri, veritabanı ve soru akışı değiştirilmez.
"""

import argparse
import collections
import csv
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "ornek-veri" / "etiketler"
OUTPUT = ROOT / "frontend" / "public" / "kaynakli-etiketler"
SOURCE = ROOT / "veri"
REQUIRED = (
    "bank", "exam_type", "subject", "code", "source_topic", "label",
    "evidence_type", "evidence_ref", "confidence", "review_required",
)
OPTIONAL = (
    "review_reason", "source_heading", "source_page", "official_status",
    "official_notice_url", "suggested_subject", "source_subject_conflict",
    "source_title", "source_file", "discipline", "label_level", "source_fingerprint",
)
SUBJECTS = {
    "TYT": {"Türkçe", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü", "Biyoloji", "Kimya"},
    "AYT": {"Türk Dili ve Edebiyatı", "Tarih", "Tarih-1", "Tarih-2", "Coğrafya", "Coğrafya-1", "Coğrafya-2", "Felsefe", "Felsefe Grubu", "Din Kültürü", "Biyoloji", "Kimya"},
}
SUBJECT_ORDER = {
    "Türkçe": 0, "Türk Dili ve Edebiyatı": 0,
    "Tarih": 1, "Tarih-1": 1, "Tarih-2": 1,
    "Coğrafya": 2, "Coğrafya-1": 2, "Coğrafya-2": 2,
    "Felsefe": 3, "Felsefe Grubu": 3,
    "Din Kültürü": 4, "Biyoloji": 5, "Kimya": 6,
}


def slug(value):
    value = value.casefold().replace("ı", "i")
    value = unicodedata.normalize("NFD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")


def read_csv(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        if not reader.fieldnames or not set(REQUIRED).issubset(reader.fieldnames):
            missing = sorted(set(REQUIRED) - set(reader.fieldnames or []))
            raise ValueError(f"{path}: eksik sütunlar: {missing}")
        return list(reader)


def source_rows():
    records = {}
    for filename, bank in (("sorular-tum.csv", "CIKMIS"), ("sorular-ogm.csv", "OGM")):
        with (SOURCE / filename).open(encoding="utf-8-sig", newline="") as stream:
            for row in csv.DictReader(stream):
                if row.get("active") == "true" and row["subject"] in SUBJECTS.get(row["exam_type"], set()):
                    key = (bank, row["code"])
                    if key in records:
                        raise ValueError(f"Kaynakta yinelenen soru: {key}")
                    records[key] = row
    return records


def payloads():
    paths = sorted(INPUT.glob("*.csv"))
    if not paths:
        raise ValueError(f"Etiket CSV'si bulunamadı: {INPUT}")
    records = {}
    for path in paths:
        for row in read_csv(path):
            key = (row["bank"], row["code"])
            if key in records:
                raise ValueError(f"Etiket dosyalarında yinelenen soru: {key}")
            if not all(row[field].strip() for field in REQUIRED):
                raise ValueError(f"Eksik etiket/kanıt alanı: {path.name} {key}")
            label = row["label"].strip().casefold()
            if label in {"sınıflandırılmamış", "etiketsiz", "belirsiz"}:
                raise ValueError(f"Etiketsiz yer tutucu kaldı: {path.name} {key}: {row['label']}")
            if "belirsiz" in label and row["review_required"].casefold() not in {"true", "yes", "evet", "1"}:
                raise ValueError(f"Belirsiz alt konu inceleme gerektirir: {path.name} {key}")
            if row["bank"] not in {"CIKMIS", "OGM"}:
                raise ValueError(f"Bilinmeyen koleksiyon: {key}")
            if row["review_required"].casefold() not in {"true", "false", "yes", "no", "evet", "hayır", "1", "0"}:
                raise ValueError(f"Bilinmeyen inceleme durumu: {key}")
            confidence = row["confidence"]
            if confidence not in {"high", "medium", "low"}:
                try:
                    if not 0 <= float(confidence) <= 1:
                        raise ValueError()
                except ValueError:
                    raise ValueError(f"Geçersiz kaynak eşleme puanı: {key}: {confidence}") from None
            records[key] = row

    sources = source_rows()
    expected = set(sources)
    actual = set(records)
    if expected != actual:
        raise ValueError(f"Kapsam farkı: {len(expected - actual)} eksik, {len(actual - expected)} fazla; "
                         f"ilk eksikler {sorted(expected - actual)[:5]}; ilk fazlalar {sorted(actual - expected)[:5]}")
    for key, row in records.items():
        source = sources[key]
        for field, source_field in (("exam_type", "exam_type"), ("subject", "subject"),
                                    ("source_topic", "topic")):
            if row[field] != source[source_field]:
                raise ValueError(f"Kaynak alanı değişmiş: {key} {field}: {row[field]} != {source[source_field]}")

    groups = collections.defaultdict(list)
    for row in records.values():
        key = (row["exam_type"], row["subject"])
        entry = {field: row[field] for field in REQUIRED if field not in {"exam_type", "subject"}}
        entry.update({field: row[field] for field in OPTIONAL if row.get(field)})
        entry["approval_status"] = "teacher_pending"
        if "possible_subject_error" in row.get("review_reason", ""):
            entry["source_subject_conflict"] = "true"
            if "geography_content_in_history_row" in row["review_reason"]:
                entry["suggested_subject"] = "Coğrafya"
        groups[key].append(entry)

    files = {}
    manifest = []
    ordered = sorted(groups.items(), key=lambda item: (SUBJECT_ORDER[item[0][1]],
                                                       0 if item[0][0] == "TYT" else 1,
                                                       item[0][1]))
    for (exam, subject), entries in ordered:
        entries.sort(key=lambda row: (row["bank"], row["code"]))
        name = f"{slug(exam)}-{slug(subject)}.json"
        files[name] = json.dumps(entries, ensure_ascii=False, separators=(",", ":")) + "\n"
        confidence = collections.Counter(row["confidence"] for row in entries)
        review = sum(row["review_required"].casefold() in {"true", "yes", "evet", "1"} for row in entries)
        manifest.append({"id": name.removesuffix(".json"), "exam": exam, "subject": subject,
                         "count": len(entries), "needsReview": review,
                         "confidence": dict(sorted(confidence.items()))})
    files["manifest.json"] = json.dumps({"total": len(records), "unlabelled": 0,
                                        "teacherApproved": 0, "groups": manifest}, ensure_ascii=False,
                                        separators=(",", ":")) + "\n"
    return files, manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    files, manifest = payloads()
    if args.write:
        OUTPUT.mkdir(parents=True, exist_ok=True)
        for name, content in files.items():
            (OUTPUT / name).write_text(content, encoding="utf-8")
        stale = set(OUTPUT.glob("*.json")) - {OUTPUT / name for name in files}
        if stale:
            raise ValueError(f"Eski yayın dosyaları var: {sorted(stale)}")
    else:
        stale = set(OUTPUT.glob("*.json")) - {OUTPUT / name for name in files}
        if stale:
            raise ValueError(f"Eski yayın dosyaları var: {sorted(stale)}")
        for name, content in files.items():
            path = OUTPUT / name
            if not path.exists() or path.read_text(encoding="utf-8") != content:
                raise ValueError(f"Yayın dosyası eksik veya eski: {path}")
    print(f"{sum(group['count'] for group in manifest)} soru, {len(manifest)} sınav/ders grubu; "
          f"boş etiket: 0; mod: {'write' if args.write else 'check'}")


if __name__ == "__main__":
    main()
