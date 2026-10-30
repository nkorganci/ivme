# İvme devir notu

Önce bu notu oku; aynı keşif/üretim işine baştan başlama. Ortak çalışma ve kalıcı kullanıcı
beklentileri `AGENTS.md` içindedir; Claude `CLAUDE.md` ile aynı dosyayı okur.
Teknik ayrıntı yalnız gerektiğinde [Konuyu Öğrenelim sözleşmesinden](icerik/konuyu-ogrenelim.md)
alınır. İlgisiz PDF envanteri çalışmasına bu görev yerine dönme.

## Etkin görev

29 Ekim 2026: Kullanıcı, Claude'un Konuyu Öğrenelim modülünü daha anlaşılır, temelden
ileri düzeye, görsel ve etkileşimli yapmamızı istedi. Sonraki mesajlarda günlük kullanım,
ilginç bağlantılar, **önce örnek çözüm sonra koşullu hızlı ipuçları** ve iki ajan için
kalıcı devam kaydı özellikle istendi. Bu beklentiler AGENTS.md'ye yazıldı.

## Korunan başlangıç

- Claude'un 33 ders, öğrenme motoru ve API çalışması değişiklikten önce yerel `main` üzerinde
  **98fe6ca** (`Preserve Claude learning engine and initial mathematics lessons`) ile commit edildi.
- PostgreSQL öğrenci verileri ve özgün PDF arşivi değiştirilmedi. Yeni çalışma ön yüz,
  elle yazılan öğretim içeriği, soru banka çıktıları ve doğrulama betikleri üzerindedir.
- Kullanıcı push istemedi. Yerel commit gerekli; dış dağıtım/push yapılmaz.

## Uygulanan kapsam

- 33 matematik dersinin ilk bölümüne konuya özgü görsel keşif eklendi: günlük bağlam,
  temel terimler, değiştirilebilir model, 3+ gerekçeli adım, yeni deneme, koşullu kısa yol,
  yaygın hata ve ileri açıklama. Model hesabı/çizimi ayrı dosyalarda.
- Ders ekranı: okunur metin, bölüm yolu, Temelden/Bağlantıları kur/Derinleş seçimi,
  isteğe bağlı ön test, sırayla açılan çözümler, görünür nedenler, büyük görsel penceresi.
- Özgün görselleri okunarak **6 gerçek TYT sorusuna** adımlı çözüm ve hızlı yol yazıldı.
  Kodlar ve görüntü hash'leri teknik sözleşmede. Bu örnekler ustalık testinden hariç.
- Eksik `frontend/src/learn/bank` çıktıları mevcut betikle oluşturuldu. Otomatik eşleme
  her sorunun incelendiği anlamına gelmez. TYT-0653 yanlış oran/orantı eşlemesinden
  sayı basamaklarına düzeltildi; TYT-0541 görünmeyen temel-kavramlar bağlantısından
  rasyonel sayılara taşındı. Betik `WORKED_EXAMS` eşlemelerini önceliklendirir.
- İşlem önceliği metni, uç değerlerde aşırı genel kural ve iki doğru seçenek veren
  temel-kavramlar/h1 sorusu düzeltildi. Mevcut ders/soru kimlikleri korundu.

## Şu anki doğrulama ve devam noktası

- 24 Node testi geçti: içerik/KaTeX, 298 sayısal soru, motor, 33 modelin bütün kontrol
  kombinasyonları, gerçek örneklerin bağımsız hesapları ve ustalık hariç tutma.
- `npm run build` geçti. İzleyiciyle aynı dist'i kullanan ilk UI denemesinde dosya yarışına
  rastlandı; UI testi `IVME_TEST_DIST` destekli ayrı pakete geçirildi. Bu giderilmiş
  altyapı sorununu yeniden araştırma.
