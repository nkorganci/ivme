// Özgün kırpımlar incelendi; öğretmen onayı değildir.
export const SAYMA_EXAMS = {
  "TYT-0763": {
    "conceptId": "sayma-permutasyon",
    "archetype": "temel-ilke",
    "answer": "C",
    "title": "2018 TYT · piramitten minderlere yollar",
    "cue": "Her adımda çocuk bulunduğu küple ortak ayrıtı olan iki alt küpten birine iner. Her basamağa kaç yoldan gelindiğini yaz ya da her adımın seçenek sayısını çarp.",
    "steps": [
      {
        "text": "İlk üç adımda her seferinde 2 seçenek: $2\\cdot2\\cdot2=8$ yol en alt sıraya ulaşır.",
        "why": "Her küp, altında iki küple ortak ayrıta sahip."
      },
      {
        "text": "Pascal sayılarıyla kontrol: 1; 1 1; 1 2 1; 1 3 3 1 — toplam 8.",
        "why": "Her küpe gelen yol, üstündeki komşuların yollarının toplamı."
      },
      {
        "text": "Son adımda her alt küp iki mindere komşu: $8\\cdot2=16$.",
        "why": "Art arda aşamalar çarpılır."
      }
    ],
    "result": "C · 16",
    "tip": "Yol sorularında ya her adımın seçenek sayısını çarp ya da her noktaya gelen yol sayısını toplayarak ilerle; ikisi aynı sonucu verir.",
    "check": "Minderlere gelen yollar Pascal satırı 1 4 6 4 1'dir; toplamı 16 ✓.",
    "mistake": "Yalnız minder sayısını ya da yalnız son sıradaki küp sayısını saymak."
  },
  "TYT-0767": {
    "conceptId": "sayma-permutasyon",
    "archetype": "temel-ilke",
    "answer": "A",
    "title": "2022 TYT · ortak çeşit olmayan iki dondurma siparişi",
    "cue": "Beş seçenek var: V, K, A, VK, VA. Aslı'nın her seçimi için Başak'ın ortak çeşit içermeyen seçeneklerini say.",
    "steps": [
      {
        "text": "Aslı V: Başak K ya da A (2). Aslı K: V, A, VA (3). Aslı A: V, K, VK (3).",
        "why": "Tek çeşitli seçimler."
      },
      {
        "text": "Aslı VK: yalnız A (1). Aslı VA: yalnız K (1).",
        "why": "Karışık seçimler daha çok seçeneği eler."
      },
      {
        "text": "Toplam $2+3+3+1+1=10$.",
        "why": "Aslı ile Başak farklı kişiler; sıra önemli."
      }
    ],
    "result": "A · 10",
    "tip": "Uyumluluk koşulu her seçimde farklı sayıda seçenek eliyorsa çarpma yerine durum durum say.",
    "check": "Ayrık sıralı çiftler: (V,K), (V,A), (K,V), (K,A), (K,VA), (A,V), (A,K), (A,VK), (VK,A), (VA,K): 10 ✓.",
    "mistake": "Her seçim için 2 seçenek kaldığını sanıp $5\\cdot2=10$… bulmak doğru sayıyı tesadüfen verir ama yöntem yanlıştır; ya da sırayı unutup 5 bulmak."
  },
  "TYT-0770": {
    "conceptId": "sayma-permutasyon",
    "archetype": "siralama-kosul",
    "answer": "C",
    "title": "2025 TYT · beş aktivite ve iki önce–sonra koşulu",
    "cue": "Koşulsuz sıralamalar 5!. Banyo spordan sonra: yarısı. Ödev ve ev işi filmden önce: üç işin sırasının üçte biri.",
    "steps": [
      {
        "text": "Bütün sıralamalar $5!=120$.",
        "why": "Koşulsuz."
      },
      {
        "text": "Spor–banyo: iki sıradan biri uygun, $\\frac12$.",
        "why": "Banyo spordan sonra."
      },
      {
        "text": "Ödev, ev işi, film: 6 sıradan film sonda olan 2 tanesi uygun, $\\frac13$.",
        "why": "Film ikisinden sonra."
      },
      {
        "text": "Koşullar ayrı aktivitelerle ilgili: $120\\cdot\\frac12\\cdot\\frac13=20$.",
        "why": "Bağımsız kesirler çarpılır."
      }
    ],
    "result": "C · 20",
    "tip": "Önce–sonra koşullarında sıralamaların hangi kesrinin uygun olduğunu bul; ayrı nesnelere ait koşullarda kesirleri çarp.",
    "check": "Bütün 120 sıralamayı tarayan bir sayım da 20 verir.",
    "mistake": "Banyoyu sona, filmi sona sabitleyip yalnız bir sıralama düşünmek ya da yalnız bir koşulu uygulamak."
  }
};
