// Özgün kırpımlar incelendi; öğretmen onayı değildir.
export const MERKEZI_EXAMS = {
  "TYT-0799": {
    "conceptId": "merkezi-egilim",
    "archetype": "ortalama",
    "answer": "B",
    "title": "2020 TYT · en genç ve en yaşlı çıkınca ortalama",
    "cue": "Kişi sayısı ve yaş toplamı bilinmiyor. Her çıkarma için “kalanların toplamı = yeni ortalama × kalan kişi” yaz; iki denklemi çıkarınca toplam kaybolur.",
    "steps": [
      {
        "text": "Kişi sayısı $n$, yaş toplamı $T$. En küçük çıkınca: $T-1=45(n-1)$.",
        "why": "Kalan $n-1$ kişinin ortalaması 45."
      },
      {
        "text": "En büyük çıkınca: $T-92=38(n-1)$.",
        "why": "Yine $n-1$ kişi kalır."
      },
      {
        "text": "Çıkar: $91=7(n-1)$, $n-1=13$, $n=14$.",
        "why": "$T$ iki denklemde aynı olduğu için sadeleşir."
      }
    ],
    "result": "B · 14",
    "tip": "Bir veri çıkarılınca yeni toplam = yeni ortalama × kalan sayı. İki ayrı çıkarma verilirse denklemleri çıkar: çıkarılan verilerin farkı, ortalamaların farkı × kalan sayıya eşittir.",
    "check": "$T=1+45\\cdot13=586$; $586-92=494=38\\cdot13$ ✓.",
    "mistake": "Kalan kişi sayısını $n$ almak ya da ortalamalar farkını (7) doğrudan cevap sanmak."
  },
  "TYT-0801": {
    "conceptId": "merkezi-egilim",
    "archetype": "medyan-mod",
    "answer": "B",
    "title": "2021 TYT · yaş ve boy ortancası değişmiyor",
    "cue": "9 kişiden biri ayrılınca 8 kişi kalır; ortanca 4. ve 5. verinin ortalaması olur. Yaşlar ve boylar için ayrı sıralı listeler yap.",
    "steps": [
      {
        "text": "Boylar sıralı: 1,76 · 1,79 · 1,82 · 1,84 · 1,84 · 1,88 · 1,90 · 1,92 · 1,96; ortanca 1,84. 8 kişide 4. ve 5. boy 1,84 kalmalı: ayrılanın boyu 1,84'ten büyük.",
        "why": "Silinen veri, iki 1,84'ün sağında olmalı; solundan ya da 1,84 silinirse ortanca 1,86'ya çıkar."
      },
      {
        "text": "Yaşlar sıralı: 17, 17, 18, 18, 19, 19, 20, 20, 21; ortanca 19. 8 kişide 4. ve 5. yaş 19 kalmalı: ayrılan 17 ya da 18 yaşında.",
        "why": "Silinen veri, iki 19'un solunda olmalı."
      },
      {
        "text": "Boyu 1,84'ten büyük ve yaşı 17 ya da 18 olan tek oyuncu: (17; 1,90).",
        "why": "1,88 → 21, 1,92 → 20, 1,96 → 19 yaşında; elenir."
      }
    ],
    "result": "B · (17; 1,90)",
    "tip": "Ortanca değeri tekrar ediyorsa bir veri silinince ortanca, silinenin karşı tarafındaki kopyaya kayar; silinen veri tekrar eden ortanca değerlerinin öbür yanından seçilmelidir.",
    "check": "Kalan boylar 1,76 … 1,84 · 1,84 … : ortanca 1,84; kalan yaşlar 17, 18, 18, 19, 19, 20, 20, 21: ortanca 19 ✓.",
    "mistake": "Ortancaya eşit değerli bir veriyi (1,84 ya da 19) silmenin ortancayı korunduğunu sanmak."
  },
  "TYT-0810": {
    "conceptId": "merkezi-egilim",
    "archetype": "ortalama",
    "answer": "D",
    "title": "2026 TYT · ortalama 85, ortanca 84, açıklık 15",
    "cue": "Puanları sıralı $a\\le b\\le c\\le d\\le e$ yaz. Üç eşit puan ortancayı (84) içerir; üç olası yerleşimi dene.",
    "steps": [
      {
        "text": "Toplam $5\\cdot85=425$; ortanca $c=84$; açıklık $e-a=15$.",
        "why": "Dizelerden üç denklem."
      },
      {
        "text": "$a=b=c=84$ olursa $e=99$, $d=425-252-99=74<84$ ✗. $c=d=e=84$ olursa en yüksek 84, $a=69$, $b=104$ ✗.",
        "why": "Sıralamayı bozan yerleşimler elenir."
      },
      {
        "text": "$b=c=d=84$: $a+e=173$, $e-a=15$ → $e=94$, $a=79$ ✓.",
        "why": "79 ≤ 84 ≤ 94 sıralamaya uygun."
      }
    ],
    "result": "D · 94",
    "tip": "“Üç tanesi eşit” bilgisini ortancayı içeren üç ardışık konuma yerleştir; toplam ve açıklıkla her durumu çöz, sıralamaya uymayanı ele.",
    "check": "79, 84, 84, 84, 94: toplam 425, ortanca 84, açıklık 15 ✓.",
    "mistake": "Eşit puanları en küçük üç puan sanmak ya da ortalama 85'i ortanca gibi kullanmak."
  }
};
