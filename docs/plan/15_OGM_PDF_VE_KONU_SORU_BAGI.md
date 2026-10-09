# OGM konu PDF'si ve ilişkili sorular

**Durum:** YAPILACAK · **İlgili işler:** 12.05, 13.04, 13.05, 07.08, 07.09. Öncelik ve tamamlanma durumu [numaralı iş listesindedir](12_NUMARALI_IS_LISTESI.md).

## Öğrenci akışı ve UI kontrolü

1. Öğrenci menüden **Konu anlatımları** bölümüne gider. Sınav, ders, konu ve kaynak türüne göre kısa, aranabilir liste görür. İçerik **özgün PDF olarak** sitenin içinde açılır; yeni HTML/Markdown konu anlatımı üretilmez. Telefonda PDF açma ve listeye dönme kolay olmalı; dosya eksikse açık mesaj gösterilir.
2. PDF ekranı doğrulanmış konu bağında **Bu konudan soru çöz** ve **Test oluştur** eylemlerini gösterir. Geçişte sınav/ders/konu kimliği korunur; kullanıcı sayı ve yeni/önceki/yanlış/karışık seçimini mevcut pratik veya sınav kurucusunda ayarlar. Uygun havuzun gerçek sayısı ve boş durum görünür. Bir PDF birden çok konu kapsarsa ilgili konular açıkça seçilir; yalnız ad benzerliğiyle yanlış sorular bağlanmaz.
3. Zorluk filtresi ancak kaynakça/operatörce doğrulanmış etiket veya yeterli çözüm verisi bulunduğunda **kolay / orta / zor** olarak sunulur. Öğrencinin “kolaydı/zordu” oyu, editör etiketi ve hesaplanan başarı ayrı veridir; bunlar körlemesine tek zorluk alanında birleştirilmez. Filtre yoksa “Henüz zorluk etiketi yok” denir; eşleşen soru sayısı ve boş havuz durumu gösterilir.

## Küçük uygulama dilimleri

| İş | Somut çıktı ve kabul |
|---|---|
| 12.05 | BITTI: `veri-hatti/ogm-indirme` katalogu ile kartların kaynak kimliği karşılaştırıldı; ilk iki kart/sayfa kanıtı ve TYT Türkçe alt konu örneği [12.05 denetiminde](26_12_05_OGM_KAYNAK_KONU_BAGI.md). Belirsiz Soru Bankası kökeni inceleme kuyruğunda; değişmeyen dosyalar atlanıyor. |
| 13.04 | BITTI: konu özeti/sunu/video notu PDF'leri soru/test/denemeden ayrıldı; tür, sınav/ders, başlık, aday konu kimliği, göreli yol, checksum ve dosya durumu [artımlı katalogda](27_13_04_OGM_KONU_PDF_KATALOGU.md). Tam PDF arşivi Git dışında. |
| 13.05 | BITTI: Yetkili öğrenci için katalog API'si ve PDF açma yolu; izinli kök altında gerçek yol, PDF türü, kimlik ve SHA-256 kontrolü. Menü/liste/görüntüleyici masaüstü ve telefon genişliğinde denendi. Yanıt satır içi PDF'dir; dış dosya yolu açığa çıkmaz. [Uygulama kaydı](28_13_05_KONU_PDF_GORUNTULEME.md). |
| 07.08 | PDF'den konuya bağlı pratik/test kurucusuna giriş; sayı ve soru geçmişi tercihi; seçilen konudan çıkmama, kaynak ve soru sayısı doğrulaması. |
| 07.09 | Kaliteli zorluk etiketlerinden aday sayıları ve filtre; etiketsiz veya yetersiz havuzun anlaşılır durumu; sıralama ve yenilemede seçim korunur. |

## Kaynak ve sınırlar

- Gerçek yerel kaynak: `D:\workspace\ivme\Kaynaklar\ogm-materyal\`; `veri-hatti\ogm-indirme\katalog.json` ve `veri-hatti\ogm-sorular\` mevcut başlangıçtır. Önce dosya ve kart sayıları yeniden ölçülür; eski indeks sayıları güncel kabul edilmez.
- Öğrencinin konu anlatımı ekranında yalnız özgün PDF açılır. Gelecekteki AI ipucu için PDF metin/OCR çıkarımı ayrı iç iş hattıdır (13.01–13.03); PDF görüntüleme şartını değiştirmez.
- Yerel kaynakları ve üretilmiş toplu görselleri Git'e ekleme. Katalogda yalnız gerekli metadata/kod bulunur; kaynak yolu normalize edilir ve dizin dışına çıkış engellenir.
- Her dilimde UI kontrolü, gerekli API/test, iki plan kopyasının eşitlenmesi ve **yerel commit** gerekir. Kullanıcı değerlendirmesine kadar push yapılmaz.
