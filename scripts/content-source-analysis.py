"""Preserve Codex source-reading proposals for the 243 formerly unclassified cards.

Single-question assignments below were selected in this session from the actual
source text (eight also from their WebP). Mixed cards are split by printed question
numbers and use explicit, auditable concept cues. All remain unapproved proposals.
No answer is inferred or changed. The stored result binds every proposal to its text.
"""
import hashlib
import json
import re
import unicodedata
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
STATE = APP / "veri/content-labels"
DECISIONS = """
0|Soğuk Savaş
1|Türev ve uygulamaları;Eşitsizlik sistemleri;Fonksiyonlar
2|Fonksiyonlar;Temel kavramlar ve eşitsizlikler
3|Soğuk Savaş
4|Fonksiyonlar;Temel kavramlar ve eşitsizlikler
5|geometri:Analitik düzlemde doğru;geometri:Üçgenler
6|Şair, yazar ve eser eşleştirmeleri;Cumhuriyet dönemi Türk edebiyatı
7|19. yüzyılda Osmanlı ve Avrupa
8|Polinomlar;Türev ve uygulamaları
9|geometri:Dörtgenler ve çokgenler;Oran ve orantı
10|geometri:Dörtgenler ve çokgenler;Fonksiyonlar
11|Türev ve uygulamaları;geometri:Analitik düzlemde doğru
12|Şair, yazar ve eser eşleştirmeleri;Metin türleri
13|Tanzimat edebiyatı
14|Servetifünun ve Fecriati
15|İntegral ve uygulamaları;Fonksiyonlar
16|Basit harmonik hareket;Newton’ın hareket yasaları
17|Felsefeyi tanıma
18|İlk Çağ uygarlıkları
19|Osmanlı kültür ve medeniyeti;Osmanlı’da değişim ve diplomasi
20|Çevre sorunları ve doğal afetler
21|İlk Türk devletleri;İslam tarihi;İlk Çağ uygarlıkları
22|Osmanlı kültür ve medeniyeti;Türk İslam devletleri
23|Osmanlı kültür ve medeniyeti
24|Osmanlı’da değişim ve diplomasi
27|Osmanlı’da değişim ve diplomasi
28|Ahlak, siyaset, sanat ve din felsefesi
31|Atatürk ilke ve inkılapları
32|Bilim felsefesi
33|psikoloji:Ruh sağlığı ve kişilik
36|Ahlak, siyaset, sanat ve din felsefesi
38|Ahlak, siyaset, sanat ve din felsefesi
41|Osmanlı’da değişim ve diplomasi
47|20. yüzyıl başlarında Osmanlı
48|AYT/matematik:Binom açılımı
50|Tarih bilimi ve zaman
52|Cümlede anlam
54|Osmanlı’da değişim ve Avrupa;Osmanlı kültür ve medeniyeti
55|Felsefeyi tanıma
57|Olasılık;geometri:Üçgende kenar ve açı bağıntıları
60|Fizik bilimine giriş
61|Canlıların sınıflandırılması
62|Canlıların sınıflandırılması
63|Canlıların sınıflandırılması
64|Tanzimat edebiyatı;Şair, yazar ve eser eşleştirmeleri
65|Soğuk Savaş
66|fizik:Isı, sıcaklık ve genleşme
67|Şair, yazar ve eser eşleştirmeleri;Tanzimat edebiyatı;Servetifünun ve Fecriati
68|cografya:Nüfus politikaları
69|turkce:Paragrafta konu ve ana düşünce
70|AYT/matematik:Parabol;geometri:Özel dörtgenler
71|Divan edebiyatı;Şair, yazar ve eser eşleştirmeleri
72|Grafik ve tablo problemleri;Hareket problemleri
73|AYT/biyoloji:Dolaşım ve bağışıklık
74|İlk Türk devletleri;Türk İslam devletleri
76|Üçgende alan;Özel dörtgenler
77|Kümeler
78|geometri:Üçgende yardımcı elemanlar;geometri:Üçgende eşlik ve benzerlik
80|İntegral ve uygulamaları;Polinomlar;Türev ve uygulamaları
81|Analitik düzlemde doğru;Dönüşümler
82|Çember ve daire;Katı cisimler
84|Felsefeyi tanıma
86|geometri:Üçgenler;İkinci dereceden denklemler
87|Fonksiyonlar;Diziler
88|Cumhuriyet dönemi Türk edebiyatı;Şair, yazar ve eser eşleştirmeleri
89|Osmanlı’da değişim ve diplomasi
90|Türk İslam devletleri
91|Türev ve uygulamaları;geometri:Analitik düzlemde doğru
92|Edebî akımlar;Cumhuriyet dönemi Türk edebiyatı
93|Millî Edebiyat
94|Türk İslam devletleri
95|Fonksiyonlar;Eşitsizlik sistemleri
96|Limit ve süreklilik;Polinomlar
97|Eşitsizlik sistemleri
98|Dörtgenler ve çokgenler;matematik:Temel kavramlar ve eşitsizlikler
99|Çemberin analitiği
100|Şair, yazar ve eser eşleştirmeleri;Öğretici metinler
101|Şair, yazar ve eser eşleştirmeleri;Öğretici metinler
102|Diziler
103|geometri:Dörtgenler ve çokgenler;Oran ve orantı
104|Temel kavramlar ve eşitsizlikler
105|Halk edebiyatı;Metin türleri
106|Logaritma;geometri:Dörtgenler ve çokgenler
107|Cumhuriyet dönemi Türk edebiyatı;Roman ve hikâye
108|İstatistik;Temel kavramlar ve eşitsizlikler
109|geometri:Üçgenler
110|Kalıtımın genel ilkeleri;Hücre bölünmeleri
111|Doğa ve kimya
112|Tepkime hızı;Kimyasal denge;Kimyasal tepkimelerde enerji
113|fizik:Kütle çekim ve Kepler yasaları
114|fizik:Dalga mekaniği
115|fizik:Alternatif akım ve transformatörler
116|fizik:Manyetik alan ve kuvvet
117|fizik:Çembersel hareket
118|kimya:Sıvı çözeltiler ve çözünürlük
119|kimya:Tepkime hızı
122|20. yüzyıl başlarında dünya
127|Osmanlı’da değişim ve diplomasi
129|Türk İslam devletleri
130|psikoloji:Davranışın biyolojik temelleri;sosyoloji:Kültür ve toplumsallaşma
136|Katı cisimler;matematik:Birinci dereceden denklemler
140|geometri:Özel dörtgenler;Köklü sayılar
141|Doğruda ve üçgende açılar
143|Oran ve orantı;Rasyonel sayılar
146|Üçgende alan;Üçgende eşlik ve benzerlik
147|Özel dörtgenler;Üçgende alan
149|Özel dörtgenler;matematik:Hareket problemleri
150|Çember ve daire
152|Ekonomik faaliyetler;Su, toprak ve bitki örtüsü
154|Rasyonel sayılar;Grafik ve tablo problemleri
155|Rutin olmayan problemler;Sayı ve kesir problemleri
156|matematik:Mutlak değer;matematik:Köklü sayılar
157|matematik:Temel kavramlar ve eşitsizlikler
158|geometri:Özel dörtgenler;Yüzde, kâr ve zarar problemleri
159|turkce:Paragrafta konu ve ana düşünce
160|matematik:Sayı basamakları;matematik:Sayı kümeleri ve işlem önceliği
161|Fonksiyonlara giriş
162|Basit eşitsizlikler;geometri:Özel dörtgenler
163|AYT/matematik:Trigonometrik denklemler
164|kimya:Kimyasal türler arası etkileşimler;kimya:Atom ve yapısı
165|kimya:Asitler, bazlar ve tuzlar
166|Kalıtımın genel ilkeleri;Hücre bölünmeleri
167|AYT/psikoloji:Yaşam boyu gelişim
168|Manyetik alan ve kuvvet;Tork ve denge
169|Hareket ve kuvvet;AYT/fizik:Kütle çekim ve Kepler yasaları
170|Karbon kimyasına giriş;Doğa ve kimya;Kimyasal türler arası etkileşimler
171|Fonksiyonlar;Eşitsizlik sistemleri
172|Fonksiyonlar;Eşitsizlik sistemleri
173|Fonksiyonlar;Eşitsizlik sistemleri
174|Çemberin analitiği;matematik:Parabol
175|Fonksiyonlar;Eşitsizlik sistemleri
176|Dörtgenler;Üçgende eşlik ve benzerlik
177|Özel dörtgenler;matematik:Sayı basamakları
178|Oran ve orantı;geometri:Özel dörtgenler
179|Osmanlı’da değişim ve Avrupa;Türk İslam devletleri;19. yüzyılda Osmanlı
180|Türk İslam devletleri;Osmanlı kültür ve medeniyeti
181|Osmanlı’da değişim ve Avrupa
182|19. yüzyılda Osmanlı;20. yüzyıl başlarında Osmanlı
183|İlk Türk devletleri;Türk İslam devletleri
184|İlk Türk devletleri;Türk İslam devletleri
185|Osmanlı kültür ve medeniyeti
186|Osmanlı kültür ve medeniyeti
187|İlk Türk devletleri
188|Osmanlı’da değişim ve Avrupa
189|Osmanlı kültür ve medeniyeti;Osmanlı’da değişim ve Avrupa
190|Osmanlı’da değişim ve Avrupa
191|19. yüzyılda Osmanlı
192|Osmanlı kültür ve medeniyeti
193|Osmanlı kültür ve medeniyeti;Osmanlı kuruluş ve yükselme
194|Türk İslam devletleri;Osmanlı kültür ve medeniyeti
195|Tarih bilimi ve zaman
196|Osmanlı’da değişim ve Avrupa
197|Osmanlı kültür ve medeniyeti
198|Şair, yazar ve eser eşleştirmeleri
199|Roman ve hikâye;Cumhuriyet dönemi Türk edebiyatı
200|Servetifünun ve Fecriati
201|Servetifünun ve Fecriati
202|Tanzimat edebiyatı
203|Cumhuriyet dönemi Türk edebiyatı;Şair, yazar ve eser eşleştirmeleri
204|Cümle türleri;Fiil, ek fiil ve fiilimsi;Sözcük türleri
205|Fiil, ek fiil ve fiilimsi;Sözcük türleri
"""