- UI için ayrı Vite paketi hazır: `veri/ui-denetim/konu-ogrenme-dist`.
- 33 keşfin tamamı masaüstü ve mobilde geçti (66 ekran akışı; taşma/konsol/istek hatası yok).
  Rasyonel-sayilar tam öğrenme akışı da iki boyutta geçti: 5 bölüm, 22 ders olayı,
  6 soruluk ustalık ve hata/ilerleme/harita/ayarlar. Sonuçlar:
  `veri/ui-denetim/konu-ogrenme-kesif.json`, `veri/ui-denetim/konu-ogrenme-akis.json`.
- Altı gerçek sorunun hesap sonuçları DB cevap anahtarlarıyla da karşılaştırıldı;
  doğrulama anahtarı değiştirmez ve öğrenci cevabı üretmez.
- Son görsel incelemede kesir parçaları değişirken geçici ara geometrinin yanlış bir
  miktar izlenimi vermemesi için SVG geometri geçişi kaldırıldı; şekil ve sayı eşzamanlı.
- Altı rehberli gerçek örnek masaüstü/mobilde geçti (12 akış): cevap önce saklı,
  adımlar açılıyor, kısa yol sonuçtan sonra, alıştırma bağlantısı doğru, öğrenci puanı
  üretilmiyor. Görsel genişliği dar ekranda 288 px; uzun sayfada küçülme `readingWidth`
  desteğiyle giderildi. Sonuç `veri/ui-denetim/konu-ogrenme-gercek.json`.
- Canlı sayfaların masaüstü/mobil salt okuma kontrolü geçti:
  `veri/ui-denetim/konu-ogrenme-canli.json`. Giriş öncesi beklenen auth/me 401 test
  kapsamından ayrıldı; giriş sonrası 401 hâlâ hata sayılır. Konsol/taşma/istek hatası yok.
- Plan denetimi ve commit öncesi kontrol geçti. Son değişikliklerin servis edilen
  sürümü yerel izleyiciyle doğrulanır; tam sonuç commit açıklamasında ve Git geçmişinde.
- Sonraki içerikler bu standarda uyar. Diğer ders/ünitelere yeni içerik eklerken aynı
  33 dersi yeniden üretme; mevcut örnekleri genişlet. Gerçek kaynak görselini okumadan
  çözüme veya öğretmen onayına dair iddia ekleme.

## Sıradaki içerik işi (yeniden keşif yapma)

Bu commit mevcut 33 dersin **ilk bölümündeki keşif katmanını ve ortak oynatıcıyı**
geliştirir; bütün alt bölümler için ayrı simülasyon veya bütün çıkmış sorular için
çözüm yazıldığı iddia edilmez. Sonraki kapsam [12.02](plan/12-icerik-ve-yayin.md):

1. `temel-kavramlar.ders` s2 (tek–çift), s3 (işaret), s4 (ardışık), s5 (uç değer)
   için aynı derinliği bölüm bazında yay. s1 sayı kümeleri keşfini tekrar yazma.
2. Her bölümde mevcut çözümlü örneği oku; ona özgü değiştirilebilir görsel ve işlem
   gerekçesi ekle. Örnekten sonra kısa yol, koşul, yanlış yöntem ve sağlama gelsin.
3. `WORKED_EXAMS` içindeki altı örnek dışındaki gerçek sorularda önce özgün kırpımı
   aç, hesapla, DB anahtarıyla karşılaştır; sonra doğru ders/bölüm/tip bağı ve hash kaydı
   ekle. Otomatik banka eşlemesi kesin kanıt değildir. Gerçek DB'ye test cevabı yazma.
4. Yeni bir görsel blok veya bölüm eklenince yalnız değişen kapsamın anlamlı testini
   ve UI'sini çalıştır. Tüm PDF arşivini/OCR hattını yeniden çalıştırma.

## Hızlı devam komutları

```powershell
git status --short
git log -3 --oneline
Get-Content veri/ui-denetim/konu-ogrenme-kesif.json
Get-Content veri/ui-denetim/konu-ogrenme-akis.json
python scripts/ivme.py durum --hizli
```

Ayrıntılı test/üretim komutları teknik sözleşmede. Önceki PDF uzlaştırmasının açık işleri
[12.01](plan/12-icerik-ve-yayin.md) kapsamında; önceki kanıt ve yedekler korunur.
