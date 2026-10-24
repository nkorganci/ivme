"""Give every OGM / Çıkmış soru that has no first-worksheet topic a ders, ünite and konu by reading its content.

The published catalogue (`learning_catalog.current_*`) is read-only here. The script writes
`veri/content-labels/question-topic-decisions.json`; `excel-curriculum-relabel.mjs` applies it as
new CANDIDATE assignments (teacher approval still required) and republishes. Existing topic
assignments are never changed.

Method per question, in order:
  EXACT_NAME  - the source names one Excel topic ("Mantık – Sembolleştirme") or an alias table entry.
  NAMED_UNIT  - the source heading (or its sub-heading) is an Excel unit; the topic is chosen inside it.
  DUPLICATE   - the same question text already has exactly one topic elsewhere in the bank.
  TEXT_MODEL  - question text and learning outcome read by a word + character TF-IDF SVM trained on the
                bank's single-topic questions plus the Excel names; the heading adds a reliability-weighted prior.
  PRIOR       - no readable text; the heading prior implies exactly one topic.
  CONTENT_READ - decided by reading the question text or image (`question-topic-reviewed.json`, {code: row});
                 identical-text copies follow as CONTENT_READ_COPY. Questions listed in
                 `question-topic-applied.json` were completed by an earlier run: they are planned again and are
                 never used as training labels.
Image-only questions without an unambiguous prior are listed in `reviewNeeded` for visual reading;
`--visual-decisions FILE` merges {code: [row topic names]} read from the images.
"""

import argparse
import collections
import json
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC

from kaynakli_arastirma_db import db_connection, query

APP = Path(__file__).resolve().parents[1]
STATE = APP / "veri/content-labels"
OUTPUT = STATE / "question-topic-decisions.json"
REVIEWED = STATE / "question-topic-reviewed.json"  # {code: Excel row id} read from the question text or image
APPLIED = STATE / "question-topic-applied.json"  # keys whose topic was added by this planner; planned again, never used as training labels
REVIEW_BELOW = 0.8
MIN_TEXT = 40
DUPLICATE_SIMILARITY = 0.93
SOFTMAX_SCALE = 4.0
OTHER_EXAM_WEIGHT = 0.3

# Excel subjects that share one question pool because the source book does not separate them.
GROUP = {"matematik": "mat", "geometri": "mat", "turkce": "tr", "edebiyat": "tr",
         "felsefe": "fel", "mantik": "fel", "psikoloji": "fel", "sosyoloji": "fel"}
# Source subject -> Excel subjects its questions may belong to.
SOURCE_SUBJECTS = {"Türkçe": {"turkce"}, "Türk Dili ve Edebiyatı": {"edebiyat", "turkce"}, "Matematik": {"matematik", "geometri"},
                   "Geometri": {"geometri"}, "Felsefe": {"felsefe", "mantik", "psikoloji", "sosyoloji"},
                   "Felsefe Grubu": {"felsefe", "mantik", "psikoloji", "sosyoloji"}, "Biyoloji": {"biyoloji"},
                   "Coğrafya": {"cografya"}, "Din Kültürü": {"din"}, "Fizik": {"fizik"}, "Kimya": {"kimya"}, "Tarih": {"tarih"}}
SUBJECT_NAMES = {"mantik": "mantik", "psikoloji": "psikoloji", "sosyoloji": "sosyoloji", "felsefe": "felsefe"}
# Groups whose Excel rows are exam-specific in a way the source exam must respect.
STRICT_EXAM = {"tr", "mat"}


def norm(text):
    text = (text or "").replace("İ", "i").replace("I", "ı").lower().replace("ı", "i")
    text = text.replace("’", "").replace("'", "")
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"\bxxi\b", "21", text)
    text = re.sub(r"\bxx\b", "20", text)
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


