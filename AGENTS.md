# İvme: Claude ve Codex çalışma kuralları

Bu dizin tek İvme uygulamasıdır: React/Vite, Spring Boot, PostgreSQL. Claude `CLAUDE.md` üzerinden bu dosyayı içe alır. Görevle ilgisiz belgeleri baştan yükleme; [belge dizininden](docs/README.md) ilgili sözleşmeyi seç.

## Başlangıç ve devir

- Önce `git status --short` ile kullanıcı değişikliklerini koru. Devam isteniyorsa [devir notunu](docs/devam.md), yalnız ilgili açık işi ve gerekli rehber bölümünü oku. Yeni kullanıcı talimatı, devirdeki sıradaki görevin önüne geçer.
- Devirde yalnız yarım işin konumu, sonraki komut ve açık karar tutulur; geçmiş işler `git log` ve sürümlü raporlardadır. Görev sonunda devir notunu gerekiyorsa güncelle ve tamamlanan değişikliği yerel `main` dalına commit et. Kullanıcı istemedikçe push yapma.
- Tekrarlanan komutları `python scripts/ivme.py` ve [işlem tariflerinden](docs/islemler/README.md) seç. İş ikinci kez elle kuruluyorsa betik veya kısa tarif ekle; çıktı/hash önbelleğini kullan.

## Veri ve ürün sınırları

- Kalıcı DB `ivme` içindeki öğrenci kayıtlarını ve içerik karar geçmişini koru. Testleri yalnız geçici `ivme_test` üzerinde `python scripts/ivme.py test` ile çalıştır. Özgün `../Kaynaklar/` arşivi yalnız okunur.
- Sözlük, kaynak kimliği, kanıt ve öğretmen onayı için [ortak etiket sözleşmesini](docs/sozlesmeler/ortak-etiketler.md) ve ilgili [şemayı](docs/semalar/learning-resource-v2.schema.json) kullan. Üretilmiş JSON'u elle düzenleme; kanıtı olmayan içeriğe öğretmen onayı yazma.
- Ön yüzde tabloları `frontend/src/components/DataGrid.jsx` üzerinden AG Grid Community ile çiz; başka tablo bileşeni veya düz `<table>` ekleme. Ortak renkler `frontend/src/theme.css` değişkenlerindedir. Tablo başlığı/hücresi ortalı ve grid alanı dolu olmalı.

## Doğrulama ve belgeler

- Değişen davranışı ilgili teknik belgede düzelt; tarihli iş günlüğünü belgelere kopyalama. Açık iş [yol haritasında](docs/plan/README.md), etkin/yarım iş devir notunda, tekrar eden işlem `docs/islemler/` altında kalır.
- Değişiklikle ilgili en küçük anlamlı denetimi çalıştır. Belge/plan için `python scripts/ivme.py plan`, commit öncesi `python scripts/ivme.py kontrol`; ön yüz için gerektiğinde `npm run build`, sayfa için `python scripts/ivme.py sayfa /yol`.
- Uygulama kodu değiştiyse yerel izleyicinin sonucu ve servis edilen sürümü doğrula. Çalışma/yeniden başlatma ayrıntıları [işletim tarifinde](docs/islemler/uygulama-calistirma-ve-yayin.md). Yeni dış dağıtım ve push için açık kullanıcı talimatını bekle.

## Konuyu Öğrenelim: kullanıcının kalıcı öğretim beklentisi

Bu bölüm hem Codex/ChatGPT hem Claude için geçerlidir. `CLAUDE.md` bu dosyayı içe alır;
ayrı bir `agent.md` veya kopya kural dosyası oluşturma. Devam noktası için önce
[docs/devam.md](docs/devam.md), yalnız uygulama ayrıntısı gerektiğinde
[öğretim sözleşmesi](docs/icerik/konuyu-ogrenelim.md) okunur.

- Amaç öğrencinin **mantığı kavraması ve gerçek soruyu kendi başına çözebilmesi**.
  Kısa özetleri uzun metne çevirmek yeterli değildir. Hiç bilmeyen için terimleri ve
  sembolleri açıklayarak başla; temel → bağlantılar → ileri gerekçe/özel durum sırasını koru.
- Öğretim sırası: **günlük yaşam bağlamı → tahmin ve etkileşimli görsel → gerekçeli
  çözümlü örnekler → bu örneklerden çıkarılan pratik kısa yollar → öğrencinin denemesi
  ve gerçek sorular**. İpuçları tek başına kural listesi olmasın. Kısa yolun geçerli
  olduğu koşulu, neden çalıştığını ve yanıltacağı durumu birlikte açıkla.
- Görseller süs değildir: değişen miktarı, sabit kalan ilişkiyi ve işlemin nedenini
  gösterir. Öğrenci değeri değiştirebilmeli; şekil, sayısal sonuç ve açıklama tutarlı
  güncellenmeli. Günlük kullanım, merak uyandıran bağlantı ve püf noktası konuya özgü
  olmalı. Olgusal ilginç bilgiyi uydurma; matematiksel bir ilişkiyi keşfettirmek uygundur.
- Önce örnek çöz; her adımda **ne / neden / nasıl kontrol ederim** göster. Yeni başlayan
  için gerekçeyi gizleme. “Temelden” başlangıçtır; bilgili öğrenci daha ileri anlatımı
  seçebilir. Gereksiz jargon, küçük yazı, yoğun tek ekran ve acele ettiren dil kullanma.
- Kaynak PDF görüntüsü veya özgün çizim kullanılabilir. Özgün soru kodunu/görselini koru;
  görmeden ayrıntılı çözüm yazma. Otomatik konu eşlemesini görsel inceleme veya öğretmen
  onayı gibi sunma. Çözümü derste gösterilen soru bağımsız ustalık testine girmemeli.
- Mevcut dersler ve bundan sonra eklenecekler aynı standarda uyar. Yeni ders yalnız
  `.ders` özetiyle tamamlanmış sayılmaz: keşif anlatımı, uygun görsel model, gerekçeli
  örnek, aktarım sorusu, koşullu kısa yol ve yanlış düşünce geri bildirimi gerekir.
  Her bölümde üç düzeyi dolu bir `::duzey` (Temelden / Bağlantıları kur / Derinleş) ve en az
  bir `::sorgula` (Günlük hayattan sorgula) bulunur; örnek: bölme ve bölünebilme pilotu.
- Oturum sonunda yerel commit yap; devam notunda **tamamlanan kapsam, kalan somut iş,
  doğrulama sonucu ve sıradaki komut** bulunmalı. Geçmişi yeniden tarama, geçerli testleri
  sebepsiz tekrarlama, mevcut modeli veya soru bankasını baştan üretme. Yeni bir hata ya
  da değişen girdi tekrar denetimini gerektirebilir. Kaynak arşivi ve öğrenci DB'si korunur.
