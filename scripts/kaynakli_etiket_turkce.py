"""Kaynak kaydı izlenebilen, öneri niteliğinde Türkçe/edebiyat soru etiketleri.

Kullanım:
    python -X utf8 scripts/kaynakli_etiket_turkce.py --write
    python -X utf8 scripts/kaynakli_etiket_turkce.py --check

Soru metni ve görseli çıktıya kopyalanmaz. Etiketler öğretmen onayı değildir.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path


APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
KAYIT = ROOT / "veri-hatti/ogm-sorular/kayit"
CIKMIS = ROOT / "veri-hatti/ogm-yks-cikmis/ham/sorular_son.json"
OUTPUT = APP / "ornek-veri/etiketler/turkce_kaynakli.csv"
SUBJECTS = {("TYT", "Türkçe"), ("AYT", "Türk Dili ve Edebiyatı")}
UNCLASSIFIED = "Sınıflandırılmamış"
FIELDS = (
    "bank", "exam_type", "subject", "code", "source_topic", "label",
    "evidence_type", "evidence_ref", "confidence", "review_required",
    "source_title", "label_level", "review_reason", "source_fingerprint",
    "approval_status", "official_status", "official_notice_url",
)
CANCELLED_CODE = "2026-AYT-TDE-20"
CANCELLED_NOTICE = "https://www.osym.gov.tr/2026-yks-sonuclari-aciklandi"
CANCELLED_IMAGE = ROOT / "veri-hatti/ogm-yks-cikmis/ham/img/eski/2026-AYT-TDE-20.webp"

# Bu 34 soru, kaynak soru metni/şıkları asistan tarafından okunarak konu
# başlığı olmayan kayıtlar arasından öneri olarak sınıflandırıldı.
# Bağımsız öğretmen onayı henüz yoktur. Paralel AYT kitapçıklarındaki aynı soru da
# açıkça listelenir; otomatik olarak başka soruya yayılmaz.
MANUAL_UNCLASSIFIED = {
    "yk-turk-dili-ve-edebiyati-ayt-test-09-01-07": "Yazar-Eser Eşleştirmeleri",
    "yk-turk-dili-ve-edebiyati-ayt-test-09-01-11": "Anlatı Teknikleri ve Bakış Açısı",
    "yk-turk-dili-ve-edebiyati-ayt-test-11-01-06": "Servetifünun Dönemi Türk Edebiyatı",
    "yk-turk-dili-ve-edebiyati-ayt-test-11-01-15": "Servetifünun Dönemi Türk Edebiyatı",
    "yk-turk-dili-ve-edebiyati-ayt-test-12-01-08": "Tanzimat Dönemi Türk Edebiyatı",
    "yk-turk-dili-ve-edebiyati-ayt-test-15-01-02": "Yazar-Eser Eşleştirmeleri",
    "3d-ayt-esit-agirlik-17-18": "Sanatçı-Eser Eşleştirmeleri",
    "3d-ayt-sozel-17-18": "Sanatçı-Eser Eşleştirmeleri",
    "3d-ayt-esit-agirlik-27-19": "Edebî Türler",
    "3d-ayt-sozel-27-19": "Edebî Türler",
    "3d-ayt-esit-agirlik-27-23": "Tanzimat Dönemi Türk Edebiyatı",
    "3d-ayt-sozel-27-23": "Tanzimat Dönemi Türk Edebiyatı",
    "3d-ayt-esit-agirlik-29-21": "Servetifünun Dönemi Türk Edebiyatı",
    "3d-ayt-sozel-29-21": "Servetifünun Dönemi Türk Edebiyatı",
    "md-ayt-esit-agirlik-01-22": "Yazar ve Eser Bilgisi",
    "md-ayt-sozel-01-22": "Yazar ve Eser Bilgisi",
    "md-ayt-esit-agirlik-05-23": "Edebî Akımlar ve Anlayışlar",
    "md-ayt-sozel-05-23": "Edebî Akımlar ve Anlayışlar",
    "md-ayt-esit-agirlik-07-19": "Millî Edebiyat Dönemi Türk Edebiyatı",
    "md-ayt-sozel-07-19": "Millî Edebiyat Dönemi Türk Edebiyatı",
    "md-ayt-esit-agirlik-15-19": "Yazar ve Eser Bilgisi",
    "md-ayt-sozel-15-19": "Yazar ve Eser Bilgisi",
    "md-ayt-esit-agirlik-19-18": "Öğretici Metinlerde Yazar ve Eser",
    "md-ayt-sozel-19-18": "Öğretici Metinlerde Yazar ve Eser",
    "md-ayt-esit-agirlik-23-13": "Anlatı ve Tür Özellikleri",
    "md-ayt-sozel-23-13": "Anlatı ve Tür Özellikleri",
    "md-ayt-esit-agirlik-29-23": "Anlatıcı ve Bakış Açısı",
    "md-ayt-sozel-29-23": "Anlatıcı ve Bakış Açısı",
    "cd-2021-ayt-genel-deneme-01-18": "Yazar-Eser-Tür Eşleştirmeleri",
    "cd-2021-mini-deneme-2-01-07": "Eser-Kahraman Eşleştirmeleri",
    "cd-2021-mini-deneme-4-01-09": "Yazar-Eser Eşleştirmeleri",
    "yk-turk-dili-ve-edebiyati-tyt-test-08-01-02": "Paragrafta Yardımcı Düşünce",
    "yk-turk-dili-ve-edebiyati-tyt-test-15-01-11": "Paragrafta Yardımcı Düşünce",
    "3d-tyt-41-07": "Cümlede Anlam: Cümle Birleştirme",
}
# Bağımsız kalite örneklemesinde kaynak üst konusu ile soru/ÖSYM anahtarı
# çelişen kart. Öneri, öğretmen onayı bekler.
MANUAL_SOURCE_CORRECTIONS = {"AYT_EsitAgirlik-0078": "Pendnâme (Öğüt Verici Metin)"}


def plain(value: str) -> str:
    """Turkish-aware matching key; output labels retain source spelling."""
    value = value.replace("ı", "i").replace("I", "i")
    return "".join(c for c in unicodedata.normalize("NFKD", value.casefold())
                   if not unicodedata.combining(c))


def prompt_text(value: str) -> str:
    """Read the question clause before A), excluding passage and options."""
    match = re.search(r"(?:^|\s)A\s*\)", value)
    tail = (value[:match.start()] if match else value)[-600:]
    # PDF extraction often inserts a line break inside the question stem.
    tail = re.sub(r"\s+", " ", plain(tail))
    primary = list(re.finditer(r"\bbu (?:parca|metin|dize|siir|beyit|dortluk|cumle|tablo|bilgi|ifade)", tail))
    if primary:
        return tail[primary[-1].start():]
    secondary = list(re.finditer(r"\b(?:asagidaki|yukaridaki|numaralanmis)\b", tail))
    return tail[secondary[-1].start():] if secondary else tail[-230:]


# Rules deliberately require a task phrase, rather than merely a keyword in a
# passage. Broad source headings remain the fallback when a stem is ambiguous.
STEM_RULES = (
    (r"yazim yanlis|yazilis|nasil yazil|ayri yazil|bitisik yazil|buyuk harf", "Yazım Kuralları"),
    (r"noktalama isaret|noktalama yanlis|virgul.{0,120}(?:kullan|gorev|islev|yanlis|konul|yerinde)|iki nokta.{0,100}(?:konul|kullan|yerinde|yanlis)|noktali virgul.{0,80}(?:konul|kullan|yanlis)|uc nokta.{0,80}(?:konul|kullan|yanlis)|kesme isaret", "Noktalama İşaretleri"),
    (r"ses olay|unlu dusme|unlu daral|unlu ture|unsuz yumusa|unsuz benzes|unsuz ture|kaynas?tirma", "Ses Olayları"),
    (r"farkli bir oge|oge olarak|hangi oge|oge dizilis|ogelerden biri", "Cümlenin Ögeleri"),
    (r"fiilimsi|isim.fiil|sifat.fiil|zarf.fiil", "Fiilimsiler"),
    (r"fiilde cati|edilgenlik|etkenlik|donuslu fiil|istes fiil", "Fiilde Çatı"),
    (r"ek.fiil|kip eki|haber kipi|dilek kipi", "Fiiller: Kip ve Ek Fiil"),
    (r"anlatim bozuklug", "Anlatım Bozukluğu"),
    (r"cumlenin oge|cumle ogeler|ozne ve nesne|dolayli tumlec|zarf tumleci", "Cümlenin Ögeleri"),
    (r"cumle tur|yuklemin turune|yuklemin yerine|yapisina gore cumle", "Cümle Türleri"),
    (r"yapim eki|cekim eki|sozcugun yapisi|sozcukte yapi|kok bakimindan", "Sözcükte Yapı"),
    (r"isim tamlamas|sifat tamlamas|tamlamanin turu", "Tamlamalar"),
    (r"soru anlami zamirle", "Zamirler"),
    (r"soru anlami zarfla", "Zarflar"),
    (r"sozcuk tur|sozcugun tur|sifat olan|zamir olan|zarf olan|edat olan|baglac olan", "Sözcük Türleri"),
    (r"dusunceyi gelistirme|anlatim bicim|betimleyici anlatim|oykuleyici anlatim", "Anlatım Biçimleri ve Düşünceyi Geliştirme"),
    (r"paragrafi ikiye bol|iki paragrafa ayril|ikinci paragraf|parcanin basina|parcanin sonuna|dusuncenin akisini bozan|anlamli bir butunluk olustur|cumlelerin dogru siralan|hangisinden sonra.{0,130}getiril|yer alma sirasi", "Paragrafın Yapısı"),
    (r"bu iki cumle.{0,90}birlestiril|cumlelerin birlestirilmis", "Cümlede Anlam: Cümle Birleştirme"),
    (r"alti cizili soz.{0,100}anlam|numaralanmis sozcuk.{0,100}anlam|sozun anlam|sozcugun anlam|deyimin anlam|sozle.{0,50}anlatilmak isten", "Sözcükte Anlam"),
)
LITERATURE_RULES = (
    (r"1980 sonrasi turk roman", "1980 Sonrası Türk Romanı"),
    (r"islamiyet oncesi turk destan", "İslamiyet Öncesi Türk Destanları"),
    (r"cumhuriyet donemi halk sair", "Cumhuriyet Dönemi Halk Şiiri"),
    (r"nazim bicim|nazim tur|nazim sekli", "Nazım Biçimi ve Türü"),
    (r"siirdeki ahenk|ahenk unsur|uyak duzeni|redif ve kafiye|kafiye ve redif", "Şiirde Ahenk"),
    (r"edebi sanat|soz sanat|sanatlardan hangis|tesbih sanat|istiare sanat", "Söz Sanatları"),
    (r"anlatici ve bakis acis|bakis acis|anlaticinin turu", "Anlatıcı ve Bakış Açısı"),
    (r"yazar.eser eslestir|sanatci.eser eslestir|eser.yazar eslestir", "Yazar-Eser Eşleştirmeleri"),
    (r"eser.kahraman eslestir|kahraman.eser eslestir", "Eser-Kahraman Eşleştirmeleri"),
    (r"edebi akim|sanat akimlar", "Edebî Akımlar"),
)
PARAGRAPH_RULES = (
    (r"ana dusunce|ana fikir|asil anlatilmak isten|vurgulanmak isten|en kapsamli yargi|parcanin baslig|uzerinde durdugu dusunce", "Paragrafta Ana Düşünce"),
    (r"sorulardan hangisine karsilik", "Paragrafta Soru ve Konu"),
    (r"parcadan.{0,100}(?:cikaril|soylen|ulasil)|parcayla ilgili.{0,100}soylen|parcaya gore.{0,100}(?:soylen|degil|baglidir)|parcadan hareketle.{0,100}soylen|parcada.{0,80}degini", "Paragrafta Yardımcı Düşünce"),
)


def find_stem_label(text: str, subject: str, source_topic: str) -> str | None:
    if not text:
        return None
    stem = prompt_text(text)
    for pattern, label in STEM_RULES:
        if re.search(pattern, stem):
            return label
    if subject == "Türk Dili ve Edebiyatı":
        for pattern, label in LITERATURE_RULES:
            if re.search(pattern, stem):
                return label
    # Generic "parçayla ilgili" is a reading task only for TYT; in AYT it
    # commonly tests a literary genre, period or author instead.
    if subject == "Türkçe" and source_topic in {"Paragraf", "Paragrafta Anlam", UNCLASSIFIED}:
        for pattern, label in PARAGRAPH_RULES:
            if re.search(pattern, stem):
                return label
    return None


def heading_label(heading: str, subject: str) -> str | None:
    heading = re.sub(r"\s+", " ", heading or "").strip()
    if not heading or heading.endswith((",", ">", " ve")):
        return None
    heading = re.sub(r"\s*-\s*\d+\s*$", "", heading).strip()
    if subject == "Türkçe":
        for prefix, label in (
            ("Ana Düşünce", "Paragrafta Ana Düşünce"),
            ("Yardımcı Düşünce", "Paragrafta Yardımcı Düşünce"),
            ("Paragrafta Yapı", "Paragrafın Yapısı"),
            ("Çoklu Paragraf", "Çoklu Paragraf"),
            ("Anlatım Bozuklukları", "Anlatım Bozukluğu"),
            ("Cümlenin Türleri", "Cümle Türleri"),
            ("Ses Olayları", "Ses Olayları"),
        ):
            if heading.startswith(prefix):
                return label
        if heading.startswith("Sözcük Türleri - "):
            return heading.replace("Sözcük Türleri - ", "Sözcük Türleri: ", 1)
    if subject == "Türk Dili ve Edebiyatı":
        if heading.startswith("Hikâye Türleri ve Hikâyenin Yapı Unsurları >"):
            return "Hikâye: Tür, Yapı ve Dönemler"
        if heading == "Giriş":
            return "Edebiyata Giriş"
        if heading == "Anlam Bilgisi":
            return "Anlam Bilgisi"
    return heading.replace(" > ", ": ")


def sb_skill(kazanim: str, unit: str) -> str | None:
    """Only clear, specific outcome phrases; generic grammar outcomes excluded."""
    k = plain(kazanim)
    u = unit.strip()
    if "dil bilgisi calismalari" in k or re.match(r"\d+\.1\.", k):
        return None
    if "ahengi saglayan" in k:
        return "Şiirde Ahenk"
    if "nazim bicimini" in k:
        return "Nazım Biçimi ve Türü"
    if "mazmun, imge ve edebi sanat" in k:
        return "Şiirde İmge ve Söz Sanatları"
    if "anlatici ve bakis" in k:
        return "Anlatıcı ve Bakış Açısı"
    if "olay orgusunu" in k:
        return f"{u}: Olay Örgüsü"
    if "sahis kadrosunun" in k:
        return f"{u}: Kişiler"
    if "yazarlarini ve eserlerini" in k:
        return f"{u}: Yazar ve Eser"
    if "akimlarin" in k:
        return f"{u}: Edebî Akımlar ve Anlayışlar"
    if "turunun ortaya cikisi" in k:
        return f"{u}: Tür ve Dönem"
    if "anlatim bicimleri" in k:
        return f"{u}: Anlatım Biçimleri"
    if "metnin tema ve konusunu" in k or "siirin temasini" in k:
        return f"{u}: Tema ve Konu"
    return None


def source_label(topic: str, subject: str) -> str:
    if topic == UNCLASSIFIED or not topic:
        return "Türkçe: Konu Belirleme İncelemesi" if subject == "Türkçe" else "Türk Dili ve Edebiyatı: Konu Belirleme İncelemesi"
    return topic


def load_sources() -> tuple[dict, dict, dict]:
    pdf_records: dict[str, tuple[str, dict]] = {}
    for file in sorted(KAYIT.glob("*.json")):
        if file.name == "sb.json":
            continue
        data = json.loads(file.read_text(encoding="utf-8"))
        if not isinstance(data, dict) or not isinstance(data.get("kayitlar"), list):
            continue
        for record in data["kayitlar"]:
            if not isinstance(record, dict) or "id" not in record:
                continue
            code = record["id"]
            if code in pdf_records:
                raise ValueError(f"duplicate PDF record: {code}")
            pdf_records[code] = (file.name, record)
    sb_records = {r["id"]: r for r in json.loads((KAYIT / "sb.json").read_text(encoding="utf-8"))}
    cikmis_records = {r["id"]: r for r in json.loads(CIKMIS.read_text(encoding="utf-8"))["sorular"]}
    return pdf_records, sb_records, cikmis_records


def fingerprint(*parts: str) -> str:
    return hashlib.sha256("\x1f".join(parts).encode("utf-8")).hexdigest()[:16]


def classify(row: dict, bank: str, sources: tuple[dict, dict, dict]) -> dict:
    pdf_records, sb_records, cikmis_records = sources
    code, subject, topic = row["code"], row["subject"], row["topic"]
    text = heading = kazanım = unit = answer = ""
    image_hash = ""
    if bank == "CIKMIS":
        record = cikmis_records[code]
        text = record.get("metin") or ""
        answer = ",".join(record.get("cevaplar") or [])
        ref = f"veri-hatti/ogm-yks-cikmis/ham/sorular_son.json#id={code}"
        if record.get("konu") != topic and code != CANCELLED_CODE:
            raise ValueError(f"source topic differs from OGM catalog: {code}")
        if code == CANCELLED_CODE:
            # This card is absent from the OGM booklet and only the older
            # ÖSYM image survives locally. Its topic was checked visually.
            image_hash = hashlib.sha256(CANCELLED_IMAGE.read_bytes()).hexdigest()[:16]
    elif code in sb_records:
        record = sb_records[code]
        text, kazanım, unit = record.get("metin") or "", record.get("kazanim") or "", record.get("unite") or ""
        ref = f"veri-hatti/ogm-sorular/kayit/sb.json#id={code}"
    else:
        file, record = pdf_records[code]
        text, heading = record.get("metin") or "", record.get("konu_basligi") or ""
        ref = f"veri-hatti/ogm-sorular/kayit/{file}#id={code}"

    stem_label = find_stem_label(text, subject, topic)
    book_label = heading_label(heading, subject)
    outcome_label = sb_skill(kazanım, unit) if kazanım else None
    generic_grammar_outcome = "dil bilgisi calismalari" in plain(kazanım)
    review_reason = ""
    if code == CANCELLED_CODE:
        label, evidence_type = "Roman: Eser Tanıma", "assistant_image_review"
        confidence, review_required = "medium", "true"
        review_reason = "osym_cancelled_2026_ayt_tde_sb1_20;local_answer_B_not_validated"
    elif code in MANUAL_SOURCE_CORRECTIONS:
        if bank != "CIKMIS" or topic != "Nesir Bilgisi" or answer != "B":
            raise ValueError(f"manual source correction requires renewed review: {code}")
        label, evidence_type = MANUAL_SOURCE_CORRECTIONS[code], "assistant_question_text_review"
        confidence, review_required, review_reason = "medium", "true", "source_topic_conflicts_with_question;osym_answer_key"
    elif topic == UNCLASSIFIED:
        # An unknown source topic is never silently promoted to certainty.
        label = MANUAL_UNCLASSIFIED.get(code) or stem_label or source_label(topic, subject)
        evidence_type = "assistant_question_text_review" if code in MANUAL_UNCLASSIFIED else "question_stem" if stem_label else "subject_fallback"
        confidence, review_required, review_reason = "medium" if label != source_label(topic, subject) else "low", "true", "original_topic_unclassified"
    elif stem_label:
        label, evidence_type = stem_label, "question_stem"
        confidence = "high"
        review_required = "false"
        if book_label and book_label != label and not (plain(label) in plain(book_label) or plain(book_label) in plain(label)):
            review_required, review_reason = "true", "stem_and_test_heading_differ"
        if not text:
            raise ValueError(f"stem evidence without text: {code}")
    elif outcome_label:
        label, evidence_type = outcome_label, "sb_kazanim"
        confidence, review_required = "medium" if text else "low", "true"
        review_reason = "outcome_is_group_level" if text else "outcome_is_group_level;question_text_unavailable"
    elif generic_grammar_outcome and not text:
        label, evidence_type = f"{unit}: Dil Bilgisi (Alt Konu Belirsiz)", "sb_kazanim_general"
        confidence, review_required, review_reason = "low", "true", "generic_grammar_outcome;question_text_unavailable"
    elif book_label:
        label, evidence_type = book_label, "pdf_test_heading"
        confidence = "high" if text else "medium"
        review_required = "false" if text else "true"
        review_reason = "" if text else "question_text_unavailable"
        heading_without_number = re.sub(r"\s*-\s*\d+\s*$", "", heading).strip()
        multiple = any(token in heading_without_number for token in (" / ", ",", ">"))
        multiple = multiple or (" - " in heading_without_number and not heading_without_number.startswith("Sözcük Türleri - "))
        if multiple:
            confidence, review_required, review_reason = "medium", "true", "test_heading_covers_multiple_topics"
    elif kazanım and unit == "Giriş":
        label, evidence_type = "Edebiyata Giriş", "sb_unit"
        confidence, review_required, review_reason = "medium", "true", "unit_is_broad"
    else:
        label, evidence_type = source_label(topic, subject), "source_topic"
        confidence, review_required, review_reason = "medium", "true", "no_question_level_topic_evidence"
        if not text:
            confidence, review_reason = "low", "question_text_unavailable"
        elif generic_grammar_outcome:
            confidence, review_reason = "low", "generic_grammar_outcome_no_question_level_match"
    if not text and (kazanım or heading) and confidence == "medium":
        review_required = "true"
        review_reason = review_reason or "question_text_unavailable"
    if not label or label == UNCLASSIFIED:
        raise ValueError(f"empty or unresolved label: {code}")
    evidence_ref = f"{ref};field=" + {
        "assistant_question_text_review": "metin",
        "assistant_image_review": "gorsel",
        "question_stem": "metin",
        "sb_kazanim": "kazanim",
        "sb_kazanim_general": "kazanim",
        "sb_unit": "unite",
        "pdf_test_heading": "konu_basligi",
        "source_topic": "konu",
        "subject_fallback": "ders",
    }[evidence_type]
    if evidence_type == "assistant_image_review":
        evidence_ref = "veri-hatti/ogm-yks-cikmis/ham/img/eski/2026-AYT-TDE-20.webp"
    elif code in MANUAL_SOURCE_CORRECTIONS:
        evidence_ref = f"{ref};field=metin,cevaplar"
    if evidence_type == "source_topic" and bank == "OGM":
        evidence_ref = f"uygulama/veri/sorular-ogm.csv#code={code};field=topic"
    return {
        "bank": bank,
        "exam_type": row["exam_type"],
        "subject": subject,
        "code": code,
        "source_topic": topic,
        "label": label,
        "evidence_type": evidence_type,
        "evidence_ref": evidence_ref,
        "confidence": confidence,
        "review_required": review_required,
        "source_title": row["source"],
        "label_level": "subject" if evidence_type == "subject_fallback" else "topic" if label == topic else "subtopic",
        "review_reason": review_reason,
        "source_fingerprint": fingerprint(topic, heading, kazanım, unit, text, answer, image_hash),
        "approval_status": "teacher_pending",
        "official_status": "cancelled" if code == CANCELLED_CODE else "",
        "official_notice_url": CANCELLED_NOTICE if code == CANCELLED_CODE else "",
    }


def active_rows(filename: str) -> list[dict]:
    with (APP / "veri" / filename).open(encoding="utf-8-sig", newline="") as handle:
        return [r for r in csv.DictReader(handle)
                if r["active"].lower() == "true" and (r["exam_type"], r["subject"]) in SUBJECTS]


def render() -> tuple[str, list[dict]]:
    sources = load_sources()
    rows = []
    for bank, filename in (("CIKMIS", "sorular-tum.csv"), ("OGM", "sorular-ogm.csv")):
        for record in active_rows(filename):
            code = record["code"]
            if bank == "CIKMIS" and code not in sources[2]:
                raise ValueError(f"missing CIKMIS source record: {code}")
            if bank == "OGM" and code not in sources[0] and code not in sources[1]:
                raise ValueError(f"missing OGM source record: {code}")
            rows.append(classify(record, bank, sources))
    keys = [(r["bank"], r["code"]) for r in rows]
    if len(keys) != len(set(keys)):
        raise ValueError("duplicate output question")
    unresolved = {r["code"] for r in rows if r["source_topic"] == UNCLASSIFIED}
    if unresolved != set(MANUAL_UNCLASSIFIED):
        raise ValueError(f"unclassified question set changed; inspect: {sorted(unresolved ^ set(MANUAL_UNCLASSIFIED))}")
    corrections = {r["code"] for r in rows if r["code"] in MANUAL_SOURCE_CORRECTIONS}
    if corrections != set(MANUAL_SOURCE_CORRECTIONS):
        raise ValueError("manual source correction set changed")
    cancelled = [r for r in rows if r["code"] == CANCELLED_CODE and r["bank"] == "CIKMIS"]
    if len(cancelled) != 1 or cancelled[0]["official_status"] != "cancelled" or cancelled[0]["review_required"] != "true":
        raise ValueError("cancelled 2026 AYT Turkish question is not flagged")
    if any(not r["label"] or r["label"] == UNCLASSIFIED for r in rows):
        raise ValueError("some question has no useful label")
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, FIELDS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue(), rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    options = parser.parse_args()
    content, rows = render()
    if options.write:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(content, encoding="utf-8", newline="")
    elif OUTPUT.read_text(encoding="utf-8") != content:
        raise ValueError(f"generated labels differ from sources: {OUTPUT}")
    counts = Counter((r["bank"], r["exam_type"], r["subject"]) for r in rows)
    evidence = Counter(r["evidence_type"] for r in rows)
    conf = Counter(r["confidence"] for r in rows)
    print(f"{len(rows)} active questions, {len(set((r['bank'], r['code']) for r in rows))} unique; mode={'write' if options.write else 'check'}")
    for key, count in sorted(counts.items()):
        print(" / ".join(key), count)
    print("evidence:", dict(sorted(evidence.items())))
    print("confidence:", dict(sorted(conf.items())))
    print("teacher review flagged:", sum(r["review_required"] == "true" for r in rows))
    print("no primary label:", sum(not r["label"] for r in rows))


if __name__ == "__main__":
    main()
