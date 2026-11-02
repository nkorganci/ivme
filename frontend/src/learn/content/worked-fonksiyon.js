// Özgün kırpımlar incelendi; öğretmen onayı değildir.
export const FONKSIYON_EXAMS = {
  "TYT-0782": {
    "conceptId": "fonksiyon-kavrami",
    "archetype": "parcali-islem",
    "answer": "A",
    "title": "2019 TYT · iki eşitlikten iki parametre",
    "cue": "$(f+g)(1)=f(1)$ eşitliğini açınca bir değer sıfır çıkar. İki eşitlik a ve b için iki denklem verir.",
    "steps": [
      {
        "text": "$(f+g)(1)=f(1)$: $f(1)+g(1)=f(1)$, $g(1)=0$. $b-2=0$, $b=2$.",
        "why": "Ortak terim sadeleşir."
      },
      {
        "text": "$(f+g)(2)=g(2)$: $f(2)=0$. $2a-b=0$, $a=1$.",
        "why": "Aynı fikir ikinci eşitlikte."
      },
      {
        "text": "$a\\cdot b=1\\cdot2=2$.",
        "why": "İstenen çarpım."
      }
    ],
    "result": "A · 2",
    "tip": "Fonksiyonlarda işlem eşitliklerini aç; bir taraftaki değer öbür tarafta da varsa sadeleşir ve kalan değer sıfır olur.",
    "check": "$f(x)=x-2$, $g(x)=2x-2$: $g(1)=0$, $f(2)=0$ ✓.",
    "mistake": "$(f+g)(1)$'i $f(1)\\cdot g(1)$ gibi işleyip yanlış denklem kurmak."
  },
  "TYT-0788": {
    "conceptId": "fonksiyon-kavrami",
    "archetype": "parcali-islem",
    "answer": "B",
    "title": "2023 TYT · çarpım ve toplam eşitliği",
    "cue": "İki tarafı ayrı ayrı a cinsinden yaz. Ortak çarpan $(a+1)$ çıkacak; $a>0$ koşulunu kullanarak sadeleştir.",
    "steps": [
      {
        "text": "$(f\\cdot g)(1)=f(1)\\cdot g(1)=(1+a)(a+1)=(a+1)^2$.",
        "why": "Aynı noktadaki değerlerin çarpımı."
      },
      {
        "text": "$(f+g)(2)=(2+a)+(2a+1)=3a+3=3(a+1)$.",
        "why": "Aynı noktadaki değerlerin toplamı."
      },
      {
        "text": "$(a+1)^2=3(a+1)$; $a>0$ olduğundan $a+1\\neq0$: $a+1=3$, $a=2$.",
        "why": "Ortak çarpana bölmeden önce sıfır olmadığını kontrol ettik."
      },
      {
        "text": "$g(7)=2\\cdot7+1=15$.",
        "why": "İstenen değer."
      }
    ],
    "result": "B · 15",
    "tip": "Parametreli eşitliklerde ortak çarpanı fark et; bölmeden önce koşulla sıfır olamayacağını göster.",
    "check": "$a=2$: $(f\\cdot g)(1)=3\\cdot3=9$, $(f+g)(2)=4+5=9$ ✓.",
    "mistake": "$(a+1)$ ile bölmeyi unutup ikinci dereceden denklemi çözerken $a=-1$'i de cevap sanmak."
  },
  "TYT-0786": {
    "conceptId": "fonksiyon-kavrami",
    "archetype": "parcali-islem",
    "answer": "D",
    "title": "2021 TYT · f + g ve f − g grafiklerinden b",
    "cue": "Grafikten $x=a$'da $(f+g)(a)=b$ ve $(f-g)(a)=2$ okunur. Çarpımı toplam ve farkla ifade et.",
    "steps": [
      {
        "text": "$f(a)=\\frac{b+2}{2}$, $g(a)=\\frac{b-2}{2}$.",
        "why": "Toplam ve farkı topla ya da çıkar."
      },
      {
        "text": "$(f\\cdot g)(a)=\\frac{(b+2)(b-2)}{4}=\\frac{b^2-4}{4}=8$.",
        "why": "İki kare farkı."
      },
      {
        "text": "$b^2=36$; grafikte $b>0$: $b=6$.",
        "why": "b, y ekseninde 2'nin üstünde."
      }
    ],
    "result": "D · 6",
    "tip": "$(f\\cdot g)=\\frac{(f+g)^2-(f-g)^2}{4}$: toplam ve fark grafikleri verildiğinde çarpım doğrudan bir denklem verir.",
    "check": "$b=6$: $f(a)=4$, $g(a)=2$; $4\\cdot2=8$ ✓, $4-2=2$ ✓.",
    "mistake": "$b$ ile 2'yi çarpıp $2b=8$, $b=4$ bulmak."
  }
};
