// Özgün kırpımlar incelendi; öğretmen onayı değildir.
export const FONKSIYON_GRAFIK_EXAMS = {
  "TYT-0790": {
    "conceptId": "fonksiyon-grafikleri",
    "archetype": "grafik-okuma",
    "answer": "C",
    "title": "2025 TYT · üç doğrunun grafiği ve f(a) = g(b) = h(b)",
    "cue": "Önce hangi doğrunun hangi fonksiyon olduğunu bul: $f(1)=g(1)$ iki doğrunun $x=1$'de buluştuğunu, $g(b)=h(b)$ g ile h'nin $(0,1)$ içinde kesiştiğini söyler.",
    "steps": [
      {
        "text": "$x=1$'de buluşan iki doğru siyah ve kırmızı: f ile g bunlar; mavi doğru h.",
        "why": "$f(1)=g(1)$."
      },
      {
        "text": "Mavi doğru $(0,1)$ içinde yalnız kırmızıyla kesişir: g kırmızı, f siyah. Kesişimin x'i b.",
        "why": "$g(b)=h(b)$; siyah ile mavi aralıkta kesişmez."
      },
      {
        "text": "Siyah her yerde kırmızının üstünde: $f(a)=g(b)$ ve $f(a)>g(a)$ olduğundan $g(b)>g(a)$, yani $a<b$ (g artan).",
        "why": "Aynı yüksekliğe siyah daha solda ulaşır."
      },
      {
        "text": "$a<b$'de mavi kırmızının üstünde, siyah ikisinin de üstünde: $g(a)<h(a)<f(a)$.",
        "why": "Kesişimin solunda sıralama; ayrıca $h(a)<h(b)=f(a)$."
      }
    ],
    "result": "C · g(a) < h(a) < f(a)",
    "tip": "Önce eşitlik bilgileriyle grafikleri fonksiyonlarla eşle; sonra istenen noktada dikey doğruyla sıralamayı oku.",
    "check": "Örnek kurallar $f=0{,}4+0{,}6x$, $g=x$, $h=0{,}25+0{,}5x$ ile $a=\\frac16$, $b=\\frac12$: $0{,}17<0{,}33<0{,}5$ ✓.",
    "mistake": "Mavi doğruyu g sanmak; o zaman $g(b)=h(b)$ için kesişim olmaz."
  },
  "TYT-0789": {
    "conceptId": "fonksiyon-grafikleri",
    "archetype": "grafik-okuma",
    "answer": "A",
    "title": "2024 TYT · fark çarpımlarıyla grafikleri eşleme",
    "cue": "Çarpımı negatif iki fark, f(1)'in diğer ikisinin arasında olduğunu; çarpımı pozitif iki fark, g(2)'nin en büyük ya da en küçük olduğunu söyler.",
    "steps": [
      {
        "text": "$x=1$'de kırmızı en üstte, mavi en altta, siyah ortada: f siyah.",
        "why": "$(f-g)(1)$ ile $(f-h)(1)$ ters işaretli."
      },
      {
        "text": "$x=2$'de siyah ile mavi aynı noktada, kırmızı onların üstünde: $g(2)$ en büyük olmalı, g kırmızı; h mavi.",
        "why": "$(g-h)(2)$ ile $(g-f)(2)$ aynı işaretli."
      },
      {
        "text": "$x=3$'te siyah en altta, kırmızı ortada, mavi en üstte: $f(3)<g(3)<h(3)$.",
        "why": "Dikey doğruyla oku."
      }
    ],
    "result": "A · f(3) < g(3) < h(3)",
    "tip": "Fark çarpımlarının işareti “arada” ya da “uçta” bilgisi verir; bununla grafikleri isimlendir, sonra sıralamayı oku.",
    "check": "Eşleme iki bilgiyi de sağlar: $x=1$'de siyah arada, $x=2$'de kırmızı en üstte ✓.",
    "mistake": "$x=2$'de siyah ve mavi eşit olduğu için g'yi bunlardan biri sanmak; o zaman fark çarpımı sıfır olur."
  },
  "TYT-0787": {
    "conceptId": "fonksiyon-grafikleri",
    "archetype": "grafik-okuma",
    "answer": "B",
    "title": "2022 TYT · f(a) = f(b) = f(c) ve g'nin değerleri",
    "cue": "$y=k$ yatay doğrusu f'yi üç noktada kesiyor. Önce a, b, c'nin f'nin hangi parçalarında olduğunu, sonra g'nin bu noktalardaki yüksekliklerini oku.",
    "steps": [
      {
        "text": "f önce artar, sonra ortalarda dibe iner, sonra yeniden artar: a ilk artan kısımda (0'a yakın), b azalan kısımda, c son artan kısımda (1'e yakın).",
        "why": "Her monoton parçada bir kesişim."
      },
      {
        "text": "g önce azalır, aralığın ortasında en küçük olur, sonra artar: b dibe en yakın, $g(b)$ en küçük.",
        "why": "b, g'nin en küçük değerine en yakın nokta."
      },
      {
        "text": "Kesikli çizgiler g'nin c'deki değerinin başlangıç değerinden büyük olduğunu gösterir; g başta azaldığı için $g(a)<g(0)<g(c)$.",
        "why": "a, 0'ın biraz sağında."
      }
    ],
    "result": "B · g(b) < g(a) < g(c)",
    "tip": "Eşit değer bilgisini yatay doğruya çevir, noktaları parçalara dağıt; ikinci fonksiyonun değerlerini kendi grafiğinden oku.",
    "check": "Kurallarla benzeri: $f=x^3-6x^2+9x$, $f=2$ için $a=2-\\sqrt3$, $b=2$, $c=2+\\sqrt3$; g dipte b'de en küçük ✓.",
    "mistake": "g'nin değerlerini f'nin grafiğinden okumak ya da a ile c'yi simetrik sanıp $g(a)=g(c)$ demek."
  }
};