def norm(text):
    return " ".join("".join(c for c in unicodedata.normalize("NFD", text.casefold().replace("ı", "i"))
        if unicodedata.category(c) != "Mn").split())


def concept(stem, branch, exam):
    s = norm(stem)
    rules = {
        "felsefe": [
            ("Orta Çağ felsefesi", r"orta cag|skolastik|hristiyan dusun"),
            ("Bilim felsefesi", r"bilim|teori|yanlislan|hipotez|kuhn|popper"),
            ("Sanat felsefesi", r"sanat|estetik|guzellik"),
            ("Siyaset felsefesi", r"devlet|egemen|siyaset|toplum sozlesmesi|hak ve ozgurluk"),
            ("Din felsefesi", r"tanri|teizm|inanc|din felsef"),
            ("Ahlak felsefesi", r"ahlak|erdem|mutluluk|ozgur|haz ve aci|iyi ve kotu|odev|maksim"),
            ("Varlık felsefesi", r"varlik|var olan|idealar|ontoloji|maddi toz|zihinsel toz"),
            ("Bilgi felsefesi", r"bilgi|duyu|sezgi|akil|rasyonel|epistem|gercek"),
            ("Düşünme ve akıl yürütme", r"kavram|dil|dusun|refleks|elestir"),
        ],
        "psikoloji": [
            ("Psikoloji bilimi ve yöntemleri", r"korelasyon|monografi|psikoloji biliminin|pozitif bilim|arastirma yontem"),
            ("Öğrenme ve bellek", r"ogren|bellek|unut|anims|kodla"),
            ("Yaşam boyu gelişim", r"gelisim|dollen|ahlaki donem"),
            ("Ruh sağlığı ve kişilik", r"stres|benlik|kisilik|ruh|freud|kaygi|savunma|ofke|duygu"),
            ("Davranışın biyolojik temelleri", r"algi|algila|duyum|uyari|organizma|sinir"),
            ("Düşünme ve zekâ", r"zeka|dusun|problem coz"),
        ],
        "sosyoloji": [
            ("Sosyoloji bilimi ve yöntemleri", r"monografi|anket|arastirma yontem|sosyolojinin nesnesi|bir bilim olarak sosyoloji"),
            ("Toplumsal değişme ve gelişme", r"degisme|kureselles|modernles|tampon|toplumsal dinamik"),
            ("Kültür ve toplumsallaşma", r"kultur|norm|sosyal deger|sosyalles|toplumsallas"),
            ("Toplumsal kurumlar", r"kurum|egitim|aile"),
            ("Toplumsal yapı ve ilişkiler", r"statu|rol|tabaka|toplumsal yapi|nufus|toplumsal etkilesim"),
        ],
        "mantik": [
            ("Sembolik mantık", r"sembol|matematiksel"),
            ("Klasik mantık", r"dondurme|altik|alt karsit|tumel olumlu|tikel olumlu|kiyas"),
            ("Kavram ve terim", r"kavram|terim|iclem|kaplam|bes tumel|tanim"),
            ("Önerme ve çıkarım", r"onerme|oncul|cikarim"),
            ("Mantığa giriş ve akıl yürütme", r"akil yurut|analoji|tumevar|ozdes|celismez|mantik"),
        ],
    }
    topic = next((t for t, pattern in rules[branch] if re.search(pattern, s)), None)
    defaults = {"felsefe":"Felsefeyi tanıma", "psikoloji":"Psikoloji bilimi ve yöntemleri",
                "sosyoloji":"Sosyoloji bilimi ve yöntemleri", "mantik":"Mantığa giriş ve akıl yürütme"}
    topic = topic or defaults[branch]
    if branch == "felsefe" and exam == "AYT":
        topic = {"Bilgi felsefesi":"Bilgi ve varlık felsefesi", "Varlık felsefesi":"Bilgi ve varlık felsefesi",
                 "Ahlak felsefesi":"Ahlak, siyaset, sanat ve din felsefesi", "Siyaset felsefesi":"Ahlak, siyaset, sanat ve din felsefesi",
                 "Sanat felsefesi":"Ahlak, siyaset, sanat ve din felsefesi", "Din felsefesi":"Ahlak, siyaset, sanat ve din felsefesi",
                 "Orta Çağ felsefesi":"İlk Çağ ve Orta Çağ felsefesi"}.get(topic,topic)
    return {"exam":exam,"subjectId":branch,"topic":topic,"relation":"PRIMARY"}


