"""Create an auditable label index for philosophy, religion, biology and chemistry.

This is a proposal for study content, not an update to the live question CSVs.
Labels never claim more detail than an available source heading, curriculum
outcome, existing source annotation, or a clearly marked text inference.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path


APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
SOURCE_ROOT = ROOT / "veri-hatti"
QUESTION_ROOT = SOURCE_ROOT / "ogm-sorular"
OUTGOING = SOURCE_ROOT / "ogm-yks-cikmis/ham/sorular_son.json"
OUTPUT = APP / "ornek-veri/etiketler/diger-branslar.csv"
SUMMARY = APP / "ornek-veri/etiketler/diger-ozet.json"
SUBJECTS = {"Felsefe", "Felsefe Grubu", "Din Kültürü", "Biyoloji", "Kimya"}
UNKNOWN = {"", "Sınıflandırılmamış", "Sınıflandırılmadı", "Sınıflandırılmadı (konu listesi yok)"}
FIELDS = (
    "bank", "exam_type", "subject", "code", "source_topic", "label",
    "evidence_type", "evidence_ref", "confidence", "review_required",
    "discipline", "suggested_subject", "source_subject_conflict", "source_heading",
    "source_page", "source_file", "review_reason",
)

# These 27 were unclassified in the active OGM CSV. Every nonvisual anchor is
# checked against the extracted source question text below. The one visual
# case was read from the extracted image; no text is copied into the output.
SOURCE_TEXT_OVERRIDES = {
    "md-ayt-sayisal-04-32": ("Canlılar ve Çevre", "", "genetik varyasyonun", "Biyoloji üst konusu; mayoz ve varyasyon birlikte soruluyor."),
    "md-ayt-sayisal-24-17": ("Sıvı Çözeltiler ve Çözünürlük", "Kimya", "sulu çözeltilerine", "CSV dersi Biyoloji; kaynak sorusu çözeltidir."),
    "md-ayt-sayisal-24-18": ("Kimyasal Tepkimelerde Hız", "Kimya", "tepkimelerden hangilerinin hızı", "CSV dersi Biyoloji; kaynak sorusu tepkime hızıdır."),
    "md-ayt-sayisal-06-24": ("Enerji Kaynakları ve Bilimsel Gelişmeler", "", "geri dönüşüm", "Geri dönüşüm bağlamı; alt konu insan incelemesi ister."),
    "md-ayt-sayisal-10-20": ("Tepkime enerjisi, hızı ve dengesi", "", "Tepkime entalpisi", "Bir soruda üç kimya konusu var; tek alt konuya zorlanmadı."),
    "md-ayt-sayisal-24-08": ("Kütle Çekim Kuvveti", "Fizik", "kütle çekim", "CSV dersi Kimya; kaynak sorusu Fizik."),
    "md-ayt-sayisal-24-10": ("Elektromanyetik Dalgalar", "Fizik", "Elektromanyetik spektrumda", "CSV dersi Kimya; kaynak sorusu Fizik."),
    "md-ayt-sayisal-24-11": ("Transformatörler", "Fizik", "ideal transformatörün", "CSV dersi Kimya; kaynak sorusu Fizik."),
    "md-ayt-sayisal-24-12": ("Akımın Manyetik Alanı", "Fizik", "manyetik alan içine", "CSV dersi Kimya; kaynak sorusu Fizik."),
    "md-ayt-sayisal-24-14": ("Çembersel Hareket", "Fizik", "çembersel ve sürtünmeli", "CSV dersi Kimya; kaynak sorusu Fizik."),
    "mn-test-03-01-32": ("Tanımlı İşlemler", "Matematik", "", "Kaynak görseli insan tarafından okundu; OCR yalnız soru numarasını çıkarmış."),
    "yk-kimya-test-16-01-03": ("Karma Kimya Kavramları", "", "Molekül Formülü", "Bileşik türleri, formüller ve çevre kimyası birlikte soruluyor; tek alt konuya zorlanmadı."),
    "cd-2021-tyt-genel-deneme-04-18": ("Virüsler ve Bağışıklık", "", "bağışıklık sistemi", "Kaynakta antijen, antikor ve grip virüsü var."),
    "yk-biyoloji-test-05-01-04": ("Kromozomlar ve Kalıtım", "", "Karyotip hazırlama", "Kaynakta homolog kromozom ve aleller var."),
    "cd-2021-mini-deneme-1-01-46": ("Sıcaklık ve Termometreler", "Fizik", "termometre denir", "CSV dersi Kimya; kaynak sorusu Fizik."),
    "3d-ayt-sozel-02-23": ("Felsefi Düşüncenin Birikimli Niteliği", "", "birbiri üzerinden", "Kaynak metni felsefi düşüncenin birikimini anlatıyor."),
    "3d-ayt-sozel-14-23": ("Ahlak Felsefesinde Erdem ve İyi", "", "ruhun erdemleri", "Kaynak metnindeki erdem ve iyi ilişkisi."),
    "3d-ayt-sozel-20-23": ("Bilim Felsefesi: Kuram ve Fenomen", "", "her teori", "Kaynak metni kuramın fenomenlerle ilişkisini soruyor."),
    "3d-ayt-sozel-20-26": ("Psikoloji: Tutumlar", "", "Hepimizde bazı olgulara", "Kaynak metni tutumların değişimini soruyor."),
    "3d-ayt-sozel-24-31": ("Özgürlük ve Eğitim", "", "özgür olma ihtimali", "Metin iki kavramı bağlıyor; tek alt konu kesin değil."),
    "3d-ayt-sozel-26-23": ("Ahlak Felsefesinde İyilik ve Mutluluk İlişkisi", "", "Mutluluğa erişmek", "Kaynak metni doğrudan iyi ve mutluluğu karşılaştırıyor."),
    "cd-ayt-02-25": ("Felsefenin İnsan Hayatındaki Rolü", "", "geçmişinin üzerinde yeniden düşünmeden", "Yaşamı sorgulama vurgusu; sınır konu uzman incelemesi ister."),
    "md-ayt-sozel-20-26": ("Kültürel Alışkanlıklar ve Algı", "", "Kültürel alışkanlıklar", "Psikoloji ve sosyoloji sınırında bir soru."),
    "3d-tyt-46-13": ("Felsefi Araştırmada Farklı Yaklaşımlar", "", "felsefi araştırmada", "Kaynak metni felsefi yaklaşımları soruyor."),
    "cd-2021-mini-deneme-3-01-09": ("Paragrafta Anlam", "Türkçe", "Bu parçadan", "CSV dersi Felsefe; kaynak soru kökü okuduğunu anlamadır."),
    "mn-test-03-01-01": ("Paragrafta Anlam", "Türkçe", "TÜRK DİLİ VE EDEBİYATI", "Kaynak görselindeki bölüm başlığı Türk Dili ve Edebiyatı; soru bir paragraf sorusu."),
    "yk-felsefe-test-07-01-11": ("Kohlberg’in Gelenek Sonrası Ahlaki Dönemi", "", "Kohlberg’in", "Kaynak soru kökü kavramı doğrudan adlandırıyor."),
}

# The original catalog topics are valid upper areas, but these two sampled
# questions explicitly name a narrower concept. Keep the original topic in
# source_topic and mark this extra precision as a question-text review.
OUTGOING_TEXT_OVERRIDES = {
    "AYT_Sayisal-0666": ("Genetik Araştırmalarda Model Organizmalar", "model organizmalarda"),
    "2020-TYT-SOS-17": ("Kur’an'ı Anlama ve Tefsir İlkeleri", "tefsir olarak"),
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def read_active(path: Path, bank: str) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    wanted = [row for row in rows if row["active"].lower() == "true" and row["subject"] in SUBJECTS]
    for row in wanted:
        row["bank"] = bank
    return wanted


def source_index(codes: set[str]) -> dict[str, tuple[dict, str]]:
    """Join extracted source questions by immutable card ID, retaining metadata only."""
    result = {}
    for file in sorted((QUESTION_ROOT / "kayit").glob("*.json")):
        data = read_json(file)
        records = data if isinstance(data, list) else data.get("kayitlar", [])
        source_file = "OGM Soru Bankası" if isinstance(data, list) else "kaynaklar/ogm-materyal/" + data["dosya"]
        for question in records:
            code = question.get("id")
            if code in codes:
                if code in result:
                    raise AssertionError(f"duplicate source question: {code}")
                result[code] = (question, source_file)
    return result


def simple_text(value: str) -> str:
    value = value.casefold().replace("ı", "i")
    value = "".join(letter for letter in unicodedata.normalize("NFKD", value) if not unicodedata.combining(letter))
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", value)).strip()


def source_heading(question: dict) -> str:
    heading = question.get("konu_basligi") or ""
    # Numbered test variants share the same published section heading.
    return re.sub(r"\s*[-–]\s*\d+$", "", heading).strip()


def is_known(label: str | None) -> bool:
    return bool(label and label.strip() not in UNKNOWN)


def ref(source: str, page: int | None, detail: str = "") -> str:
    parts = [source]
    if page:
        parts.append(f"PDF s. {page}")
    if detail:
        parts.append(detail)
    return " · ".join(parts)


def label_outgoing(row: dict, source: dict | None) -> dict:
    topic = row["topic"].strip()
    subject = row["subject"]
    label = topic if is_known(topic) else subject
    evidence = "catalog_topic" if is_known(topic) else "subject_fallback"
    confidence = 0.74 if is_known(topic) else 0.25
    review = True
    reason = "Kaynak katalog etiketi soru metniyle tek tek doğrulanmalı." if is_known(topic) else "Kaynakta dar konu yok."
    discipline = ""
    heading = ""
    detail = ""
    page = None
    source_file = ""
    if source:
        page = source.get("sayfa")
        book = source["kitaplar"][0]
        source_file = ("kaynaklar/yks-cikmis-sorular/OGM Kitapciklari/" + book + ".pdf"
                       if book != "eski" else "")
        heading = source.get("konu_ham") or ""
        if heading == "Belirsiz":
            heading = ""
        detail = heading
        # The outgoing catalog carries an explicit, source-bound course topic.
        alt = source.get("alt")
        discipline = source.get("konu") if subject == "Felsefe Grubu" else ""
        if is_known(alt):
            label = alt.strip()
            evidence = "source_record_subtopic"
            confidence = 0.83
            reason = "Katalog alt konusu; özgün soru için uzman doğrulaması önerilir."
        elif is_known(source.get("konu")) and not is_known(topic):
            label = source["konu"].strip()
            evidence = "source_record_topic"
            confidence = 0.64
            reason = "Yalnız kaynak üst konusu mevcut."
        if not source_file:
            evidence = "legacy_catalog_topic"
            confidence = min(confidence, 0.48)
            reason = "Eski kayıt; özgün OGM PDF sayfası bu katalogda bağlı değil."
            heading = ""
            detail = ""
        if row["code"] in OUTGOING_TEXT_OVERRIDES:
            label, anchor = OUTGOING_TEXT_OVERRIDES[row["code"]]
            assert simple_text(anchor) in simple_text(source.get("metin", "")), f"source anchor missing for {row['code']}"
            evidence = "source_question_keyword_review"
            confidence = 0.67 if source_file else 0.58
            reason = "Kaynak soru metni daha dar kavramı açıkça veriyor; öğretmen onayı belgelenmedi."
            detail = f"soru metni kavramı: {anchor}"
    return {
        "label": label,
        "evidence_type": evidence,
        "evidence_ref": ref(source_file or row["source"], page, detail),
        "confidence": confidence,
        "review_required": review,
        "discipline": discipline,
        "suggested_subject": "",
        "source_subject_conflict": False,
        "source_heading": heading,
        "source_page": page or "",
        "source_file": source_file,
        "review_reason": reason,
    }


def label_ogm(row: dict, source: tuple[dict, str] | None, manual: dict,
              sb_map: dict, book_map: dict, model: dict) -> dict:
    code = row["code"]
    exam = row["exam_type"]
    subject = row["subject"]
    topic = row["topic"].strip()
    question, source_file = source if source else ({}, row["source"])
    heading = source_heading(question)
    page = question.get("sayfa")
    label = topic if is_known(topic) else subject
    evidence = "catalog_topic" if is_known(topic) else "subject_fallback"
    confidence = 0.66 if is_known(topic) else 0.25
    review = True
    reason = "Yalnız derleme konusu; daha dar alt konu kanıtı yok." if is_known(topic) else "Kaynakta güvenilir dar konu yok."
    detail = heading
    discipline = ((topic if topic in {"Mantık", "Psikoloji", "Sosyoloji"} else "Felsefe")
                  if subject == "Felsefe" and exam == "AYT" else "")
    suggested_subject = ""
    source_subject_conflict = False

    hand = manual.get(code, {})
    if hand.get("sinav") == exam and hand.get("ders") == subject and is_known(hand.get("konu")):
        label = hand.get("alt") or hand["konu"]
        evidence = "prior_source_annotation"
        confidence = 0.91 if hand.get("alt") else 0.83
        review = True
        reason = "Önceki kaynak işaretlemesi; öğretmen onayı belgelenmedi."
        detail = f"elle_etiket.json: {hand['konu']}" + (f" / {hand['alt']}" if hand.get("alt") else "")
    elif code.startswith("sb-") and question:
        key = "sb|{ders}|{sinif}|{unite}|{kazanim}".format(
            ders=question.get("ders_kod", ""), sinif=question.get("sinif", ""),
            unite=question.get("unite", ""), kazanim=question.get("kazanim_kod4", ""),
        )
        mapped = sb_map.get(key, {})
        outcome = question.get("kazanim", "")
        detail = f"{question.get('kazanim_kod4', '')}: {outcome}".strip(": ")
        alt = mapped.get("alt")
        explicit_alt = bool(is_known(alt) and len(simple_text(alt)) >= 7
                            and simple_text(alt) in simple_text(outcome))
        if (is_known(mapped.get("alt")) and mapped.get("konu") == topic
                and (mapped.get("skor_alt", 0) >= 0.75 or explicit_alt)):
            label = mapped["alt"]
            evidence = "ogm_outcome_explicit_topic" if explicit_alt else "ogm_outcome_and_mapping"
            confidence = 0.86 if explicit_alt else min(0.90, 0.72 + 0.18 * mapped["skor_alt"])
            review = True
            reason = "Kazanımdaki açık alt konu; öğretmen onayı belgelenmedi." if explicit_alt else "Kazanım-alt konu eşlemesi; öğretmen onayı belgelenmedi."
        elif outcome and is_known(topic):
            evidence = "ogm_outcome_parent_topic"
            confidence = 0.76
            review = True
            reason = "Kazanım mevcut; alt konu eşlemesi düşük güvenli ya da yok."
    elif question:
        prefix = code.split("-", 1)[0]
        candidates = [heading, question.get("konu_basligi") or ""]
        for candidate in candidates:
            if not candidate:
                continue
            key = f"{prefix}|{exam}|{subject}|{candidate}"
            mapped = book_map.get(key)
            if (mapped and mapped.get("konu") == topic and is_known(mapped.get("alt"))
                    and mapped.get("skor", 0) >= 0.70):
                label = mapped["alt"]
                evidence = "pdf_section_and_mapping"
                confidence = min(0.9, 0.7 + 0.18 * mapped["skor"])
                review = True
                reason = "PDF bölümünden alt konu eşlemesi; öğretmen onayı belgelenmedi."
                break
        else:
            predicted = model.get(code, {})
            if (predicted.get("sinav") == exam and predicted.get("ders") == subject
                    and predicted.get("konu") == topic and is_known(predicted.get("alt"))
                    and predicted.get("p_alt", 0) >= 0.90):
                label = predicted["alt"]
                evidence = "source_question_text_model"
                confidence = min(0.79, 0.60 + 0.2 * predicted["p_alt"])
                review = True
                reason = "Kaynak soru metninden model tahmini; insan incelemesi zorunlu."
                detail = f"metin modeli alt konu puanı {predicted['p_alt']:.3f}"
            elif heading and is_known(topic):
                evidence = "pdf_section_parent_topic"
                confidence = 0.76
                review = True
                reason = "PDF başlığı var; güvenilir alt konu eşlemesi yok."

    if not source:
        review = True
        reason = "Kaynak soru kaydı bulunamadı; CSV üst konusu korundu."
        confidence = min(confidence, 0.55)
    override = SOURCE_TEXT_OVERRIDES.get(code)
    if override:
        proposed_label, proposed_subject, anchor, note = override
        text = question.get("metin", "")
        if anchor:
            assert simple_text(anchor) in simple_text(text), f"source anchor missing for {code}"
            evidence = "source_question_keyword_review"
            detail = f"soru metni kavramı: {anchor}"
        else:
            image = question.get("gorsel", "")
            assert image and (ROOT / "icerik" / image).is_file(), f"review image missing for {code}"
            evidence = "source_question_image_review"
            detail = image
        label = proposed_label
        suggested_subject = proposed_subject
        source_subject_conflict = bool(proposed_subject and proposed_subject != subject)
        confidence = 0.58 if source_subject_conflict else 0.65
        review = True
        reason = note + " Öneri ayrıca uzman tarafından doğrulanmalı."
        if subject == "Felsefe" and exam == "AYT":
            discipline = ("Psikoloji" if "Psikoloji" in proposed_label or "Tutum" in proposed_label
                          else "Felsefe")
            if code == "md-ayt-sozel-20-26":
                discipline = ""  # perception and culture overlap two branches
    return {
        "label": label,
        "evidence_type": evidence,
        "evidence_ref": ref(source_file, page, detail),
        "confidence": confidence,
        "review_required": review,
        "discipline": discipline,
        "suggested_subject": suggested_subject,
        "source_subject_conflict": source_subject_conflict,
        "source_heading": heading,
        "source_page": page or "",
        "source_file": source_file,
        "review_reason": reason,
    }


def render() -> tuple[str, str]:
    active = read_active(APP / "veri/sorular-tum.csv", "CIKMIS") + read_active(APP / "veri/sorular-ogm.csv", "OGM")
    outgoing = {question["id"]: question for question in read_json(OUTGOING)["sorular"]}
    ogm_codes = {row["code"] for row in active if row["bank"] == "OGM"}
    extracted = source_index(ogm_codes)
    manual = read_json(QUESTION_ROOT / "etiket/elle_etiket.json")
    sb_map = read_json(QUESTION_ROOT / "etiket/sb_etiket.json")
    book_map = read_json(QUESTION_ROOT / "etiket/kitap_etiket.json")
    model = read_json(QUESTION_ROOT / "etiket/model_etiket.json")
    result = []
    for row in active:
        decision = (label_outgoing(row, outgoing.get(row["code"])) if row["bank"] == "CIKMIS"
                    else label_ogm(row, extracted.get(row["code"]), manual, sb_map, book_map, model))
        result.append({
            "bank": row["bank"], "exam_type": row["exam_type"], "subject": row["subject"],
            "code": row["code"], "source_topic": row["topic"], "label": decision["label"],
            "evidence_type": decision["evidence_type"], "evidence_ref": decision["evidence_ref"],
            "confidence": f"{decision['confidence']:.2f}",
            "review_required": str(decision["review_required"]).lower(),
            "discipline": decision["discipline"],
            "suggested_subject": decision["suggested_subject"],
            "source_subject_conflict": str(decision["source_subject_conflict"]).lower(),
            "source_heading": decision["source_heading"],
            "source_page": decision["source_page"], "source_file": decision["source_file"],
            "review_reason": decision["review_reason"],
        })
    assert len(result) == len({(r["bank"], r["code"]) for r in result}), "duplicate question key"
    assert all(r["label"].strip() and r["evidence_ref"].strip() for r in result), "blank label or source"
    assert len(result) == len(active)
    files = {r["source_file"] for r in result if r["source_file"] and r["source_file"] != "OGM Soru Bankası"}
    assert all((ROOT / file).is_file() for file in files), "one or more source PDFs are missing"
    result.sort(key=lambda r: (r["bank"], r["exam_type"], r["subject"], r["code"]))
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=FIELDS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(result)
    by_subject = Counter((r["bank"], r["exam_type"], r["subject"]) for r in result)
    summary = {
        "schema": "diger-branslar-v1", "records": len(result), "blank_labels": 0,
        "source_record_missing": {"CIKMIS": sum(r["bank"] == "CIKMIS" and r["code"] not in outgoing for r in result),
                                  "OGM": len(ogm_codes - extracted.keys())},
        "review_required": sum(r["review_required"] == "true" for r in result),
        "source_subject_conflicts": [r["code"] for r in result if r["source_subject_conflict"] == "true"],
        "subject_counts": {"|".join(key): count for key, count in sorted(by_subject.items())},
        "evidence_counts": dict(sorted(Counter(r["evidence_type"] for r in result).items())),
        "upper_subject_fallback": [r["code"] for r in result if r["evidence_type"] == "subject_fallback"],
    }
    return stream.getvalue(), json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="Write the index and audit summary")
    mode.add_argument("--check", action="store_true", help="Rebuild and compare with saved artifacts")
    options = parser.parse_args()
    csv_content, summary_content = render()
    if options.write:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(csv_content, encoding="utf-8", newline="")
        SUMMARY.write_text(summary_content, encoding="utf-8", newline="")
    else:
        assert OUTPUT.read_text(encoding="utf-8") == csv_content, "CSV does not match current sources"
        assert SUMMARY.read_text(encoding="utf-8") == summary_content, "audit summary does not match current sources"
    summary = json.loads(summary_content)
    print(f"{summary['records']} records; 0 blank labels; {summary['review_required']} need review; "
          f"missing source records {summary['source_record_missing']}; mode={'write' if options.write else 'check'}")


if __name__ == "__main__":
    main()
