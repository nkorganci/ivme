# Sistem rehberi — Uygulamada adlandırma ve erişim — kategori seçimi, notlar ve kapsam

[Rehber dizini](../00_SISTEM_REHBERI.md) · Ne zaman okunur: categorySelection, kaynaklı notlar, /coverage, yükleme hataları.

## Kategori seçimi, notlar ve kapsam

`categorySelection.js` yalnız arama ve sunum düzenidir; yeni bir sözlük değildir.
Konu adları güncel metadata yanıtından alınır. Liste AYT/TYT, ders, konu ve alt
konu sırasıyla Türkçe alfabetik gruplara ayrılır; 150 kayıt sınırı uygulanmaz.
Yazarken açılan öneriler Türkçe/ASCII harfleri ve birden çok arama sözcüğünü
destekler; klavye veya tıklamayla aynı sabit kategori kimliği seçilir.
Katalog istekleri yalnız eşzamanlı çağrılar için paylaşılır; kalıcı sayfa içi
önbellek tutulmaz. Ekrana/alanlara yeniden odaklanınca güncel DB adları tekrar
okunur; kimlikler başlık değişikliğinden türetilmez.
`/soru-bankasi` ve `/cikmis-sorular` liste adresleri, müfredat bağlantıları ve
tekil sorulardan geri dönüş için korunur.
Eski kütüphane/PDF/not dizini adresleri ortak filtreli hedefe gider; konuya veya
kalıba işaret eden not ve PDF ayrıntı bağlantıları korunur. Ortak gezinme sınav,
ders, kategori, eşleşme ve aday kapsamını taşır. Ayrıntı sayfasının URL'sinde
kategori yoksa `ResourceContext` aynı yoldaki kaynaktan kapsamı sağlar. Video
bölüm bağlantısı doğrulanmış/tahmini zamanını gösterir; tam video QR'si bölüm
QR'si gibi sunulmaz.

Kaynaklı not üreticisi `ornek-veri/kaynakli-notlar/*.json` taslaklarının PDF
sayfa dayanaklarını, gerçek OGM/çıkmış soru kimliklerini ve anahtarlarını kontrol
eder; çıktısı öğretmen onayı değildir. `ornek-veri/resmi-soru-durumlari.json`
ek resmî iptal bildirimlerini tutar; üretici bunları rehber örneği olarak almaz.
`scripts/content-correction-package.py` kaynak/cevap/kırpım düzeltmelerini
kimlik, hash ve geçmiş etkisiyle ayrı kanıt paketine aktarır; banka veya geçmiş
yazmaz. V50 `official_question_corrections` ayrı resmî düzeltme kanıtını saklar.
`official-question-corrections.py --apply` yalnız birincil duyuru dayanağı ve
tam yıl/test/soru kimliği eşleşen iptalleri yeni seçimden çıkarmak için
`active=false` yapar. İşlem atomiktir ve tekrarında kaynak damgasını değiştirmez;
cevap anahtarı, eski deneme veya puan yazmaz. Görsel onarımı gibi bu işlem de
öğretmen etiketi onayı değildir. V51 resmî iptal kaydı bulunan sorunun yeniden
etkinleşmesini DB'de engeller. Eski CSV içe aktarımında iptal kaydı korunur,
satır uyarısı verilir ve diğer geçerli sorular alınabilir.
`official-archive-check.py` resmî PDF anahtarını yalnız tekil eski kimliği
eşleşen kayıtta karşılaştırır; birleşik pasajı tek soru gibi onaylamaz.

`/coverage` tekil kaynak, fiziksel varlık ve konu referansını ayrı sayar; yalnız
`VERIFIED` ve kendi sayfa/süre sınırları geçerli aralıkları birleştirir. Eksik
`pageCount`/`durationSeconds` veya bozuk aralık toplamı şişirmez. Kaynağı açmak ve
konuya “Bitti” demek sayfa okuma/video izleme olayı üretmez.

Sözlük ve kaynak listesi yükleme hataları ayrı tutulur ve kendi isteği yeniden
denenir. Bir isteğin başarısı diğer isteğin hatasını silmez. Tarayıcı doğrulaması
güncel frontend ve backend'e bağlanır: Vite `IVME_API_TARGET` yalnız loopback HTTP
hedefi kabul eder; `node testler/learning-resources-ui.mjs <frontend-url>` veya
`IVME_UI_BASE_URL` ayrı yerel ön yüzü seçer. Portun HTTP 200 vermesi çalışan kodun
güncel olduğunu kanıtlamaz. `ui/acceptance.json` denenen kaynak hash'lerini,
masaüstü/390 px sonuçlarını ve sentetik 503/403 hata senaryolarını kaydeder.
