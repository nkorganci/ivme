# Denetimler

[Mimari dizini](README.md) · Ne zaman okunur: Hangi betik neyi denetler.

## Tekrarı ve hatayı yakalayan denetimler

| Amaç | Komut / kanıt |
|---|---|
| JSON/DB/API ve fiziksel kaynak farkı | `scripts/content-label-reconcile.py --dev-login`; salt okunur içerik karşılaştırması; yerel dev oturumu LOGIN olayı ekleyebilir |
| Tekil kaynak ve işleme farkları | `scripts/content-label-workset.py`; başarılı aynı sürüm uzlaştırmasını ister |
| Kontrollü sözlük, eski kimlik, döngü ve alias | `node scripts/content-taxonomy-check.mjs --check`; `testler/content-taxonomy.mjs` |
| Kaynak/konum sözleşmesi | `node scripts/learning-resource-check.mjs`; `testler/learning-resource-contract.mjs` |
| Kaynak kapsamı, inceleme kuyruğu ve örneklem | `scripts/content-label-audit.py`; `veri/content-labels/audit.json` |
| Soru sürümleri, eski araştırma, not örnekleri | `scripts/question-label-check.py`; `testler/question-label-check-test.py` |
| Yanlış görev/eksik yerel bağlantı/eski devam noktası | `scripts/plan-check.py`; `testler/plan-check-test.py` |
| Kesinti/bozulmuş çıktı/önbellek ve sayfa ayrımı | `testler/content-pipeline-test.py` |
| API rolü, etkin öğretmen etiketi, konum ve sızıntı | `ContentReviewFlowTest`, `LearningResourcesFlowTest`; ayrı test DB |
| Tarayıcı, filtre ve mobil görünüm | `testler/learning-resources-ui.mjs`; `npm run build` |

Python komutlarında projenin `..\.venv\Scripts\python.exe -X utf8 -B` yorumlayıcısı
kullanılır. Büyük çıktı, sır ve kaynak arşivleri Git'e eklenmez. Raporların kendisi,
özgün dosyalar, DB ve öğretmen kararları uygun yedek kapsamına ayrı ayrı alınır.
Gerçek telefon, dış ağ, bağımsız fiziksel yedek ve gerçek öğretmen incelemesi
yalnız sentetik test sonucuyla tamamlanmış sayılmaz.

Kullanıcı bu çalışma için aynı fiziksel diskte yerel yedeği seçmiştir.
`D:\workspace\ivme-yedekleri` uygulamanın ve yedeklenen kaynak köklerinin dışında
tutulur; bağımsız disk/ağ yolu beklemek bu tercihin ön koşulu değildir.
`scripts/ivme-yedek-provasi.py --destination D:\workspace\ivme-yedekleri --allow-same-disk`
komutu, PostgreSQL'in dışa aktarılan salt okunur anlık kaydını `pg_dump` ile
paylaşır. Geri yükleme yalnız yeni üretilen `ivme_restore_probe_*` veritabanına
ve yedek altındaki `restore-probe` klasörüne yapılır. Gerçek uygulama/test DB'si
silinmez veya geri yükleme hedefi yapılmaz. Tablo/görünüm sayıları, seçili satır
parmak izleri, arşiv ve geri yüklenen dosya SHA-256 değerleri doğrulanır.
`manifest.json`, dosya denetim listeleri ve `verification.json` gerçek kanıttır;
aynı disk sonucu bağımsız fiziksel yedek olarak adlandırılmaz.
Öğrenci/öğretmen kayıtları DB yedeğine dahildir; yedekler Git'e alınmaz.

Yedek kapsamı eski TYT/AYT görsellerinin yanında etkin `resimler-pilot` kökünün
tamamını (OGM, kırpılmış ve onarılmış görseller dahil), kaynak PDF'lerini, etiket
sürümlerini ve kaynak metadatasını içerir. Ağ hedefinde fiziksel disk numarası
bilinmiyorsa ayrı fiziksel disk doğrulandı yazılmaz; ağ hedefi ayrıca kaydedilir.
Yerel makinenin UNC paylaşımı bağımsız hedef sayılmaz. Sınırlı rol kurulumunda
ortak katalog/araştırma şemaları okunabilir; katalog şemasında uygulama yalnız `question_intake`
kabul tablosuna yazabilir, katalog yayını ve Flyway ayrı yetkili çalışma gerektirir.

API ayrıntıları [mimari belgesinde](../sozlesmeler/api.md), etiket üretim sözleşmesi
[ortak etiket kaydında](../sozlesmeler/ortak-etiketler.md), öğretmen akışı
[öğretmen doğrulamasında](../sozlesmeler/ogretmen-dogrulamasi.md) tutulur.
