# Arayüz ve tablolar

[Mimari dizini](README.md) · Ne zaman okunur: Görünen ad, resourceMetadata, DataGrid kuralları.

## Uygulamada adlandırma ve erişim

`originalTitle` ve `originalFilename` korunur; `displayTitle` ortak kategorilerden
üretilir. Genel biçim `Sınav | Branş | Konu | Alt konu | Kaynak/Hoca | Tür` olur.
Boş alanlar atlanır, geniş/çok branşlı kapsam “Karma konular” olur, aday kapsam
tahmini olarak belirtilir. Fiziksel dosya adı etiket değişti diye değiştirilmez.

`frontend/src/resourceMetadata.js` sayfa/zaman gösterimi ve konumlu URL kurallarını
paylaşır. Öğrenci API'si etkin öğretmen etiketleriyle görünen adı yeniden hesaplar.
Liste yanıtına iç analiz metni, fiziksel dosya yolu, cevap anahtarı veya öğretmen
kimliği eklenmez. Öğretmen ve içerik bakımı uçları rol sınırını korur.

Bütün tablolar `DataGrid.jsx` üzerinden AG Grid Community kullanır; renkler
yalnız `theme.css` değişkenlerinden alınır. Aynı içerik için yeni bağımsız liste,
etiket sözlüğü veya menü ağacı eklemeden mevcut ortak veri ve filtre bağlamı kullanılır.

Tablolar kendilerine ayrılan alanın tamamını doldurur. `DataGrid.fitContent`
varsayılan `false` değerindedir; `fitGridWidth` sürekli uyarlaması sütunları
kullanılabilir genişliğe göre ölçekler. Gerçek kontrol/minWidth/maxWidth
sınırları korunur; dar ekranda gereken kaydırma tablo içinde kalır. Açık
`fitContent=true` içerik ölçümünü kullanırken `scaleUpToFitGridWidth` ile boş
alanı da doldurur; sarmalayıcı hiçbir zaman içerik toplamına daraltılmaz.
Başlıklar, hücreler ve hücre içindeki girişler ortak CSS ile ortalanır.
Bu varsayılanlar yeni tablolar için de geçerlidir; sayfada tekrar uygulanmaz.

`Dersler` (`/dersler-ve-konular`): ders ve sınav seçimi tablo başlığındadır; solda
sıralama/seçimden sonra yenilenen sıra numarası bulunur, Ders sütunu en uzun görünen
ders adı (başlık seçicisi payı dahil) kadar geniştir. Hücre dikey dolgusu 4 px,
Ders/Ünite/Konu metin sarmalayıcısı ek 2 px, satır aralığı 1,15'tir: tek satır 30 px,
iki satır 46 px. Konu takibinde Soru bankası / Çıkmış soru hücreleri yalnız sayıdır;
Çalış bağlantıları ve Bitti düğmesi tek satırdır. PDF envanterinde sütunlar dar
tutulur, uzun metinler satır içinde sarmalanır; Kanıt düğmesi açılan ayrıntıya götürür.
Soru Bankası/Çıkmış Sorular listesi de mevcut sayfanın konu ve kaynak metnini
`fitAllRows` ile ölçer; “Soruyu aç” sütununun genişliği sabittir. Uzun hücreler
tablonun kendi yatay kaydırmasıyla okunur.
