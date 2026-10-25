## Oturum başlangıcı ve devir (Claude ↔ Codex)

- Her yeni görevde önce `docs/plan/00_DEVAM.md` (etkin/yarım iş) ve `docs/plan/00_CALISMA_BAGLAMI.md` (kalıcı kurallar, güncel sürümler) dosyalarını oku. Durumu tek komutla gör: `python scripts/ivme.py durum`.
- Yarım iş varsa yeni iş başlatmadan ondan devam et. Kullanıcının yeni talimatı önceliklidir.
- Her anlamlı adımın sonunda `00_DEVAM.md` dosyasını güncelle (ne yapılıyordu, nerede kalındı, sıradaki komut) ve yerel commit at. Başka bir AI yalnız bu dosyayla devam edebilmelidir.
- Bilinen test hataları `testler/bilinen-hatalar.md` içindedir; listedekileri yeniden araştırma.

## Tekrar eden işler

- Tekrar eden işler için `python scripts/ivme.py <komut>` kullan (`durum`, `bekle`, `test`, `sayfa`, `ui`, `kontrol`, `plan`, `pdf`, `ollama`, `ogretim`). Adım adım tarifler `docs/islemler/` altındadır. Bir iş ikinci kez elle kuruluyorsa tarif veya alt komut ekle.
- Ekran doğrulamasında önce `python scripts/ivme.py sayfa /yol` (JSON: başlıklar, tablo, kırpılan hücre, taşma, konsol/istek hataları) kullan. Ekran görüntüsünü yalnız JSON yetmezse veya denetim sorun bulduğunda aç.
- PDF'den soru/metin için önce `python scripts/ivme.py pdf sorular <pdf>` (metin katmanı + konum); yalnız `gorselGerekli` sorularda kırpılmış görsele bak, tam sayfa görüntüsü verme.
- Mekanik ve çok tekrarlı sınıflandırmada önce yerel Ollama (`python scripts/ivme.py ollama ...`); sonuç adaydır, öğretmen onayı yazılmaz.

## Belge düzeni

- Belgeler çalışan sistemin **güncel** hâlini anlatır. Geçmiş iş dökümü, tarihli kabul satırı, “şu tarihte yapıldı” anlatımı ve kabul raporu bağlantısı belgeye yazılmaz; kanıt commit mesajına veya `veri/` altındaki rapora gider.
- Bilginin tek yeri vardır: etkin/yarım iş → `00_DEVAM.md`; kalıcı kural ve güncel sürüm kimliği → `00_CALISMA_BAGLAMI.md`; sistemin nasıl çalıştığı → `docs/plan/rehber/` ilgili bölümü; API → `docs/API-ve-mimari.md`; yapılacak iş → numaralı adım dosyası. Aynı bilgiyi ikinci belgeye kopyalama; bağlantı ver.
- Kodu veya veriyi değiştiren her işte, değişen davranışı anlatan belge bölümünü aynı commit'te güncelle; eskiyen cümleyi düzelt veya sil. Sayıları belgeye yazmak yerine nereden okunacağını yaz (DB sorgusu, `ivme.py durum`, üretim raporu); yazman gerekiyorsa güncel değeri doğrula.
- Sistem rehberinin yalnız ilgili bölümünü aç; rehberi görev listesine veya tamamlanan adım özetine dönüştürme.
- `python scripts/ivme.py kontrol` (pre-commit) belgelere yeni tarihli iş dökümü ve rapor bağlantısı eklenmesini reddeder.

## Plan ve adımlar

- Yol haritası `docs/plan/00_YOL_HARITASI.md`; görev tanımı yalnız ilgili `NN_*.md` adım dosyasındadır. Yalnız seçilen adımın ilgili kaynaklarını ve sözlük dalını yükle. Kanıtı olan işi yeniden yapma; mevcut kullanıcı değişikliklerini koru.
- Branş/konu/alt kategori, PDF/video görünen adı ve kaynak sayfa/zaman bilgisi için ortak kimlikleri ve `00_CALISMA_BAGLAMI.md` içindeki kalıcı kuralları kullan. Yeni bağımsız sözlük veya “eksikler” listesi oluşturma.
- Kapanan alt işi adım dosyasından çıkar. Adım tamamen bitince kalıcı kuralları rehbere aktarıp adımın `.md` dosyasını sil; yol haritasını ve bağlantıları güncelle. Kalan adım numaralarını değiştirme. Tamamlanan adım için özet dosyası bırakma.
- Kullanıcının “yalnız plan” talimatında kod, kaynak içerik, veritabanı ve dağıtım değişikliği yapma. Planın varlığı tek başına uygulama veya yayın yetkisi değildir.