def main():
    groups = json.loads((STATE / "ai-review-groups.json").read_text(encoding="utf-8"))
    mapping = {int(line.split("|",1)[0]): line.split("|",1)[1] for line in DECISIONS.strip().splitlines()}
    inventory = {r["code"]: r for r in json.loads((STATE / "source-inventory.json").read_text(encoding="utf-8"))["questions"]}
    destination=APP / "ornek-veri/content-ai-question-labels.json"
    previous = {p['code']:p for p in json.loads(destination.read_text(encoding='utf-8'))['proposals']} if destination.is_file() else {}
    pdfs = json.loads((APP / 'backend/src/main/resources/pdf-review-labels.json').read_text(encoding='utf-8'))['items']
    proposals = []
    for index, group in enumerate(groups):
        targets, evidence = [], []
        if index in mapping:
            for definition in mapping[index].split(";"):
                exam, branch = group["exam"], group["subjectId"]
                if ":" in definition:
                    prefix, topic = definition.split(":",1)
                    if "/" in prefix:
                        exam, branch = prefix.split("/",1)
                    else:
                        branch = prefix
                else:
                    topic = definition
                targets.append({"exam":exam,"subjectId":branch,"topic":topic,"relation":"PRIMARY"})
            if index in {15,164}:
                targets[1]['relation']='PREREQUISITE'
            evidence.append({"type":"AI_SOURCE_READING","text":group["text"][:360],
                             "targets":targets[1:] if index==15 else targets.copy()})
            if index in {69,159}:
                task = ("Bu parçadan aşağıdakilerden hangisi çıkarılamaz?" if index==69
                        else "Metinde aşağıdakilerden hangisine değinilmemiştir?")
                if task.casefold() not in re.sub(r"\s+", " ", group["text"]).casefold():
                    raise ValueError(f"Changed reading-comprehension task: {group['codes']}")
                evidence.append({"type":"QUESTION_TASK_READING","text":task,"targets":targets.copy(),
                    "reason":"Parçanın konusunu değil, kökün istediği çıkarım/yardımcı düşünceyi ölçer."})
        else:
            # Each mixed card contains five/six separately numbered questions, not a single-topic question.
            found = list(re.finditer(r"(?<!\d)(4[1-6]|2[1-5])\.\s+(?!sorular)", group["text"]))
            if len(found) < 5:
                raise ValueError(f"Missing explicit source decision: group {index}, {group['codes']}")
            for j, match in enumerate(found):
                number = int(match[1])
                fragment = group["text"][match.end():found[j+1].start() if j+1<len(found) else None]
                stem = re.split(r"\bA\)",fragment)[0]
                branch = "felsefe" if number<43 else "psikoloji" if number==43 else "sosyoloji" if number<46 else "mantik"
                target = concept(stem,branch,group["exam"])
                if target not in targets:
                    targets.append(target)
                evidence.append({"type":"MIXED_CARD_SOURCE_SEGMENT","text":f"{number}. {stem[:260]}","targets":[target]})
        for code in group["codes"]:
            original=inventory[code]
            entry={"code":code,"textSha256":group["textSha256"],"targets":targets,"evidence":[dict(e) for e in evidence],
                "method":"CODEX_SOURCE_READING" if index in mapping else "SOURCE_SEGMENTS_AND_CONCEPT_CUES",
                "reviewRequired":True,"teacherApproved":False,
                "note":"Sorunun ölçtüğü kavram için kaynak metninden üretilmiş öneri; bağımsız öğretmen doğrulaması bekliyor."}
            if index in {15,156,157,160,161,163,164,165}:
                picture=APP / "veri/resimler-pilot" / original["image"]
                entry["visualEvidence"]={"image":original["image"],"sha256":hashlib.sha256(picture.read_bytes()).hexdigest()}
                saved = previous.get(code, {}).get('visualEvidence')
                if saved and saved['sha256'] != entry['visualEvidence']['sha256']:
                    raise ValueError(f'Visual observation source changed; review before rebinding: {code}')
                entry["method"]="CODEX_SOURCE_IMAGE_READING"
                observed={15:"Gerçek sayılar kümesi üzerinde tanımlı f fonksiyonu",
                    156:"Sayı doğrusunda a ve b sayıları arasındaki uzaklık |a-b| ile gösterilir; köklü ifadeler.",
                    157:"a ve b doğal sayıları için toplama, çarpma, bölme ve fark işlemlerinden oluşan işlem çarkı.",
                    160:"a bir basamaklı ve ab iki basamaklı doğal sayılar; şekillerle tanımlanan basamak işlemleri.",
                    161:"y=f(x) grafiğinden f(3a-1)=-1 eşitliğini sağlayan değerleri belirleme.",
                    163:"cot x - tan x = 2√3 denkleminin kökleri.",
                    164:"51. soru: elementlerin katman elektron dağılımı ve Lewis sembolleri.",
                    165:"HCl ve H2SO4 çözeltilerine daldırılan X, Y metallerinde H2 ve SO2 gazı oluşması."}
                entry["evidence"].append({"type":"AI_VISUAL_OBSERVATION","text":observed[index],
                    "reference":original["image"],"imageSha256":entry["visualEvidence"]["sha256"],
                    "targets":targets[1:] if index==15 else targets.copy()})
                if index==15:
                    entry["note"]="Özgün PDF s.311'de soru sol sütundan sağ sütuna devam ediyor ve belirli integral ölçüyor; mevcut kırpım yalnız başlığı içeriyor ve onarılmalı."
                    entry["sourceProblem"]="INCOMPLETE_QUESTION_CROP"
                if index==164:
                    entry["note"]="Görseldeki 51. soru Lewis sembollerini ölçüyor; altta komşu 52. sorunun başlangıcı da bulunuyor."
                    entry["sourceProblem"]="NEIGHBOR_QUESTION_IN_CROP"
                if index in {15,164}:
                    expected = {15:'4977ef8e26a3caf529c86ea03f681a9a6320660817fd1495f6c9b47536638723',
                                164:'976b3972bf219d92e3af0d2d167ee607989a3998b89ade8f87531b5100bd11df'}[index]
                    pdf = next(p for p in pdfs if p.get('relativePath')==original['original']['file'])
                    if pdf['sourceSha256']!=expected:
                        raise ValueError(f'Reviewed original PDF changed: {code}')
                    entry['sourcePdfEvidence']={'sourceKey':pdf['key'],'sourceSha256':expected,'page':original['original']['page']}
                    entry['evidence'].append({'type':'AI_ORIGINAL_PDF_VISUAL_READING',**entry['sourcePdfEvidence'],
                        'reference':pdf['key'],'targets':targets.copy(),
                        'text':'27. soruda fonksiyon bileşiminden belirli integral isteniyor; soru iki sütuna yayılmış.' if index==15 else
                               '51. soruda katman elektron dağılımından Lewis sembolündeki yanlışlığı belirleme isteniyor; 52. soru kapsam dışı.'})
            proposals.append(entry)
    destination.write_text(json.dumps({"version":1,"approvalStatus":"PROPOSED","proposals":proposals},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(proposals)} source-bound proposals ({len(groups)} source text groups); 0 teacher approvals")


if __name__ == "__main__":
    main()
