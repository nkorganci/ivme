# 12.05 — OGM kart kaynak/konu kimliği ve artımlı katalog

**Durum:** BITTI (kaynak denetimi ve küçük doğrulanmış bağ örneği) · **Tarih:** 2026-10-09 · **Girdiler:** [OGM kaynak hedefi](15_OGM_PDF_VE_KONU_SORU_BAGI.md), [10.01 taksonomisi](25_10_01_TAKSONOMI_VE_ORNEK.md), [12.04 taraması](24_12_04_TOPLU_IS_VE_HATA_RAPORU.md).

## Artımlı denetim

`scripts/ogm-kaynak-bagi-denetle.py` mevcut indirme `katalog.json` dosyasıyla düzenli `ogm-sorular/kayit/*.json` kartlarını **göreli PDF yolunda tam eşleşme** ile karşılaştırır. PDF yolu izinli kaynak kökünde çözülür; mutlak/yukarı çıkan veya PDF olmayan yol reddedilir. Kaynak kimliği normalize göreli yoldan sabit `ogm:<hash>` kodudur; dosya sürümü ayrı SHA-256'dır. Katalog kimlikleri kanıt olarak saklanır, aynı yola birden fazla kimlik düşerse bağ incelemeye ayrılır. Kart dosyası/PDF/katalog/taksonomi/betik SHA-256 özetleri girdi parmak izine girer. Değişmeyen çıktı `--resume` ile atlanır, değişen kaynak yeniden incelenir. Çıktı atomik olarak yalnız Git dışı `uygulama/veri/ogm-kaynak-bagi/` altına yazılır; kaynak veya öğrenci DB'si değişmez.

```powershell
D:\workspace\ivme\.venv\Scripts\python.exe scripts\ogm-kaynak-bagi-denetle.py --sample --resume
D:\workspace\ivme\.venv\Scripts\python.exe scripts\ogm-kaynak-bagi-denetle.py --all --limit 237 --resume
```

Her kaynakta ilk iki kartın `sayfa` alanı açılır; soru metninin normalize ilk 60 harfi belirtilen PDF sayfasında aranır. Bu **sayfa düzeyinde bağ kanıtıdır**, tam kırpım veya cevap anahtarı onayı değildir. TYT Türkçe'de kaynak `konu_basligi` başlığı 10.01 alt konu adıyla tam eşleşir ve sayfa kanıtı varsa alt konu kodu `source_header_and_pdf_page_text` kanıtıyla bağlanır; belirsiz başlık/sınav/ders `null` kalır. `sources/*.json` içinde tüm kart kimlikleri, dosya özetleri ve örnek kanıtları bulunur. `summary.json` sayımları, `errors/*.json` işleme hatalarını taşır.

Soru Bankası'nın `sb.json` kayıtlarında kart başına PDF yolu bulunmaz. `sb_katalog.json` 240 **HTML'den türetilmiş PDF** listeler; 24.809 kart bunlara ada bakılarak bağlanmadı. `sb_review_groups.json` kartları ders/sınıf/üniteye göre 177 `needs_source_link` grubuna ayırır; ilk beş kimlik ve kaynak dosya checksum'larıyla incelemeye sunar. Özgün HTML kökeni ve PDF sayfası ayrıca doğrulanmadan öğrenciye PDF–soru geçişi açılmaz.

## Doğrulama sonucu

| Ölçü | Sonuç |
|---|---:|
| İndirme kataloğu girdisi | 2.487 (10'unda PDF yolu yok) |
| Düzenli kart dosyası / toplam soru kimliği | 237 / 54.227; kaynaklar arası tekrar yok |
| Tekil katalog yolu eşleşmesi | 231 dosya |
| Katalogda olmayan kaynak | 2 çevrim içi deneme PDF'si |
| Çoklu katalog kimliği | 4 Mini Deneme PDF'si |
| İlk iki karttan sayfa metni eşleşmesi | 451 / 472 incelenen kart |
| Sayfa kanıtı eksik | 15 metin uyuşmadı, 6 metin 60 harften kısa |
| Başlık + sayfa kanıtlı TYT Türkçe alt konu bağı | 6 kart, `tyt.turkce.sozcuk` |
| Soru Bankası kaynağı belirsiz | 24.809 kart / 177 inceleme grubu |

Beş farklı ailelik küçük örnekte 10/10 ilk kart metni PDF sayfasında bulundu; 3 Adım, Dört Dörtlük ve MEBİ TYT Türkçe'nin altı kartı “Sözcükte Anlam” alt konusuna başlık ve sayfa metniyle bağlandı. YKS Kampı Testi'nde `konu_basligi` yok, Mini Deneme PDF'sinin katalog kimliği çift; bu kartlara konu kodu verilmedi. Tam taramada `mn-test-04` boş kart listesi ayrıca raporlandı. **451 eşleşme, tüm 54.227 sorunun PDF sayfasının doğrulandığı anlamına gelmez**; kaynak başına yalnız ilk iki kart kontrol edildi. Sayfa metni olmayan taramalar OCR ve insan incelemesi gerektirir.

**Test:** `--sample` sonucu 5 kaynak/10 sayfa eşleşmesi/6 konu bağı, ikinci çalışmada 5/5 atlama. `--all --limit 20` sonucu ikinci çalışmada 20/20 atlama. Tam 237 kaynakta sıfır işleme hatası; ikinci çalışmada 237/237 atlama, aynı sayımlar ve boş çapraz kimlik tekrarı. `python -W error` ile çalıştı. Öğrenci UI'si değişmedi; 07.08/13.05'te yalnız doğrulanmış bağlar kullanılmalı.