# Source name -> the Excel topics (subject, title) it implies. A weighted prior for the text model.
# (source subject, source topic, alt or None for any)
TOPIC_PRIORS = [
    ("Türk Dili ve Edebiyatı", "Öğretici ve Diğer Metin Türleri", None, [("edebiyat", "Nesir Bilgisi")], 3.0),
    ("Türk Dili ve Edebiyatı", "Türk Şiiri", "Divan Şiiri", [("edebiyat", "Divan Edebiyatı")]),
    ("Türk Dili ve Edebiyatı", "Türk Şiiri", "Halk Şiiri", [("edebiyat", "Halk Edebiyatı")]),
    ("Türk Dili ve Edebiyatı", "Türk Şiiri", "Tanzimat Dönemi Şiiri", [("edebiyat", "Tanzimat Dönemi Türk Edebiyatı")]),
    ("Türk Dili ve Edebiyatı", "Türk Şiiri", "İslamiyet Öncesi ve Geçiş Dönemi Şiiri",
     [("edebiyat", "İslamiyet Öncesi Türk Edebiyatı / Geçiş Dönemi Türk Edebiyatı")]),
    ("Türk Dili ve Edebiyatı", "Roman", "Roman Bilgisi", [("edebiyat", "Nesir Bilgisi")], 3.0),
    ("Türk Dili ve Edebiyatı", "Roman", "Cumhuriyet Dönemi Romanı", [("edebiyat", "Cumhuriyet Dönemi Türk Edebiyatı")]),
    ("Türk Dili ve Edebiyatı", "Roman", "Tanzimat, Servetifünun ve Millî Edebiyat Romanı",
     [("edebiyat", "Tanzimat Dönemi Türk Edebiyatı"), ("edebiyat", "Servetifünun Dönemi Türk Edebiyatı/ Fecriâti Dönemi Türk Edebiyatı"),
      ("edebiyat", "Millî Edebiyat Dönemi Türk Edebiyatı")]),
    ("Türk Dili ve Edebiyatı", "Tiyatro", "Tiyatro Bilgisi", [("edebiyat", "Geleneksel Türk Tiyatrosu")]),
    ("Türk Dili ve Edebiyatı", "Tiyatro", "Cumhuriyet Dönemi Tiyatrosu", [("edebiyat", "Cumhuriyet Dönemi Türk Edebiyatı")]),
    ("Türk Dili ve Edebiyatı", "Tiyatro", "Tanzimat, Servetifünun ve Millî Edebiyat Tiyatrosu",
     [("edebiyat", "Tanzimat Dönemi Türk Edebiyatı"), ("edebiyat", "Servetifünun Dönemi Türk Edebiyatı/ Fecriâti Dönemi Türk Edebiyatı"),
      ("edebiyat", "Millî Edebiyat Dönemi Türk Edebiyatı")]),
    ("Türkçe", "Sözcük Bilgisi", "Sözcükte yapı (kök, yapım ve çekim ekleri)", [("turkce", "Biçim Bilgisi")]),
    ("Türkçe", "Sözcük Bilgisi", "Sözcük türleri (isim, zamir, sıfat, zarf, edat, bağlaç, ünlem)",
     [("turkce", "İsim Soylu Sözcükler"), ("turkce", "Fiiller")]),
    ("Türkçe", "Sözcük Bilgisi", "Sözcük grupları (tamlamalar, öbekler)", [("turkce", "Cümlenin Öğeleri")]),
    ("Geometri", "Temel Geometri ve Üçgenler", "Üçgende alan", [("geometri", "Üçgenin Alanı/ Üçgenin Alanı ile ilgili Uygulamalar")]),
    ("Geometri", "Temel Geometri ve Üçgenler", "Üçgende açı-kenar bağıntıları", [("geometri", "Üçgenlerde Temel Kavramlar")]),
    ("Geometri", "Temel Geometri ve Üçgenler", "Açıortay-kenarortay", [("geometri", "Üçgenin Yardımcı Elemanları")]),
    ("Kimya", "Doğa ve Kimya", "Su, Hayat ve Çevre Kimyası", [("kimya", "Yaygın Günlük Hayat Kimyasalları")]),
    ("Din Kültürü", "Yahudilik ve Hıristiyanlık", None, [("din", "Yahudilik"), ("din", "Hristiyanlık")]),
    ("Din Kültürü", "İslam ve Bilim", None, [("din", "İslam Medeniyetinde Bilim ve Düşüncenin Gelişimi")]),
]

