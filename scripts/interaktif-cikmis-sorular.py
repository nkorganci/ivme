"""İnteraktif Öğrenme ünitelerinin çıkmış soru bağlantılarını veri/sorular-tum.csv'den üretir.

Kullanım: python scripts/interaktif-cikmis-sorular.py
Çıktı: frontend/src/interactive/pastQuestions.json (ünite anahtarı → soru kodları, yıla göre).
Bir ünitenin konu eşlemesi değişirse yalnız UNIT_TOPICS düzenlenir ve betik yeniden çalıştırılır.
"""
import csv
import json
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
UNIT_TOPICS = {
    "fizik/hareket": [("Fizik", "Hareket"), ("Fizik", "Bir Boyutta Sabit İvmeli Hareket"), ("Fizik", "Bağıl Hareket")],
    "fizik/elektrik": [("Fizik", "Elektrik Devreleri")],
    "fizik/atislar": [("Fizik", "İki Boyutta Hareket")],
    "matematik/fonksiyonlar": [("Matematik", "Fonksiyonlar"), ("Matematik", "Fonksiyonlarda Uygulamalar"),
                               ("Matematik", "İkinci Dereceden Denklemler, Karmaşık Sayılar, Denklem ve Eşitsizlik Sistemleri")],
    "matematik/turev-integral": [("Matematik", "Türev"), ("Matematik", "İntegral")],
    "matematik/trigonometri": [("Matematik", "Trigonometri"), ("Matematik", "Trigonometrik Denklemler"), ("Matematik", "Dik Üçgen ve Trigonometri")],
    "geometri/ucgen": [("Matematik", "Üçgenlerde Temel Kavramlar"), ("Matematik", "Üçgenlerde Eşlik ve Benzerlik"), ("Matematik", "Üçgenin Alanı"),
                       ("Matematik", "Özel Dörtgenler"), ("Matematik", "Dörtgenler ve Çokgenler"), ("Matematik", "Üçgen, Çokgen, Dörtgen, Özel Dörtgenler")],
    "geometri/cember": [("Matematik", "Çember ve Daire")],
    "geometri/analitik": [("Matematik", "Analitik Geometri")],
    "kimya/gazlar": [("Kimya", "Gazlarda Kinetik Teori"), ("Kimya", "İdeal Gaz Yasası"), ("Kimya", "Gazların Özellikleri ve Gaz Yasaları"), ("Kimya", "Gaz Karışımları")],
    "kimya/cozeltiler": [("Kimya", "Derişim Birimleri"), ("Kimya", "Sulu Çözelti Dengeleri"), ("Kimya", "Asitlerin ve Bazların Tepkimeleri"),
                         ("Kimya", "Asitler ve Bazlar"), ("Kimya", "Homojen ve Heterojen Karışımlar")],
    "biyoloji/kalitim": [("Biyoloji", "Kalıtım ve Biyolojik Çeşitlilik")],
    "biyoloji/dna": [("Biyoloji", "Genetik Şifre ve Protein Sentezi"), ("Biyoloji", "Nükleik Asitlerin Keşfi ve Önemi")],
    "turkce/paragraf-yapisi": [("Türkçe", "Paragrafın Yapısı")],
    "turkce/paragraf-anlam": [("Türkçe", "Paragrafta Anlam")],
    "turkce/ogeler": [("Türkçe", "Cümlenin Ögeleri")],
    "tarih/kronoloji": [("Tarih", "Atatürkçülük ve Türk İnkılabı"), ("Tarih-1", "Atatürkçülük ve Türk İnkılabı"), ("Tarih-2", "Atatürkçülük ve Türk İnkılabı"),
                        ("Tarih-2", "Tarih ve Zaman"), ("Tarih-1", "Tarih ve Zaman")],
    "tarih/milli-mucadele": [("Tarih", "Millî Mücadele"), ("Tarih-1", "Millî Mücadele"), ("Tarih-2", "Millî Mücadele")],
    "tarih/antlasmalar": [("Tarih-1", "20. Yüzyıl Başlarında Osmanlı Devleti ve Dünya"), ("Tarih-2", "20. Yüzyıl Başlarında Osmanlı Devleti ve Dünya")],
    "cografya/gunes": [("Coğrafya", "Dünya’nın Şekli ve Hareketleri")],
    "cografya/iklim": [("Coğrafya", "Atmosfer ve İklim Bilgisi")],
    "cografya/nufus": [("Coğrafya", "Nüfus ve Göç"), ("Coğrafya-1", "Nüfus Politikaları ve Projeksiyonları"), ("Coğrafya-2", "Nüfus Politikaları ve Projeksiyonları")],
    "edebiyat/siir": [("Türk Dili ve Edebiyatı", "Şiir Bilgisi")],
    "edebiyat/donemler": [("Türk Dili ve Edebiyatı", "Tanzimat Dönemi Türk Edebiyatı"),
                          ("Türk Dili ve Edebiyatı", "Servetifünun Dönemi Türk Edebiyatı / Fecriati Dönemi Türk Edebiyatı"),
                          ("Türk Dili ve Edebiyatı", "Millî Edebiyat Dönemi Türk Edebiyatı"), ("Türk Dili ve Edebiyatı", "Cumhuriyet Dönemi Türk Edebiyatı")],
    "edebiyat/sanatlar": [("Türk Dili ve Edebiyatı", "Söz Sanatları")],
}


def main():
    rows = list(csv.DictReader(open(APP / "veri" / "sorular-tum.csv", encoding="utf-8-sig")))
    out = {}
    for unit, topics in UNIT_TOPICS.items():
        wanted = set(topics)
        picked = [r for r in rows if (r["subject"], r["topic"]) in wanted and r["active"] == "true"]
        picked.sort(key=lambda r: (r["year"], r["code"]), reverse=True)
        out[unit] = [{"code": r["code"], "year": int(r["year"]), "exam": r["exam_type"]} for r in picked]
    target = APP / "frontend" / "src" / "interactive" / "pastQuestions.json"
    target.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{target.relative_to(APP)}: " + ", ".join(f"{k}={len(v)}" for k, v in out.items()))


if __name__ == "__main__":
    main()
