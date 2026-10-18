## Tablo kuralları

- Projedeki tüm tablolar için yalnızca AG Grid Community kullan (`ag-grid-community`, `ag-grid-react`).
- Başka tablo kütüphanesi ekleme (TanStack Table, MUI DataGrid, shadcn Table vb.) ve düz `<table>` yazma.
- Her tabloyu `frontend/src/components/DataGrid.jsx` sarmalayıcısı üzerinden çiz. Sıralama, filtreleme, sayfalama ve tema gibi ortak ayarları bu dosyada tut; sayfalarda tekrarlama.
- Kullanıcının kalıcı tablo tercihi: yeni ve mevcut tablolarda başlık/hücre içerikleri yatay-dikey ortalanır. Tablo kendisine ayrılan alanın tamamını doldurur; sütunlar kullanılabilir genişliğe göre otomatik ölçeklenir (`fitGridWidth`, sürekli uyarlama). İçerik ölçümü açıkça seçildiğinde de tablo tam genişlikte kalır ve sütunlar boş alanı doldurur. Kullanılabilir düzenleme kontrollerinin ve özel dar sütunların sınırlarını koru; genel davranışı sayfalarda yeniden yazma.
- AG Grid Enterprise özelliklerini kullanma. Bir özelliğin Community sürümünde olup olmadığından emin değilsen önce resmi belgelerde `(e)` işaretini kontrol et.
- Renkleri yalnızca `frontend/src/theme.css` içinde tanımlı değişkenlerden al. Yeni renk ekleme.

## Plan ve oturum tutarlılığı

- Bu projede her yeni görevde önce `docs/plan/00_YOL_HARITASI.md` ve `docs/plan/00_CALISMA_BAGLAMI.md` dosyalarını oku; kullanıcının güncel isteğini bu çerçeveyle ilişkilendir.
- Mimari, kaynak, kimlik, etiket veya üretim akışı değişikliğinde kalıcı referans `docs/plan/00_SISTEM_REHBERI.md` dosyasıdır. İlgili bölümünü oku; tek veri kaynağı ve tekrar önleme kurallarını koru, sistem değişirse rehberi aynı işte güncelle. Rehberi görev listesine veya tamamlanan adım özetine dönüştürme; adımlar kapanırken silme.
- Yalnız seçilen adımın ilgili kaynaklarını ve sözlük dalını yükle. Tamamlanmış işi kanıtı varsa yeniden yapma; mevcut kullanıcı değişikliklerini koru.
- Branş/konu/alt kategori, PDF/video görünen adı ve kaynak sayfa/zaman bilgisi için ortak kimlikleri ve `docs/plan/00_CALISMA_BAGLAMI.md` içindeki kalıcı kuralları ve güncel sözlük/şema referanslarını kullan. Yeni bağımsız sözlük veya “eksikler” listesi oluşturma.
- Her anlamlı görev sonunda çalışma bağlamındaki etkin/sıradaki görevi, sürüm/kanıt referansını ve varsa devam noktasını güncelle. Kapanan alt işi aktif plandan çıkar. Adım tamamen bittiğinde kalıcı kuralları/kanıtı koruyup adımın `.md` dosyasını sil; yol haritası ve bütün bağlantıları güncelle. Kalan adım numaralarını/dosya adlarını değiştirme: 1 bitince 2. adımdan devam et. Tamamlanan adım için özet dosyası bırakma; geçmiş kanıtı rapor/commit referansıyla koru. Genel karar değişirse ilgili plan/sözleşmeyi de aynı işte güncelle.
- Kullanıcının “yalnız plan” talimatında kod, kaynak içerik, veritabanı ve dağıtım değişikliği yapma. Planın varlığı tek başına uygulama veya yayın yetkisi değildir.

## Değişiklikleri çalışan uygulamaya yansıtma

- Kullanıcının kalıcı talimatı: uygulama değişikliğinden sonra gerekiyorsa derleme ve yeniden başlatmayı da yap; bu işi kullanıcıya bırakma. Yalnız plan taleplerinde bu kural uygulanmaz.
- Önce kullanıcının açtığı adresi sunan süreci belirle. Vite geliştirmede HMR'ı, paketli uygulamada `yeniden-baslat.ps1` akışını kullan. Mevcut yerel/paylaşılan uygulamayı güncelleme yetkisi yeni bir dış dağıtım veya push yetkisi değildir.
- Görevi bitirmeden sunulan HTML/asset sürümünü ve değişen ekranı doğrula; yalnız `frontend/dist` derlemesinin geçmesi yeterli değildir. Paketli çalışmada `backend/target/live-watch.status` kaydındaki sürecin ve izleyici güncelliğinin de sağlam olduğunu kontrol et.
- Otomatik güncelleme sürekli açık kalır; görev veya doğrulama bittiğinde kaynak izleyicisini kapatma. Kullanıcının Windows başlangıç klasöründeki `IVME - Otomatik Guncelleme.lnk`, `canli-izle.ps1` dosyasını gizli başlatır; oturum açılışındaki bu ayarı koru.
