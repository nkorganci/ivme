# 15. Adım — Yurt dışı öğretmenlik soruları

## 15.01 — Kaynak, çıkarım ve ortak soru havuzu

Kapsam: `Kaynaklar/yurt-disi/cikmis-sorular` PDF'lerini salt okunur işle;
`Konular/00_Resmi_Kapsam` kılavuzunun yazılı sınav tablosundan konu ağacı kur.
PyMuPDF ile soru PNG'leri ve cevap anahtarlarını çıkar; MEB kılavuzunun dört resmi
bölümünü kitapçık sırasına göre uygula. İstenirse içerik bazlı yerel Ollama önerisi
çalıştır. İptal, eksik cevap, okunamayan soru ve belirsiz eşlemeyi raporla. Aynı
kaynağın tekrar çalıştırılması kimlikleri değiştirmesin.

Sınav seçimi, ortak katalog, soru listesi ve pratik akışı `YURT_DISI` kapsamında
çalışmalı; YKS/KPSS ile karışmamalı. Öğrenci kayıtlarını koru. Önce sorular;
konu anlatımı, video ve çözümler bu aşamanın dışında.

Kabul: kaynak bazlı sayı/anahtar/görsel denetimi, tekrar çalıştırma, geçici DB'de
sınav izolasyonu ve soru/pratik testi, yerel servis sürümü. Otomatik konu etiketleri
öğretmen onayı sayılmaz. Teknik tarif: [yurt dışı aktarımı](../islemler/yurt-disi-sorular.md).

Uygulandı: V96, ortak sınav seçimi ve soru kaynağı; 28 PDF'den 2.541 cevaplı
soru görseli ve dört kapsam kategorisi `ivme` DB'ye eklendi. Katalog fonksiyonu
2.541/2.541 soruyu bu sınav kaynağından seçiyor. 13 soru numarası 2015 PDF'lerinde
metin çıkarımında bulunamadı; otomatik tamamlama yapılmadı.

## 15.02 — Dersler ve çalışma istatistikleri

Yurt dışı sınavında Konu takibi, Konu ve soru dağılımı, PDF envanteri ve Çalışma
istatistikleri açılır. Katalog sınav kimliğiyle süzülür; ders görünümünde YKS
sütunları kullanılmaz. Soru dağılımı DB'deki aktif kayıtların yıllara göre sayımıdır;
PDF envanteri yalnız yurt dışı klasöründen beslenir. Deneme ve pratik geçmişi seçili
sınavın `track_id` kayıtlarıyla, konu ilerlemesi ilgili sınav türleriyle sınırlanır.
Mevcut öğrenci kayıtları değiştirilmez.
