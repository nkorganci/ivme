// Özgün kırpımlar incelendi; öğretmen onayı değildir.
export const KOSULLU_EXAMS = {
  "TYT-0750": {
    "conceptId": "kosullu-onerme",
    "archetype": "ise-deger",
    "answer": "C",
    "title": "2023 TYT · muayene kartındaki boy ve kilo",
    "cue": "Kartta yaş yazılı: $r$'nin değeri hemen belli. Sonra $(p\\Rightarrow q')\\wedge r'\\equiv0$ bilgisinden kesin değerleri çıkar.",
    "steps": [
      {
        "text": "Yaş 53: “yaşı 55 ile 65 aralığında” yanlış, $r\\equiv0$, $r'\\equiv1$.",
        "why": "Karttaki bilgi bir önermeyi doğrudan değerlendirir."
      },
      {
        "text": "$(p\\Rightarrow q')\\wedge1\\equiv0$ ise $p\\Rightarrow q'\\equiv0$: $p\\equiv1$, $q'\\equiv0$.",
        "why": "İse yalnız $1\\Rightarrow0$ durumunda yanlış."
      },
      {
        "text": "Kilo 60'tan fazla, boy 164–170 aralığında: 166 cm – 62 kg.",
        "why": "A ve B'de kilo 60'ın altında; D ve E'de boy 170'in üstünde."
      }
    ],
    "result": "C · 166 cm – 62 kilogram",
    "tip": "Önce verilen bilgiyle hemen değerlendirilebilen önermeyi bul; kalan bileşik önerme çoğu zaman tek bir koşullu önermenin yanlışlığına iner.",
    "check": "$p\\equiv1$, $q\\equiv1$, $r\\equiv0$: $(1\\Rightarrow0)\\wedge1\\equiv0$ ✓.",
    "mistake": "$r'$'yi 0 alıp “ve” bağlacının zaten 0 olduğunu düşünmek; ya da $q'$'yu $q$ ile karıştırıp boyu aralık dışında seçmek."
  },
  "TYT-0752": {
    "conceptId": "kosullu-onerme",
    "archetype": "ise-deger",
    "answer": "A",
    "title": "2025 TYT · Beyza'nın doğum tarihi",
    "cue": "Dış bağlaç “ise” ve önerme yanlış: sol taraf doğru, sağ taraf yanlış. Sağ taraf da bir “ise”; onun yanlışlığı iki değeri kesinleştirir.",
    "steps": [
      {
        "text": "$(p\\Rightarrow q)\\Rightarrow(r\\Rightarrow q)\\equiv0$: $p\\Rightarrow q\\equiv1$ ve $r\\Rightarrow q\\equiv0$.",
        "why": "Dış ise yalnız $1\\Rightarrow0$'da yanlış."
      },
      {
        "text": "$r\\Rightarrow q\\equiv0$: $r\\equiv1$, $q\\equiv0$.",
        "why": "İçteki ise de yanlış."
      },
      {
        "text": "$p\\Rightarrow0\\equiv1$ için $p\\equiv0$.",
        "why": "Sonucu yanlış olan ise ancak koşul da yanlışsa doğru."
      },
      {
        "text": "2000'de doğdu, eylülde değil, ayın birinde değil: 4 Aralık 2000.",
        "why": "Değerleri cümleye çevirdik."
      }
    ],
    "result": "A · 4 Aralık 2000",
    "tip": "İç içe “ise” yanlışsa dıştan içe in: her yanlış “ise” bir doğru koşul ve bir yanlış sonuç verir.",
    "check": "$p\\equiv0$, $q\\equiv0$, $r\\equiv1$: $(0\\Rightarrow0)\\Rightarrow(1\\Rightarrow0)\\equiv1\\Rightarrow0\\equiv0$ ✓.",
    "mistake": "$p\\Rightarrow q\\equiv1$ bilgisinden $p\\equiv1$ sanıp ayın birini seçmek (1 Aralık 2000)."
  },
  "TYT-0753": {
    "conceptId": "kosullu-onerme",
    "archetype": "ise-deger",
    "answer": "A",
    "title": "2026 TYT · galerideki beş araba",
    "cue": "Önce mantık: önerme yanlış olduğundan hangi koşulların doğru olduğunu bul. Sonra en çok kısıtlayan koşulla (C ile D arası 3 araba) yerleştirmeye başla.",
    "steps": [
      {
        "text": "$(p\\vee q)\\Rightarrow(r\\Rightarrow p)\\equiv0$: $p\\vee q\\equiv1$, $r\\Rightarrow p\\equiv0$; yani $r\\equiv1$, $p\\equiv0$, $q\\equiv1$.",
        "why": "İç içe ise yanlışlığı."
      },
      {
        "text": "$r$: C ile D arasında 3 araba, ikisi uçlarda. $q$: B ile C arasında 2 araba.",
        "why": "Doğru koşulları yerleştir."
      },
      {
        "text": "C 1. sıradaysa B 4., D 5.; C 5. sıradaysa B 2., D 1. Kalan iki yere A ve E.",
        "why": "İki simetrik durum."
      },
      {
        "text": "$p\\equiv0$: A ile B arasında tam 1 araba olamaz. Birinci durumda A 2. olamaz, A 3.; ikinci durumda A 4. olamaz, A 3. Ortada A.",
        "why": "Yanlış koşulu eleme kuralı olarak kullandık."
      }
    ],
    "result": "A · A marka araba",
    "tip": "Dizilim sorularında önce bileşik önermeden doğru ve yanlış koşulları ayır; doğruları yerleştir, yanlışları eleme için kullan, iki simetrik durumu da kontrol et.",
    "check": "C E A B D ve D B A E C: iki dizilimde de $p\\equiv0$, $q\\equiv1$, $r\\equiv1$; ortada A ✓.",
    "mistake": "$p\\equiv0$ bilgisini kullanmayıp E'yi ortaya koymak."
  }
};