# Çıkmış soru titles and book chapters that name a topic with another wording, or a topic the
# Excel sheet does not list: the nearest Excel topic is used. (exam, source subject, source topic)
TOPIC_ALIASES = {
    ("AYT", "Fizik", "Atom Kavramının Tarihsel Gelişimi"): [("fizik", "Atom Modelleri")],
    ("AYT", "Fizik", "Dalgalarda Kırınım, Girişim ve Doppler Olayı"): [("fizik", "Dalga Mekaniği ve Elektromanyetik Dalgalar")],
    ("AYT", "Fizik", "Denge ve Denge Şartları"): [("fizik", "Kuvvet, Tork ve Denge")],
    ("AYT", "Fizik", "Dönerek Öteleme Hareketi"): [("fizik", "Dönme, Yuvarlanma ve Açısal Momentum")],
    ("AYT", "Fizik", "Elektriksel Potansiyel"): [("fizik", "Elektrik Alan ve Potansiyel")],
    ("AYT", "Fizik", "Fotoelektrik Olayı"): [("fizik", "Fotoelektrik Olay")],
    ("AYT", "Fizik", "Görüntüleme Teknolojileri"): [("fizik", "Modern Fiziğin Teknolojideki Uygulamaları")],
    ("AYT", "Fizik", "Kepler Kanunları"): [("fizik", "Kütle Çekim ve Kepler Yasaları")],
    ("AYT", "Fizik", "Laser Işınları"): [("fizik", "Modern Fiziğin Teknolojideki Uygulamaları")],
    ("AYT", "Fizik", "Manyetizma ve Elektromanyetik İndüklenme"): [("fizik", "Manyetik Alan ve Manyetik Kuvvet"), ("fizik", "Elektromanyetik İndüksiyon")],
    ("AYT", "Fizik", "Süper İletkenler"): [("fizik", "Modern Fiziğin Teknolojideki Uygulamaları")],
    ("AYT", "Fizik", "Tork"): [("fizik", "Kuvvet, Tork ve Denge")],
    ("TYT", "Fizik", "Fizik Biliminin Önemi"): [("fizik", "Fizik Bilimine Giriş")],
    ("TYT", "Fizik", "Isıl Denge"): [("fizik", "Isı, Sıcaklık ve Genleşme")],
    ("TYT", "Fizik", "Madde ve Özkütle"): [("fizik", "Madde ve Özellikleri")],
    ("TYT", "Fizik", "Newton’ın Hareket Yasaları"): [("fizik", "Hareket ve Kuvvet")],
    ("TYT", "Fizik", "Sürtünme Kuvveti"): [("fizik", "Hareket ve Kuvvet")],
    ("TYT", "Fizik", "Yapışma ve Birbirini Tutma"): [("fizik", "Madde ve Özellikleri")],
    ("AYT", "Biyoloji", "Dolaşım Sistemi"): [("biyoloji", "Dolaşım Sistemleri")],
    ("AYT", "Kimya", "Kimyasal Tepkimelerde Hesaplamalar"): [("kimya", "Kimyasal Tepkimelerde Hesaplamalar")],
    # The 12th-grade chapter on energy resources, recycling and nanotechnology has no Excel unit;
    # its fossil-fuel content is closest to hydrocarbons.
    ("AYT", "Kimya", "Enerji Kaynakları ve Bilimsel Gelişmeler"): [("kimya", "Hidrokarbonlar", "Organik Bileşikler")],
}

