"""Build traceable Tarih and Coğrafya labels for active TYT/AYT questions.

The output is a review inventory, not an approved teaching taxonomy. It never
copies question text or images. Run from anywhere:

    python scripts/kaynakli_etiket_tarih_cografya.py
    python scripts/kaynakli_etiket_tarih_cografya.py --check
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path


APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
OUT = APP / "ornek-veri/etiketler"
CSV_OUT = OUT / "tarih_cografya.csv"
SUMMARY_OUT = OUT / "tarih_cografya_ozet.json"
SUBJECTS = {"Tarih", "Coğrafya", "Tarih-1", "Tarih-2", "Coğrafya-1", "Coğrafya-2"}
# Baseline from the active October 2026 outgoing CSV. A dropped subject family
# must fail --check even if a reduced CSV was accidentally regenerated.
MIN_OUTGOING_COUNTS = {
    "Tarih": 45, "Coğrafya": 45, "Tarih-1": 90,
    "Tarih-2": 99, "Coğrafya-1": 54, "Coğrafya-2": 99,
}
OFFICIAL_2019_AYT_PDF = "https://dokuman.osym.gov.tr/pdfdokuman/2019/YKS/TSK/ayt_yks_2019_web.pdf"
OFFICIAL_2019_CANCEL_NOTICE = "https://www.osym.gov.tr/2019yks-yuksekogretim-kurumlari-sinavi-2019yks-sonuclari-aciklandi"
CANCELLED_2019_CODE = "2019-AYT-TDE-33"
FIELDS = (
    "bank", "exam_type", "subject", "code", "source_topic", "label",
    "evidence_type", "evidence_ref", "confidence", "review_required",
    "source_heading", "source_name", "source_file", "source_page",
    "question_text_available", "review_reason", "official_status", "official_notice_url",
)

# The original topic field is absent on these mixed-booklet records. Each
# proposed label was read from that question's PDF-derived text. The anchor is
# deliberately short, and is checked against the local source text on each run.
# All these labels remain in the human review queue.
TEXT_REVIEW = {
    "3d-ayt-sozel-04-20": ("Kuraklık", "Kuraklık"),
    "md-tyt-2-deneme-22-09": ("Akarsulardan elektrik enerjisi üretimi", "elektrik enerjisi"),
    "yk-tarih-test-04-01-11": ("Avrupa tarihindeki gelişmelerin kronolojisi", "kronolojik"),
    "yk-tarih-test-05-01-03": ("Türk devletlerinde yönetim ve teşkilat", "Büyük Selçuklu"),
    "yk-tarih-test-05-01-12": ("Osmanlı padişahları ve dönemlerindeki gelişmeler", "padişah"),
    "yk-tarih-test-06-01-01": ("Uygurlar ve Karahanlılar", "Karahanlı"),
    "yk-tarih-test-07-01-04": ("Türk devletlerinde kadın unvanları", "hatun"),
    "yk-tarih-test-07-01-12": ("Osmanlı kapitülasyonları", "kapitülasyon"),
    "yk-tarih-test-09-01-02": ("Türk Kara Kuvvetleri tarihi", "Kara Kuvvetleri"),
    "yk-tarih-test-10-01-03": ("Osmanlı şehzadeleri ve merkezî yönetim", "şehzadelerin"),
    "yk-tarih-test-14-01-04": ("Osmanlı'da devşirme ve kul sistemi", "Gulam Sistemi"),
    "yk-tarih-test-15-01-11": ("Büyük Selçuklu ve Osmanlı devletlerinin karşılaştırılması", "Büyük Selçuklu"),
    "yk-tarih-test-16-01-01": ("Astronomi ve takvim bilgisi", "takvim"),
    "yk-tarih-test-16-01-09": ("Coğrafi Keşifler ve deniz ticareti", "Coğrafi keşiflerle"),
    "yk-tarih-test-16-01-12": ("Osmanlı taşra yönetiminde salyâneli eyaletler", "salyâneli"),
    "3d-ayt-esit-agirlik-11-33": ("1960'larda Türk sineması", "Susuz Yaz"),
    "3d-ayt-esit-agirlik-15-32": ("Filistin meselesi", "Filistin"),
    "3d-ayt-esit-agirlik-17-30": ("Meclis-i Mebusan ve II. Meşrutiyet", "Meşrutiyet"),
    "3d-ayt-sozel-04-01": ("Kitlesel göçlerin sonuçları", "göç"),
    "3d-ayt-sozel-04-05": ("Yeniçeri Ocağının sayısal değişimi", "yeniçeri"),
    "3d-ayt-sozel-06-02": ("Devletlerde hükümdarlık meşruiyeti", "Gök Tengri"),
    "3d-ayt-sozel-06-03": ("Osmanlı devlet geleneği", "ekberiyet"),
    "3d-ayt-sozel-06-04": ("Osmanlı'da kadıların görevleri", "kadının"),
    "3d-ayt-sozel-06-05": ("Şark Meselesi ve Osmanlı-Rus ilişkileri", "Şark Meselesi"),
    "3d-ayt-sozel-11-33": ("1960'larda Türk sineması", "Susuz Yaz"),
    "3d-ayt-sozel-14-03": ("Osmanlı'da âyanlar", "âyanlardan"),
    "3d-ayt-sozel-15-32": ("Filistin meselesi", "Filistin"),
    "3d-ayt-sozel-17-30": ("Meclis-i Mebusan ve II. Meşrutiyet", "Meşrutiyet"),
    "3d-ayt-sozel-18-09": ("Mustafa Kemal'in eserleri", "Mustafa Kemal"),
    "3d-ayt-sozel-30-05": ("Coğrafi Keşifler", "Coğrafi Keşifler"),
    "3d-tyt-26-04": ("Balkan Savaşları sonrasında Anadolu'ya göç", "Balkan Savaşlarından"),
    "3d-tyt-34-01": ("Biruni ve bilim insanının özellikleri", "Biruni"),
    "3d-tyt-46-02": ("Osmanlı maliyesinde cizye gelirleri", "cizye"),
    "md-ayt-esit-agirlik-01-30": ("Osmanlı'da esham sistemi", "Esham"),
    "md-ayt-esit-agirlik-03-26": ("Türk-İslam devletlerinde hükümdarın görevleri", "hükümdar"),
    "md-ayt-esit-agirlik-07-26": ("Ribat ve ticari konaklama", "Ribat"),
    "md-ayt-sozel-01-30": ("Osmanlı'da esham sistemi", "Esham"),
    "md-ayt-sozel-03-26": ("Türk-İslam devletlerinde hükümdarın görevleri", "hükümdar"),
    "md-ayt-sozel-07-26": ("Ribat ve ticari konaklama", "Ribat"),
    "md-ayt-sozel-08-07": ("I. Dünya Savaşı öncesi ittifak blokları", "Üçlü ittifak"),
    "md-ayt-sozel-18-05": ("Osmanlı diplomasisinde halifelik", "halifelik"),
    "md-ayt-sozel-20-03": ("Gulam sistemi ve hükümdarlık", "gulam"),
    "cd-2021-ayt-genel-deneme-02-11": ("Kıbrıs Türk Mukavemet Teşkilatı", "Kıbrıslı"),
    "cd-2021-mini-deneme-2-01-23": ("Japonya'nın nüfus politikaları", "Japonya"),
    "cd-2022-genel-deneme-tyt-02-03": ("Türk devletlerinde ülüş geleneği", "ülüş"),
}


def compact(value: object) -> str:
    return " ".join(str(value or "").split())


def is_unclassified(value: object) -> bool:
    return compact(value).casefold().startswith("sınıflandırılma")


def folded(value: object) -> str:
    value = unicodedata.normalize("NFKD", compact(value).casefold())
    return " ".join("".join(c if c.isalnum() else " " for c in value
                            if not unicodedata.combining(c)).split())


def source_ref(path: Path, code: str) -> str:
    return f"{path.relative_to(ROOT).as_posix()}#id={code}"


def read_csv(path: Path, bank: str) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as stream:
        rows = [row for row in csv.DictReader(stream)
                if row["subject"] in SUBJECTS and row["active"].lower() == "true"]
    if len({row["code"] for row in rows}) != len(rows):
        raise ValueError(f"duplicate {bank} code in {path}")
    for row in rows:
        row["_bank"] = bank
    return rows


def load_ogm_source(wanted: set[str]) -> dict[str, tuple[Path, dict, dict]]:
    directory = ROOT / "veri-hatti/ogm-sorular/kayit"
    result = {}
    for path in sorted(directory.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            records = data.get("kayitlar", [])
            metadata = {key: data.get(key) for key in ("kaynak", "dosya", "kod")}
        elif isinstance(data, list) and path.name == "sb.json":
            records, metadata = data, {"kaynak": "OGM Soru Bankası"}
        else:
            continue
        for record in records:
            code = record.get("id")
            if code not in wanted:
                continue
            if code in result:
                raise ValueError(f"duplicate source record: {code}")
            result[code] = (path, metadata, record)
    missing = wanted - result.keys()
    if missing:
        raise ValueError(f"missing OGM source records: {sorted(missing)[:12]}")
    return result


def load_outgoing_source(wanted: set[str]) -> tuple[dict, dict]:
    base = ROOT / "veri-hatti/ogm-yks-cikmis/ham"
    final_path = base / "sorular_son.json"
    raw_path = base / "sorular.json"
    final = {item["id"]: item for item in
             json.loads(final_path.read_text(encoding="utf-8"))["sorular"]
             if item["id"] in wanted}
    raw = {item["id"]: item for item in
           json.loads(raw_path.read_text(encoding="utf-8"))["sorular"]
           if item["id"] in wanted}
    # This cancelled question was carried over from the former ÖSYM card set;
    # it has no crop in the OGM compilation. The official PDF is linked below.
    if CANCELLED_2019_CODE in wanted and CANCELLED_2019_CODE not in raw:
        old_path = base / "eski/questions.json"
        old = {item["id"]: item for item in json.loads(old_path.read_text(encoding="utf-8"))
               if item["id"] == CANCELLED_2019_CODE}
        if CANCELLED_2019_CODE not in old:
            raise ValueError("cancelled AYT question's old card is missing")
        old[CANCELLED_2019_CODE]["_source_kind"] = "official_pdf_old_card"
        raw.update(old)
    if wanted - final.keys() or wanted - raw.keys():
        raise ValueError("missing outgoing question source record")
    return final, raw


def objective_label(value: str) -> str:
    return compact(re.sub(r"^\s*\d+(?:\.\d+)*\.?\s*[-–.]?\s*", "", value))


def manual_label(code: str, question_text: str) -> tuple[str, str]:
    label, anchor = TEXT_REVIEW[code]
    if not folded(anchor) or folded(anchor) not in folded(question_text):
        raise ValueError(f"manual text anchor absent: {code} ({anchor})")
    return label, anchor


def outgoing_row(row: dict, final: dict, raw: dict) -> dict[str, str]:
    code = row["code"]
    record, original = final[code], raw[code]
    if record.get("ders") != row["subject"] or record.get("sinav") != row["exam_type"]:
        raise ValueError(f"outgoing subject/exam mismatch: {code}")
    legacy_label = compact((record.get("eski_etiket") or {}).get("alt_konu"))
    label = legacy_label or compact(record.get("konu") or row["topic"])
    if not label or (is_unclassified(label) and code != CANCELLED_2019_CODE):
        raise ValueError(f"outgoing label missing: {code}")
    old_card_only = original.get("_source_kind") == "official_pdf_old_card"
    if old_card_only:
        if code != CANCELLED_2019_CODE or not (folded("Tekâlif-i Milliye") in
                                                 folded(original.get("metin"))):
            raise ValueError(f"old AYT card source mismatch: {code}")
        label = "Tekâlif-i Milliye Emirleri"
        source_file = OFFICIAL_2019_AYT_PDF
        page = 11  # Web PDF page 11 (printed booklet page 9).
        evidence_type = "official_pdf_question_text"
        evidence_ref = source_ref(ROOT / "veri-hatti/ogm-yks-cikmis/ham/eski/questions.json", code)
        confidence = "0.90"
        review_reason = "officially_cancelled_2019_ayt_question;ogm_booklet_missing;answer_key_invalid"
        source_name = "ÖSYM 2019 AYT Temel Soru Kitapçığı"
    else:
        source_book = original["kitap"]
        source_pdf = ROOT / "kaynaklar/yks-cikmis-sorular/OGM Kitapciklari" / f"{source_book}.pdf"
        page = original.get("sayfa")
        if not source_pdf.is_file() or not isinstance(page, int) or page < 1:
            raise ValueError(f"outgoing PDF anchor missing: {code}")
        source_file = source_pdf.relative_to(ROOT).as_posix()
        evidence_type = "legacy_subtopic_annotation" if legacy_label else "outgoing_catalog_topic"
        evidence_ref = source_ref(ROOT / "veri-hatti/ogm-yks-cikmis/ham/sorular_son.json", code)
        confidence = "0.70" if legacy_label else "0.55"
        review_reason = ("legacy_label_requires_question_level_review" if legacy_label
                         else "catalog_topic_requires_question_level_review")
        source_name = compact(row["source"])
    return {
        "bank": "CIKMIS", "exam_type": row["exam_type"], "subject": row["subject"],
        "code": code, "source_topic": compact(row["topic"]), "label": label,
        "evidence_type": evidence_type, "evidence_ref": evidence_ref,
        "confidence": confidence, "review_required": "true", "source_heading": "",
        "source_name": source_name,
        "source_file": source_file,
        "source_page": str(page),
        "question_text_available": str(bool(compact(record.get("metin")))).lower(),
        "review_reason": review_reason,
        "official_status": "cancelled" if old_card_only else "",
        "official_notice_url": OFFICIAL_2019_CANCEL_NOTICE if old_card_only else "",
    }


def ogm_row(row: dict, source: tuple[Path, dict, dict]) -> dict[str, str]:
    code = row["code"]
    source_path, metadata, record = source
    title = compact(record.get("konu_basligi"))
    text = compact(record.get("metin"))
    source_topic = compact(row["topic"])
    pdf_relative = compact(metadata.get("dosya"))
    source_pdf = ROOT / "kaynaklar/ogm-materyal" / pdf_relative if pdf_relative else None
    if source_pdf and not source_pdf.is_file():
        raise ValueError(f"source PDF missing: {code}: {source_pdf}")
    page = record.get("sayfa") if source_pdf else None
    reason = ""
    if is_unclassified(source_topic):
        if code not in TEXT_REVIEW:
            raise ValueError(f"unclassified question has no reviewed candidate: {code}")
        label, _anchor = manual_label(code, text)
        evidence_type, confidence, review = "question_text_anchor", "0.60", True
        reason = "missing_catalog_topic;human_review_required"
        if code == "cd-2021-mini-deneme-2-01-23":
            reason += ";possible_subject_error_geography_content_in_history_row"
    elif title:
        # Serial numbers distinguish test booklets, not curricular topics.
        label = re.sub(r"\s+-\s+[123]$", "", title).strip()
        evidence_type, confidence = "pdf_section_heading", "0.90"
        review = not bool(text)
        if review:
            reason = "question_text_missing"
    elif source_path.name == "sb.json" and compact(record.get("kazanim")):
        label = objective_label(record["kazanim"])
        evidence_type, confidence, review = "ogm_learning_outcome", "0.65", True
        reason = "outcome_may_cover_multiple_question_concepts"
        if not text:
            reason += ";question_text_missing"
    else:
        label = source_topic
        evidence_type, confidence, review = "existing_parent_topic", "0.45", True
        reason = "mixed_test_without_question_level_heading"
    if not label or is_unclassified(label):
        raise ValueError(f"empty/unclassified OGM label: {code}")
    if not source_pdf and source_path.name != "sb.json":
        raise ValueError(f"non-SB source PDF missing: {code}")
    return {
        "bank": "OGM", "exam_type": row["exam_type"], "subject": row["subject"],
        "code": code, "source_topic": source_topic, "label": label,
        "evidence_type": evidence_type, "evidence_ref": source_ref(source_path, code),
        "confidence": confidence, "review_required": str(review).lower(),
        "source_heading": title, "source_name": compact(row["source"]),
        "source_file": source_pdf.relative_to(ROOT).as_posix() if source_pdf else
                       source_path.relative_to(ROOT).as_posix(),
        "source_page": str(page or ""),
        "question_text_available": str(bool(text)).lower(),
        "review_reason": reason,
    }


def build() -> tuple[list[dict[str, str]], dict]:
    outgoing = read_csv(APP / "veri/sorular-tum.csv", "CIKMIS")
    ogm = read_csv(APP / "veri/sorular-ogm.csv", "OGM")
    outgoing_counts = Counter(row["subject"] for row in outgoing)
    for subject, minimum in MIN_OUTGOING_COUNTS.items():
        if outgoing_counts[subject] < minimum:
            raise ValueError(f"outgoing {subject} coverage fell below {minimum}")
    source_final, source_raw = load_outgoing_source({r["code"] for r in outgoing})
    source_ogm = load_ogm_source({r["code"] for r in ogm})
    rows = [outgoing_row(row, source_final, source_raw) for row in outgoing]
    rows += [ogm_row(row, source_ogm[row["code"]]) for row in ogm]
    rows.sort(key=lambda r: (r["subject"], r["bank"], r["exam_type"], r["code"]))
    if len(rows) != len(outgoing) + len(ogm):
        raise ValueError("row count mismatch")
    if len({(r["bank"], r["code"]) for r in rows}) != len(rows):
        raise ValueError("duplicate output code")
    if any(not r["label"].strip() or not r["evidence_ref"].strip() for r in rows):
        raise ValueError("blank label/evidence")
    if set(TEXT_REVIEW) != {r["code"] for r in ogm
                            if is_unclassified(r["topic"])}:
        raise ValueError("manual review map differs from unclassified inventory")
    by_group = Counter((r["bank"], r["exam_type"], r["subject"]) for r in rows)
    summary = {
        "schema": "tarih-cografya-kaynakli-etiket-v1",
        "source_files": ["veri/sorular-tum.csv", "veri/sorular-ogm.csv",
                         "veri-hatti/ogm-yks-cikmis/ham/sorular_son.json",
                         "veri-hatti/ogm-yks-cikmis/ham/eski/questions.json",
                         "veri-hatti/ogm-sorular/kayit/*.json",
                         OFFICIAL_2019_AYT_PDF, OFFICIAL_2019_CANCEL_NOTICE],
        "total": len(rows),
        "blank_labels": sum(not r["label"].strip() for r in rows),
        "still_unclassified": sum(is_unclassified(r["label"]) for r in rows),
        "review_required": sum(r["review_required"] == "true" for r in rows),
        "by_group": [{"bank": b, "exam_type": e, "subject": s, "count": n}
                     for (b, e, s), n in sorted(by_group.items())],
        "by_evidence_type": dict(sorted(Counter(r["evidence_type"] for r in rows).items())),
        "possible_subject_error": [r["code"] for r in rows
                                   if "possible_subject_error" in r["review_reason"]],
        "officially_cancelled_active_question": [r["code"] for r in rows
                                                 if "officially_cancelled" in r["review_reason"]],
    }
    return rows, summary


def render_csv(rows: list[dict[str, str]]) -> str:
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=FIELDS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="verify committed outputs against current source records")
    args = parser.parse_args()
    rows, summary = build()
    csv_text = render_csv(rows)
    json_text = json.dumps(summary, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    if args.check:
        for path, expected in ((CSV_OUT, csv_text), (SUMMARY_OUT, json_text)):
            if not path.is_file() or path.read_text(encoding="utf-8") != expected:
                raise SystemExit(f"stale or missing output: {path}")
    else:
        OUT.mkdir(parents=True, exist_ok=True)
        CSV_OUT.write_text(csv_text, encoding="utf-8", newline="")
        SUMMARY_OUT.write_text(json_text, encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
