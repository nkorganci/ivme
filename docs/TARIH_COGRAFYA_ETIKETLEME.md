# Tarih ve Coğrafya kaynaklı soru etiketleri

**Durum (13 Ekim 2026):** TYT/AYT etkin soru envanteri için kaynak izli etiket taslağı. Bu dosya ve üretilen CSV, ders notu veya öğretmen onayı yerine geçmez.

## Kapsam ve sonuç

`veri/sorular-tum.csv` ile `veri/sorular-ogm.csv` içindeki etkin Tarih ve Coğrafya soruları eşleştirildi. Çıktı `ornek-veri/etiketler/tarih_cografya.csv` dosyasındadır; özet `ornek-veri/etiketler/tarih_cografya_ozet.json` dosyasındadır. Soru metni, görseli ve çözüm metni dışarı aktarılmadı.

| Kaynak | Sınav | Ders (kaynak kaydındaki ad) | Sayı |
|---|---|---|---:|
| Çıkmış | TYT | Tarih | 45 |
| Çıkmış | TYT | Coğrafya | 45 |
| Çıkmış | AYT | Tarih-1 | 90 |
| Çıkmış | AYT | Tarih-2 | 99 |
| Çıkmış | AYT | Coğrafya-1 | 54 |
| Çıkmış | AYT | Coğrafya-2 | 99 |
| OGM | TYT | Tarih | 4.038 |
| OGM | TYT | Coğrafya | 3.358 |
| OGM | AYT | Tarih | 3.789 |
| OGM | AYT | Coğrafya | 4.003 |
| **Toplam** | | | **15.620** |

Boş etiket: **0**. `Sınıflandırılmamış` etiket: **0**. İnceleme gerektiren: **6.992**. Bu son sayı, bir etiketin var olması ile ders notu yazmaya yetecek doğruluktaki konu kimliğinin farklı şeyler olduğunu gösterir.

Bu sayılar yalnızca mevcut yerel CSV'lerdeki **etkin** kayıtlardır. AYT'nin `Tarih-1`, `Tarih-2`, `Coğrafya-1`, `Coğrafya-2` alanları özgün adlarıyla tutuldu. ÖSYM arşivindeki bütün yıllar ile bağımsız tamlık karşılaştırması bu etiket denetiminin kapsamında değildir.

## Kanıt sırası

