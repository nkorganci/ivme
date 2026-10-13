# Kaynak taraması, örnek konu analizi ve araştırma hafızası

13 Ekim 2026. Kullanıcı sırası: menüdeki eksikleri gör; çıkmış soruları, OGM sorularını ve ders anlatımlarını birlikte incele; örnek konu analizinden genel konu/alt konu rehberine geç; ardından diğer branşları genişlet. Analiz, her sorunun altında tekrar eden notlar yerine **konuya ait soru kalıpları ve düşünme yolları** üretir.

## Taramada gerçekten yapılanlar

`scripts/analiz_kaynakli_sorular.py` bütün hedef etiket kayıtlarını özgün kaynak soruya bağlar. Kapsam, mevcut yedi branşın yerel etkin envanteridir; Matematik/Fizik veya ÖSYM arşivinin bağımsız tamlık denetimi değildir.

- **53.019** etkin kayıt: 1.656 çıkmış, 51.363 OGM; **19** ders/sınav grubu, **1.110** kaynak konu etiketi. Bunlar özgün etiketlerdir; birbirinin eş anlamlısı veya farklı ayrıntı düzeyi olabilir. 1.110 bağımsız pedagojik alt konu olarak sunulmaz.
- Kaynak kimliği eksik kayıt **0**. Çıkarılmış soru metni olmayan **5.756**, metni çok kısa/görsele bağımlı **36** kayıt vardır. Metni olan bir soruda bile grafik, şekil veya alt çizgi için ayrıca görsel inceleme gerekebilir.
- TYT Türkçe **4.093** kayıt: çıkarılmış metni olmayan veya çok kısa olan kayıt yoktur. AYT Edebiyat **7.476** kayıt: **960** metinsiz kayıt vardır. Özellikle bu 960 soru metinden incelenmiş sayılmaz.
- Seçilen temel ders anlatımları **22 OGM PDF'si / 2.403 sayfa**: istenen branşların MEBİ özetleri, AYT Mantık/Psikoloji/Sosyoloji ve Din Kültürü video notları. Bu sayı tüm OGM konu anlatımı kataloğunun tamamı değildir.
- Aynı soru farklı kitapçık kartlarında bulunabilir. Rapor her kaynak etiketi içinde normalize edilmiş okunabilir metin fingerprint'lerini ayrıca sayar. Bu sayı bütün veri kümesinde benzersiz soru sayısı değildir; şekillerin farklılığını metin özeti tek başına saptamaz.

Otomatik soru kökü taraması, soru parçasında geçen kelimeler yerine **istenen göreve ait aday kalıp** üretir. `patternCandidates` bir son karar veya insan onayı değildir; `karma-incelenmeli` / `kok-incelenmeli` kayıtları kalır. Bu aday sayıları öğrenciye sınavda çıkma olasılığı veya öğrenme önceliği olarak sunulmaz.

Çıktı: `ornek-veri/kaynakli-analiz-ozet.json`. Soru metinleri bu Git dosyasına kopyalanmaz. Sayfa ve soru metinlerinin özel yerel araştırma arşivi aşağıdaki veritabanındadır.

## Örnek analiz: TYT Cümlede Anlam

Kaynak etiketi **167 kayıt** içerir: **23 çıkmış + 144 OGM**. Hepsine aynı çözüm reçetesi yazmak doğru olmaz. Birleştirme etiketi gibi diğer kaynak başlıkları bu 167 sayısına ayrıca eklenmemiştir.

1. `TYT-0034` nesnel yargıyı arar. Öğrenci kişisel değerlendirmeyle gözlem/tanımı ayırır; bir bilginin çoğunlukça kabul edilmesini nesnellik ölçütü saymaz. OGM MEBİ Türkçe PDF **s. 19**, öznel/nesnel anlatım ayrımının dayanağıdır.
2. `3a-tyt-turkce-10-01` numaralanmış sözleri anlamlı ve kurallı cümle hâline sıralatır. Öğrenci bağlı söz gruplarını korur, yüklemi ve anlam bağını kurar; sırf cümle kulağa iyi geldiği için seçim yapmaz. Kaynak kaydındaki cevap A, yerel CSV ile karşılaştırılmıştır.
3. OGM MEBİ Türkçe PDF **s. 17**, neden, amaç ve koşul ilişkilerini ayrı gösterir. Bu ilişkilerde bağlaç ortak olabilir; aynı “için” sözcüğünü görünce otomatik etiket veya çözüm üretmek yerine yargıların ilişkisi incelenir.

