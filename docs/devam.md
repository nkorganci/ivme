# İvme devir notu

Önce AGENTS.md ve bu not okunur. Tamamlanan keşifleri veya soru bankasını baştan üretme.
Ayrıntı: [öğretim sözleşmesi](icerik/konuyu-ogrenelim.md).

## Güncel görev kapsamı

Son kullanıcı talimatı yalnız inceleme/model seçimi belgeleri ve her önemli görevde
MD durumunun güncellenmesidir. İnceleme ve model tablosu tamamlandı; takip kuralının
güncel kanıtı [görev durum tablosunda](gorev-durumu.md) `BELGE-03` satırındadır.
Uygulama/PDF/DB işlemi başlatılmadı. Önerilen `TAS-*` işlerini uygulama yetkisi sayma.
Yeni görevde önce ilgili durum satırını kontrol et; tamamlanan incelemeyi tekrarlama.

## Önceki yarım uygulama işi — bu belge görevi sırasında ilerletilmedi

- Güncelleme: 30 Ekim 2026 — Codex.
- Kullanıcı: yalnız matematik; bütün TYT ve AYT konularını bölme pilotu derinliğinde
  tamamla, eksik dersleri de ekle. Kapsam bitmedi; başka branşa geçilmez.
- Envanter: node scripts/konu-ogrenme-kapsam.mjs --write. Şu anda 34 ders;
  12 pilot yapısında, 22 mevcut ders derinleştirilecek, ayrıca 22 alt kapsamda ders yok.
  Yapı sayacı öğretmen onayı veya bütün alt konuların pedagojik tamamlığı değildir.
  Eksik ders kimlikleri aynı betikte; açık kapsam [12.02](plan/12-icerik-ve-yayin.md).
- Sıradaki mevcut ders: sayi-kesir-problemleri, sonra yuzde-karisim, kar-zarar,
  hareket-problemleri, yas-isci-problemleri ve sira düzeni. Yeni AYT derslerinde
  karmaşık sayılar, eşitsizlik/sistemler ve parabol henüz yok; ikinci derece dersi
  geniş katalog kategorisinin yalnız denklem/kök-katsayı kısmını kapsar.

## Tamamlanan kapsam

- Bu pakette mutlak-deger, uslu-ifadeler, koklu-ifadeler ve oran-oranti derinleştirildi;
  ikinci-derece-denklemler yeni eklendi. Beş dersin her biri 8 bölüm ve 24 gerekçeli
  çözümlü örnek; her bölümde L1/L2/L3, günlük sorgulama ve bağımsız kontrol bulunur.
  Bölüm başına en çok bir rehberli gerçek soru vardır.
- Yeni 17 etkileşimli keşif: mutlak değerde 4, üslü/köklü/oranda üçer, yeni ikinci
  derece dersinde giriş dahil 4. Modeller, çizimler ve kayıtlar learn/derin altındadır.
- Yeni 14 kaynak görseli okunmuş TYT/AYT rehberi, content/worked-math-continuation.js
  üzerinden WORKED_EXAMS'e katılır. Soru kodları, sonuçlar ve görüntü SHA-256 kanıtları
  öğretim sözleşmesindedir; hepsi DB anahtarıyla salt okuma karşılaştırıldı.
- Banka yalnız betikle üretildi. TYT-0605,0608,0618 görsel okumayla eşitsizlikten
  mutlak değere taşındı; diğer eski ders ve soru kimlikleri korunur. Yeni denklem
  bankasındaki otomatik eşlemeler görsel inceleme/öğretmen onayı sayılmaz.
- İkinci derece kaynakları: OGM 10. sınıf özet 34 ve 37, ilk sayfaları görsel okundu.
  Üslü ifadede parantez, kökte işaret ve tanım, oranda ayrı sabitler ve birim verim,
  ikinci derecede a≠0, sıfır kökünün korunması, Δ, Vieta ve yeni denklem koşulları işlendi.

## Doğrulama

- 89 Node testi geçti: içerik/KaTeX, hesap/şık, kopya soru, motor, keşif, biçim,
  bölme pilotu ve 12 derin ders. Yeni modellerin tüm sınırlı girdileri ve matematiksel
  değişmezleri; yeni gerçek soruların bağımsız hesapları derin testte.
- Ayrı Vite paketi: veri/ui-denetim/matematik-derin-dist. Beş dersin keşif, rehberli
  gerçek soru, düzey/sorgulama ve tam akış testleri masaüstü/mobilde geçti.
  Taşma, konsol/istek hatası yok; keşif lab görüntüleri gözle incelendi.
- Son işaret/yuvarlama açıklaması düzeltmeleri için ikinci derece ve oran keşifleri
  son pakette ayrıca denetlendi; sonuçlar veri/ui-denetim/son-kesif-*.json.
- Öğrenci DB'sine test cevabı yazılmadı; bütün UI denetimleri sahte API ile.
  Kaynak arşivi değiştirilmedi. Plan ve 31 dosyalık commit öncesi kontrol geçti.
  Yerel izleyici son paketi sundu; izleyiciyle aynı Windows PowerShell ortamında
  kaynak/sunulan paket parmak izi eşleşti. Konu haritası ve yeni ders çalışan
  1010 uygulamasında hatasız açıldı. Dört eski dersin tüm eski soru ve bölüm
  kimlikleri önceki commit ile karşılaştırılıp korunduğu doğrulandı. Push yapılmadı.

## Sıradaki komut

    git status --short
    node scripts/konu-ogrenme-kapsam.mjs --write

Ardından sayi-kesir-problemleri bankasının ÖSYM görsellerini aç, çöz ve salt okuma
cevap karşılaştırması yap. Mevcut giriş keşfi ile soru kimliklerini koruyarak en az
8 bölüm / 20 gerekçeli örnek / 3 tamamlama / 4 keşif / 2 görseli okunmuş gerçek soru
ölçütünü tamamla. DERIN listesine ancak model ve gerçek soru hesap testleriyle ekle.
Ayrıntılı yöntem öğretim sözleşmesindedir. Geçen testleri girdi değişmeden tekrarlama.
