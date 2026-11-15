# İvme devir notu

Önce `git status --short`, [AGENTS.md](../AGENTS.md) ve yalnız ilgili açık görev okunur. Yeni kullanıcı talimatı bu notun önüne geçer.

| Alan | Değer |
|---|---|
| Sıradaki görev | `16.04` Opus 5.5 yeniden denetimi **23/28 FAIL** ([bulgular A1–A8](islemler/hareket-v2-denetim.md#opus-55-yeniden-denetimi-d99dcc7)). Sıradaki: düzeltme turu. A1/A2 içerik (yeni gerekçe seçenekleri, 3–4 seçenekli ölçme maddeleri, eşdeğer yeni tur maddeleri) **Fable 5.2**; A3–A7 kod ve test **Sonnet 5.5**; sonra yeniden denetim **Opus 5.5** (yeni oturum) |
| Son kapanan | `16.03` silme kısmı (video/ses, tekrar dosya, kapanmış YKS/Pratik 2 betikleri; taşımalar ertelendi); model konu arayüzü (`/konuyu-ogrenelim/ogren/fizik-hareket`) |
| Sıradaki komut | `node --test testler/konu-paketi.test.mjs`; sayfa `python scripts/ivme.py sayfa "/konuyu-ogrenelim/ogren/fizik-hareket" --bekle Hareket --ekran` |

## Dondurulan iş: Pratik 2

11.026 soru ana OGM bankasında; MEBİ/Pratik 2 aktarımı **kapalı**: yeni soru arama, çıkarım, OCR/model ve aktarım başlatılmaz; `scripts/mebi-pratik2-lifecycle.json` kapalı kalır, eski plan ve paket panosu yeniden oluşturulmaz. Çalışan Pratik 2 süreci yoktur. İmleç: kabul kaydı `veri/mebi-pratik-2/pdf-closeout/acceptance.json`, kaynak kanıtları `veri/mebi-pratik-2/20261111-source-inventory/` (16.03'e dek silinmez); PDF/hash/kategori kayıtları `learning_catalog.source_audits.inventory_audit.mebiPdfCloseout`.

## Açık kararlar (kullanıcı)

- **16.03 silmeleri:** her kategori (video/ses, zip, tekrar PDF, önbellek, eski döküm; konu anlatımında sayı sınırı yok, sistemde karşılığı olmayan dosya silinmez) için kuru liste sunulur; kullanıcı onaylamadan hiçbir dosya silinmez. Önce güncel veritabanı dökümü alınır. Adresi olmayan video listelenir, karar kullanıcıya aittir.
- **16.04:** Kullanıcı içerikten devam edilmesini istedi; içerik taslağı tamamlandı. Teknik kabul, öğretmen onayı ve öğrenci ölçümü bekliyor.
- **Yeni soru edinimi:** 100 bin yeni soru istenirse dışlanan adaylar açılmadan ayrı kaynak edinimi projesi tanımlanır ([kaynak kaydı](tarifler/kaynak-kaydi.md#yks-kaynak-birleştirme-kapalı)).

## Etkin ve bekleyen işler

- **MAT-TYT (etkin):** TYT 29/32; sıradaki konu `node scripts/konu-ogrenme-kapsam.mjs --liste --kontrol` ile bulunur. 16. adım başlayana dek içerik üretimi bu sırayı korur; 16.04'ten sonra yeni konu paketi standardına geçilir.
- **Kullanıcı/insan girdisi bekleyen:** TAS-08 ve TAS-09 öğretmen kararları, Fizik pilotu değerlendirmesi, TAS-10 Brevo göndereni ve API anahtarı, TAS-02 dış izleme kurulumu. Ayrıntı [yol haritasında](plan/README.md).
- Başlangıçtaki `frontend/src/learn/derin/sayma-permutasyon*`, `derin/index.js`, `derin/cizimler.jsx` kullanıcı çalışmasıdır; ilgisiz commit'lere alınmaz.

## Kurallar özeti

Referans günü 2026-10-31: DB'ye ulaşmamış olay/kuyruk/log yeniden oynatılmaz; öğrenci kayıtları, soru kimlikleri ve içerik karar geçmişi korunur. Push ve dış dağıtım yalnız açık talimatla. Geçerli kanıtı sebepsiz tekrarlama.
