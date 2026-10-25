# Kaynaklı soru analizi ve araştırma arşivi

Bu belge çıkmış/OGM sorularını ve ders anlatımı PDF'lerini birlikte inceleyen kaynak
taramasının nasıl çalıştığını ve araştırma arşivinin (`source_research`) nasıl yeniden
kullanılacağını anlatır. Öğrenciye sunulan konu rehberleri
[kaynaklı ders notlarında](KAYNAKLI_DERS_NOTLARI.md), kalan içerik işi
[12.02'de](plan/12_KALAN_ICERIK_VE_YAYIN.md) tutulur. Güncel sayılar belgeye yazılmaz;
`--status` çıktısından okunur.

Bu belge ve ders notları belgesi `scripts/kaynakli_arastirma_db.py` tarafından girdi
olarak hash'lenir ve her araştırma sürümüyle birlikte tam metin saklanır. Belgeyi
değiştirmek bir sonraki `--write` çalıştırmasında yeni araştırma sürümü (`run_key`) üretir;
bu beklenen davranıştır.

## Tarama

`scripts/analiz_kaynakli_sorular.py` hedef etiket kayıtlarını özgün kaynak soruya bağlar.
Kapsam, listelenmiş ders/sınav gruplarının etkin yerel envanteridir; ÖSYM arşivinin
bağımsız tamlık denetimi değildir. Çıktı `ornek-veri/kaynakli-analiz-ozet.json`; soru
metinleri bu Git dosyasına kopyalanmaz.

- Kaynak konu etiketleri özgün etiketlerdir; eş anlamlı veya farklı ayrıntı düzeyinde
  olabilirler ve bağımsız pedagojik alt konu olarak sunulmazlar.
- Çıkarılmış metni olmayan veya çok kısa/görsele bağımlı kayıtlar ayrı sayılır. Metni olan
  soruda bile grafik, şekil veya alt çizgi için görsel inceleme gerekebilir; metinsiz kayıt
  metinden incelenmiş sayılmaz.
- Aynı soru farklı kitapçık kartlarında bulunabilir; rapor her etiket içinde normalize metin
  fingerprint'lerini sayar. Bu sayı veri kümesindeki benzersiz soru sayısı değildir.
- Otomatik soru kökü taraması, soru parçasındaki kelimeler yerine **istenen göreve ait aday
  kalıp** üretir. `patternCandidates` son karar veya insan onayı değildir;
  `karma-incelenmeli` / `kok-incelenmeli` kayıtları kalır. Aday sayıları öğrenciye çıkma
  olasılığı veya öğrenme önceliği olarak sunulmaz.

## Örnekten genel rehbere

Analiz, her sorunun altında tekrar eden notlar yerine **konuya ait soru kalıpları ve
düşünme yolları** üretir. Bir konu için önce çıkmış ve OGM örnekleri ile anlatım PDF'i
karşılaştırılır; örnek: TYT Cümlede Anlam'da `TYT-0034` (nesnel yargı), `3a-tyt-turkce-10-01`
(sıralama) ve OGM MEBİ Türkçe PDF s. 17/19 (neden-amaç-koşul, öznel/nesnel) karşılaştırması
**nesnellik**, **anlam ilişkisi** ve **sıralama/bilgi koruma** kalıplarını verir. Mini
düşünme örnekleri özgündür; kaynak soruların kopyası değildir. Gösterilen örnekler bütün
alt kalıpların tüm sınav yıllarında doğrulandığı anlamına gelmez.

Sayısal derslerde konular kaynak CSV'den alınır: `scripts/kaynakli_etiket_sayisal.py`
`ornek-veri/etiketler/sayisal-kapsam.csv` dosyasını üretir; kaynak JSON kimliği ve CSV kodu
birlikte izlenir ve bütün kayıtlar inceleme bekler.

## Araştırma arşivi (`source_research`)

Yerel `ivme` PostgreSQL veritabanında `source_research` şeması kullanılır.
`V35__kaynakli_arastirma_arsivi.sql` bu şemanın idempotent DDL'sidir. Aktarım betiği yalnız
bu DDL'yi uygular; başka göçleri, soru düzeltmelerini veya öğrenci akışlarını çalıştırmaz.
Öğrenci tablolarına yazılmaz.

- `runs`: girdi fingerprint'leri, sürüm, kapsam, öğrenciye sunulan JSON ve iki belgenin
  tam metni. Aynı girdiye aynı araştırma anahtarı üretilir; girdiler değişirse önceki kayıt
  korunarak yeni sürüm eklenir.
- `documents`, `document_pages`, `run_documents`: PDF'lerin kurum adresi, yerel yolu,
  SHA-256 özeti ve 1 tabanlı sayfa metinleri; çıkarıcı sürümü ve raster görsel varlığı.
  Vektör çizim kontrolü yalnız rehberde kullanılan sayfalarda yapılır, diğerlerinde `NULL`
  kalır. **Metin çıkarımı veya çizim tespiti şeklin yorumlandığı anlamına gelmez.**
- `question_evidence`: kaynak sorunun koleksiyon/kod kimliği, öneri etiketi, kaynak metni,
  metin/görsel checksum'u, PDF/kayıt referansları ve inceleme durumu. Soru bankasının konu
  veya cevabı değiştirilmez.
- `topic_inventory`: kaynak başlıkları için sayım, belirsizlik ve kalıp adayları.
- `topic_guides`: konu rehberleri, soru kalıpları, gerekçeler ve özgün alıştırmalar;
  durumları yalnız `DRAFT`.
- `observations`: checksum bağlı asistan gözlemleri (görselde alt çizgi/sütun ilişkisi,
  PDF tablosu, konu uyuşmazlığı, cevap çelişkisi). Gözlem öğretmen onayı değildir. Kaynak
  metin/görsel veya PDF/sayfa checksum'u değişirse aktarım eski gözlemi geçerli saymayı
  reddeder. Girdisi `ornek-veri/kaynakli-arastirma-gozlemleri.json`; uygunsuz kayıtlar
  `excludeFromGuides` taşır ve yayın üreticisi bunları örnek göstermez (banka düzeltmesi değildir).

Bilinen istisna: `3a-ayt-fizik-56-04` kaynak metni NUL karakter taşır; PostgreSQL bunu
metin/jsonb içinde kabul etmez. Özgün UTF-8 bytes `originalSourceTextUtf8Base64`, SHA-256
özeti ve `requiresVisualReview` bayrağıyla korunur; okunabilir sütunda U+FFFD görünür.
Karakterin anlamı tahmin edilmez.

Arşiv PDF/soru metinlerini içerir; öğrenci JSON'u veya Git raporları bunların toplu tam
metnini yayımlamaz. Görseller özgün konumlarında kalır. `veri/source-research/image-cache.json`
değişmeyen görselleri tekrar hash'lememek için boyut/mtime/checksum önbelleğidir;
`pdf-cache/` PDF checksum'u ve çıkarıcı sürümüne göre sayfa metinlerini yeniden kullanır.

```powershell
python -X utf8 scripts/kaynakli_arastirma_db.py --status
python -X utf8 scripts/kaynakli_arastirma_db.py --find "Cümlede Anlam"
python -X utf8 scripts/kaynakli_arastirma_db.py --write
python -X utf8 scripts/kaynakli_arastirma_db.py --export
python -X utf8 scripts/incele_kaynakli_arastirma.py --question TYT-0289 --bank CIKMIS
python -X utf8 scripts/incele_kaynakli_arastirma.py --topic "Fiilde Çatı" --subject Türkçe --limit 5
python -X utf8 scripts/incele_kaynakli_arastirma.py --pdf-page 39:137
```

`--write` tek işlemde araştırma satırlarını ekler ve soru bankasının kayıt/konu/cevap/aktiflik
özetini önce ve sonra karşılaştırır; parolayı yazmaz. `--export` son sürümün öğrenci JSON'unu
araştırma yapmadan geri yükler. `--find` konu rehberi, etiketli kayıt sayıları ve PDF
sayfalarını döndürür. `incele_kaynakli_arastirma.py` metni PDF'den yeniden çıkarmadan soruyu,
cevap kaydını, görsel yolunu, checksum'ları ve gözlemleri getirir; konu araması kaynak
etiketine göredir ve her koleksiyona ayrı örnek sınırı uygular.

## Yeni araştırmaya başlarken

1. `--status` ve `--find` ile eldeki kanıtı getir; aynı kaynakları baştan sınıflandırma.
2. Kaynak checksum'u değişmediyse mevcut sayfa metni, soru referansı ve gözlemi kullan.
   Kaynak değiştiyse eski sonucu silmeden yeni sürüm oluştur.
3. Metinsiz veya şekle bağlı sorularda önce görseli incele (`python scripts/ivme.py pdf sorular`
   şekilli soruları ayırır). İncelenmemiş kayıtları `SOURCE_LINKED` bırak; “analiz edildi”
   durumuna otomatik yükseltme. Uydurma çözüm veya öğretmen onayı oluşturma.
4. Yeni konu/not kapsamı yalnız 12.02'de takip edilir.