## Tablo kuralları

- Projedeki tüm tablolar için yalnızca AG Grid Community kullan (`ag-grid-community`, `ag-grid-react`).
- Başka tablo kütüphanesi ekleme (TanStack Table, MUI DataGrid, shadcn Table vb.) ve düz `<table>` yazma.
- Her tabloyu `frontend/src/components/DataGrid.jsx` sarmalayıcısı üzerinden çiz. Sıralama, filtreleme, sayfalama ve tema gibi ortak ayarları bu dosyada tut; sayfalarda tekrarlama.
- Kullanıcının kalıcı tablo tercihi: yeni ve mevcut tablolarda başlık/hücre içerikleri yatay-dikey ortalanır. Tablo kendisine ayrılan alanın tamamını doldurur; sütunlar kullanılabilir genişliğe göre otomatik ölçeklenir (`fitGridWidth`, sürekli uyarlama). İçerik ölçümü açıkça seçildiğinde de tablo tam genişlikte kalır ve sütunlar boş alanı doldurur. Kullanılabilir düzenleme kontrollerinin ve özel dar sütunların sınırlarını koru; genel davranışı sayfalarda yeniden yazma.
- AG Grid Enterprise özelliklerini kullanma. Bir özelliğin Community sürümünde olup olmadığından emin değilsen önce resmi belgelerde `(e)` işaretini kontrol et.
- Renkleri yalnızca `frontend/src/theme.css` içinde tanımlı değişkenlerden al. Yeni renk ekleme.

## Git

- Yalnız `main` dalında çalış ve tamamlanan değişiklikleri yerel `main` dalına commit et. Kullanıcı istemeden Git push yapma (istenirse `git fetch ivme` sonra `git push ivme main`). Yeni feature dalı veya ikinci worktree oluşturma.
- Her yeni işten önce yerel `main` ve uzak `ivme/main` güncelliğini kontrol et. Bekleyen değişiklikleri koru; reset/temizleme ile atma. Çakışmayı kodu kaybetmeden çöz.
- Tek uzak depo `ivme`dir; main upstream `ivme/main` olmalıdır.
- Commit öncesi kural denetimi: `git config core.hooksPath .githooks` (bir kez). Kanca `python scripts/ivme.py kontrol` çalıştırır.

## Tek yerel ortam ve veritabanı

- Tek uygulama deposu `D:\workspace\ivme\uygulama`, dalı `main`, adresi `http://localhost:1010`, veritabanı `ivme`dir.
- Git güncellemesi DB kayıtlarını taşımaz. Öğrenci kayıtlarını ve içerik geçmişini koru. Testleri gerçek `ivme` veritabanında çalıştırma; `python scripts/ivme.py test` geçici `ivme_test` kullanır.
- Cloudflare tünelinin hedefi doğrudan `http://localhost:1010` adresidir; 5173 için ek giriş açılmaz. Kullanıcı Cloudflare hedefini kendisi değiştirir. `my-jenkins` Docker konteyneri durdurulmuş kalır; otomatik başlatma.
- `Kaynaklar/` özgün PDF arşivi yalnız okunur. `yerel-ortam.ps1` main/1010/ivme ayarını seçer; `yeniden-baslat.ps1` bu uygulamanın sürecini değiştirir.
- Windows başlangıcındaki `IVME - Otomatik Guncelleme.lnk`, `yerel-baslat.ps1` üzerinden tek izleyiciyi çalıştırır. Üst dizindeki `Ivme Baslat.bat` aynı uygulamayı tarayıcıyla açar.

## Değişiklikleri çalışan uygulamaya yansıtma

- Uygulama değişikliğinden sonra gerekiyorsa derleme ve yeniden başlatmayı da yap; bu işi kullanıcıya bırakma. Yalnız plan taleplerinde bu kural uygulanmaz.
- Kaynak izleyicisi `frontend/src`, `backend/src/main/java` ve `backend/src/main/resources/db` değişikliğinden yaklaşık 3 sn sonra paketi yeniler (döngü ~2,5 dk). Döngü sürerken `mvn test` çalıştırma; `python scripts/ivme.py bekle` döngünün bitmesini bekler.
- Görevi bitirmeden sunulan HTML/asset sürümünü ve değişen ekranı doğrula (`ivme.py durum`, `ivme.py sayfa`); yalnız `frontend/dist` derlemesinin geçmesi yeterli değildir. Mevcut yerel uygulamayı güncelleme yetkisi yeni bir dış dağıtım veya push yetkisi değildir.
- Otomatik güncelleme açık kalır.