# Topics that no question in the bank is labelled with yet get a short description of their content so the
# text model can still recognise them. Plain subject knowledge of the Excel topic titles, nothing else.
KEYWORDS = {
    ("tarih", "İlk Çağ’da Başlıca Medeniyet Havzaları"): "mezopotamya sümer akad babil asur hitit mısır firavun nil hint çin ilk çağ medeniyet havzaları yazı şehir devleti piramit tapınak rahip",
    ("tarih", "Kanunlar Doğuyor"): "hammurabi kanunları urukagina ur-nammu yazılı hukuk kanun koyucu hukuk kuralları ceza kanunları",
    ("tarih", "İnsanlığın İlk İzleri"): "paleolitik neolitik mezolitik taş devri tunç çağı demir çağı ateş tarım yerleşik hayat avcı toplayıcı göçebe çatalhöyük göbeklitepe mağara ilk insan",
    ("tarih", "İslamiyet Yayılıyor"): "hz muhammed hicret mekke medine dört halife raşit halifeler emeviler fetih arap yarımadası vahiy kur’an islam dini cihat bedir uhud",
    ("tarih", "Abbasi Devleti ve Türkler"): "abbasi abbasiler bağdat horasan türklerin orduda talas muhtasım samarra beytülhikme emeviler abbasi iktidar",
    ("tarih", "Osmanlı Devleti’nde İsyanlar ve Düzeni Koruma Çabaları"): "celali isyanları ayan kuyucu murat paşa kadızade sipahi yeniçeri isyanı düzeni koruma karışıklık ıslahat",
    ("tarih", "Avrupa’da Değişim Çağı"): "rönesans reform coğrafi keşifler aydınlanma sanayi devrimi merkantilizm kapitalizm burjuva feodalite avrupa dönüşüm",
    ("tarih", "Türk İslam Dünyasında Birliği Sağlama Çabaları"): "memlûk mısır yavuz sultan selim çaldıran ridaniye halifelik hilafet safevi şah ismail türk islam birliği",
    ("tarih", "İstanbul’un Fethi ve Fethin Sonuçları"): "istanbul fethi fatih sultan mehmet bizans surlar konstantinopolis ayasofya fetih",
    ("tarih", "Dünyanın Muhteşem Gücü Osmanlı"): "kanuni sultan süleyman muhteşem yüzyıl donanma preveze akdeniz kapitülasyon zigetvar mohaç avrupa siyaseti",
    ("tarih", "Osmanlı Devleti’nde Tımar Sistemi"): "tımar sistemi sipahi tımarlı has zeamet dirlik gelir bölüşümü",
    ("tarih", "Devşirme Sistemi ve Yeniçeri Ocağı"): "devşirme yeniçeri ocağı acemi oğlan kapıkulu enderun",
    ("tarih", "İnsanlığın Hafızası Tarih"): "tarih bilimi tarih nedir kaynaklar yazılı belge arkeoloji tarihçi yardımcı bilimler tarih yazımı",
    ("tarih", "Zamanın Taksimi"): "takvim çağlar hicri miladi zaman dilimi kronoloji yüzyıl dönem başlangıç",
    ("tarih", "Osmanlı’da Devletin Toprak Üzerindeki Mülkiyeti ve Çifthane Sistemi"): "miri toprak çifthane sistemi çiftçi vakıf mülk toprak mülkiyeti",
    ("tarih", "Osmanlı Devleti’nde Millet Sistemi"): "millet sistemi gayrimüslim rum ermeni yahudi cemaat patrik hoşgörü azınlık",
    ("tarih", "Osmanlı Devleti’nde Modern Orduya Geçiş"): "nizam-ı cedit iii. selim yeniçeri ocağı kaldırılması vaka-i hayriye asakir-i mansure-i muhammediye modern ordu",
    ("tarih", "İhtilaller Çağı"): "fransız ihtilali milliyetçilik ihtilal bağımsızlık sırp rum isyanı yunan",
    ("tarih", "I. Dünya Savaşı Sürecinde Osmanlı Devleti"): "çanakkale kafkas irak cephesi mondros sarıkamış birinci dünya savaşı cepheler",
    ("tarih", "I. Dünya Savaşı’nın Sonuçları"): "versay paris barış konferansı sevr mandater milletler cemiyeti savaş sonrası",
    ("tarih", "20. Yüzyıl Başlarında Osmanlı Devleti"): "trablusgarp balkan savaşları ittihat ve terakki ikinci meşrutiyet 31 mart",
    ("tarih", "Mustafa Kemal’in Lider Olarak Yetişmesinde Etkili Koşullar"): "mustafa kemal selanik manastır harbiye lider yetişmesi",
    ("tarih", "Hilal ve Haç Mücadelesi"): "haçlı seferleri selçuklu bizans malazgirt kılıç arslan latin krallığı",
    ("tarih", "Boylardan Devlete"): "boy oymak hun göktürk uygur devlet teşkilatı kağan kurultay töre",
    ("tarih", "Kavimler Göçü"): "kavimler göçü hunlar avrupa roma germen göç",
    ("tarih", "Coğrafya ile Oluşan Yaşam Tarzı"): "ipek yolu göçebe yaşam atlı kültür step kürk yolu ticaret yolları orta asya",
}
# How strongly a source name may outweigh the text model, by how the source label was produced.
PRIOR_BONUS = {"kaz": 0.5, "kaz-ikiz": 0.5, "elle": 0.5, "baslik-elle": 0.5, "baslik": 0.3}
DEFAULT_PRIOR_BONUS = 0.1


