// Özgün görseller okunarak çözülmüştür; bağımsız öğretmen onayı değildir.
export const YAS_ISCI_EXAMS = {
  "TYT-0650": {
    "conceptId": "yas-isci-problemleri",
    "archetype": "yas-toplam",
    "answer": "A",
    "title": "2018 TYT · ebeveyn ve çocuk toplamlarını ayır",
    "cue": "Önce 3 kişilik ve 6 kişilik ortalamaları toplama çevir. Üç yaş farkının toplamı, ebeveyn ve çocuk gruplarının toplamları arasındaki farktır.",
    "steps": [
      {
        "text": "İlk üç arkadaşın toplam yaşı $3\\cdot20=60$. Son buluşmadaki altı kişinin toplamı $6\\cdot20=120$.",
        "why": "Aynı ortalama, farklı kişi sayılarında farklı toplam demektir."
      },
      {
        "text": "Ebeveyn toplamına $E$, çocuk toplamına $C$ de: $E+C=120$, $E-C=28+30+32=90$.",
        "why": "Her ebeveyn–çocuk farkını toplarken iki grubun toplam farkını buluruz."
      },
      {
        "text": "İki denklemi topla: $2E=210$, $E=105$; çocuk toplamı 15.",
        "why": "Çocukların tek tek yaşlarını bilmek gerekmiyor."
      },
      {
        "text": "Ebeveynlerin toplamı $105-60=45$ artmış. Üç kişide $3t=45$, $t=15$.",
        "why": "Her yıl üç ebeveynin toplamı 3 artar; artışı 6 kişiye bölmek yanlış olur."
      }
    ],
    "result": "A · 15 yıl",
    "tip": "Ortalama sorusunda kişi sayısını yanında yaz. İki grubun toplamı ve farkı biliniyorsa büyük toplam (toplam + fark)/2’dir.",
    "check": "Başta ebeveynler 20’şer, sonda 35’er seçilebilir; çocuklar 7, 5, 3: farklar 28, 30, 32 ve altı kişinin toplamı 120.",
    "mistake": "Ortalama değişmedi diye zaman geçmedi sanma; gruba üç çocuk eklendi."
  },
  "TYT-0681": {
    "conceptId": "yas-isci-problemleri",
    "archetype": "yas-toplam",
    "answer": "D",
    "title": "2020 TYT · iki ayrı ziyaret, tek ağaç",
    "cue": "2015 ve 2020 grupları farklı öğrencilerden oluşuyor. Beş yıl yaşlanan ortak varlık ağaçtır.",
    "steps": [
      {
        "text": "İkinci grupta $n$, ilk grupta $n+10$ öğrenci olsun.",
        "why": "İlk grubun kişi sayısı 10 fazla verilmiş."
      },
      {
        "text": "Ağaç 2015’te $7(n+10)$, 2020’de $10n$ yaşında.",
        "why": "Her ziyaret için ağacın yaşı o grubun toplam yaşına eşit."
      },
      {
        "text": "$7(n+10)+5=10n$, dolayısıyla $75=3n$, $n=25$.",
        "why": "Ağaç iki ziyaret arasında yalnız 5 yaş büyür."
      },
      {
        "text": "2020’de ağacın yaşı $10\\cdot25=250$.",
        "why": "Bulunan n kişi sayısıdır; sorulan ağaç yaşıdır."
      }
    ],
    "result": "D · 250",
    "tip": "Zaman tablosunda ortak varlığı işaretle; farklı grupları aynı kişiler gibi yaşlandırma.",
    "check": "İlk grup 35 kişi: 7×35=245. Beş yıl sonra 250; ikinci grup 25 kişi: 10×25=250.",
    "mistake": "7 yaşındaki ilk grubun 2020’de 12 yaşında olacağını kullanmak gereksizdir; ikinci ziyaret başka grupla yapılmıştır."
  },
  "TYT-0683": {
    "conceptId": "yas-isci-problemleri",
    "archetype": "yas-fark",
    "answer": "C",
    "title": "2021 TYT · yapım, bulunma ve doğum yılı",
    "cue": "Vazonun bulunduğu yıl ile yapıldığı yıl arasında 300 yıl var. Ziyaret yılı 2020; sınav yılını buraya yazma.",
    "steps": [
      {
        "text": "Faruk’un 2020’deki yaşı $x$ ise doğum yılı $2020-x$. Vazonun bulunma yılı da budur.",
        "why": "Aynı yılda gerçekleşen olayları birleştirdik."
      },
      {
        "text": "Vazo 300 yıl önce yapılmış: yapım yılı $2020-x-300=1720-x$.",
        "why": "Bulunma tarihinde vazo yeni yapılmış değildi."
      },
      {
        "text": "$39x=1720-x$, yani $40x=1720$, $x=43$.",
        "why": "Sorudaki 39 kat ilişkisi vazonun yaşına değil yapıldığı yıla aittir."
      }
    ],
    "result": "C · 43",
    "tip": "Olay yılını ve olayın yaşını ayrı tut: yapım = bulunma − bulunduğundaki yaş.",
    "check": "Faruk 1977’de doğar; vazo 1977’de bulunur ve 1677’de yapılmıştır. 39×43=1677; 2020−1977=43.",
    "mistake": "39x’i vazonun bugünkü yaşıyla eşitleme; soruda yapım yılı deniyor."
  },
  "TYT-0741": {
    "conceptId": "yas-isci-problemleri",
    "archetype": "yas-fark",
    "answer": "E",
    "title": "2026 TYT · iki resmin yılıyla iki zaman denklemi",
    "cue": "Konuşma 2025’te geçer. Sağdaki 2013 ve soldaki 1999 tarihlerini bu yıldan çıkar: 12 ve 26 yıl önce.",
    "steps": [
      {
        "text": "Bugünkü anne yaşına $A$, çocuk yaşına $C$ de. 2013’teki toplam $(A-12)+(C-12)=A$.",
        "why": "Çocuk, ikisinin geçmiş toplamını annenin bugünkü yaşına eşitliyor."
      },
      {
        "text": "Denklemden $C=24$ çıkar.",
        "why": "A her iki tarafta yok olur; çocuğun yaşını doğrudan buluruz."
      },
      {
        "text": "1999’da annenin yaşı çocuğun bugünkü yaşı: $A-26=C=24$; $A=50$.",
        "why": "İkinci cümlede annenin geçmişi ile çocuğun bugünü karşılaştırılıyor."
      },
      {
        "text": "Sorulan toplam $50+24=74$.",
        "why": "Fark ya da tek yaş değil, bugünkü toplam isteniyor."
      }
    ],
    "result": "E · 74",
    "tip": "Fotoğraf/resim sorusunda her konuşmayı ayrı zaman sütununa yaz. “Şimdiki” sözcüğü hangi kişiye ait, kontrol et.",
    "check": "2013’te anne 38, çocuk 12: toplam 50. 1999’da anne 24. İki koşul da sağlanır.",
    "mistake": "Kaydın sınav yılı 2026 olsa da olay yılı 2025; zamanı sorunun içinden al."
  }
};
