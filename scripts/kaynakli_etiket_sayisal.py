"""TYT Fizik ve AYT Matematik/Fizik kaynak etiketlerini izlenebilir dizine ekler.

Kaynak CSV konu adlarını korur; tüm soruların çözümünün incelendiğini veya dar
konu doğrulamasını iddia etmez. Bankaya yazmaz. Her kayıt inceleme bekler.
"""
import argparse
import csv
import io
import json
from pathlib import Path

from yayinla_kaynakli_notlar import normalized

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
OUTPUT = APP / "ornek-veri/etiketler/sayisal-kapsam.csv"
TARGETS = {("TYT", "Fizik"), ("AYT", "Fizik"), ("AYT", "Matematik")}
FIELDS = ["bank", "exam_type", "subject", "code", "source_topic", "label",
          "evidence_type", "evidence_ref", "confidence", "review_required",
          "source_title", "source_heading", "source_page", "review_reason",
          "source_subject_conflict", "suggested_subject"]


def build():
    records = {}
    for filename, bank in (("sorular-tum.csv", "CIKMIS"), ("sorular-ogm.csv", "OGM")):
        with (APP / "veri" / filename).open(encoding="utf-8-sig", newline="") as stream:
            for row in csv.DictReader(stream):
                if row.get("active") == "true" and (row["exam_type"], row["subject"]) in TARGETS:
                    key = (bank, row["code"])
                    if key in records:
                        raise ValueError(f"Yinelenen kaynak kimliği: {key}")
                    records[key] = row
    paths = [(ROOT / "veri-hatti/ogm-yks-cikmis/ham/sorular.json", "CIKMIS"),
             (ROOT / "veri-hatti/ogm-yks-cikmis/ham/eski/questions.json", "CIKMIS")]
    paths += [(path, "OGM") for path in sorted((ROOT / "veri-hatti/ogm-sorular/kayit").glob("*.json"))]
    sources = {}
    for path, bank in paths:
        data = json.loads(path.read_text(encoding="utf-8"))
        rows = data if isinstance(data, list) else data.get("kayitlar", data.get("sorular", []))
        for question in rows:
            key = (bank, question.get("id"))
            if key not in records:
                continue
            if key in sources:
                if bank == "CIKMIS":
                    continue
                raise ValueError(f"Yinelenen özgün kaynak: {key}")
            sources[key] = (question, path.relative_to(ROOT).as_posix())
    if records.keys() != sources.keys():
        raise ValueError(f"Özgün kaynak kaydı eksik: {sorted(records.keys()-sources.keys())[:10]}")
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=FIELDS, lineterminator="\n")
    writer.writeheader()
    subject_names = {normalized(name): name for name in ("Fizik", "Matematik", "Kimya", "Biyoloji", "Türkçe", "Tarih")}
    for key, row in sorted(records.items()):
        question, source_path = sources[key]
        topic = row["topic"].strip()
        known = normalized(topic) not in {"", "belirsiz", "siniflandirilmamis", "siniflandirilmadi", "siniflandirilmadi konu listesi yok"}
        source_subject = subject_names.get(normalized(str(question.get("ders_kod") or question.get("ders") or "")))
        conflict = bool(source_subject and source_subject != row["subject"])
        writer.writerow({"bank": key[0], "exam_type": row["exam_type"], "subject": row["subject"],
            "code": key[1], "source_topic": row["topic"],
            "label": topic if known else f"{row['subject']} (Alt Konu Belirsiz)",
            "evidence_type": "source_csv_topic" if known else "source_subject_only",
            "evidence_ref": f"{source_path}#id={key[1]};veri/{'sorular-tum.csv' if key[0]=='CIKMIS' else 'sorular-ogm.csv'}#code={key[1]}",
            "confidence": "medium" if known else "low", "review_required": "true",
            "source_title": row["source"], "source_heading": question.get("konu_basligi") or "",
            "source_page": question.get("sayfa") or "",
            "review_reason": "Kaynak konu kaydı; soru çözümü ve dar alt konu bağımsız doğrulanmadı." + (" Özgün kaynak dersi CSV ile uyuşmuyor." if conflict else ""),
            "source_subject_conflict": str(conflict).lower(), "suggested_subject": source_subject if conflict else ""})
    return stream.getvalue(), len(records)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    content, count = build()
    if args.write:
        OUTPUT.write_text(content, encoding="utf-8-sig")
    elif not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8-sig") != content:
        raise ValueError("Sayısal kapsam etiketi eksik/eski; --write ile üretin.")
    print(f"{count} TYT Fizik / AYT Matematik-Fizik kaynak referansı; tamamı inceleme bekliyor.")


if __name__ == "__main__":
    main()
