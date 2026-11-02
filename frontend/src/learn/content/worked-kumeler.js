// Özgün kırpımlar incelendi; öğretmen onayı değildir.
export const KUMELER_EXAMS = {
  "TYT-0756": {
    "conceptId": "kumeler-temel",
    "archetype": "gosterim",
    "answer": "B",
    "title": "2020 TYT · telefon numaralarının rakam kümeleri",
    "cue": "Görünen rakamlarla iki kümenin bilinen elemanlarını yaz. Eleman sayıları, gizli rakamların kaç yeni eleman getirdiğini; kesişim ise hangi rakamın iki kümede olduğunu söyler.",
    "steps": [
      {
        "text": "Berk: görünenler 0, 5, 9, 4, 1; kesişimde 6 var, $6\\in B$. $s(B)=6$: $B=\\{0, 1, 4, 5, 6, 9\\}$.",
        "why": "Altı eleman doldu; başka rakam yok."
      },
      {
        "text": "Ayla: görünenler 0, 5, 7, 2, 3; kesişimden 1, 4, 6 da A'da: 8 eleman. 9 kesişimde olmadığı için $9\\notin A$.",
        "why": "Kesişim, iki kümede ortak olanların tamamıdır."
      },
      {
        "text": "$s(A)=9$: bir eleman daha, B'de olmayan ve henüz yazılmamış tek rakam 8. $A\\setminus B=\\{2, 3, 7, 8\\}$.",
        "why": "B'deki rakamlar A'ya eklenirse kesişim büyürdü."
      },
      {
        "text": "Toplam $2+3+7+8=20$.",
        "why": "A'da olup B'de olmayanların değerleri."
      }
    ],
    "result": "B · 20",
    "tip": "Rakam ve harf kümelerinde tekrarlar düşer; eleman sayısı ile bilinen elemanların farkı, gizli yerlerden gelen yeni elemanları verir.",
    "check": "$A=\\{0,\\dots,8\\}$, $B=\\{0, 1, 4, 5, 6, 9\\}$: $A\\cap B=\\{0, 1, 4, 5, 6\\}$ ✓, $s(A)=9$ ✓.",
    "mistake": "9'u da A'ya koymak (o zaman kesişimde olurdu) ya da A'nın dokuzuncu elemanını unutup toplamı 12 bulmak."
  },
  "TYT-0758": {
    "conceptId": "kumeler-temel",
    "archetype": "esitlik",
    "answer": "C",
    "title": "2022 TYT · 2 ile çarpılan küme ve 3 elemanlı kesişim",
    "cue": "$a$'sız kesişimi yaz, sonra $a$'nın kesişimi bir eleman büyüttüğü değerleri dene: $a$ yeni kümede olabilir, $2a$ eski kümede olabilir ya da $a=2a$ olabilir.",
    "steps": [
      {
        "text": "$\\{2, 4, 8\\}\\cap\\{4, 8, 16\\}=\\{4, 8\\}$: iki eleman.",
        "why": "Bilinen elemanlarla kesişim."
      },
      {
        "text": "$a=16$: $16$ iki kümede ✓. $2a=2$: $a=1$ ✓ (2 ortak olur). $2a=4$ ya da $2a=8$: $a$ kümede zaten var ✗.",
        "why": "Küme 4 elemanlı olmalı; $a$ diğerlerinden farklı."
      },
      {
        "text": "$a=2a$: $a=0$ ✓. Değerler 0, 1, 16; toplam 17.",
        "why": "0 iki kümede birden bulunur."
      }
    ],
    "result": "C · 17",
    "tip": "Dönüştürülmüş kümelerde bilinmeyen eleman kesişimi üç yoldan büyütür: yeni kümede bulunmak, dönüşmüş hâliyle eski kümede bulunmak ya da dönüşümde değişmemek.",
    "check": "$a=1$: $\\{1,2,4,8\\}\\cap\\{2,4,8,16\\}$ üç eleman ✓; $a=0$ ve $a=16$ de 3 eleman ✓.",
    "mistake": "Yalnız $a=16$'yı bulmak ya da $a=2$ ve $a=4$'ü küme 4 elemanlı olmadığı hâlde saymak."
  },
  "TYT-0759": {
    "conceptId": "kumeler-temel",
    "archetype": "gosterim",
    "answer": "E",
    "title": "2023 TYT · isimlerin harf kümeleri",
    "cue": "X'i yaz; AKIN ve KENAN'ın X ile ortak harflerini bul. Kesişimde kalan harfler üçüncü isimden gelmeli, X'teki diğer harfler üçüncü isimde olmamalı.",
    "steps": [
      {
        "text": "$X=\\{A, Y, L, İ, N, B, E, S, U\\}$. AKIN ve KENAN'ın harfleri A, K, I, N, E; X ile ortakları A, N, E.",
        "why": "I ile İ farklı harflerdir."
      },
      {
        "text": "Kesişimde B ve U da var: üçüncü isim B ve U içermeli; Y, L, İ, S içermemeli.",
        "why": "Bunlar X'te var ama kesişimde yok."
      },
      {
        "text": "BARIŞ'ta U yok; BİLAL'de İ ve L, BURAY'da Y, BULUT'ta L var. BURAK uygun.",
        "why": "Seçenekleri iki kurala göre ele."
      }
    ],
    "result": "E · BURAK",
    "tip": "Harf kümesi sorularında kesişimde olması gereken ve olmaması gereken harfleri iki ayrı liste yap; seçenekleri bu listelerle ele.",
    "check": "BURAK ile $Y=\\{A, K, I, N, E, B, U, R\\}$; $X\\cap Y=\\{A, B, E, N, U\\}$ ✓.",
    "mistake": "Yalnız B ve U'yu içeren ilk ismi seçmek; BULUT'taki L kesişime girer."
  }
};
