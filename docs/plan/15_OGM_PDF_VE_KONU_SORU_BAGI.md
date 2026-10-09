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
| 07.08 | BITTI (ilk doğrulanmış dilim): katalog `1099` ve üç sayfa kanıtlı OGM soru kodu için PDF'den pratik/test kurucusuna güvenli geçiş, dört geçmiş sayısı ve kapsam kilidi. [Uygulama kaydı](29_07_08_PDF_SORU_GECISI.md). |
| 07.09 | Kaliteli zorluk etiketlerinden aday sayıları ve filtre; etiketsiz veya yetersiz havuzun anlaşılır durumu; sıralama ve yenilemede seçim korunur. |

## 07.08 ön inceleme — 2026-10-09

Konu PDF kataloğundaki dokuz `topic_code` kaydının tamamı `candidate_title_match` durumunda; bu kayıtlar yalnız başlık eşleşmesidir. 12.05 denetiminde sayfa metniyle doğrulanan altı soru kartı `tyt.turkce.sozcuk` kodunu taşır, ancak dokuz aday PDF'nin hiçbiri bu kodda değildir. Üstelik `veri/sorular-ogm.csv` içindeki `3a-tyt-turkce-85-01` gibi "Noktalama İşaretleri" kaynaklı soruların mevcut `topic` alanı daha geniş "Ses Bilgisi ve Yazım"dır; yalnız mevcut konu filtresi kullanılırsa ilgisiz sorular da havuza girer. Bu nedenle mevcut veride öğrenciye açılabilecek doğrulanmış PDF–konu–soru üçlü bağı bulunmadı. 07.08 `SIRADAKI` kalır; aday bağlantıları ürün ekranında gösterilmez.

2026-10-09 devamında katalog `1099` PDF'sinin içeriği görsel olarak, üç Noktalama İşaretleri soru kartı da özgün soru PDF sayfasında doğrulandı. Sürümlü onay kaydı ve yalnız bu kodlarla sınırlı API/kurucu geçişi [07.08 uygulamasında](29_07_08_PDF_SORU_GECISI.md) tamamlandı. Diğer başlık adayları onaysız kalır; yeni kaynaklar aynı kanıt adımından geçmelidir.

## 07.09 veri kapısı — 2026-10-09

`V2__soru_zorluk_kaldir.sql` sorudaki eski zorluk sütununu kaldırmış; mevcut `feedback.difficulty_vote` yalnız öğrenci oyudur. Onaylı üç soru için editör etiketi veya yeterli başarı örneklemine dayalı zorluk verisi bulunmadığından kolay/orta/zor filtresi açılmadı. PDF'den gelen iki kurucu “Henüz doğrulanmış zorluk etiketi yok” mesajını ve mevcut gerçek soru sayılarını gösterir. 07.09'un zorluk filtreleme kabulü açık kalır; editör kaynaklı, sürümlü etiket ya da ölçütü belirlenmiş yeterli çözüm verisi gerektiğinde uygulanır.

## Kaynak ve sınırlar

- Gerçek yerel kaynak: `D:\workspace\ivme\Kaynaklar\ogm-materyal\`; `veri-hatti\ogm-indirme\katalog.json` ve `veri-hatti\ogm-sorular\` mevcut başlangıçtır. Önce dosya ve kart sayıları yeniden ölçülür; eski indeks sayıları güncel kabul edilmez.
- Öğrencinin konu anlatımı ekranında yalnız özgün PDF açılır. Gelecekteki AI ipucu için PDF metin/OCR çıkarımı ayrı iç iş hattıdır (13.01–13.03); PDF görüntüleme şartını değiştirmez.
- Yerel kaynakları ve üretilmiş toplu görselleri Git'e ekleme. Katalogda yalnız gerekli metadata/kod bulunur; kaynak yolu normalize edilir ve dizin dışına çıkış engellenir.
- Her dilimde UI kontrolü, gerekli API/test, repo içindeki planın güncellenmesi ve **yerel commit** gerekir. Kullanıcı değerlendirmesine kadar push yapılmaz.
