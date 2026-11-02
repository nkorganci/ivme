// Özgün kırpımlar incelendi; öğretmen onayı değildir.
export const YUZDE_KARISIM_EXAMS = {
  "TYT-0661": {
    "conceptId": "yuzde-karisim",
    "archetype": "yuzde-hesap",
    "answer": "D",
    "title": "2019 TYT · tarifte yüzde tabanı badem yağı",
    "cue": "Argan ve zeytinyağı yüzdeleri toplam karışıma değil konulan badem yağına göre verilmiş. Deniz ve Eylül için iki ayrı hesap yap.",
    "steps": [
      {
        "text": "Deniz 60 mL argan kullanıyor: $0{,}40B_D=60$, $B_D=150$ mL badem.",
        "why": "Bir şişe 60 mL; argan badem yağının %40’ı."
      },
      {
        "text": "Deniz’in toplam yağı $150+60=210$ mL; yumurta $210/70=3$.",
        "why": "Yumurta hesabının tabanı artık bütün yağ karışımıdır."
      },
      {
        "text": "Eylül 2 şişe yani 120 mL zeytinyağı kullanıyor: $0{,}75B_E=120$, $B_E=160$ mL badem.",
        "why": "İkinci tarifte oran %75; miktar iki şişe."
      },
      {
        "text": "Eylül’ün toplamı $160+120=280$ mL; yumurta $280/70=4$. Toplam $3+4=7$.",
        "why": "Her karışım yalnız iki yağdan oluşur; argan ve zeytinyağı birlikte kullanılmıyor."
      }
    ],
    "result": "D · 7 yumurta",
    "tip": "Her yüzdeyi “neyin yüzdesi?” sorusuyla etiketle. Alt bileşenin miktarından bütüne dönerken yüzdeye böl.",
    "check": "60/150=%40, 120/160=%75; 210 ve 280 mL karışımlar toplam 490 mL, 490/70=7.",
    "mistake": "60’ı toplam yağın %40’ı sanma; yüzde badem yağına göre. Yumurta hacmi verilmediğinden yağ toplamına yumurta hacmi eklenmez."
  },
  "TYT-0698": {
    "conceptId": "yuzde-karisim",
    "archetype": "yuzde-hesap",
    "answer": "A",
    "title": "2022 TYT · yüzdeyi dakikaya, dakikayı saate çevir",
    "cue": "Toplantı 15.xx’te bitiyor ve 108 dakikanın %25’inde saat hanesi 15. Bu 27 dakikalık parça, saat 15.00’ten toplantının sonuna kadardır.",
    "steps": [
      {
        "text": "$108\\cdot25/100=27$ dakika saat hanesinde 15 görünmüş.",
        "why": "Verilen yüzde toplam toplantı süresine ait."
      },
      {
        "text": "Bitiş 15.27. Saat 15’ten önce geçen süre $108-27=81$ dakika.",
        "why": "Bitiş saat hanesi 15 olduğundan 27 dakikalık bölüm 15.00’te başlar."
      },
      {
        "text": "15.00’ten 81 dakika geri: önce 60 dakika ile 14.00, sonra 21 dakika ile 13.39.",
        "why": "Saat sisteminde bir saat 60 dakikadır; 15,00−0,81 işlemi yapılmaz."
      }
    ],
    "result": "A · 13.39",
    "tip": "Yüzde verilen süreyi önce dakika cinsinden bul. Saat göstergesini ondalık sayı gibi çıkarma.",
    "check": "13.39–15.00 arası 81, 15.00–15.27 arası 27; toplam 108 ve 27/108=1/4.",
    "mistake": "27 dakikayı toplantının başına ekleyerek başlama saatini bulamazsın; 15.00, yüzdeyle tanımlanan son parçanın başlangıcıdır."
  }
};
