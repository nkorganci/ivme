# İvme — kalıcı sistem ve değişiklik rehberi

Bu belge sistemin nasıl kurulduğunu ve ileride nasıl değiştirileceğini anlatır.
Yapılacaklar listesi, tamamlanan adımların özeti veya oturum günlüğü değildir.
Güncel görev [çalışma bağlamında](00_CALISMA_BAGLAMI.md), iş sırası
[yol haritasında](00_YOL_HARITASI.md) bulunur. Uygulama değiştiğinde ilgili
sözleşme ve bu rehber aynı işte güncellenir. Kaynak kodla çelişirse önce gerçek
kod, veri sürümü ve doğrulama kanıtı kontrol edilir; belge tek başına tamamlanma kanıtı değildir.

Rehber bölümlere ayrılmıştır; **yalnız görevle ilgili bölümü aç**. Bölüm dosyası
değişince bu dizindeki satır yalnız kapsam değiştiyse güncellenir. Yeni bölüm
gerekirse `rehber/` altına aynı biçimle eklenir; bölüm başka belgeye kopyalanmaz.

| Bölüm | Ne zaman okunur |
|---|---|
| [Sistemin omurgası](rehber/01_omurga.md) | Uygulamanın katmanları ve veri akışı; ilk kez sistemi tanırken |
| [Hangi bilginin tek kaynağı var?](rehber/02_tek-kaynak.md) | Yeni veri/sözlük/kayıt eklemeden önce; tekrar ve ikinci liste önleme |
| [Kimlikler ve sayım](rehber/03_kimlikler-ve-sayim.md) | Kategori/soru/kaynak kimlikleri, tekil sayım, sürüm kimlikleri |
| [Kanıt, konum, güven ve onay](rehber/04_kanit-ve-onay.md) | Sayfa/zaman aralığı, güven, öğretmen onayı |
| [Üretim ve yeniden başlama](rehber/05_uretim-ve-yeniden-baslama.md) | Derleme, izleyici, yeniden başlatma, yedek |
| [Alternatif çıkarım ve manuel inceleme](rehber/06_alternatif-cikarim.md) | OCR/okunamayan kaynak, önbellek, manuel inceleme |
| [Yeni kaynak kabulü](rehber/07_yeni-kaynak-kabulu.md) | Yeni PDF/video/sınav eklerken |
| [Uygulamada adlandırma ve erişim — adlandırma, metadata ve tablolar](rehber/08a_adlandirma-ve-tablolar.md) | Görünen ad, resourceMetadata, DataGrid kuralları |
| [Uygulamada adlandırma ve erişim — soru filtreleri ve etiket eşleşmesi](rehber/08b_soru-filtre-ve-eslesme.md) | match/categoryMatch, filtre sayımları, V44–V52 etiket anlık kayıtları |
| [Uygulamada adlandırma ve erişim — ilerleme, Konu takibi ve istatistik](rehber/08c_ilerleme-ve-istatistik.md) | /progress, Konu takibi, /gecmis, haftalık çizelge, öğrenci kayıtları |
| [Uygulamada adlandırma ve erişim — menü ve pratik](rehber/08d_menu-ve-pratik.md) | Menü yapısı, pratik oluşturma, bitmemiş pratik |
| [Uygulamada adlandırma ve erişim — deneme ve sınav arşivi](rehber/08e_deneme.md) | Deneme planı, kapsam, yıla ait sınav, arşiv konumları |
| [Uygulamada adlandırma ve erişim — kategori seçimi, notlar ve kapsam](rehber/08f_kategori-not-kapsam.md) | categorySelection, kaynaklı notlar, /coverage, yükleme hataları |
| [Site yöneticisinin kullanıcı yönetimi](rehber/09_kullanici-yonetimi.md) | Hesap, rol, onay, silme |
| [Yeni değişiklik yaparken](rehber/10_yeni-degisiklik.md) | Her kod/veri değişikliğinden önce kontrol listesi |
| [Tekrarı ve hatayı yakalayan denetimler](rehber/11_denetimler.md) | Hangi betik neyi denetler |