| Kanıt türü | Kayıt | Uygulama | İnceleme |
|---|---:|---|---|
| `pdf_section_heading` | 8.628 | OGM PDF'den çıkarılan soruya bağlı bölüm başlığı. `source_file` ve `source_page` asıl PDF'yi gösterir. `- 1` gibi test seri numarası etiketten çıkarılır; ham başlık `source_heading` alanında kalır. | Soru metni mevcutsa otomatik kaynak eşlemesi yeterli görülür; ders notu yayımlanmadan pedagojik kontrol yine gerekir. |
| `ogm_learning_outcome` | 4.022 | OGM Soru Bankası kayıtlarındaki kazanım cümlesi. PDF olmayan bu kaynakta kayıt kodu `evidence_ref` içindedir. | **Her zaman gerekli.** Kazanımın sorunun dar kavramıyla aynı olması garanti değildir. |
| `existing_parent_topic` | 2.493 | Karma deneme/kamp testlerinde soru düzeyinde başlık bulunmadığında var olan üst konu kullanılır. | **Her zaman gerekli.** Geniş etiket bilinçli olarak korunur. |
| `legacy_subtopic_annotation` | 90 | TYT çıkmış sorularının önceki alt konu kaydı. PDF kitapçığı ve sayfa ayrıca tutulur. | **Her zaman gerekli.** Önceki etiket, PDF'nin basılı bölüm başlığı değildir. |
| `outgoing_catalog_topic` | 341 | AYT çıkmış sorularının kaynak kataloğundaki konu alanı. OGM derleme kitapçığı ve sayfa kaydı bulunur. | **Her zaman gerekli.** Konu alanı sorunun basılı başlığı değildir. |
| `official_pdf_question_text` | 1 | OGM derlemesinde bulunmayan 2019 AYT Tarih-1 soru 33; [ÖSYM resmî PDF'si](https://dokuman.osym.gov.tr/pdfdokuman/2019/YKS/TSK/ayt_yks_2019_web.pdf), PDF sayfa 11. | **Zorunlu.** Soru resmen iptal edilmiştir. |
| `question_text_anchor` | 45 | Kaynağı `Sınıflandırılmamış` olan OGM sorularında PDF'den çıkarılan metin, kısa anahtar sözcükle denetlendi ve konu önerisi yapıldı. | **Her zaman gerekli.** Metin eşleşmesi öğretmen kararı değildir. |

`confidence` değeri kanıtın konuya bağlanma gücünün **iş akışı tahminidir**; ölçülmüş doğruluk olasılığı değildir. `review_required=false` yalnızca doğrudan PDF bölüm başlığının soru kaydına bağlı ve metnin mevcut olduğu anlamına gelir; içerik onayı anlamına gelmez. `review_required=true` olan etiketler ders notu veya öğrenciye kesin konu önerisi üretmek için önce incelenmelidir.

Örnek kaynak uyuşmazlığı: `sb-10988` kaydının OGM kazanımı dış kuvvetlerden söz ederken soru metni kalıcı kar sınırından söz eder. Bu yüzden bütün kazanım etiketleri inceleme kuyruğundadır. Ayrıca `cd-2021-mini-deneme-2-01-23` soru kaydı **Tarih** olarak işaretli olduğu hâlde metni Japonya'nın nüfus politikaları hakkındadır. CSV'de kaynak dersi korunmuş, etiket metne göre verilmiş ve `possible_subject_error_geography_content_in_history_row` inceleme nedeni eklenmiştir. Asıl soru kaydı otomatik düzeltilmemiştir.

`2019-AYT-TDE-33` etkin soru kaydındaki cevap `E` olsa da [ÖSYM'nin 17 Temmuz 2019 duyurusu](https://www.osym.gov.tr/2019yks-yuksekogretim-kurumlari-sinavi-2019yks-sonuclari-aciklandi) 2019 AYT Türk Dili ve Edebiyatı-Sosyal Bilimler-1 testinin 33. sorusunu **iptal** etti. Soru OGM derleme PDF'sinde yoktur; eski kart metni [resmî ÖSYM PDF'sinin 11. sayfası](https://dokuman.osym.gov.tr/pdfdokuman/2019/YKS/TSK/ayt_yks_2019_web.pdf) ile doğrulandı. Etiket ``Tekâlif-i Milliye Emirleri`` olarak tutuldu, `official_status=cancelled` ve `official_notice_url` alanları dolduruldu; kullanıcıya geçerli cevaplı soru gibi sunulmamalıdır. Kaynak CSV ve soru veritabanı bu çalışma tarafından değiştirilmedi.

## Yeniden üretim ve denetim

Uygulama dizininde:

```powershell
python scripts/kaynakli_etiket_tarih_cografya.py
python scripts/kaynakli_etiket_tarih_cografya.py --check
```

`--check`, mevcut CSV/JSON çıktısını kaynak kayıtlarından yeniden hesaplayıp birebir karşılaştırır. Ayrıca altı çıkmış soru dersi dahil tüm hedef etkin kayıtların kapsanmasını, tekil kodları, yerel kaynak PDF/kayıt varlığını, 45 metin dayanağını ve sıfır boş etiketi kontrol eder. Yeni bir `Sınıflandırılmamış` kayıt eklenirse kaynak metnine dayanan inceleme adımı tanımlanana kadar işlem hata verir. ÖSYM PDF'si ve iptal duyurusu dış URL'lerdir; `--check` ağdan tekrar indirme yapmaz. Bu denetim, etiketlerin pedagojik doğruluğunu ölçmez.

Ek sayfa örneklemesinde PDF bölüm başlığına bağlı 24 kayıt incelendi. 23 sorunun normalize edilmiş ilk sekiz sözcüğü kayıtlı PDF sayfasında bulundu. `3a-ayt-tarih-11-05` kaydının başlangıcı görsel içindeki renk diyagramından geldiği için düz PDF metninde görünmedi; soru gövdesi ve seçenekleri aynı PDF sayfasında ayrıca bulundu.

AYT çıkmış sorulardan rastgele seçilen 24 yerel PDF bağlantısının tamamında metnin normalize edilmiş ilk sekiz sözcüğü kayıtlı sayfada bulundu. İptal edilen soru ise ayrıca resmî ÖSYM PDF'si ve iptal duyurusuyla kontrol edildi.

Yeniden üretim için yerel `veri/` ve uygulama üst dizinindeki `veri-hatti/` ile `kaynaklar/` ağaçları gerekir; büyük kaynak dosyalarının tamamı bu CSV çıktısının içine kopyalanmaz. `source_file` alanı bir soru dışında üst dizine göre yerel yoldur; iptal sorusunda resmî PDF adresidir.

CSV, var olan soru tablolarına veya veritabanına otomatik olarak yazılmaz. Ders notu üretiminde `evidence_ref`, `source_file`, `source_page`, `review_required` ve `review_reason` alanlarını birlikte kullanın; geniş ya da inceleme bekleyen etiketi kesin bilgi gibi sunmayın.
