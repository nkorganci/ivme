# Sistem rehberi — Alternatif çıkarım ve manuel inceleme

[Rehber dizini](../00_SISTEM_REHBERI.md) · Ne zaman okunur: OCR/okunamayan kaynak, önbellek, manuel inceleme.

## Alternatif çıkarım ve manuel inceleme

Metin azlığı tek başına boş sayfa değildir. `pdf-readability-fallback.py`, önce
renderdaki piksel içeriğini denetler; dolu sayfada 300 DPI gri ve gerekirse
360 DPI odaklanmış OCR uygular. İlk pilotta daha önce çıkarılamayan 320 sayfada
metin bulundu. Boş aday ile şekil/az yazı içeren sayfa ayrı tutulur; otomatik
boşluk kararı kesin insan onayı değildir. Alternatif sonuçlar kaynak/sayfa/model
hash'i ve çıkarıcı sürümüyle ayrı önbellekte kalır. Başarısız denemeyi her
oturumda tekrar etme; `--check` ve devam önbelleği kullanılır.

Çözülemeyen kayıt `manualReview.status=NEEDS_MANUAL_REVIEW`, kontrollü neden kodu,
Türkçe etiket ve varsa fiziksel sayfa listesi taşır. `EMPTY_OR_UNREADABLE`,
`LOCATION_REVIEW`, `LABEL_REVIEW`, `TIME_REVIEW`, `SOURCE_REPAIR` birbirinden
ayrıdır. Kütüphanede neden filtresi ve doğrudan sayfa bağlantıları bulunur.
Bu durum teknik üretimi/entegrasyonu durdurmaz; kaydın içerik doğruluğu veya
öğretmen onayı verilmiş gibi kullanılmasına izin vermez. Aday konu ilişkisini
dahil etme seçeneği, `ANY/ALL` sorgusunda her ilişki düzeyinde uygulanır.

`video-content-probe.py` genel altyazı URL'sinde JSON3, SRV3, SRV1 ve doğrudan
ASR biçimlerini sınırlı pilotla dener. HTTP 200/sıfır bayt transkript değildir.
Başarısızlık, yöntem ve metadata sürümü önbelleğe alınır; normal üretim aynı
isteği tekrarlamaz. Yerel zamanlı metin yoksa veya sağlayıcı yanıt vermiyorsa
manuel zaman incelemesi korunur; başlıktan başlangıç/bitiş uydurulmaz.

Oynatma listesinde normal HTML veri çıkarımı başarısızsa genel RSS
`/feeds/videos.xml?playlist_id=...` kullanılır. Beş listede ilk denemede 60 farklı
video referansı bu yolla bulundu. RSS son kayıtlarla sınırlıdır; tam liste
sayılmaz. `RSS_RECENT_ENTRIES_ONLY` kapsamı ve gözlenen besleme sırası korunur.
Yeni girişler önceki keşiflerle birleştirilir, sağlayıcı kimliğiyle tekilleşir;
eski veri hash'li geçmişe alınır. Liste kaydı tek video gibi süre almaz.
