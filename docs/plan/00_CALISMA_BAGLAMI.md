# İvme — çalışma bağlamı

Bu dosya **kalıcı kuralları ve güncel sürüm dayanaklarını**
tutar; kısa kalır. Etkin/yarım iş ve devir notu [00_DEVAM.md](00_DEVAM.md) dosyasındadır.
Tarihli iş dökümü buraya yazılmaz; kanıt commit mesajında ve sürümlü rapor dosyasında
kalır; eski ayrıntılar `git log -p -- docs/plan/00_CALISMA_BAGLAMI.md` ile görülür.

## Güncel dayanaklar

Değer değiştiğinde yalnız ilgili satır güncellenir; eski değer commit geçmişinde kalır.

| Alan | Güncel değer |
|---|---|
| Çerçeve sürümü | `2026-10-25-devir-dosyasi` |
| Yerel ortam | Tek uygulama `D:\workspace\ivme\uygulama`, dal `main`, `http://localhost:1010`, DB `ivme`. Cloudflare bu adresi sunar; `my-jenkins` durdurulmuş kalır. Kaynak izleyicisi açık |
| Yayımlanmış katalog | `learning_catalog.current_run` = `labels-v1-cbca1ff6f1bdc5c68c32e54a`. Son yayın KPSS Ortaöğretim kataloğudur. Değişince `python scripts/ivme.py durum` ile doğrula |
| Müfredat | Excel'in yalnız ilk KONULAR sayfası: 453 satır, 14 ders, 146 ünite, 530 seçilebilir sınav–konu kimliği (178 TYT / 352 AYT). Matematik/Geometri ve Türkçe/Edebiyat ayrıdır |
| Soru kapsamı | Öğrenciye görünen 80.094 sorunun (OGM 77.533 + çıkmış 2.561) hepsi ≥1 Excel konusuna bağlı; 7.222'si `CANDIDATE` + öğretmen onayı bekliyor (07.02). 168 arşiv sorusu `system.*` etiketinde |
| KPSS | Ortaöğretim (14.01) yayımlandı: 1.260 soru, 85 konu. Diğer türler [14. adımda](14_KPSS.md) |
| PDF envanteri | 2.708 katalog kaydı PostgreSQL'de (V77); 2.697 açılabilir, 10 yalnız video, 1 dosya yok |
| Ortak sözlük/ad/konum sözleşmesi | Sözlük `taxonomy-v1-28273703f3dfd4b69551d319`; `learning-resource-v2`. Bütün branşlar `canonicalUnit/canonicalTopicIds/order/selectable/estimatedGrades` alanlarıyla aynı sözlüktedir. `gradeStatus=ESTIMATED` öğretmen onayı değildir |
| Açık adımlar | 7 (07.02), 12 (12.01), 14 (14.02–14.06). 13 yalnız tasarım önerisidir; ayrı uygulama talimatı bekler |
| Bilinen test hataları | [testler/bilinen-hatalar.md](../../testler/bilinen-hatalar.md); listede olanı yeniden araştırma |

Her oturumun başında bu alanları gerçek dosya/rapor/API durumu ile karşılaştır. Tamamlandığı kanıtlanmayan işi kapanmış sayma. Yarım iş varsa yeni iş başlatmadan devam et; bağımsız işi yapmaya devam edebilirsin. Kullanıcının yeni talimatı önceliklidir.

Okunamayan/boş adayda alternatif çıkarım/OCR
yöntemini dene; sonuç alınamazsa kaynak ve sayfayı `Boş/okunamayan — manuel
inceleme` durumuyla koru. Bu kayıtlar otomasyonu veya sonraki entegrasyonları
bekletmez. İşleyen yöntem ve önbellek anahtarı sistem rehberinde kaydedilir.
İnsan incelemesi yapılmış gibi onay yazılmaz; manuel işaretli kaynak ile
tamamlanmış teknik işi ayırarak sıradaki işi uygula.

## Ortak referans kayıtları

