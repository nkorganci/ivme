// Özgün kırpımlar incelendi; öğretmen onayı değildir.
export const KUME_ISLEM_EXAMS = {
  "TYT-0761": {
    "conceptId": "kume-islemleri",
    "archetype": "islem-venn",
    "answer": "E",
    "title": "2025 TYT · üyelik bilgilerinden B kümesi",
    "cue": "Her bilgiyi B için “kesin var” ya da “kesin yok” listesine çevir; birleşim bilgisi B hakkında tek başına bir şey söylemez.",
    "steps": [
      {
        "text": "$8\\in A\\cap B$: $8\\in B$. $10\\in A\\setminus B$: $10\\notin B$. $9\\in A\\cup B$: B için bilgi yok.",
        "why": "Kesişim ve fark kesin üyelik verir."
      },
      {
        "text": "I. Bütün çift sayılar 10'u içerir ✗.",
        "why": "10, B'de olmamalı."
      },
      {
        "text": "II. Bir basamaklı doğal sayılar: 8 var, 10 yok ✓. III. 4'ün katları: 8 var, 10 yok ✓.",
        "why": "İki koşul da sağlanıyor."
      }
    ],
    "result": "E · II ve III",
    "tip": "$\\cap$ ve $\\setminus$ bilgilerinden kesin üyelikleri çıkar; aday kümeleri yalnız bu iki listeyle ele.",
    "check": "II için $A=\\{8, 9, 10\\}$ alınırsa üç bilgi de sağlanır ✓.",
    "mistake": "$9\\in A\\cup B$ bilgisinden $9\\in B$ sonucunu çıkarıp III'ü elemek."
  },
  "TYT-0757": {
    "conceptId": "kume-islemleri",
    "archetype": "islem-venn",
    "answer": "D",
    "title": "2021 TYT · asker, ressam, akademisyen",
    "cue": "Akademisyen'in 9 farklı harfi var; kesişimle yazılabilseydi A ile B aynı küme olurdu. Bu yüzden asker ve ressam kesişimle yazılır. A'nın kesin harflerini ve boş yer sayısını bul.",
    "steps": [
      {
        "text": "asker ve ressam: $A\\cap B\\supseteq\\{a, s, k, e, r, m\\}$; A'da 6 harf kesin.",
        "why": "Kesişimle yazılabilen kelimelerin harfleri iki kümede."
      },
      {
        "text": "$s(A)=9$: A'ya en çok 3 harf daha eklenebilir.",
        "why": "Boş yer sayısı."
      },
      {
        "text": "şair: ş, i; hekim: h, i; memur: u; sekreter: t gerekir; en çok 2 harf. sanatçı: n, t, ç, ı gerekir: 4 harf.",
        "why": "Her kelime için eksik harfleri say."
      }
    ],
    "result": "D · sanatçı",
    "tip": "“Kesinlikle yazılamaz” sorusunda kelimenin eksik harf sayısını kümenin boş yer sayısıyla karşılaştır.",
    "check": "A = {a, s, k, e, r, m, h, i, ş} gibi bir küme şair ve hekim'i yazar; hiçbir 9 harfli A sanatçı'yı yazamaz.",
    "mistake": "akademisyen'i kesişime koymak; o zaman A = B olur ve “diğeri A ∪ B ile” bilgisi anlamsızlaşır."
  },
  "TYT-0760": {
    "conceptId": "kume-islemleri",
    "archetype": "islem-venn",
    "answer": "B",
    "title": "2024 TYT · bölgelere 1–9 sayılarını yerleştirme",
    "cue": "Üç bölgeyi ayrı düşün. En kısıtlı bölgeden başla: 1–9 arasında farkı 8 olan tek çift 1 ve 9. Toplam eşitliği, iki fark bölgesinin toplamlarının eşit olması demektir.",
    "steps": [
      {
        "text": "$A\\cap B\\supseteq\\{1, 9\\}$. $B\\setminus A$'da çarpımı 8 olan çift: 1 kullanıldığı için $\\{2, 4\\}$.",
        "why": "Bir sayı yalnız bir bölgede bulunur."
      },
      {
        "text": "$A\\setminus B$'de toplamı 8 olan çift: 1, 2 kullanıldı; $\\{3, 5\\}$.",
        "why": "(1, 7) ve (2, 6) elenir."
      },
      {
        "text": "Kalan 6, 7, 8 yerleşecek; $s(A)=s(B)$ toplamları için $\\Sigma(A\\setminus B)=\\Sigma(B\\setminus A)$: $8+x=6+y$. Tek çözüm 6 → $A\\setminus B$, 8 → $B\\setminus A$, 7 → $A\\cap B$.",
        "why": "$y=x+2$ olacak biçimde dağıtım."
      },
      {
        "text": "$A\\cap B=\\{1, 7, 9\\}$, toplam 17.",
        "why": "Kontrol: A = {1, 3, 5, 6, 7, 9} toplam 31; B = {1, 2, 4, 7, 8, 9} toplam 31."
      }
    ],
    "result": "B · 17",
    "tip": "Bölge sorularında en kısıtlı koşulla başla, sonra küresel koşulu (toplam eşitliği) fark bölgeleri arasındaki eşitliğe çevir.",
    "check": "$A=\\{1, 3, 5, 6, 7, 9\\}$, $B=\\{1, 2, 4, 7, 8, 9\\}$: iki toplam 31 ✓.",
    "mistake": "7'yi fark bölgelerinden birine koymak; toplamlar eşitlenmez."
  }
};
