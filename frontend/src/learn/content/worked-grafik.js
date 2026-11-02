// Özgün kırpımlar incelendi; öğretmen onayı değildir.
export const GRAFIK_EXAMS = {
  "TYT-0692": {
    "conceptId": "grafik-rutin-olmayan",
    "archetype": "grafik-okuma",
    "answer": "A",
    "title": "2021 TYT · bir saat önce çıksa da aynı süre",
    "cue": "Grafik iki doğru parçası: 07.00–08.00 arası artıyor, 08.00–09.00 arası azalıyor. Asıl çıkış ikinci parçada, bir saat önceki çıkış birinci parçada; iki süreyi eşitle.",
    "steps": [
      {
        "text": "Birinci parça 60 dakikada $24\\to36$: dakikada $\\frac{1}{5}$ artış. 07.00'den $u$ dakika sonra süre $24+\\frac{u}{5}$.",
        "why": "Doğrusal parçada artış süreyle orantılı."
      },
      {
        "text": "İkinci parça 60 dakikada $36\\to30$: dakikada $\\frac{1}{10}$ azalış. 08.00'den $u$ dakika sonra süre $36-\\frac{u}{10}$.",
        "why": "Asıl çıkış saati 08.00'den $u$ dakika sonra; bir saat öncesi 07.00'den $u$ dakika sonra."
      },
      {
        "text": "$24+\\frac{u}{5}=36-\\frac{u}{10}$, $\\frac{3u}{10}=12$, $u=40$.",
        "why": "Bir saat önce çıksaydı süre aynı olacaktı."
      },
      {
        "text": "Çıkış 08.40, süre $36-4=32$ dakika; varış 09.12.",
        "why": "Soru varış saatini istiyor; çıkış saatine süreyi ekledik."
      }
    ],
    "result": "A · 09.12",
    "tip": "Parçalı grafikte her parçanın kuralını ayrı yaz; “bir saat önce” ifadesini aynı $u$ ile iki parçaya yerleştirip eşitle.",
    "check": "07.40'ta çıksaydı süre $24+8=32$ dakika: aynı ✓.",
    "mistake": "Varış yerine çıkış saatini (08.40) cevap sanmak ya da iki parçanın eğimini aynı almak."
  },
  "TYT-0670": {
    "conceptId": "grafik-rutin-olmayan",
    "archetype": "en-az-en-cok",
    "answer": "E",
    "title": "2020 TYT · ses simgesinden başlangıç seviyesi",
    "cue": "Simge sesi değil, sesin hangi aralıkta olduğunu söylüyor. İki bilgiyi başlangıç seviyesi $L$ için iki eşitsizliğe çevir ve ortak kısmı al.",
    "steps": [
      {
        "text": "17 artınca en yüksek simge: $66\\le L+17\\le100$, yani $49\\le L\\le83$.",
        "why": "Üç dalgalı simge 66–100 aralığı."
      },
      {
        "text": "18 azalınca en düşük simge: $1\\le L-18\\le32$, yani $19\\le L\\le50$.",
        "why": "Tek dalgalı simge 1–32 aralığı."
      },
      {
        "text": "Ortak kısım $49\\le L\\le50$; tam sayı değerlerin toplamı $49+50=99$.",
        "why": "İki bilgi aynı anda doğru."
      }
    ],
    "result": "E · 99",
    "tip": "Gösterge ve simge sorularında her bilgiyi bir aralığa çevir, aralıkları kesiştir; uçların dahil olup olmadığını “en az / en fazla” kelimelerinden oku.",
    "check": "$L=49$: $66$ ve $31$ ✓; $L=50$: $67$ ve $32$ ✓; $L=51$: $51-18=33$ iki dalgalı ✗.",
    "mistake": "Yalnız bir bilgiyi kullanmak ya da 32 ve 66 sınırlarını dışarıda bırakıp tek değer bulmak."
  },
  "TYT-0704": {
    "conceptId": "grafik-rutin-olmayan",
    "archetype": "oruntu-strateji",
    "answer": "D",
    "title": "2022 TYT · kumbarada ilk 500 TL cumartesi",
    "cue": "Bir haftanın toplamını bul, tam haftaları geç ve 500'e ulaşılan günün cumartesi olmasını sağlayan başlangıç gününü dene. Bir önceki gün 500'ün altında kalmalı.",
    "steps": [
      {
        "text": "Bir hafta $5\\cdot20+2\\cdot25=150$ TL; 3 hafta 450 TL.",
        "why": "Başlangıç günü ne olursa olsun her 7 günde bir 150 TL birikir."
      },
      {
        "text": "21 gün sonra 450 TL var; sonraki günler başlangıç gününden itibaren yeniden sayılır. 500 için en az 50 TL daha gerekir.",
        "why": "Tam haftalar haftanın gününü değiştirmez."
      },
      {
        "text": "Perşembe başlarsa: perşembe 470, cuma 490, cumartesi 515. İlk kez cumartesi 500'ü geçer.",
        "why": "Önceki gün 490 < 500 olduğu için “ilk gün” cumartesi."
      },
      {
        "text": "Çarşamba başlarsa cuma 510'a, cuma başlarsa pazar 520'ye ulaşılır; cumartesi tutmaz.",
        "why": "Komşu günleri dışarıda bırakmak tek cevabı doğrular."
      }
    ],
    "result": "D · Perşembe",
    "tip": "Haftalık döngüde tam haftaları toplu geç, kalan günleri başlangıç gününden itibaren tek tek say; “ilk gün” için bir önceki günü de kontrol et.",
    "check": "Perşembe başlangıcıyla 23. gün cumartesi: $450+20+20+25=515\\ge500$ ve 22. gün $490<500$ ✓.",
    "mistake": "500'ü tam 150'nin katı sanıp gün sayısını bölmeyle bulmak ya da hafta sonu günlerinin 25 TL olduğunu unutmak."
  }
};