| Bilgi | Şimdiki dayanak / kullanım |
|---|---|
| Genel sıra ve kapsam | [00_YOL_HARITASI.md](00_YOL_HARITASI.md) |
| Kalıcı sistem kurgusu ve tekrar önleme | [00_SISTEM_REHBERI.md](00_SISTEM_REHBERI.md); kullanıcı isteğiyle korunur, görev listesi değildir; sistem değişince güncellenir |
| Yapılacak işin tanımı | Yalnız seçilen numaralı adım dosyası |
| Etkin yayımlanmış kategori kimlikleri | PostgreSQL `learning_catalog.current_run/current_categories`; salt okunur API `GET /api/learning-resources/metadata` |
| Yerel üretilmiş sözlük ve ilişkiler | `veri/content-labels/labels.json`; büyük dosyanın yalnız ilgili branş/kategori parçasını oku |
| Diğer kontrollü etiket boyutları | `backend/src/main/resources/review-vocabulary.json` |
| Müfredat/sınav/ders/ünite/konu | Excel’in yalnız ilk KONULAR sayfası → `content-taxonomy.json` → PostgreSQL `current_categories`; `frontend/src/curriculumReference.js` yalnız metadata projeksiyonudur |
| Kaynak ve karar kanıtları | `veri/content-labels/report.json`, `audit.json`, `source_research`, `content_reviews/content_review_history` |
| Sürüm/fark doğrulayıcısı | `scripts/content-label-reconcile.py`; kullanım ve kapsam [ortak etiket kaydında](../ORTAK_ETIKET_KAPSAMI.md); denetim içerik doğruluğu onayı değildir |
| Kaynak kimliği ve işlem farkları | `scripts/content-label-workset.py`; sürümlü `veri/content-labels/inventory/<runKey>-<zaman>/report.json`, `resources.jsonl`, `gaps.jsonl`; uzak video erişimi bilinmiyorsa `REMOTE_NOT_CHECKED` |
| Tek sözlük üretim kaynağı | `backend/src/main/resources/content-taxonomy.json`; `scripts/content-taxonomy.mjs`, `scripts/canonical-units.mjs`; `taxonomy-v1-28273703f3dfd4b69551d319`. Üretilmiş kimlik projeksiyonu elle değiştirilmez; çalışma anında DB metadata kullanılır |
| Etiket/konum/adlandırma sözleşmesi | `docs/plan/sema/learning-resource-v2.schema.json`; `scripts/learning-resource-contract.mjs`, `learning-resource-check.mjs`; ad/konum sunumu `frontend/src/resourceMetadata.js` |

Kaynaklar uyuşmazsa birini sessizce doğru ilan etme: 01.01 fark raporunu ve güncel kaynak sürümünü kullan. Üretilen JSON dosyaları elle düzeltilmez; değişiklik üretim kaynağında yapılır. Her branş için ayrı sözlük açılmaz. Ders ve alt kategoriler prompt içinde yeniden icat edilmez; kayıtlı kimliklerden seçilir.

## Kalıcı etiket, kaynak ve adlandırma kuralları

Bu bölüm adım dosyaları silindikten sonra da geçerlidir. Hedef veri sözleşmesidir; bu kuralların burada yazması uygulamada tamamlandığı anlamına gelmez. Kesinleşen şema/üretici yolları yukarıdaki referanslara eklenir; bütün ayrıntılar tekrar buraya kopyalanmaz.

- Tek kontrollü sözlük: sabit kategori kimliği, Türkçe görünen ad, üst/alt ilişki, branş ve sınav kapsamı. Eş adlar alias ile çözülür; ad değişince kimlik değişmez.
- Tek kaynak kaydına çok sayıda kategori ilişkisi bağlanabilir; her ilişki kendi kanıtını, güvenini ve kaynak aralıklarını taşır. `PRIMARY/SECONDARY/PREREQUISITE`, aday/kesin kapsam ve öğretmen onayı ayrı bilgilerdir.
- Her kaynak en az bir etiket alır. Kanıt yetersizse bilinen en geniş kapsam ve düşük güven; kapsam da bilinmiyorsa kontrollü inceleme etiketi kullanılır. Rastgele dar konu atanmaz.
- Güven `LOW/MEDIUM/HIGH` ve kısa gerekçeyle tutulur; OCR okunabilirliği, konum doğrulaması ve öğretmen onayı ayrı değerlendirilir. Kaynak/sözlük değişince etkilenen karar yeniden incelemeye gider; geçmiş karar korunur.
- PDF: fiziksel 1 tabanlı başlangıç/bitiş sayfası, ikisi de dahil. Basılı sayfa numarası ayrıca tutulur. Kesintili konu bölümleri ayrı aralıklardır; aralık sayfa sayısını aşmaz.
- Video: başlangıç dahil/bitiş hariç saniye aralığı; `0 ≤ başlangıç < bitiş ≤ süre`. Ekranda `HH:MM:SS–HH:MM:SS` gösterilir. Soru için kod/PDF sayfası/kırpım; not için sabit bölüm ve destek kaynağı ayrı tutulur.
- Konum durumları: `MISSING/NOT_APPLICABLE/ESTIMATED/VERIFIED`. Okunamayan kaynağa sayfa veya dakika uydurulmaz; erişim ve eksiklik nedeni saklanır.
- Özgün başlık/dosya adı ve kalıcı kimlik korunur. Ortak görünen ad: `Sınav | Branş | Konu | Alt konu(lar) | Kaynak/Hoca | İçerik türü`. Boş alan/ayraç atlanır; tahmini kapsam açıkça belirtilir.
- Çok konulu kaynakta bütün ilişkiler metadatada kalır; geniş kaynak için “Karma konular” ve tam etiket listesi kullanılır. Konuya özel referans, kaynak adının yanında kendi sayfa/zaman aralığını gösterir.
- Fiziksel dosyalar etiket değişince yeniden adlandırılmaz. İndirme adı okunur slug ve kısa kalıcı kimlikten türetilebilir; asıl video başlığı/URL'si korunur. Taşıma gerekirse yol manifesti, hash ve referans güncellemesiyle ayrı yapılır.
- Sayımlar tekil kaynak/soru kimliğine dayanır; çoklu etiket öğrenci olayını çoğaltmaz. İlk deneme ve geçmiş etiket sürümü korunur. Etiket güncellemesi cevap anahtarını veya öğrenci geçmişini sessizce değiştirmez.
- Önce mevcut çıktı/hash önbelleği ve kurallar, sonra gerekli sayfada OCR; yalnız belirsiz bölümde AI. Yeni kaynaklar da aynı sözlük, adlandırma ve konum doğrulamasından geçer.

