// Özgün kırpımlar incelendi; öğretmen onayı değildir.
export const BILESKE_EXAMS = {
  "TYT-0785": {
    "conceptId": "bileske-ters",
    "archetype": "bileske-kural",
    "answer": "A",
    "title": "2020 TYT · f ∘ g ve g ∘ f verilmiş, f(3) isteniyor",
    "cue": "Kuralları bulmaya çalışma. $f(g(f(2)))$ ifadesini iki yoldan yaz: dıştan $(f\\circ g)(f(2))$, içten $f\\big((g\\circ f)(2)\\big)$.",
    "steps": [
      {
        "text": "$(f\\circ g)(f(2))=(f\\circ g)(1)=1+3+1=5$.",
        "why": "$f(2)=1$ verilmiş."
      },
      {
        "text": "$(g\\circ f)(2)=4-2+1=3$; aynı ifade $f\\big((g\\circ f)(2)\\big)=f(3)$.",
        "why": "Üç katlı bileşkenin içten okunuşu."
      },
      {
        "text": "İki yol aynı ifadeyi verdiği için $f(3)=5$.",
        "why": "$f(g(f(2)))$ tek bir sayıdır."
      }
    ],
    "result": "A · 5",
    "tip": "$f\\circ g$ ve $g\\circ f$ birlikte verilince $f\\circ g\\circ f$'yi iki yoldan yaz; bilinen f değerinin girdisini x olarak seç.",
    "check": "$(f\\circ g)(1)=5$ ve $(g\\circ f)(2)=3$: $f(3)=5$ iki eşitlikle tutarlı ✓.",
    "mistake": "$(f\\circ g)(x)$ ifadesine $x=3$ yazıp $f(3)$ sanmak: $(f\\circ g)(3)=f(g(3))$'tür."
  },
  "TYT-0783": {
    "conceptId": "bileske-ters",
    "archetype": "bileske-deger",
    "answer": "A",
    "title": "2019 TYT · grafiklerden f ∘ g ve g ∘ f",
    "cue": "$a\\in(0,1)$ için önce $g(a)$ ve $f(a)$'nın hangi aralıklarda olduğunu grafikten oku; sonra bu aralıklarda öbür fonksiyonun değerlerine bak.",
    "steps": [
      {
        "text": "$(0,1)$'de g, 3'ten yaklaşık 2,2'ye iner: $g(a)\\in(2{,}2;\\ 3)$. f, 1'den yükselir: $f(a)\\in(1;\\ 2{,}2)$.",
        "why": "İç değerlerin aralığı."
      },
      {
        "text": "$b=f(g(a))$: f'nin $(2{,}2;3)$ aralığındaki değerleri yaklaşık 2: $b\\approx2$.",
        "why": "f bu aralıkta 2 civarında, neredeyse yatay."
      },
      {
        "text": "$c=g(f(a))$: g'nin $(1;2{,}2)$ aralığındaki değerleri yaklaşık 2,2 ve üstü: $c>b$. $a<1<b<c$.",
        "why": "g bu aralıkta f'nin oradaki değerlerinin üstünde."
      }
    ],
    "result": "A · a < b < c",
    "tip": "Grafikle bileşkede iç fonksiyonun çıktı aralığını bul, dış fonksiyonu yalnız bu aralıkta incele.",
    "check": "a 0 ile 1 arasında; b ve c 2 civarında ve c, g'nin yatay kısmında b'nin üstünde ✓.",
    "mistake": "$f(g(a))$ için f'yi a noktasında okumak; f'nin girdisi $g(a)$'dır."
  },
  "TYT-0791": {
    "conceptId": "bileske-ters",
    "archetype": "bileske-deger",
    "answer": "B",
    "title": "2026 TYT · üç doğrunun bileşke eşitlikleri",
    "cue": "$(f\\circ g)(1)=(f\\circ h)(1)$ için en doğal durum $g(1)=h(1)$'dir; $x=1$'de aynı değeri alan iki doğruyu bul. Sonra $(g\\circ h)(1)=(f\\circ h)(1)$ ile g'yi seç.",
    "steps": [
      {
        "text": "$x=1$'de kırmızı ve siyah aynı yükseklikte, mavi 0'da: g ve h kırmızı ile siyah, f mavi.",
        "why": "$g(1)=h(1)$."
      },
      {
        "text": "$g(h(1))=f(h(1))$: g ile f, $h(1)$ noktasında eşit; mavi ile siyah orada kesişiyor: g siyah, h kırmızı.",
        "why": "Kırmızı o noktada maviden yüksek."
      },
      {
        "text": "$a=g(f(1))=g(0)$: siyahın başlangıcı, küçük. $b=h(f(1))=h(0)$: kırmızının başlangıcı, en büyük. $c=h(g(1))$: kırmızının ortadaki değeri.",
        "why": "Kırmızı azalan: $h(0)>h(g(1))$."
      },
      {
        "text": "$a<c<b$.",
        "why": "Siyahın başlangıcı kırmızının bütün değerlerinin altında."
      }
    ],
    "result": "B · a < c < b",
    "tip": "Bileşke eşitliklerinden önce grafikleri isimlendir; sonra her bileşkeyi içten dışa iki okuma ile hesapla.",
    "check": "Benzer kurallarla ($f=0{,}5-0{,}5x$, $g=0{,}5x$, $h=1-0{,}5x$): $a=0$, $c=0{,}75$, $b=1$ ✓.",
    "mistake": "f'yi x = 1'de 0,5 olan doğrulardan biri sanmak; o zaman eşitliklerin hepsi sağlanmaz."
  }
};