def fetch(connection, sql):
    return json.loads(query(connection, sql))


def load(database=None):
    connection = db_connection(database)
    topics = fetch(connection, """SELECT json_agg(json_build_object('id',category_id,'exam',definition->>'exam',
        'subject',definition->>'subjectId','unit',definition->>'unit','topic',definition->>'topic',
        'row',definition->>'excelRowId'))
        FROM learning_catalog.current_categories WHERE (definition->>'selectable') IS DISTINCT FROM 'false'
        AND definition->>'curriculumSource'='EXCEL_FIRST_SHEET'""")
    questions = fetch(connection, """SELECT json_agg(json_build_object('key',i.item_key,'code',i.question_code,
        'exam',i.exam,'bank',i.data->>'bank','categories',
        (SELECT coalesce(json_agg(json_build_object('id',a.category_id,'relation',a.relation)),'[]'::json)
         FROM learning_catalog.assignments a WHERE a.run_key=i.run_key AND a.item_key=i.item_key)))
        FROM learning_catalog.current_items i WHERE i.kind='QUESTION' AND i.student_visible
        AND i.data->>'bank' IN ('OGM','CIKMIS')""")
    run = fetch(connection, "SELECT json_build_object('runKey',run_key) FROM learning_catalog.current_run")["runKey"]
    inventory = json.loads((STATE / "source-inventory.json").read_text(encoding="utf-8"))["questions"]
    return topics, questions, {q["code"]: q for q in inventory}, run


def squash(text):
    return re.sub(r"\s+", " ", (text or "").lower()).strip()