## Her prompt için çalışma protokolü

1. `AGENTS.md`, [00_DEVAM.md](00_DEVAM.md), bu dosya ve gerekiyorsa yol haritası ile seçilen adımı oku. `python scripts/ivme.py durum` git, izleyici, katalog ve devir özetini tek seferde verir. Sistem rehberinin yalnız ilgili bölümünü aç.
2. Görevin hâlâ açık olduğunu kanıtlarla kontrol et. Zaten kapanmışsa yeniden üretme; plandaki eski maddeyi kaldır, devir dosyasını düzelt ve istenen adım içindeki ilk açık işe geç.
3. Başlarken etkin görev kimliğini devir dosyasına yaz. Önceki yarım grubun çıktı/checkpoint yolunu kullan; tüm içeriği yeniden okuma.
4. Tekrar eden iş için önce `scripts/ivme.py` alt komutunu veya [docs/islemler](../islemler/README.md) içindeki işlem tarifini kullan; tarif yoksa ve iş tekrar edecekse tarifi ekle. Şema, alias, adlandırma ve kaynak aralığı kurallarını tek kaynaktan al.
5. Yalnız görev kapsamındaki değişikliği yap, ilgili denetimi çalıştır ve kanıtı küçük rapora veya commit'e bağla. Kaynaklar ve öğrenci/öğretmen geçmişi korunur. Bir grup bitti diye bütün adımı tamamlanmış sayma.
6. Her anlamlı adımın sonunda devir dosyasını güncelle ve yerel commit at; böylece başka bir AI kaldığın yerden sürdürebilir. Sistem değiştiyse rehberin ilgili bölümünü, sürüm değiştiyse bu dosyanın “Güncel dayanaklar” satırını aynı işte güncelle.
7. Son kapanan iş için devir dosyasında yalnız tek satır ve commit/rapor bağlantısı tut. Ayrı “yapılanlar” ve “eksikler” listesi açma.

Tamamlanan adımın kabul ölçütleri doğrulanınca önce kalıcı kararları ilgili teknik belge/sözlük/şemaya aktar, bu dosyadaki sürüm/kanıt referanslarını güncelle; sonra adımın `.md` dosyasını sil. Tamamlanan adım için kısa özet dosyası veya arşiv klasörü bırakma. Yol haritasındaki satırını kaldır; kalan adımların bağımlılıklarını ve silinen dosyaya giden bütün bağlantıları güncelle. `01` bittiğinde kalan ilk dosya `02` ve başlığı “2. Adım” olarak kalır; hiçbir adımı veya alt görevi yeniden numaralama. Yarım adım silinmez. `00_` belgeleri, kullanılan teknik belgeler, şemalar ve gerçek çıktılar kalıcıdır.

## Kopyalanabilir prompt

Adım dosyalarının sonundaki “Kopyalanacak prompt” doğrudan kullanılabilir. Claude ile Codex arasında geçerken veya sıradaki işe devam etmek için yeterli olan kısa sürüm:

```text
İvme'de devam et: docs/plan/00_DEVAM.md'deki yarım işe, yoksa sıradaki göreve.
```

Uzun sürüm gerekmez; kurallar `AGENTS.md` ve bu dosyadadır. Süreklilik sohbet geçmişine değil, devir dosyasına, commit'lere ve sürümlü çıktılara dayanır.
