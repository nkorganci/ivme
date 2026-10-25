# Çalışma bağlamı

Bu dosya yalnız güncel kaynakların yerini gösterir. Etkin ve yarım iş [devir notunda](00_DEVAM.md), açık işler [yol haritasında](00_YOL_HARITASI.md), kalıcı davranış [sistem rehberinde](00_SISTEM_REHBERI.md) ve [teknik sözleşmelerde](../README.md) bulunur. Sayısal durumu belgeden varsayma; `python scripts/ivme.py durum` ve ilgili DB/raporla doğrula.

| Konu | Tek kaynak veya giriş |
|---|---|
| Çalışan katalog ve kategori | PostgreSQL `learning_catalog.current_run`, `current_categories`; `GET /api/learning-resources/metadata` |
| Müfredat ve kontrollü kimlikler | `backend/src/main/resources/content-taxonomy.json`; Excel'in ilk `KONULAR` sayfası; [kimlik kuralları](rehber/03_kimlikler-ve-sayim.md) |
| Zorluk, beceri, sınıf ve içerik türü | `backend/src/main/resources/review-vocabulary.json` |
| Kaynak ve etiket ilişkileri | [ortak etiket sözleşmesi](../ORTAK_ETIKET_KAPSAMI.md), [v2 şeması](sema/learning-resource-v2.schema.json) |
| İnsan kararı ve geçmişi | `content_reviews`, `content_review_history`; [kanıt ve onay](rehber/04_kanit-ve-onay.md) |
| Üretim çıktısı ve fark denetimi | `veri/content-labels/`, `scripts/content-label-reconcile.py`; [üretim akışı](rehber/05_uretim-ve-yeniden-baslama.md) |
| API ve roller | [API/mimari](../API-ve-mimari.md), [kullanıcı yönetimi](rehber/09_kullanici-yonetimi.md) |

Kaynaklar çelişirse kodu, yayımlanmış sürümü ve kanıtı karşılaştır; belgeyi tek başına tamamlanma kanıtı sayma. Üretilmiş kimlik projeksiyonunu elle değiştirme; üretim kaynağında düzelt. Önceden işlenmiş kaynak/hash için çıktıyı yeniden kullan.
