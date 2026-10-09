# İvme — mevcut durum ve geçiş kaydı (2026-10-08)

Bu kayıt [yol haritasının](00_YOL_HARITASI.md) 1. adımını kapatır. Sayılar yerel PostgreSQL'den okunmuştur; GitHub'daki sürüm ile çalışma ağacı aynı değildir.

| Parça | Bugün çalışan / bulunan | Açık iş |
|---|---|---|
| Yeni uygulama `uygulama/` | React/Vite; Spring Boot; PostgreSQL/Flyway; kayıt/giriş/hesap; iki soru koleksiyonu; filtre ve cevap kontrolü; süreli/süresiz sınav ve geçmiş; geri bildirim/QR; yönetim araçları | Soru başına kalıcı deneme ve aktif süre, yeni/önceki soru seçimi, kişisel istatistik, hedef, zayıf alan analizi, sağ panelde karalama/not sekmeleri |
| Eski `site/` | Ayrı statik arayüz; tarayıcı depolamasına dayanan takip/karalama kodu ve eski soru gösterimi | Sunucu verisiyle ortak hesap/kalıcılık yok; doğrudan yeni uygulamanın parçası sayılmaz |
| `veri-hatti/` ve `Kaynaklar/` | PDF indirme, kırpma, cevap/QR, konu etiketi ve not arama işleri; kaynak PDF'ler depo dışında | Yeni uygulamanın soru kimliği, kaynak sayfası ve kalite kuyruğuna bağlanacak |
| Yerel soru verisi | `yks_hazirlik`: 80.097 etkin soru (TYT 37.934, AYT 42.163), 2 hesap, 7 sınav, 136 sınav-soru, 1 geri bildirim. `veri/sorular-tum.csv` yaklaşık 2.564 tek cevaplı çıkmış soru, `veri/sorular-ogm.csv` yaklaşık 77.533 OGM sorusu | Bunlar kaynak ve ithalat sayılarıdır; cevap/görsel eşleşmesi henüz örneklenerek doğrulanmadı. Eski statik sitenin kart sayısı ile aynı ölçü değildir |
| Git | `feature/ivme-yol-haritasi` → `ivme` uzak deposu; `origin` başka repoya (`akilli-ysk-pusulasi`) bakıyor | Çalışma ağacında önceden başlamış yaklaşık 44 değişmiş dosya ve yeni dosyalar var. İki koleksiyon/ithalat, güvenlik ve UI işleri birlikte duruyor; incelemeden topluca commit edilmez |
| Veritabanı | `yks_hazirlik` şema sürümü V1–V3; `ivme` henüz yoktu. `yks_hazirlik_test` ayrı ve testler onu temizliyor | 2. adım: yedekten `ivme`ye kopya, bağlantı değişimi, V4 telefon göçü ve yeni ilerleme şeması. Eski DB geri dönüş için saklanır |

**Ekran kontrol listesi (kaynak kod denetimi):** Ana sayfada sınav özeti, boş durum ve hızlı eylemler; soru ekranında görsel, şıklar, cevap kontrolü, komşu soru, QR ve oy; sınav kurulumunda koleksiyon/konu/sayı/süre; geçmişte sınav kartları, boş durum ve sayfalama; yönetimde özet/sorular/bildirimler/içe aktar sekmeleri bulundu. Bu denetim çalıştırılmış tarayıcı testi değildir; veritabanı geçişinden sonra yerel masaüstü/telefon akışı ayrıca doğrulanacak. Yönetici ekranı ürün isteğindeki yalnız toplu istatistik sınırını bugün aşar; 4. ve 11. adımlarda daraltılacak.

**Güvenli geçiş:** `yks_hazirlik` silinmeyecek. `pg_dump -Fc` ile Git dışı yedek alınır; ayrı `ivme` DB'sine geri yüklenir; her ikisinin tablo sayıları karşılaştırılır. Uygulama yeni DB'de Flyway göçlerini çalıştırır. `veritabani-sifirla.bat` veri silen eski geliştirme betiğidir; geçiş aracı olarak kullanılmaz.
