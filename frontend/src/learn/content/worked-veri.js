// Özgün kırpımlar incelendi; öğretmen onayı değildir.
export const VERI_EXAMS = {
  "TYT-0796": {
    "conceptId": "veri-grafikleri",
    "archetype": "daire-grafik",
    "answer": "E",
    "title": "2018 TYT · sayı grafiği ve ağırlık grafiğinden top ağırlıkları",
    "cue": "1. grafik topların sayısını, 2. grafik toplam ağırlıklarını gösteriyor. Bir topun ağırlığı, ağırlık payının sayı payına oranıyla orantılıdır.",
    "steps": [
      {
        "text": "1. grafik: A 120°, B 90° (dik açı), C $360-210=150°$.",
        "why": "Bilinmeyen dilim, 360°'den kalan."
      },
      {
        "text": "2. grafik: A yarım daire 180°, B ve C dik açılı 90°'şer.",
        "why": "Çapın bir yanı A, öbür yanı iki dik açıyla bölünmüş."
      },
      {
        "text": "Birim ağırlık $\\propto\\frac{\\text{ağırlık açısı}}{\\text{sayı açısı}}$: A $\\frac{180}{120}=1{,}5$, B $\\frac{90}{90}=1$, C $\\frac{90}{150}=0{,}6$.",
        "why": "İki grafiğin bütünleri her markada aynı çarpanla sadeleşir."
      },
      {
        "text": "$0{,}6<1<1{,}5$: $K_C<K_B<K_A$.",
        "why": "Oranlar birim ağırlıklarla aynı sırada."
      }
    ],
    "result": "E · C en hafif, B ortada, A en ağır",
    "tip": "Aynı kategoriler için adet ve miktar grafikleri verilirse birim miktarı $\\frac{\\text{miktar açısı}}{\\text{adet açısı}}$ ile karşılaştır.",
    "check": "Örnek: 12 top (A 4, B 3, C 5), toplam ağırlık 12 birim (A 6, B 3, C 3): $K_A=1{,}5$, $K_B=1$, $K_C=0{,}6$ ✓.",
    "mistake": "Yalnız 2. grafiğe bakıp B ile C'yi eşit ağırlıklı saymak; ya da açıları doğrudan ağırlık sanmak."
  },
  "TYT-0798": {
    "conceptId": "veri-grafikleri",
    "archetype": "sutun-cizgi",
    "answer": "E",
    "title": "2019 TYT · daire grafiği ve iade yüzdeleri",
    "cue": "Daire grafiği satış adetlerinin payını, sütun grafiği her türün kendi içindeki iade yüzdesini veriyor. Önce B'nin satışını yüzdeden, sonra bütünü açıdan bul.",
    "steps": [
      {
        "text": "B'nin iade yüzdesi 14: $168:0{,}14=1200$ B satıldı.",
        "why": "Kategori içindeki yüzdeden kategori adedi."
      },
      {
        "text": "C dilimi 120°, yani A + B bütünün $\\frac{2}{3}$'ü: $600+1200=1800$, bütün 2700, C 900.",
        "why": "Açı bütüne oranı verir."
      },
      {
        "text": "İadeler: A $600\\cdot0{,}07=42$, C $900\\cdot0{,}12=108$.",
        "why": "Her türde kendi iade yüzdesi."
      },
      {
        "text": "$42+108=150$.",
        "why": "Soru A ve C'nin iadelerinin toplamını istiyor."
      }
    ],
    "result": "E · 150",
    "tip": "Daire + sütun sorularında istenen sayı = bütün × pay × kategori yüzdesi. Bütünü, hem sayısı hem açısı bilinen kategorilerden bul.",
    "check": "A + B dilimleri 240°: $1800\\cdot\\frac{360}{240}=2700$ ✓; B iadesi $1200\\cdot0{,}14=168$ ✓.",
    "mistake": "İade yüzdelerini toplayıp bütüne uygulamak ya da A ile B'yi eşit dilimli sanmak."
  },
  "TYT-0809": {
    "conceptId": "veri-grafikleri",
    "archetype": "daire-grafik",
    "answer": "D",
    "title": "2025 TYT · paket grafiği ve top grafiği",
    "cue": "Her sarı pakette 1, mavide 2, kırmızıda 3 top var. Sarı paket sayısını $y$ alıp iki grafiği iki denkleme çevir.",
    "steps": [
      {
        "text": "Sarı paket dilimi 30°: paketler $12y$; mavi ve kırmızı paketler $b+r=11y$.",
        "why": "$\\frac{360}{30}=12$."
      },
      {
        "text": "Sarı top dilimi 12°: $y$ sarı top bütün topların $\\frac{1}{30}$'u; toplar $30y$, yani $2b+3r=29y$.",
        "why": "Her sarı pakette tek top var."
      },
      {
        "text": "$2(b+r)+r=22y+r=29y$: $r=7y$; kırmızı top $3r=21y$.",
        "why": "İlk denklemi 2 ile çarpıp çıkardık."
      },
      {
        "text": "Oran $\\frac{21y}{30y}=\\frac{7}{10}$: %70.",
        "why": "Kırmızı topların bütün toplara oranı."
      }
    ],
    "result": "D · %70",
    "tip": "Birim içerikleri bilinen kategorilerde adet grafiğini ve miktar grafiğini aynı bilinmeyenle iki denkleme çevir.",
    "check": "$y=1$: paketler 1 sarı, 4 mavi, 7 kırmızı (12); toplar $1+8+21=30$; sarı top $\\frac{1}{30}\\cdot360=12°$ ✓.",
    "mistake": "Paket dilimlerini top dilimleriyle aynı sanmak ya da kırmızı paket oranını ($\\frac{7}{12}$) cevap vermek."
  }
};
