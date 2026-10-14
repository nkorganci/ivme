# Kaynak taraması, örnek konu analizi ve araştırma hafızası

13 Ekim 2026. Kullanıcı sırası: menüdeki eksikleri gör; çıkmış soruları, OGM sorularını ve ders anlatımlarını birlikte incele; örnek konu analizinden genel konu/alt konu rehberine geç; ardından diğer branşları genişlet. Analiz, her sorunun altında tekrar eden notlar yerine **konuya ait soru kalıpları ve düşünme yolları** üretir.

## Taramada gerçekten yapılanlar

`scripts/analiz_kaynakli_sorular.py` bütün hedef etiket kayıtlarını özgün kaynak soruya bağlar. Kapsam, listelenmiş ders/sınav gruplarının etkin yerel envanteridir. TYT Fizik ve AYT Matematik/Fizik 14 Ekimde eklenmiştir; TYT Matematik dahil değildir. ÖSYM arşivinin bağımsız tamlık denetimi değildir.

- **68.944** etkin kayıt: 2.205 çıkmış, 66.739 OGM; **22** ders/sınav grubu, **1.215** kaynak konu etiketi. Bunlar özgün etiketlerdir; birbirinin eş anlamlısı veya farklı ayrıntı düzeyi olabilir. 1.215 bağımsız pedagojik alt konu olarak sunulmaz.
- Kaynak kimliği eksik kayıt **0**. Çıkarılmış soru metni olmayan **8.947**, metni çok kısa/görsele bağımlı **283** kayıt vardır. Metni olan bir soruda bile grafik, şekil veya alt çizgi için ayrıca görsel inceleme gerekebilir.
- TYT Türkçe **4.093** kayıt: çıkarılmış metni olmayan veya çok kısa olan kayıt yoktur. AYT Edebiyat **7.476** kayıt: **960** metinsiz kayıt vardır. Özellikle bu 960 soru metinden incelenmiş sayılmaz.
- Seçilen temel ders anlatımları **25 OGM PDF'si / 3.027 sayfa**: istenen branşların MEBİ özetleri, AYT Mantık/Psikoloji/Sosyoloji ve Din Kültürü video notları. Bu sayı tüm OGM konu anlatımı kataloğunun tamamı değildir.
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

Şimdiki somut içerik: **49 konu rehberi / 117 kalıp / 97 örnek bağı (96 farklı soru) / 146 farklı PDF sayfa dayanağı**. TYT Türkçe'deki 18 plan başlığından **17**'sine rehber bağlandı; ortak başlıklar nedeniyle Türkçe'de 16 ayrı rehber vardır. AYT Edebiyatın 17 dizin başlığı 16 giriş rehberine bağlıdır. Bu başlık kapsamı, her dönemin bütün sanatçı/eserlerinin veya bütün dar alt konuların tamamlandığı anlamına gelmez. **Sözel mantık** için kaynak dayanağı henüz doğrulanmadı; hazır gösterilmez. Tarih, Coğrafya, Felsefe, Din Kültürü, Biyoloji ve Kimya'da ikişer rehber vardır; diğer konu/alt konu incelemeleri açıktır. Fiilde Çatı yalnız uygun OGM sorusu ve PDF ile karşılaştırılmıştır; yerel çıkmış soru eşleşmesi bulunamadığı bilgisi arayüzde açıkça gösterilir.

Ana menüde **Analiz ve çalışma planı**, TYT/AYT'nin 22 kaynak grubunu ve temel PDF'lerini gösterir. Hazır konuya çalışma bağlantısı; henüz hazır olmayan AYT branşlarına gerçek kaynak ve hazırlık durumu verilir. Eksik rehbere sahte içerik eklenmez.

## Veritabanında tekrar kullanılabilir araştırma

Yerel `ivme` PostgreSQL veritabanında **`source_research`** şeması kullanılır. `V35__kaynakli_arastirma_arsivi.sql` bu şemanın idempotent DDL'sidir. Aktarım betiği yalnız bu DDL'yi uygular; başka bekleyen Flyway göçlerini, soru düzeltmelerini veya öğrenci akışlarını çalıştırmaz. Mevcut Flyway geçmişi elle değiştirilmez. Uygulama daha sonra V35'i gördüğünde aynı `IF NOT EXISTS` DDL'sini güvenle uygular.