Bu karşılaştırmadan konuya ait üç kalıp hazırlanır: **nesnellik**, **anlam ilişkisi**, **sıralama/bilgi koruma**. Mini düşünme örnekleri özgündür ve kaynak soruların kopyası değildir. Gösterilen örnek kaynaklar bütün alt kalıpların tüm sınav yıllarında tek tek doğrulandığı anlamına gelmez.

## Örnekten genel rehbere geçiş

Yeni arayüz tek seferde yalnız seçilmiş konuyu gösterir. Ders → kategori → konu → soru kalıbı seçilir. Her kalıpta kökü tanıma, düşünme mantığı, püf noktası, çeldirici ve özgün düşünme provası bulunur. Ardından konuya ait genel çözüm sırası ve özgün alıştırma gelir. Yanıt sonrası öğrenci kendi hatasının türüne göre kavrama, soru köküne veya uygulama adımlarına döner. Tek yanıttan öğrencinin tüm konuyu bildiği sonucu çıkarılmaz.

Şimdiki somut içerik: **21 konu rehberi / 44 kalıp / 42 karşılaştırılmış kaynak soru / 51 farklı PDF sayfa dayanağı**. TYT Türkçe'deki 16 plan başlığından **15**'ine rehber bağlandı; anlatım biçimleri ile düşünceyi geliştirme yolları aynı karşılaştırmalı rehberde ele alındığı için Türkçe'de 14 ayrı rehber vardır. **Sözel mantık** için kaynak dayanağı henüz doğrulanmadı; hazır gösterilmez. AYT Edebiyat ve sonraki altı branşta ilk rehberler vardır; kalan konu/alt konu incelemeleri açıktır.

Ana menüde **Analiz ve çalışma planı**, TYT/AYT'nin 19 kaynak grubunu ve temel PDF'lerini gösterir. Hazır konuya çalışma bağlantısı; henüz hazır olmayan AYT branşlarına gerçek kaynak ve hazırlık durumu verilir. Eksik rehbere sahte içerik eklenmez.

## Veritabanında tekrar kullanılabilir araştırma

Yerel `ivme` PostgreSQL veritabanında **`source_research`** şeması kullanılır. `V35__kaynakli_arastirma_arsivi.sql` bu şemanın idempotent DDL'sidir. Aktarım betiği yalnız bu DDL'yi uygular; başka bekleyen Flyway göçlerini, soru düzeltmelerini veya öğrenci akışlarını çalıştırmaz. Mevcut Flyway geçmişi elle değiştirilmez. Uygulama daha sonra V35'i gördüğünde aynı `IF NOT EXISTS` DDL'sini güvenle uygular.

