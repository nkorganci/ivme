// Özgün kırpımlar incelendi; öğretmen onayı değildir.
export const ONERME_EXAMS = {
  "TYT-0748": {
    "conceptId": "onermeler",
    "archetype": "de-morgan",
    "answer": "A",
    "title": "2021 TYT · ressamın tabloları ve “her” önermelerinin değili",
    "cue": "$(p\\vee q)'\\wedge r\\equiv1$: önce De Morgan ile $p'$ ve $q'$'ye ayır. “Her” önermesinin değili “en az bir … değil”dir; seçenekleri bu kurallarla ele.",
    "steps": [
      {
        "text": "$\\wedge\\equiv1$: $(p\\vee q)'\\equiv1$ ve $r\\equiv1$. De Morgan: $p'\\equiv1$, $q'\\equiv1$.",
        "why": "$(p\\vee q)'\\equiv p'\\wedge q'$."
      },
      {
        "text": "$p'$: en az bir tablo ters asılmamış. $q'$: en az bir tabloda kişi yok. $r$: her tablo dikdörtgen.",
        "why": "“Her …” önermesinin değili “en az bir … değil”."
      },
      {
        "text": "C'de üçgenler var ($r$ ✗); B ve D'de bütün tablolar ters ($p'$ ✗); E'de her tabloda kişi var ($q'$ ✗).",
        "why": "Her seçeneği üç kurala göre kontrol ettik."
      },
      {
        "text": "A: hepsi dikdörtgen, ikisi düz asılmış, portakallı tabloda kişi yok ✓.",
        "why": "Üç koşulu birden sağlayan tek seçenek."
      }
    ],
    "result": "A",
    "tip": "Görsel seçenekli mantık sorusunda her önermenin istenen değerini bir kontrol kuralına çevir; “her”in değilinde tek bir örnek yeter.",
    "check": "A'da $p\\equiv0$ (düz tablo var), $q\\equiv0$ (kişisiz tablo var), $r\\equiv1$: $(0\\vee0)'\\wedge1\\equiv1$ ✓.",
    "mistake": "“Her tablo ters asılmıştır” önermesinin değilini “hiçbir tablo ters değil” sanmak; o zaman A elenir."
  },
  "TYT-0749": {
    "conceptId": "onermeler",
    "archetype": "deger-cikarim",
    "answer": "D",
    "title": "2022 TYT · yol ayrımları ve çiçekçiler",
    "cue": "$p'\\wedge(q\\wedge r)\\equiv1$: bütün parçalar doğru. Her önermeyi bir yön kararına çevir ve yolu adım adım izle.",
    "steps": [
      {
        "text": "$p'\\equiv1$: ilk ayrımda soldan değil, sağdan gitti.",
        "why": "$p$: ilk ayrımda soldaki yol; değili sağ yol."
      },
      {
        "text": "$q\\equiv1$: ikinci ayrımda çiçekçinin olduğu yoldan gitti; sağ koldaki çiçekçi Cem ile Derya'ya giden yolda.",
        "why": "Sağ koldaki ikinci ayrımda Elif'e giden yolda çiçekçi yok."
      },
      {
        "text": "$r\\equiv1$: üçüncü ayrımda sağdaki yol: Derya.",
        "why": "Cem ile Derya ayrımında sağdaki yol Derya'ya gider."
      }
    ],
    "result": "D · Derya",
    "tip": "Yol ve dizilim sorularında “ve” ile bağlı bütün önermeler doğrudur; her önermeyi sırayla bir karara çevirip haritada ilerle.",
    "check": "Sağ → çiçekçili yol → sağ: Derya. $p\\equiv0$, $q\\equiv1$, $r\\equiv1$ ile $1\\wedge(1\\wedge1)\\equiv1$ ✓.",
    "mistake": "$p'$ yerine $p$'yi doğru alıp soldan gitmek (Ahmet ya da Banu) ya da çiçekçiyi yanlış kolda aramak."
  },
  "TYT-0751": {
    "conceptId": "onermeler",
    "archetype": "deger-cikarim",
    "answer": "E",
    "title": "2024 TYT · uçak bileti seçimleri",
    "cue": "$(p'\\wedge r)\\wedge(p\\vee q)\\equiv1$: ilk parantez $p$ ve $r$'yi kesinleştirir, ikinci parantez $q$'yu verir.",
    "steps": [
      {
        "text": "$p'\\equiv1$, $r\\equiv1$: koltuk için ücret ödemedi, yemek için ücret ödedi.",
        "why": "$\\wedge\\equiv1$ ise iki taraf da doğru."
      },
      {
        "text": "$p\\vee q\\equiv1$ ve $p\\equiv0$ ise $q\\equiv1$: bagaj için ücret ödemedi.",
        "why": "Veya bağlacında bilinen değeri yerleştir."
      },
      {
        "text": "Koltuk standart (a), bagaj standart (a), yemek istiyor (b): a – a – b.",
        "why": "Ücretsiz seçenekler a, ücretli seçenekler b."
      }
    ],
    "result": "E · a – a – b",
    "tip": "Önce kesin bilgi veren $\\wedge\\equiv1$ bloklarından değerleri çıkar, sonra bunları $\\vee$ içeren parçaya yerleştir.",
    "check": "$p\\equiv0$, $q\\equiv1$, $r\\equiv1$: $(1\\wedge1)\\wedge(0\\vee1)\\equiv1$ ✓.",
    "mistake": "$q$ önermesinin “ücret ödememiştir” biçiminde olumsuz kurulduğunu gözden kaçırıp bagajı ücretli seçmek."
  }
};
