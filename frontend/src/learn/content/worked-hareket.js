// Özgün kırpımlar incelendi; öğretmen onayı değildir.
export const HAREKET_EXAMS = {
  "TYT-0673": {
    "conceptId": "hareket-problemleri",
    "archetype": "karsilasma",
    "answer": "D",
    "title": "2020 TYT · karşılaştıktan sonra 250 ve 160 dakika",
    "cue": "Karşılaşma noktası yolu iki parçaya ayırıyor. Bir aracın karşılaşmadan sonra gittiği parçayı öbür araç karşılaşmadan önce gitmiştir.",
    "steps": [
      {
        "text": "Karşılaşma $t$ dakikada, C noktasında. B'den çıkan araç CB'yi $t$ dakikada gitti; A'dan çıkan aynı CB'yi 250 dakikada gidiyor: $V_A\\cdot250=V_B\\cdot t$.",
        "why": "Karşılaşmadan sonraki yol, öbür aracın karşılaşmaya kadar aldığı yoldur."
      },
      {
        "text": "Aynı şekilde AC için: $V_B\\cdot160=V_A\\cdot t$.",
        "why": "B'den çıkan araç karşılaşmadan sonra A'ya, yani AC parçasını gidiyor."
      },
      {
        "text": "İki eşitliği taraf tarafa çarp: $V_AV_B\\cdot250\\cdot160=V_AV_B\\cdot t^2$, $t^2=40\\,000$, $t=200$.",
        "why": "Hızlar bilinmiyor; çarpınca sadeleşir ve yalnız süre kalır."
      }
    ],
    "result": "D · 200 dakika",
    "tip": "Karşılaştıktan sonra $t_1$ ve $t_2$ sürede varan araçlar $t=\\sqrt{t_1t_2}$ anında karşılaşmıştır; hız oranı $\\sqrt{t_2/t_1}$'dir.",
    "check": "Hız oranı $V_A:V_B=200:250=4:5$. AC $=4\\cdot200$ birim; B bu yolu $800:5=160$ dakikada gider ✓.",
    "mistake": "Kalan sürelerin ortalamasını almak ($\\frac{250+160}{2}=205$) ya da süreleri toplamak."
  },
  "TYT-0700": {
    "conceptId": "hareket-problemleri",
    "archetype": "karsilasma",
    "answer": "E",
    "title": "2022 TYT · aradaki uzaklık grafiğinde kırılma",
    "cue": "Grafik konumu değil, iki kişinin arasındaki uzaklığı gösteriyor. 4. dakikadaki kırılma, birinin okuluna vardığı andır.",
    "steps": [
      {
        "text": "İlk 4 dakikada ikisi de yürüyor, zıt yönde: $V_B+V_E=1400:4=350$ m/dk.",
        "why": "Zıt yönlü harekette aradaki uzaklık hızların toplamıyla artar."
      },
      {
        "text": "4–6. dakikalarda uzaklık $300$ m artıyor: yalnız bir kişi yürüyor, hızı $300:2=150$ m/dk.",
        "why": "Eğim azaldı; okula ilk varan durdu."
      },
      {
        "text": "Esra'nın okulu daha uzak, demek ki 4. dakikada varan Burcu. Esra 150, Burcu $350-150=200$ m/dk.",
        "why": "Uzak okula giden daha uzun yürür; 6. dakikaya kadar yürüyen Esra'dır."
      },
      {
        "text": "Burcu'nun okulu $200\\cdot4=800$ m uzakta.",
        "why": "Burcu 4 dakika yürüdü."
      }
    ],
    "result": "E · 800 metre",
    "tip": "Aradaki uzaklık grafiğinde her parçanın eğimi o aralıkta uzaklığın değişme hızıdır: ikisi yürürken hızlar toplamı, biri durunca yalnız öbürünün hızı.",
    "check": "Esra $150\\cdot6=900$ m; $800+900=1700$ ✓ ve 4. dakikada $800+600=1400$ ✓.",
    "mistake": "Kırılmadan sonraki hızı (150) Burcu'ya vermek: o zaman Burcu'nun okulu $150\\cdot4=600$ m çıkar ve Esra'nın okulu daha yakın olurdu."
  },
  "TYT-0685": {
    "conceptId": "hareket-problemleri",
    "archetype": "akinti-pist",
    "answer": "A",
    "title": "2021 TYT · B noktasından 3. ve 7. geçiş",
    "cue": "Araç aynı noktadan art arda geçerken iki geçiş arasında tam bir tur atar. 3. ve 7. geçiş arasındaki tur sayısını say.",
    "steps": [
      {
        "text": "3. ve 7. geçiş arasında $7-3=4$ tur var; süre $8-3=5$ dakika $=300$ saniye.",
        "why": "Ardışık iki geçiş arası bir tur."
      },
      {
        "text": "Bir tur $300:4=75$ saniye.",
        "why": "Hız sabit, turlar eşit sürer."
      },
      {
        "text": "3. geçiş 180. saniyede; 1. geçiş iki tur önce: $180-2\\cdot75=30$ saniye.",
        "why": "1. geçişten 3. geçişe 2 tur atılır."
      }
    ],
    "result": "A · 30 saniye",
    "tip": "Bir noktadan $k$. ve $m$. geçiş arasında $m-k$ tur vardır. Tur süresini bul, ilk geçişe tur tur geri say; ilk geçiş tur süresinden kısa olmalı.",
    "check": "$30<75$; 3. geçiş $30+150=180$ sn, 7. geçiş $30+6\\cdot75=480$ sn ✓.",
    "mistake": "3. geçişi 3 tur saymak: $180:3=60$ gibi; B noktası A'da değil, ilk geçiş bir tur değildir."
  }
};