- `runs`: girdi fingerprint'leri, sürüm, kapsam, öğrenciye sunulan JSON ve bu iki devir belgesinin tam metni. Aynı girdiye aynı araştırma anahtarı üretilir; aynı aktarım yeni kopya oluşturmaz. Girdiler değişirse önceki kayıt korunarak yeni sürüm eklenir.
- `documents`, `document_pages`, `run_documents`: 25 PDF'nin kurum adresi, yerel yolu, SHA-256 özeti ve 1 tabanlı sayfa metinleri. Metin çıkarıcısının sürümü ve raster görsel varlığı kaydedilir. Vektör çizim kontrolü rehberde kullanılan sayfalarda yapılır; diğerlerinde bu alan `NULL` (henüz kontrol edilmedi) kalır. **Metin çıkarımı veya çizim tespiti, şeklin yorumlandığı anlamına gelmez**; görsel inceleme durumu ayrı tutulur.
- `question_evidence`: 68.944 kaynak sorunun koleksiyon/kod kimliği, öneri etiketi, eldeki kaynak metni, metin/görsel checksum'u, PDF/kayıt referansları ve inceleme durumu. Metinsiz/görsele bağımlı sorular ayrı sorgulanabilir. Soru bankasının konu veya cevabı değiştirilmez.
- `topic_inventory`: 1.215 kaynak başlığı için sayım, belirsizlik ve kalıp adayları.
- `topic_guides`: 49 konu rehberinin kaynakları, 117 soru kalıbı, gerekçeler ve özgün alıştırmaları; durumları yalnız `DRAFT`.
- `observations`: **17** checksum bağlı gözlem (14 Ekimde 7 yeni görsel notu eklendi). Önceki iki görsel notu korunur; TYT-0289, OGM edebiyat 19-10, TYT Din 0002 ve sb-40141 görsellerindeki alt çizgi/sütun ilişkileri kontrol edildi. Edebiyat PDF 39 s. 26 ve 137 tabloları görüntüden okundu. OGM `mt-tyt-turkce-02-25` konu uyuşmazlığı ve `3a-tyt-biyoloji-16-02` cevap çelişkisi ayrıca saklanır. Gözlemler asistan incelemesidir; öğretmen onayı değildir. Kaynak metin/görsel veya PDF/sayfa checksum'u değişirse aktarım eski gözlemi geçerli saymayı reddeder.

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
3. Sözcükte Yapı ve Fiilde Çatı rehberleri eklendi; bunları yeniden sıfırdan inceleme. Türkçe Sözel Mantık açık kalır; yerel arşivde ve seçilen temel anlatımda doğrulanmış karşılaştırma bulunmadı. Sonraki sıra: Tarihte İlk Uygarlıklar/İlk Türk Devletleri, Coğrafyada konum ve Dünya hareketleri, Felsefede akıl yürütme/ahlak, Din'de din-ahlak, Biyolojide bileşikler/madde geçişleri, Kimyada etkileşimler/maddenin hâlleri. AYT branşlarının ayrı rehberleri ve Edebiyatın ayrıntılı alt konuları da açık iştir.
4. Metinsiz veya şekle bağlı sorularda önce görseli incele. İncelenmemiş kayıtları `SOURCE_LINKED` bırak; “analiz edildi” durumuna otomatik yükseltme. Uydurma çözüm veya öğretmen onayı oluşturma.

Tam kaynak envanteri taranmıştır; **bütün soruların insan düzeyinde çözüldüğü veya tüm konu rehberlerinin tamamlandığı iddia edilmez**. Araştırmanın yeniden kullanılabilir izi ile gerçekten hazırlanmış öğretim içeriği ayrı tutulur.

## Bu devamın somut sonuçları ve yeniden başlama noktası

