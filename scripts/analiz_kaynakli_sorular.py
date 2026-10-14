"""Etiket, özgün soru kökü ve temel OGM ders PDF'lerini birlikte envanterler.

Otomatik soru kalıbı adayları pedagojik doğrulama sayılmaz. Soru metni yayımlanmaz.
Ham kelime tekrarını konu önemi olarak kullanmaz; aynı metnin farklı kartlarını
ayrıca sayar. --check deterministik raporu yeniden karşılaştırır.
"""

import argparse
import collections
import csv
import json
import re
from pathlib import Path

import pymupdf

from yayinla_kaynakli_notlar import normalized, digest, question_sources

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
OUTPUT = APP / "ornek-veri/kaynakli-analiz-ozet.json"
PATTERNS = [
    ("noktalama", "Noktalama işlevi ve işaret tamamlama", r"noktalama|noktanin|virgulun|virgul|ayrac"),
    ("yazim", "Yazım kuralını uygulama", r"yazim|yazilis"),
    ("ses", "Ses olayını kök ve ek üzerinden bulma", r"ses olay|ses degisim|unlu dus|unsuz|unlu dar"),
    ("ogeler", "Yüklemden hareketle öge çözümleme", r"ogenin|ogeler|ogeleri|ogeye|ogesi"),
    ("fiilimsi", "Fiilimsi ile çekimli fiili ayırma", r"fiilimsi|isim.fiil|sifat.fiil|zarf.fiil"),
    ("tamlama", "Tamlayan ve tamlanan ilişkisi", r"tamlama"),
    ("sozcuk-turu", "Sözcüğün cümledeki görevini belirleme", r"zamir|sifat|zarf|baglac|edat|isim soylu"),
    ("cumle-turu", "Cümleyi yüklem, anlam ve yapıyla sınıflama", r"cumle tur|yukleminin tur|yuklemin tur|kuralli cumle|birlesik cumle"),
    ("anlatim-bozuklugu", "Anlam veya yapı uyuşmazlığını giderme", r"anlatim bozuk"),
    ("anlatim", "Anlatım biçimi ve düşünceyi geliştirme yolu", r"anlatiminda|dusunceyi gelistirme|anlatim bicim"),
    ("cumle-birlestirme", "Yargıları bilgi kaybetmeden birleştirme", r"birlestiril|tek cumle|cumle birlest"),
    ("cumle-siralama", "Sözleri anlamlı ve kurallı cümleye sıralama", r"sozler.*siralandiginda|kuralli bir cumle olustur"),
    ("paragraf-yapisi", "Paragrafın akışı, sırası ve sınırı", r"paragrafa ayr|ikinci paragraf|akis|yer degistir|bastan|siralandiginda|getirilmesi|getirilmelidir"),
    ("ana-dusunce", "Ana düşünce veya tema", r"asil anlatil|ana dusunce|temasi|iletilmek isten|vurgulanmak isten"),
    ("konu", "Konu veya cevaplanan soruyu bulma", r"parcanin konusu|hangi soruya|sorusuna|uzerinde durul"),
    ("siir", "Şiirde biçim, ses ve ahenk", r"nazim|redif|kafiye|olcu|aruz|ahenk"),
    ("edebiyat", "Eser, sanatçı, dönem veya akımı tanıma", r"yazar|sair|sanatci|eser|donem|edebi akim|edebiyat"),
    ("cikarim", "Metinden desteklenen yargıyı ayırma", r"ulasil|cikaril|deginil|soylen|yargi|ulasila"),
    ("sozcuk-anlami", "Bağlamda sözcük veya söz anlamı", r"sozcuk|kelime|alti cizili|ifade|bos birakilan"),
]


def question_stem(text):
    text = re.sub(r"(?<=\w)[\-\u00ad]\s*\n(?=\w)", "", text)
    choice = re.search(r"(?m)^\s*A\s*\)|\bA\)", text)
    body = text[:choice.start()] if choice else text
    tail = body[-1100:]
    starts = list(re.finditer(r"\b(?:Bu (?:parça|cümle|dize|metin|söz|bilgi|şiir|açıklama)|Buna göre|Buna gore|Aşağıdaki|Numaralanmış|Yukarıdaki|Verilen|Parçada|Parçadan)", tail))
    return tail[starts[-1].start():].strip() if starts else ""


