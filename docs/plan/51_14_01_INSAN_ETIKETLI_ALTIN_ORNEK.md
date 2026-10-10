# 14.01 — İnsan etiketli altın örnek

**Durum:** YAPILACAK (200/200 geçici pilot kabulü; insan onayı 0/200) · **Tarih:** 2026-10-09 · **Girdi:** [10.01 taksonomi](25_10_01_TAKSONOMI_VE_ORNEK.md), [12.02 kaynak sözleşmesi](22_12_02_SORU_KAYNAK_SOZLESMESI.md).

## Hazırlanan örnek

`scripts/altin-ornek-kuyrugu.py` mevcut OGM çıkmış soru kataloğundan 200 benzersiz TYT Türkçe sorusunu deterministik seçer ve `ornek-veri/altin-ornek-inceleme-200.csv` üretir. Her satırda soru kimliği, kaynak konu/yıl, gerçek görselin kaynak köküne göre yolu ve SHA-256 özeti vardır. Yalnız tek A–E cevabı ve mevcut görseli olan kayıtlar alınır. Aynı konu içinde yıllar sırayla dolaşılır. Önerilen soru tipi mevcut `tyt-turkce-v1` taksonomisindeki izinli kodlardan seçilir, fakat **yalnız kaynak konu eşlemesine dayanır**. Sorunun içeriği üzerinden yapılmış insan kararı değildir.

| Kaynak konu | İnceleme sayısı | Uygun kaynak sayısı |
|---|---:|---:|
| Paragrafta Anlam | 62 | 134 |
| Paragrafın Yapısı | 32 | 38 |
| Sözcükte Anlam | 30 | 33 |
| Cümlede Anlam | 28 | 28 |
| Yazım Kuralları | 18 | 18 |
| Noktalama İşaretleri | 18 | 18 |
| Cümlenin Ögeleri | 12 | 12 |
| **Toplam** | **200** | **281** |

Yedi sınıfın hepsinde örnek vardır; küçük sınıflar kaynak sınırına kadar alınmıştır. Eşit sınıf dağılımı bu yedi sınıfla 200 benzersiz soruda mümkün değildir: en küçük sınıf 12 sorudur. Bu nedenle örnek **kapsam bakımından dengelenmiş fakat sayıca eşit değildir**. 14.03 doğruluk raporu genel ağırlıklı sonucu sınıf bazlı sonuçla birlikte vermelidir; küçük sınıfın belirsizliği gizlenmemelidir. Daha geniş ders/konu dengesi için yeni izinli taksonomi ve ayrı örnek gerekir.

## İnsan incelemesi ve kabul kapısı

CSV'de `allowed_question_type_codes` sütunu izinli etiketleri, `suggested_question_type_code` yalnız inceleme önerisini taşır. İnceleyen kişi gerçek `source_image` dosyasını açıp soru kökü, şıklar ve varsa şekli görür. `reviewed_question_type_code` alanına yalnız izinli bir kod yazar; gerekçeyi `review_evidence` alanına sorudaki ayırt edici kanıt olarak kaydeder. `reviewer_id` ve UTC saatli `reviewed_at_utc` (ör. `2026-10-09T18:00:00+00:00`) doldurulur. Belirsiz veya taksonomi dışı soru için `review_status=uncertain` ya da `rejected` ve açıklayıcı `review_note` kullanılır; tahmini onay yazılmaz. Onay yalnız `review_status=approved` ile sayılır. Başka bir kişi veya süreç öneriyi görmeden etiketleyebiliyorsa, altın veri kalitesi için bu yöntem tercih edilir; mevcut CSV öneriyi gösterdiğinden bağımsız kör etiketleme kanıtı değildir.

```powershell
$env:PYTHONIOENCODING='utf-8'
D:\workspace\ivme\.venv\Scripts\python.exe -W error scripts\altin-ornek-kuyrugu.py --check
```

`--check`, kaynaklardan deterministik seçim ve kaynak alanlarını yeniden hesaplar; 200 benzersiz kimliği, yedi kota dağılımını, görsel checksum'larını, izinli kodları ve onay satırlarında inceleyen/zaman/kanıt alanlarını doğrular. `--write` kuyruğu sıfırdan üretir ve **mevcut insan incelemesini siler**; inceleme başladıktan sonra kullanılmaz. Kaynak görsel değişirse kontrol reddeder, yeni inceleme gerekir. CSV öğrenciye veya `question_taxonomy` tablosuna otomatik yüklenmez.

**İlk kanıt:** Kuyruk üretildi; `--check` 200 benzersiz, 0 onay, 200 bekleyen satırla geçti.

**2026-10-09 kullanıcı kararı:** Kullanıcı 200 etiketi şimdi kabul edip daha sonra soruları tek tek manuel incelemek istedi. Bunun üzerine 200 satır `provisional` yapıldı; `reviewer_id`, `reviewed_at_utc`, `reviewed_question_type_code` ve `review_evidence` boş bırakıldı. `--check` 200 geçici, 0 insan onayı sonucunu verdi. Bu kabul yalnız **pilot hazırlığı içindir**; altın veri, insan onayı veya öğrenci yayını değildir. 14.02'nin yerel inceleme ekranı hazırlığı bu kararla öne alındı. [14.02 kaydı](52_14_02_AI_TASLAK_VE_INCELEME.md) arayüzün sınırlarını tutar.

**14.01 ancak** 200–500 satır gerçek insan tarafından incelenip onay/ret/belirsizlik kararları kaydedildiğinde ve altın küme için yeterli onaylı sınıf dağılımı denetlendiğinde `BITTI` olur. `--write` bu kararları sileceği için manuel inceleme başladıktan sonra kullanılmaz. Canlı DB etkisi yoktur.

**AI ön inceleme kararı (2026-10-09):** Kullanıcı manuel incelemeyi daha sonraya bırakıp 200 soruya ayrı AI notu eklenmesini istedi. `ai_` ile başlayan sütunlar modelin tipi, görsel gerekçesi, sürümü ve insan inceleme önceliğini taşır. Bunlar `reviewer_id`, `review_status=approved` veya insan altın etiketinin yerine geçmez. Ayrıntı ve ölçümler [14.03 kaydında](53_14_03_DOGRULUK_MALIYET_OLCEK.md) bulunur.
