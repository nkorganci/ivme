// Özgün soru kırpımları okunarak yazılan çözümler. Öğretmen onayı iddiası içermez.
// Kaynak kodları değişmez; soru metni yeniden yazılmaz. Kanıt: docs/icerik/konuyu-ogrenelim.md.
export const WORKED_EXAMS = {
  'TYT-0541': {
    conceptId: 'rasyonel-sayilar', archetype: 'kesir-islem', answer: 'D', title: 'Bir parçanın parçası: pasta paylaşımı',
    cue: 'Bütünün bir dilimi yeniden eş paylaştırılıyor. İkinci paylaşım bütün pastada değil, o dilimde yapılıyor.',
    steps: [
      { text: 'Pastanın tamamını 1 bütün kabul et. İlk kesimde 4 eş dilim var; bir dilim $1/4$ pasta.', why: 'Bütün miktarı verilmediğinde oran sorusunda bütünü 1 seçebiliriz.' },
      { text: 'Bu tek dilim 3 kişi arasında eş bölünüyor. Cem, dilimin üçte birini alır: $(1/4)\\div3$.', why: 'Üç kişiye dağıtılan, pastanın tamamı değil yalnız dörtte biridir.' },
      { text: '$(1/4)\\cdot(1/3)=1/12$. Bütün pastayı aynı boyda bölsen 12 küçük pay oluşur; Cem bunlardan birini alır.', why: 'Bir parçanın kesrini bulmak, kesirleri çarpmaktır; 4 ile 3 toplanmaz.' },
    ],
    result: 'D · 1/12', tip: 'Ardışık eş bölmelerde toplam küçük parça sayısını çarp: 4×3=12. Yalnız eş paylaşım koşulu sağlanıyorsa bu kısa yol doğrudan çalışır.',
    check: 'Üç arkadaşın toplam payı 3×1/12=1/4; başlangıçta paylaştırılan tek dilimi geri elde ettik.',
  },
  'TYT-0551': {
    conceptId: 'sayi-basamaklari', archetype: 'rakam-kosul', answer: 'A', title: 'Rakam koşulunu durumlara ayır',
    cue: 'En büyük ve en küçük rakamın farkı 8. Önce uç rakamları bul; üç basamaklı bütün sayıları tek tek deneme.',
    steps: [
      { text: 'Rakamlar 0–9 arasında. Farkı 8 olan uç çiftler yalnız (0,8) ve (1,9).', why: 'En küçük rakamı belirleyince en büyük ondan 8 fazla olmak zorunda.' },
      { text: '(0,8) için üçüncü rakam 1,2,…,7: 7 seçenek. Her üçlü 3!=6 diziliş verir; 0 başta olan 2 dizilişi çıkar: $7\\cdot(6-2)=28$.', why: 'Rakamlar farklı olmalı ve yüzler basamağı 0 olamaz. 9’u seçmek genişliği 9 yapardı.' },
      { text: '(1,9) için üçüncü rakam 2,3,…,8: yine 7 seçenek. Sıfır yok; altı diziliş de üç basamaklıdır: $7\\cdot6=42$.', why: '0’ı seçmek en küçük rakamı değiştirir ve genişliği 9 yapar.' },
      { text: 'İki durum ayrık: $28+42=70$.', why: 'Bir sayının uç rakamları aynı anda hem (0,8) hem (1,9) olamaz; tekrar sayım yok.' },
    ],
    result: 'A · 70', tip: 'Rakam kısıtlarında önce uçları sabitle, sonra ortadaki seçenekleri say. 0 içeren ve içermeyen durumları ayırmak baştaki sıfır hatasını önler.',
    check: 'Örneğin 108 geçerli; 018 üç basamaklı değil. 129 geçerli; 019 ise genişlik 9 olduğu için bu soruya girmez.',
  },
  'TYT-0653': {
    conceptId: 'sayi-basamaklari', archetype: 'basamak-degisim', answer: 'D', title: 'Tuş konumunu izleyerek geriye git',
    cue: 'Hesap makinelerinde rakamlar farklı konumlarda. Aynı rakamı değil aynı konumdaki tuşu takip et.',
    steps: [
      { text: 'Soldaki 2 tuşunun sağdaki karşılığı 8; soldaki 9’un karşılığı 3. Defne 29 yazarken Burcu 83 yazar.', why: 'Soru aynı rakamları değil, aynı konumları ve sırayı koruyor.' },
      { text: 'Burcu’nun toplamı 95 olduğuna göre onun ikinci sayısı $95-83=12$.', why: 'Toplamdan bilinen toplananı çıkarınca diğer toplananı buluruz.' },
      { text: 'Şimdi ters eşleştir: sağdaki 1 konumu solda 7; sağdaki 2 konumu solda 8. Defne’nin ikinci sayısı 78.', why: 'Bu aşamada sağdan sola dönüyoruz; dönüşümün yönünü karıştırmamalıyız.' },
      { text: 'Defne’nin sonucu $29+78=107$.', why: 'Sorulan Burcu’nun değil Defne’nin toplamı.' },
    ],
    result: 'D · 107', tip: 'Bütün tuşlar için denklem kurmak yerine önce bilinen sayıyı dönüştür, toplamdan çıkar, sonra yalnız kalan sayının tuşlarını geri eşleştir.',
    check: 'Solda 29+78=107. Aynı konumlar sağda 83+12=95 veriyor; verilen toplamla tutarlı.',
  },
  'TYT-0662': {
    conceptId: 'yuzde-karisim', archetype: 'yuzde-hesap', answer: 'E', title: 'Aynı toplamın iki farklı yüzdesi',
    cue: 'Tahta ve plastik kasalar aynı domates toplamının farklı yüzdelerini alıyor. Kasa adetlerini yüzdeyle karıştırma.',
    steps: [
      { text: '30 tahta kasanın her biri 8 kg: $30\\cdot8=240$ kg. Bu, bütün domatesin %60’ı.', why: 'Kasa sayısı ile bir kasanın miktarı çarpılınca o türün toplam kapasitesi bulunur.' },
      { text: 'Toplam domates $240/0{,}60=400$ kg.', why: '%60’tan %100’e geri dönüyoruz; 240’ın %40’ını eklemek aynı işlem değildir.' },
      { text: '20 plastik kasanın toplamı $400\\cdot0{,}65=260$ kg.', why: 'Her iki yüzde aynı 400 kg bütünü kullanıyor.' },
      { text: 'Bir plastik kasa $260/20=13$ kg alır.', why: '260 kg, bir kasanın değil 20 özdeş kasanın toplamıdır.' },
    ],
    result: 'E · 13 kg', tip: 'Aynı bütüne ait yüzdelerde bütünü bulmadan oranlayabilirsin: $240\\cdot65/60=260$ kg; ardından 20’ye böl. Referans bütünler farklıysa 65/60 oranı kullanılamaz.',
    check: 'Tahta: 30×8=240=%60×400. Plastik: 20×13=260=%65×400. İki bilgi aynı toplamı veriyor.',
  },
  'TYT-0666': {
    conceptId: 'hareket-problemleri', archetype: 'yol-hiz-zaman', answer: 'B', title: 'Varış farkından ortak yolu bul',
    cue: 'Aynı hareket saati ve aynı yol, iki farklı hız var. Varış saatlerindeki fark, yolculuk sürelerinin farkıdır.',
    steps: [
      { text: 'Yol d km olsun. Süreler $d/100$ ve $d/60$ saat. Yavaş yolculuk 11.00’de, hızlı yolculuk 09.00’da bitiyor: fark 2 saat.', why: 'Başlangıç aynı olduğundan saat farkını doğrudan süre farkı olarak kullanabiliriz.' },
      { text: '$d/60-d/100=2$. Payda 300 alınca $(5d-3d)/300=2$; buradan d=300 km.', why: 'Yavaş olanın süresi daha büyük; çıkarma sırasını buna göre seçtik.' },
      { text: '100 km/sa ile süre 3 saat; 09.00’dan 3 saat geri gidersek çıkış 06.00. 10.00’a kadar 4 saat var.', why: '09.00 ve 11.00 hız değil, varış saati. Hedef süreyi ortak başlangıçtan ölçmeliyiz.' },
      { text: 'Gerekli hız $300/4=75$ km/sa.', why: 'Hız=ortak yol/hedef süre.' },
    ],
    result: 'B · 75 km/sa', tip: 'Burada hedef varış, iki varışın tam ortasında: hedef süre iki sürenin ortalaması. Aynı yol için $v=2v_1v_2/(v_1+v_2)=75$. Hedef saat ortada değilse bu kısa yol doğrudan kullanılamaz.',
    check: '300/60=5 saat → 11.00; 300/100=3 saat → 09.00; 300/75=4 saat → 10.00. Üçü de 06.00 çıkışla uyumlu.',
  },
  'TYT-0621': {
    conceptId: 'mutlak-deger', archetype: 'uzaklik-minimum', answer: 'B', title: 'Yakınlık sorusunu orta noktalarla çöz',
    cue: '“En yakın” ve “en uzak” mutlak uzaklık kıyaslıyor. Önce tahminleri sayı doğrusuna yerleştir.',
    steps: [
      { text: 'Gerçek sayfa sayısı x olsun. Tahminler 27, 35 ve 39. Burcu en yakın: $|x-35|<|x-27|$.', why: 'Tahmin hatası yön değil uzaklıktır; mutlak değer bunu ölçer.' },
      { text: '27 ile 35’in orta noktası 31. 35’e daha yakın olmak için x>31 olmalı.', why: 'Orta noktada uzaklıklar eşittir; 35 tarafına geçince Burcu’nun uzaklığı küçülür.' },
      { text: 'Can, Ali’den daha uzak: $|x-39|>|x-27|$. 27 ile 39’un orta noktası 33; bu kez x<33 olmalı.', why: '39’dan daha uzakta kalmak için orta noktanın 27 tarafında olmalıyız.' },
      { text: '31<x<33 aralığındaki tek tam sayı 32. Hatalar 5,3,7: Burcu en yakın, Can en uzak. Rakam toplamı 3+2=5.', why: 'Sayfa sayısı tam sayı; eşit uzaklıklar yasak olduğu için uçlar alınmaz. Son olarak sorulanın rakam toplamı olduğunu kontrol ettik.' },
    ],
    result: 'B · 5', tip: 'İki sabit sayıya yakınlık kıyasında mutlak değerleri parça parça açmak yerine orta noktayı kullan. Üç tahminde gerekli kıyasları birleştir ve bulduğun adayı bütün koşullarla kontrol et.',
    check: '|32−27|=5, |32−35|=3, |32−39|=7. Hatalar farklı; 3<5<7 sıralaması soruyla aynı.',
  },
};
