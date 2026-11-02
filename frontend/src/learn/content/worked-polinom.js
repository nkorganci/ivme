// Özgün kırpımlar incelendi; öğretmen onayı değildir.
export const POLINOM_EXAMS = {
  "AYT_Sayisal-0087": {
    "conceptId": "polinom-islemleri",
    "archetype": "polinom-kavram",
    "answer": "A",
    "title": "2019 AYT · kökleri tam sayı olan dördüncü dereceden polinom",
    "cue": "Baş katsayı 1, derece 4: $P(0)$ köklerin çarpımıdır. Grafik parçaları −3'ün en soldaki, 4'ün en sağdaki kök olduğunu gösteriyor; kalan iki kök bu ikisinin arasında.",
    "steps": [
      {
        "text": "$P(x)=(x+3)(x-4)(x-r)(x-s)$; $P(0)=(3)(-4)(rs)=-12rs=72$: $rs=-6$.",
        "why": "Sabit terim, x = 0 yazarak."
      },
      {
        "text": "−3'te grafik yukarıdan inerek kesiyor (en sol kök), 4'te aşağıdan çıkarak kesiyor (en sağ kök): r ve s, −3 ile 4 arasında ve tam sayı.",
        "why": "Baş katsayısı pozitif dördüncü derece polinom iki uçta da yukarıdadır."
      },
      {
        "text": "Çarpımı −6 olan ve (−3, 4) aralığındaki tam sayılar: −2 ve 3.",
        "why": "1 ile −6, −1 ile 6 aralık dışında; 2 ile −3'te −3 iki katlı kök olur ve grafik x eksenine orada teğet olurdu."
      },
      {
        "text": "Katsayılar toplamı $P(1)=(4)(-3)(3)(-2)=72$.",
        "why": "x = 1."
      }
    ],
    "result": "A · 72",
    "tip": "Kökleri tam sayı olan polinomda sabit terim köklerin çarpımını verir; grafiğin x eksenini kestiği yerlerin sırası kalan kökleri sınırlar.",
    "check": "$P(x)=(x+3)(x+2)(x-3)(x-4)$: $P(0)=72$ ✓, kökler −3 ve 4 ✓.",
    "mistake": "Kalan kökleri yalnız çarpımdan seçip aralık koşulunu kullanmamak (1 ve −6 gibi)."
  },
  "AYT_Sayisal-0091": {
    "conceptId": "polinom-islemleri",
    "archetype": "polinom-kavram",
    "answer": "B",
    "title": "2021 AYT · P(x) ≥ x eşitsizliği ve çift katlı kökler",
    "cue": "$Q(x)=P(x)-x$ her x için sıfır ya da pozitif. $Q(1)=0$ ve $Q(3)=0$ olduğuna göre Q bu noktalarda sıfıra değip geri döner: 1 ve 3 çift katlı kök.",
    "steps": [
      {
        "text": "$Q(x)=P(x)-x$; $Q(1)=1-1=0$, $Q(3)=3-3=0$, $Q(2)=4-2=2$.",
        "why": "Verilen değerlerden."
      },
      {
        "text": "$Q\ge0$ olduğundan kökler çift katlı: $Q(x)=a(x-1)^2(x-3)^2$ (derece 4).",
        "why": "Tek katlı kökte işaret değişirdi."
      },
      {
        "text": "$Q(2)=a\cdot1\cdot1=2$: $a=2$.",
        "why": "Üçüncü bilgi."
      },
      {
        "text": "$P(4)=4+Q(4)=4+2\cdot9\cdot1=22$.",
        "why": "$P=Q+x$."
      }
    ],
    "result": "B · 22",
    "tip": "Bir polinom her yerde ≥ 0 ise sıfır olduğu noktalar çift katlı köktür; farkı yeni bir polinom olarak tanımla.",
    "check": "$P(x)=2(x-1)^2(x-3)^2+x$: $P(1)=1$, $P(2)=4$, $P(3)=3$ ✓.",
    "mistake": "1 ve 3'ü tek katlı kök alıp $Q=a(x-1)(x-3)\cdots$ yazmak; o zaman Q iki köke göre işaret değiştirir."
  },
  "AYT_Sayisal-0090": {
    "conceptId": "polinom-islemleri",
    "archetype": "kalan-bulma",
    "answer": "A",
    "title": "2020 AYT · ortak kökler ve fark polinomu",
    "cue": "P ve R'nin baş katsayıları ve dereceleri aynı: $P-R$'de $x^3$ sadeleşir. 2 ve 6 ortak kök olduğu için $P-R$'nin de kökü.",
    "steps": [
      {
        "text": "$(P-R)(x)=k(x-2)(x-6)$.",
        "why": "En çok ikinci derece, kökleri 2 ve 6."
      },
      {
        "text": "$x-1$ ile bölümden kalan $(P-R)(1)=k\\cdot(-1)(-5)=5k=10$: $k=2$.",
        "why": "Kalan teoremi."
      },
      {
        "text": "$P(0)-R(0)=(P-R)(0)=2\\cdot(-2)(-6)=24$.",
        "why": "Farkın sabit terimi."
      }
    ],
    "result": "A · 24",
    "tip": "Baş katsayıları eşit polinomlarda farkı tek başına bir polinom olarak düşün; ortak kökler farkın çarpanlarını verir.",
    "check": "$(P-R)(x)=2x^2-16x+24$: $x=1$'de 10 ✓, $x=0$'da 24 ✓.",
    "mistake": "Farkı üçüncü dereceden sanıp bir kök daha aramak ya da $P(0)$ ile $R(0)$'ı ayrı ayrı bulmaya çalışmak."
  }
};