class GroupModel:
    """Word + character TF-IDF SVM over one subject group, trained on the bank's single-topic questions."""

    def __init__(self, training, names):
        self.words = TfidfVectorizer(sublinear_tf=True, ngram_range=(1, 2), min_df=2, max_features=250000)
        self.chars = TfidfVectorizer(sublinear_tf=True, analyzer="char_wb", ngram_range=(3, 5), min_df=3, max_features=300000)
        self.outcomes = TfidfVectorizer(sublinear_tf=True, ngram_range=(1, 2), min_df=2)
        self.duplicates = TfidfVectorizer(sublinear_tf=True, ngram_range=(1, 2), min_df=1)
        texts = [t for t, _, _ in training] + [n for n, _ in names for _ in range(3)]
        outcomes = [k for _, k, _ in training] + [""] * (3 * len(names))
        labels = [r for _, _, r in training] + [r for _, r in names for _ in range(3)]
        weights = [1.0] * len(training) + [6.0] * (3 * len(names))
        features = hstack([self.words.fit_transform(texts), self.chars.fit_transform(texts), self.outcomes.fit_transform(outcomes)]).tocsr()
        self.classifier = LinearSVC(C=0.5, class_weight="balanced")
        self.classifier.fit(features, labels, sample_weight=weights)
        self.index = {row: i for i, row in enumerate(self.classifier.classes_)}
        real = [t for t, _, _ in training]
        self.duplicate_matrix = self.duplicates.fit_transform(real)
        self.duplicate_labels = [r for _, _, r in training]

    def vector(self, text, outcome):
        return hstack([self.words.transform([text]), self.chars.transform([text]), self.outcomes.transform([outcome])]).tocsr()

    def scores(self, text, outcome, candidates):
        margin = self.classifier.decision_function(self.vector(text, outcome))[0]
        raw = np.array([margin[self.index[row]] if row in self.index else -5.0 for row in candidates])
        raw = np.exp(SOFTMAX_SCALE * (raw - raw.max()))
        return dict(zip(candidates, raw / raw.sum()))

    def duplicate_of(self, text, allowed):
        similarity = (self.duplicate_matrix @ self.duplicates.transform([text]).T).toarray().ravel()
        near = [(self.duplicate_labels[i], similarity[i]) for i in np.argsort(-similarity)[:5] if similarity[i] >= DUPLICATE_SIMILARITY]
        near = [(row, s) for row, s in near if row in allowed]
        if near and len({row for row, _ in near}) == 1:
            return near[0]
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--database", default=None)
    parser.add_argument("--stats", action="store_true", help="print the plan without writing decisions")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    topics, questions, inventory, run = load(args.database)
    by_id = {t["id"]: t for t in topics}
    rows = collections.defaultdict(dict)  # row id -> exam -> category id
    for t in topics:
        rows[t["row"]][t["exam"]] = t["id"]
    row_info = {}
    for row, exams in rows.items():
        first = by_id[next(iter(exams.values()))]
        row_info[row] = {"subject": first["subject"], "unit": first["unit"], "topic": first["topic"],
                         "exams": sorted(exams), "group": GROUP.get(first["subject"], first["subject"])}
    row_by_name = collections.defaultdict(list)  # (subject, norm topic) -> rows
    rows_by_unit = collections.defaultdict(list)  # (subject, norm unit) -> rows
    rows_by_subject = collections.defaultdict(list)
    for row, info in row_info.items():
        row_by_name[(info["subject"], norm(info["topic"]))].append(row)
        rows_by_unit[(info["subject"], norm(info["unit"]))].append(row)
        rows_by_subject[info["subject"]].append(row)
    groups = collections.defaultdict(list)
    for row, info in row_info.items():
        groups[info["group"]].append(row)

    def topic_rows(spec):
        found = []
        for subject, name, *unit in spec:
            hit = [r for r in row_by_name.get((subject, norm(name)), []) if not unit or norm(row_info[r]["unit"]) == norm(unit[0])]
            if len(hit) != 1:
                raise ValueError(f"Rule does not match exactly one Excel topic: {subject} / {name}")
            found.append(hit[0])
        return found

    applied = set(json.loads(APPLIED.read_text(encoding="utf-8"))) if APPLIED.exists() else set()
    labelled, none = {}, []
    for q in questions:
        related = {c["id"] for c in q["categories"] if c["relation"] != "PREREQUISITE" and c["id"] in by_id}
        if q["key"] in applied or not related:
            none.append(q)
        elif len(related) == 1:
            labelled[q["code"]] = by_id[next(iter(related))]["row"]
    print(f"questions {len(questions)}; single-topic (training) {len(labelled)}; without topic {len(none)}")

    def source_fields(code):
        inv = inventory.get(code) or {}
        card = inv.get("card") or {}
        return squash((inv.get("original") or {}).get("text")), squash(card.get("kzn"))

    models = {}

    def model_for(group):
        if group not in models:
            training = []
            for code, row in labelled.items():
                if row_info[row]["group"] == group:
                    text, outcome = source_fields(code)
                    if len(text) >= MIN_TEXT:
                        training.append((text, outcome, row))
            names = [(squash(f"{row_info[r]['topic']} {row_info[r]['unit']} {KEYWORDS.get((row_info[r]['subject'], row_info[r]['topic']), '')}"), r)
                     for r in groups[group]]
            print(f"  training {group}: {len(training)} questions, {len(names)} topics", flush=True)
            models[group] = GroupModel(training, names)
        return models[group]

    def category_for(row, exam):
        exams = rows[row]
        return exams.get(exam) or next(iter(exams.values()))

    decisions, review, queue, stats = {}, [], [], collections.Counter()
    for q in none:
        inv = inventory[q["code"]]
        card = inv.get("card") or {}
        subject, source_topic, alt = inv["subject"], inv["topic"], card.get("alt") or ""
        allowed_subjects = set(SOURCE_SUBJECTS.get(subject, ()))
        if not allowed_subjects:
            review.append({"key": q["key"], "code": q["code"], "reason": "unknown source subject"}); continue
        parts = re.split(r"\s+[–-]\s+", source_topic, maxsplit=1)
        named_subject = SUBJECT_NAMES.get(norm(parts[0] if len(parts) == 2 else source_topic))
        if named_subject and named_subject in allowed_subjects:
            allowed_subjects = {named_subject}
        group = GROUP.get(sorted(allowed_subjects)[0], sorted(allowed_subjects)[0])
        method, hard, prior_rows = None, None, []

        if len(parts) == 2 and named_subject in allowed_subjects:  # "Mantık – Akıl İlkeleri"
            hit = row_by_name.get((named_subject, norm(parts[1])), [])
            if len(hit) == 1:
                hard, method = hit, "EXACT_NAME"
        alias = TOPIC_ALIASES.get((q["exam"], subject, source_topic))
        if hard is None and alias:
            hard, method = topic_rows(alias), "EXACT_NAME"
        if hard is None:  # the heading, or its sub-heading, is an Excel unit
            for name in (source_topic, alt):
                unit_rows = [r for s in sorted(allowed_subjects) for r in rows_by_unit.get((s, norm(name)), [])]
                if name and unit_rows:
                    hard, method = unit_rows, "NAMED_UNIT"; break
        strength = 1.0
        for source_subject, topic_name, alt_name, targets, *extra in TOPIC_PRIORS:
            if source_subject == subject and topic_name == source_topic and alt_name in (None, alt):
                prior_rows, strength = topic_rows(targets), (extra[0] if extra else 1.0); break
        pool = hard or [r for s in sorted(allowed_subjects) for r in rows_by_subject[s]]
        text, outcome = source_fields(q["code"])
        readable = len(text) >= MIN_TEXT
        runner_up = None
        if hard and len(hard) == 1:
            chosen, score = hard[0], 1.0
        elif readable:
            model = model_for(group)
            duplicate = None if hard else model.duplicate_of(text, set(pool))
            if duplicate:
                chosen, score, method = duplicate[0], float(duplicate[1]), "DUPLICATE"
            else:
                weights = model.scores(text, outcome, pool)
                if group not in STRICT_EXAM:
                    weights = {r: w * (1.0 if q["exam"] in row_info[r]["exams"] else OTHER_EXAM_WEIGHT) for r, w in weights.items()}
                elif not hard:
                    weights = {r: w for r, w in weights.items() if q["exam"] in row_info[r]["exams"]} or weights
                bonus = PRIOR_BONUS.get(card.get("yon"), DEFAULT_PRIOR_BONUS) * strength
                for row in prior_rows:
                    if row in weights:
                        weights[row] += bonus
                total = sum(weights.values()) or 1.0
                ranked = sorted(weights, key=weights.get, reverse=True)
                chosen, score = ranked[0], weights[ranked[0]] / total
                runner_up = (ranked[1], round(weights[ranked[1]] / total, 3)) if len(ranked) > 1 else None
                method = (method + "+TEXT") if method else "TEXT_MODEL"
        elif len(prior_rows) == 1:
            chosen, score, method = prior_rows[0], 0.5, "PRIOR"
        else:
            review.append({"key": q["key"], "code": q["code"], "exam": q["exam"], "subject": subject, "topic": source_topic, "alt": alt,
                           "candidates": [row_info[r]["topic"] for r in (hard or prior_rows)][:8]})
            stats["review-needed"] += 1
            continue
        decisions[q["key"]] = {"code": q["code"], "exam": q["exam"], "category": category_for(chosen, q["exam"]), "method": method,
                               "score": round(score, 3), "sourceTopic": source_topic, "alt": alt, "row": chosen,
                               **({"runnerUp": {"category": category_for(runner_up[0], q["exam"]), "score": runner_up[1]}} if runner_up else {})}
        stats[method] += 1
        if "TEXT" in method and score < REVIEW_BELOW and chosen not in prior_rows or method == "PRIOR":
            queue.append({"key": q["key"], "code": q["code"], "exam": q["exam"], "group": group, "method": method,
                          "unit": row_info[hard[0]]["unit"] if method.startswith("NAMED_UNIT") else None,
                          "pool": sorted(pool, key=lambda r: (row_info[r]["subject"], row_info[r]["unit"], row_info[r]["topic"]))})

    reviewed = json.loads(REVIEWED.read_text(encoding="utf-8")) if REVIEWED.exists() else {}
    reviewed_copy = set()
    exam_of = {q["code"]: (q["key"], q["exam"]) for q in none}
    for code, row in reviewed.items():
        if code not in exam_of or row not in rows:
            continue
        key, exam = exam_of[code]
        old = decisions.get(key, {})
        decisions[key] = {**old, "code": code, "exam": exam, "category": category_for(row, exam), "row": row, "method": "CONTENT_READ",
                          "score": 1.0, "sourceTopic": old.get("sourceTopic", ""), "alt": old.get("alt", "")}
        stats["CONTENT_READ"] += 1
    # The bank holds the same question under several codes (books, mock exams); a read decision applies to its copies.
    def text_key(code):
        text = source_fields(code)[0]
        return re.sub(r"[^a-z0-9ğüşöçı]", "", re.sub(r"^\d+\.\s*", "", text)) if len(text) >= MIN_TEXT else None
    read_text = {}
    for code, row in reviewed.items():
        key = text_key(code)
        if key:
            read_text.setdefault(key, row)
    pending = [q for q in none if q["code"] not in reviewed]
    for q in pending:
        key = text_key(q["code"])
        if key in read_text and not (decisions.get(q["key"], {}).get("method") in ("EXACT_NAME", "NAMED_UNIT")):
            old = decisions.get(q["key"], {})
            decisions[q["key"]] = {**old, "code": q["code"], "exam": q["exam"], "category": category_for(read_text[key], q["exam"]),
                                   "row": read_text[key], "method": "CONTENT_READ_COPY", "score": 1.0,
                                   "sourceTopic": old.get("sourceTopic", ""), "alt": old.get("alt", "")}
            stats["CONTENT_READ_COPY"] += 1
            reviewed_copy.add(q["code"])
    review = [r for r in review if r.get("code") not in reviewed and r.get("code") not in reviewed_copy]
    queue = [r for r in queue if r["code"] not in reviewed and r["code"] not in reviewed_copy]
    print(dict(stats), "| still to read:", len(queue), "| image-only without a prior:", len(review))
    if args.stats:
        return
    OUTPUT.write_text(json.dumps({"basedOnRun": run, "methods": dict(stats), "decisions": decisions,
                                  "reviewNeeded": review, "reviewQueue": queue}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("wrote", OUTPUT, len(decisions), "decisions;", len(review), "for visual review")


if __name__ == "__main__":
    main()