- `runs`: girdi fingerprint'leri, sürüm, kapsam, öğrenciye sunulan JSON ve bu iki devir belgesinin tam metni. Aynı girdiye aynı araştırma anahtarı üretilir; aynı aktarım yeni kopya oluşturmaz. Girdiler değişirse önceki kayıt korunarak yeni sürüm eklenir.
- `documents`, `document_pages`, `run_documents`: 22 PDF'nin kurum adresi, yerel yolu, SHA-256 özeti ve 1 tabanlı sayfa metinleri. Metin çıkarıcısının sürümü ve raster görsel varlığı kaydedilir. Vektör çizim kontrolü rehberde kullanılan sayfalarda yapılır; diğerlerinde bu alan `NULL` (henüz kontrol edilmedi) kalır. **Metin çıkarımı veya çizim tespiti, şeklin yorumlandığı anlamına gelmez**; görsel inceleme durumu ayrı tutulur.
- `question_evidence`: 53.019 kaynak sorunun koleksiyon/kod kimliği, öneri etiketi, eldeki kaynak metni, metin/görsel checksum'u, PDF/kayıt referansları ve inceleme durumu. Metinsiz/görsele bağımlı sorular ayrı sorgulanabilir. Soru bankasının konu veya cevabı değiştirilmez.
- `topic_inventory`: 1.110 kaynak başlığı için sayım, belirsizlik ve kalıp adayları.
- `topic_guides`: 21 konu rehberinin kaynakları, 44 soru kalıbı, gerekçeler ve özgün alıştırmaları; durumları yalnız `DRAFT`.
- `observations`: doğrudan görüntü üzerinden yapılan inceleme notları. Bu devamda `TYT-0336` üzerindeki V işaretinin “tüm”, `TYT-0296` üzerindeki V işaretinin “işitilen” olduğu görselden ayrıca kontrol edildi. Bu iki kayıt asistan görsel incelemesidir; öğretmen onayı değildir.

Yerel arşiv, PDF/soru metinlerini içerir; öğrenciye sunulan JSON veya Git raporları bunların toplu tam metnini yayımlamaz. Görseller özgün dosya konumlarında kalır; SHA-256 ve yollarıyla izlenir. `veri/source-research/image-cache.json` değişmeyen görselleri tekrar hash'lememek için boyut/mtime/checksum önbelleğidir; `pdf-cache/` PDF checksum'u ve çıkarıcı sürümüne göre sayfa metinlerini yeniden kullanır. PDF'lerde şekil, ok, eksen veya alt çizgi gerekli olduğunda özgün sayfa/görsel açılmalı; OCR tek başına yeterli sayılmamalıdır.

```powershell
python -X utf8 scripts/kaynakli_arastirma_db.py --status
python -X utf8 scripts/kaynakli_arastirma_db.py --find "Cümlede Anlam"
python -X utf8 scripts/kaynakli_arastirma_db.py --write
python -X utf8 scripts/kaynakli_arastirma_db.py --export
```

`--write` tek işlemde tüm araştırma satırlarını ekler, soru bankasının kayıt/konu/cevap/aktiflik özetini önce ve sonra karşılaştırır. Parolayı komut satırına veya çıktıya yazmaz. `--export`, son sürümün öğrenci JSON'unu yeniden araştırma yapmadan geri yükler. `--find`, son sürümde konu rehberi, ilgili etiketli kayıt sayıları ve PDF sayfaları döndürür. Kalıcı son aktarım kimliği `veri/source-research/last-run.json` dosyasındadır.

## Yeni araştırmaya başlarken

1. Bu belgeyi ve [konu rehberlerinin durum kaydını](KAYNAKLI_DERS_NOTLARI.md) oku; `--status` ve `--find` ile eldeki kanıtı getir. Aynı kaynakları baştan sınıflandırma.
2. Kaynak checksum'u değişmediyse mevcut sayfa metni, soru referansı ve gözlem notunu kullan. Kaynak değiştiyse eski sonucu silmeden yeni sürüm oluştur.
3. Sonraki içerik sırası: Türkçe'deki doğrulanmamış Sözel Mantık ve kaynak etiketlerinde ayrı duran Sözcükte Yapı/Fiilde Çatı kapsamını denetle; AYT Edebiyatın kalan başlıklarını tamamla; ardından Tarih, Coğrafya, Felsefe, Din Kültürü, Biyoloji ve Kimya rehberlerini genişlet.
4. Metinsiz veya şekle bağlı sorularda önce görseli incele. İncelenmemiş kayıtları `SOURCE_LINKED` bırak; “analiz edildi” durumuna otomatik yükseltme. Uydurma çözüm veya öğretmen onayı oluşturma.

Tam kaynak envanteri taranmıştır; **bütün soruların insan düzeyinde çözüldüğü veya tüm konu rehberlerinin tamamlandığı iddia edilmez**. Araştırmanın yeniden kullanılabilir izi ile gerçekten hazırlanmış öğretim içeriği ayrı tutulur.