- 23 yeni rehber ve 60 kalıp eklendi. Türkçe dil bilgisi dizinine eksik iki başlık eklendi; Edebiyatta biçim/tür, anlam ilişkisi, dönem/üyelik, anlatıcı/teknik ve yazar/eser ayrımları işlendi. Diğer altı branşta birer yeni konu hazırlandı.
- Başlığı `?baslik=` ile açan eski bağlantılar, artık rehberi hazırlanmışsa doğrudan o rehberi gösterir.
- `ornek-veri/kaynakli-arastirma-gozlemleri.json` tekrar kullanılacak inceleme notlarının sürümlenen girdisidir. İki uygunsuz kayıt için `excludeFromGuides` vardır; yayın üreticisi bu kayıtları örnek göstermeyi reddeder. Bu bir banka düzeltmesi değildir.
- Biyoloji `3a-tyt-biyoloji-16-02`: görselde I/II/III öncülleri D'yi destekler, yerel metin ve CSV anahtarı B'dir. Asistanın D önerisi kaynak cevabının yerine yazılmadı. Özgün kitapçık/cevap anahtarı ve branş öğretmeni incelemesi gerekir.
- PDF önbelleğinde yeni atıf verilen sayfalar için eksik vektör çizim tespiti tamamlanır. Veritabanı aynı checksum'lu sayfanın yalnız inceleme metadatasını zenginleştirir; eski metin ve kaynak sürümleri korunur. Çizim bulunması, görselin yorumlandığı anlamına gelmez.
- Fiilde Çatı rehberinde `past_question_not_found` + açıklama zorunludur. Diğer 48 rehberde iki koleksiyon da bulunur. Örnek sayısı sabit `rehber × 2` varsayımıyla hesaplanmaz.

Yeni salt okunur kanıt geri çağırma aracı, metni yeniden PDF'den çıkarmadan soruyu, cevap kaydını, görsel yolunu, checksum'ları ve inceleme notlarını getirir. Konu araması **kaynak etiketine göre** örnek döndürür; etiketin pedagojik doğruluğunu kendiliğinden kanıtlamaz. Her koleksiyona ayrı örnek sınırı uygulanır.

```powershell
python -X utf8 scripts/incele_kaynakli_arastirma.py --question TYT-0289 --bank CIKMIS
python -X utf8 scripts/incele_kaynakli_arastirma.py --topic "Fiilde Çatı" --subject Türkçe --limit 5
python -X utf8 scripts/incele_kaynakli_arastirma.py --pdf-page 39:137
```

Güncel aktarımın kimliği `veri/source-research/last-run.json` içindedir. Bu belge araştırma manifestine dahil olduğundan kendi güncel run anahtarı belgeye gömülmez. Ham soru/PDF metinleri ve yerel önbellek Git dışında kalır.

## 14 Ekim: sayısal kapsam devamı

TYT Fizik ve AYT Matematik/Fizik için 15.925 yeni kaynak referansı (549 çıkmış + 15.376 OGM) arşive bağlandı. AYT Kimya ve Biyoloji kayıtları önceki kapsamda zaten bulunuyordu; bunlara ayrı öğrenci rehberleri eklendi. AYT Türkçe görünen adı mevcut Edebiyat grubunu açar; kaynak branş kimliği değiştirilmez.

25, 32 ve 35 katalog numaralı OGM PDF'leri (624 sayfa) temel arşive eklendi. 30 ve 33 numaralı AYT Biyoloji/Kimya PDF'leri mevcut kayıtlardan kullanılır. Genel toplam 25 PDF ve 3.027 sayfadır. Matematik PDF metin çıkarımında MuPDF stitching-function uyarıları verdi; süreç tamamlandı. Rehberde kullanılan sayfaların metin dayanakları ayrıca yayın denetiminden, soru kesirleri ve grafikleri görsel incelemeden geçti. Diğer şekiller okunmuş sayılmaz.

Yeni derslerin her birinde ilk kaynaklı rehber ve kalan konuların dizini vardır; bütün alt konular hazır değildir. Sonraki genişletme: TYT Fizikte hareket/kuvvet; AYT Matematikte polinom/trigonometri; AYT Fizikte Newton yasaları; AYT Kimyada gazlar; AYT Biyolojide endokrin sistem. Önce `--status`, `--find` ve `incele_kaynakli_arastirma.py` ile kayıtları geri çağırın.

Sayısal arşivde yalnız `3a-ayt-fizik-56-04` metni NUL karakter taşır. PostgreSQL bunu metin/jsonb içinde kabul etmediği için ilk aktarım tek işlem olarak geri alınmıştır. Yeni aktarımda bu kaydın özgün UTF-8 bytes'ı `originalSourceTextUtf8Base64`, özgün SHA-256 özeti ve `requiresVisualReview` bayrağıyla korunur; okunabilir sütunda bozuk karakter U+FFFD ile görünür. `incele_kaynakli_arastirma.py` özgün metni checksum doğrulayarak geri çağırır. Bozuk karakterin anlamı veya şekil çözümü uydurulmaz. Diğer 68.943 metinde bu kodlamaya gerek yoktur.
