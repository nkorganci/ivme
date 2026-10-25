# İvme — devir dosyası (Claude ↔ Codex)

Her oturumun başında okunur, her anlamlı adımın sonunda güncellenir ve yerel commit'e
girer. Bir AI yarıda bırakırsa diğeri yalnız bu dosyayla devam edebilmelidir.
Kısa tutulur: geçmiş iş dökümü değildir; ayrıntı commit ve rapor dosyasındadır.
Kalıcı kurallar [çalışma bağlamında](00_CALISMA_BAGLAMI.md), sistem bilgisi
[rehberde](00_SISTEM_REHBERI.md) kalır; buraya kopyalanmaz.

Güncel durumu tek komutla görmek için: `python scripts/ivme.py durum`.

## Şimdi

| Alan | Değer |
|---|---|
| Güncelleme | 25 Ekim 2026 — Claude |
| Etkin görev | `07.02` |
| Sıradaki görev | `07.02` — Tahmini etiketleri göster filtresiyle bütün branşlarda gerçek kaynak/ünite/sınıf kontrolü |
| Yarım iş | Yok |
| Commit'lenmemiş değişiklik | Yok |
| Sıradaki komut | — |

Yarım iş varken satırı şu biçimde doldur: ne yapılıyordu, nerede kalındı (`itemKey`,
sayfa, parti, dosya), kalan miktar, bir sonraki komut ve çıktı/checkpoint yolu.

## Duraklatılmış işler

Kullanıcı açıkça istemeden başlatılmaz; istendiğinde buradaki noktadan devam edilir.

| İş | Durum ve devam noktası |
|---|---|
| Akıllı Öğretmen pilotu | 18 Ekim'de kullanıcı “dur, yeni konu başlatma” dedi. 14 branş × 5 konu × 1 soru = 70 içerikten 12'si hazır ve `ivme` DB'de (matematik 5, geometri 5, fizik 2: TYT-0913, TYT-0938). Sırada fizik TYT-0959, AYT_Sayisal-0370, AYT_Sayisal-0379 (seçildi/çözüldü), sonra 11 branş. İçerik `ornek-veri/ogretim-pilotu/<branş>/*.json`; `python scripts/ivme.py ogretim dogrula` → `ogretim aktar`; ekran `testler/ogretim-dongusu-ui.py`. API ve tarif: [API](../API-ve-mimari.md#akıllı-öğretmen), [tarif](../islemler/ogretim-icerigi.md). |
| KPSS diğer sınavlar | [14. adım](14_KPSS.md): 14.02 Ön Lisans sırada; 14.03–14.06 sonra. |

## Son kapanan iş

25 Ekim 2026 — Akıllı Öğretmen kurulu `qwen3.5:9b` ile çalışıyor (`think:false`, canlı sınıflandırma
OK); araştırma arşivi yayınla eşitlendi (55 rehber, atıf yapılan PDF'ler dahil). Ayrıntı: `git log -1`.
