# İvme devir notu

Önce `git status --short`, [AGENTS.md](../AGENTS.md) ve yalnız ilgili açık görev okunur. Yeni kullanıcı talimatı bu notun önüne geçer.

| Alan | Değer |
|---|---|
| Sıradaki görev | `16.04` Opus 5.5 yeniden denetimi **25/28 PASS** (yalnız teknik kabul; [ayrıntı](islemler/hareket-v2-denetim.md#opus-55-yeniden-denetimi-95586e0)). Sıradaki: B1 P2 (ayrılan ÖSYM sorularını Düzey 4 bitene kadar listelerden çıkar, deneme zamanını kaydet) ve B2 testleri (Sonnet 5.5); B3–B6 P3. Açık: A8, öğretmen onayı, öğrenci ölçümü |
| Son kapanan | `16.04` bağımsız yeniden denetim (`testler/kanit/konu/16-04-opus-yeniden-denetim.json`); `16.03` silme kısmı (video/ses, tekrar dosya, kapanmış YKS/Pratik 2 betikleri; taşımalar ertelendi); model konu arayüzü (`/konuyu-ogrenelim/ogren/fizik-hareket`) |
| Sıradaki komut | `node --test testler/konu-paketi.test.mjs`; sayfa `python scripts/ivme.py sayfa "/konuyu-ogrenelim/ogren/fizik-hareket" --bekle Hareket --ekran` |

## Dondurulan iş: Pratik 2

11.026 soru ana OGM bankasında; MEBİ/Pratik 2 aktarımı **kapalı**: yeni soru arama, çıkarım, OCR/model ve aktarım başlatılmaz; `scripts/mebi-pratik2-lifecycle.json` kapalı kalır, eski plan ve paket panosu yeniden oluşturulmaz. Çalışan Pratik 2 süreci yoktur. İmleç: kabul kaydı `veri/mebi-pratik-2/pdf-closeout/acceptance.json`, kaynak kanıtları `veri/mebi-pratik-2/20261111-source-inventory/` (16.03'e dek silinmez); PDF/hash/kategori kayıtları `learning_catalog.source_audits.inventory_audit.mebiPdfCloseout`.

## Açık kararlar (kullanıcı)

- **16.03 silmeleri:** her kategori (video/ses, zip, tekrar PDF, önbellek, eski döküm; konu anlatımında sayı sınırı yok, sistemde karşılığı olmayan dosya silinmez) için kuru liste sunulur; kullanıcı onaylamadan hiçbir dosya silinmez. Önce güncel veritabanı dökümü alınır. Adresi olmayan video listelenir, karar kullanıcıya aittir.
- **16.04:** Kullanıcı içerikten devam edilmesini istedi; içerik taslağı tamamlandı. Teknik kabul geçti (25/28); öğretmen onayı ve öğrenci ölçümü bekliyor.
- **Yeni soru edinimi:** 100 bin yeni soru istenirse dışlanan adaylar açılmadan ayrı kaynak edinimi projesi tanımlanır ([kaynak kaydı](tarifler/kaynak-kaydi.md#yks-kaynak-birleştirme-kapalı)).

## Etkin ve bekleyen işler

- **12.03 VPS:** Tam döküm geri yüklendi ve 190.171 medya dosyası VPS'de doğrulandı. Uygulanmış V104 SQL dosyası geri getirildi, sonraki değişiklikler V105'e taşındı. [İlk yayında](tarifler/tek-tikla-yayin.md) düzeltilen kodu yayımla, yeni göçü uygula ve `net.ivme.dev` geçişini bitir.
- **Öğretmenlik kaynakları:** 358 PDF `Kaynaklar/Ogretmenlik/ogretmen-AGS` ve `ogretmen-OABT` altında, DB envanteri yazıldı; 240 resmî bağlantının 36'sı yerelde yok ve ÖSYM PDF erişimi engelli (35'i 2025–2026 AGS/ÖABT). Kanıt `Kaynaklar/Ogretmenlik/ARSIV_DURUMU.md`; erişim açıldığında `python -X utf8 veri-hatti/ogretmen-sinavlari/duzenle.py --apply`, ardından `tamamla.py` (üst dizinden). Tam soru bankası aktarımı yapılmadı.
- **MAT-TYT (etkin):** TYT 29/32; sıradaki konu `node scripts/konu-ogrenme-kapsam.mjs --liste --kontrol` ile bulunur. 16. adım başlayana dek içerik üretimi bu sırayı korur; 16.04'ten sonra yeni konu paketi standardına geçilir.
- **Kullanıcı/insan girdisi bekleyen:** TAS-08 ve TAS-09 öğretmen kararları, Fizik pilotu değerlendirmesi, TAS-10 Brevo göndereni ve API anahtarı, TAS-02 dış izleme kurulumu. Ayrıntı [yol haritasında](plan/README.md).
- Başlangıçtaki `frontend/src/learn/derin/sayma-permutasyon*`, `derin/index.js`, `derin/cizimler.jsx` kullanıcı çalışmasıdır; ilgisiz commit'lere alınmaz.

## Kurallar özeti

Referans günü 2026-10-31: DB'ye ulaşmamış olay/kuyruk/log yeniden oynatılmaz; öğrenci kayıtları, soru kimlikleri ve içerik karar geçmişi korunur. Push ve dış dağıtım yalnız açık talimatla. Geçerli kanıtı sebepsiz tekrarlama.