def classify_stem(text, subject):
    stem = question_stem(text)
    plain = normalized(stem)
    if len(plain) < 15:
        return "kok-incelenmeli"
    return next((key for key, _, expression in PATTERNS
                 if (key != "edebiyat" or subject == "Türk Dili ve Edebiyatı")
                 and re.search(expression, plain)), "karma-incelenmeli")


def build():
    rows = []
    for path in sorted((APP / "ornek-veri/etiketler").glob("*.csv")):
        with path.open(encoding="utf-8-sig", newline="") as stream:
            rows.extend(csv.DictReader(stream))
    keys = {(row["bank"], row["code"]) for row in rows}
    if len(keys) != len(rows):
        raise ValueError("Yinelenen kaynak soru kimliği")
    questions = question_sources(keys)
    missing = keys - questions.keys()
    if missing:
        raise ValueError(f"Kaynak soru kaydı eksik: {sorted(missing)[:10]}")

    groups = collections.defaultdict(list)
    for row in rows:
        groups[(row["exam_type"], row["subject"])].append(row)
    summaries = []
    for (exam, subject), records in sorted(groups.items()):
        topic_groups = collections.defaultdict(list)
        for row in records:
            topic_groups[row["label"]].append(row)
        topics = []
        for topic, entries in sorted(topic_groups.items()):
            text_hashes = set()
            banks = collections.Counter()
            patterns = collections.Counter()
            candidates = collections.defaultdict(list)
            text_missing = 0
            text_short = 0
            review = 0
            for row in entries:
                question = questions[(row["bank"], row["code"])]
                text = question.get("metin") or ""
                plain = normalized(text)
                banks[row["bank"]] += 1
                review += row["review_required"].casefold() in {"true", "yes", "evet", "1"}
                if not plain:
                    text_missing += 1
                    continue
                if len(plain) < 40:
                    text_short += 1
                    continue
                text_hashes.add(digest(plain.encode("utf-8")))
                if subject in {"Türkçe", "Türk Dili ve Edebiyatı"}:
                    pattern = classify_stem(text, subject)
                    patterns[pattern] += 1
                    if len(candidates[pattern]) < 3:
                        candidates[pattern].append({"bank": row["bank"], "code": row["code"]})
            topics.append({"label": topic, "records": len(entries), "banks": dict(sorted(banks.items())),
                           "distinctReadableText": len(text_hashes), "missingText": text_missing,
                           "shortOrVisualText": text_short, "needsReview": review,
                           "patternCandidates": dict(sorted(patterns.items())),
                           "candidateRefs": dict(sorted(candidates.items()))})
        summaries.append({"exam": exam, "subject": subject, "records": len(records), "topics": topics})

    catalog = json.loads((ROOT / "veri-hatti/ogm-indirme/katalog.json").read_text(encoding="utf-8"))
    pdfs = []
    subject_ids = {"turkce", "edebiyat", "tarih", "cografya", "felsefe", "din", "biyoloji", "kimya", "fizik", "matematik"}
    for item in catalog:
        if item["ders"] not in subject_ids or not item.get("dosya"):
            continue
        if item["ders"] == "matematik" and item["sinav"] != "AYT":
            continue
        if item["kaynak"] != "MEBİ Konu Özeti" and not (item["ders"] == "din" and item["kaynak"] == "Konu Anlatımı (Video + PDF)"):
            continue
        path = ROOT / "Kaynaklar/ogm-materyal" / item["dosya"]
        with pymupdf.open(path) as document:
            pages = [page.get_text() for page in document]
            empty = sum(len(normalized(page)) < 30 for page in pages)
            pdfs.append({"catalogId": item["id"], "title": item["baslik"], "exam": item["sinav"],
                         "pages": len(pages), "shortOrVisualPages": empty,
                         "sha256": digest(path.read_bytes()), "url": item["url"]})
    return {"schemaVersion": 1, "scope": "Etkin yerel envanter; otomatik soru kökü adayları ve temel OGM ders PDF'leri",
            "records": len(rows), "missingSourceRecords": len(missing), "teacherApproved": 0,
            "patternNames": {key: name for key, name, _ in PATTERNS}, "groups": summaries,
            "primaryLessonPdfs": pdfs}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    data = build()
    content = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if args.write:
        OUTPUT.write_text(content, encoding="utf-8")
    elif not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != content:
        raise ValueError("Analiz raporu eksik veya eski")
    print(f"{data['records']} kaynak kayıt, {len(data['groups'])} ders/sınav grubu, "
          f"{len(data['primaryLessonPdfs'])} temel konu PDF'si; eksik kaynak: 0")


if __name__ == "__main__":
    main()
