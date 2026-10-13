# Felsefe, Din Kültürü, Biyoloji ve Kimya: kaynaklı soru etiketleri

Bu çalışma, uygulamanın etkin TYT/AYT soru kayıtları için **öneri niteliğinde** bir etiket dizini üretir. Canlı soru CSV'sini, veritabanını veya öğrenci arayüzünü değiştirmez. Ders notu yazımı için kullanılabilir; etiket tek başına öğretim içeriği veya soru çözümü kanıtı değildir.

## Üretim ve denetim

```powershell
python scripts/kaynakli_etiket_diger.py --write
python scripts/kaynakli_etiket_diger.py --check
```

Kaynak girdiler `veri/sorular-tum.csv`, `veri/sorular-ogm.csv`, çıkmış soru katalogu `../veri-hatti/ogm-yks-cikmis/ham/sorular_son.json`, OGM soru bankası ve PDF çıkarım kayıtları `../veri-hatti/ogm-sorular/kayit/*.json`, ayrıca aynı hattın elle, kazanım, kitap başlığı ve model etiketleridir. Çıktılar `ornek-veri/etiketler/diger-branslar.csv` ve `ornek-veri/etiketler/diger-ozet.json` dosyalarıdır. Betik her seferinde tüm etkin kayıtları yeniden karşılaştırır; aynı `(bank, code)` kimliği iki kez bulunursa, bir etiket veya kanıt referansı boşsa, kayıtlı PDF yolu yoksa hata verir. `--check` üretilen dosyaların güncel kaynaklarla birebir aynı olduğunu doğrular.

CSV'de `bank, exam_type, subject, code, source_topic, label, evidence_type, evidence_ref, confidence, review_required` ortak sütunları vardır. Ek sütunlar `discipline` (AYT felsefe dalı), `suggested_subject` ve `source_subject_conflict` (mevcut CSV'deki ders ile kaynak uyuşmazlığı), PDF bölüm başlığı/sayfası/dosyası ve inceleme gerekçesidir. Tam soru metni ve görsel kopyalanmaz. `confidence` 0–1 arasında **iş akışı için önerilen** güven derecesidir; istatistiksel kalibrasyon veya insan onayı değildir.

## Etiket kararı

1. Çıkmış sorularda kaynak katalogun açık alt konusu, yoksa mevcut konu kullanılır. AYT **Felsefe Grubu** tek bir felsefe konusu sayılmaz: `discipline` alanında Felsefe, Psikoloji, Sosyoloji veya Mantık korunur. Eski taşınmış 12 kaydın özgün PDF sayfası katalogda bulunmaz; bu kayıtlarda PDF varmış gibi bağlantı üretilmez ve güven düşürülür.
2. OGM soru bankasında soru kazanım kodu ve kazanım cümlesi kanıttır. Kazanım–alt konu eşlemesi yeterince güçlü olduğunda **veya alt konu adı kazanımda açıkça geçtiğinde** alt konu seçilir; diğerlerinde mevcut üst konu korunur.
3. OGM PDF kayıtlarında çıkarılmış bölüm başlığı ile mevcut konu uyumlu ve eşleştirme yeterince güçlü ise alt konu seçilir. Karışık denemelerde yalnız yüksek eşikli metin modeli önerisi kullanılır. Önceki `elle_etiket.json` kaynak işaretlemesi ayrıca tanınır; bu işaretleme **öğretmen onayı sayılmaz**.
4. Kaynağın tek bir dar alt konuyu desteklemediği çok konulu sorularda birleşik etiket veya üst konu kullanılır. Uydurma bir dar alt konu verilmez.

`review_required=true` bir kusur değil, yayımlanacak ders notuna geçmeden önce kaynak sorunun uzman tarafından doğrulanması gerektiği anlamına gelir. Bu üretimde öğretmen onayı kaydı bulunmadığından **tüm satırlar** `true` tutulur. Güven değeri kaynak eşlemesinin göreli gücünü anlatır; öğretmen onayını anlatmaz.

## Bu üretimde saptanan sınırlar

- Toplam **25.830** etkin kayıt vardır: çıkmış **702**, OGM **25.128**. Etiketi boş kalan kayıt **0**; çıkarılmış kaynak sorusu bulunamayan kayıt **0**; öğretmen incelemesi gereken kayıt **25.830**. Kaynakların özgün ders notları henüz bu çalışmada analiz edilmediği için burada öğretim iddiası üretilmez.
- OGM AYT Din Kültürü soru sayısı **6**; bu küçük örneklemden sık sorulan konu veya önem sıralaması çıkarılmamalıdır. Çıkmış AYT Din Kültürü **54** kayıt içerir.
- OGM CSV'de “Sınıflandırılmamış” olan **27** kaydın tamamı soru metniyle, bir tanesi kaynak görseliyle, ayrı ayrı incelendi. Bunların **11** tanesinde mevcut `subject` alanıyla kaynak soru dersi uyuşmuyor. Mevcut ders ve soru kimliği korunur; `suggested_subject` ve `source_subject_conflict=true` ayrı sütunlarda verilir. Bu önerileri mevcut soru bankasına otomatik aktarmayın. Bazı örnekler: `md-ayt-sayisal-24-17` Biyoloji kaydıdır, kaynak çözünürlük/Kimya sorusudur; `md-ayt-sayisal-24-08` Kimya kaydıdır, kaynak kütle çekim/Fizik sorusudur; `mn-test-03-01-32` Kimya kaydıdır, görsel tanımlı işlemler/Matematik sorusudur.
- Bu 11 uyuşmazlık, **tüm 25.830 soruda bağımsız ders doğrulaması yapıldığı anlamına gelmez**. Öncelik etkin CSV'de sınıflandırılmamış kalan kayıtlardı. Diğer otomatik etiketler uzman örneklemiyle denetlenmeden ders notlarında kesin kanıt olarak kullanılmamalıdır.
- PDF kaynaklarında `source_page` kaynak çıkarımının **1 tabanlı PDF sayfasıdır**. OGM Soru Bankası PDF yerine kazanım kodu ve bankanın kendi kayıt metniyle izlenir. Eski çıkmış **12** kaydın doğrudan PDF bağı yoktur; `source_file` boş ve güven düşüktür. Bunların biri soru metnindeki açık tefsir kavramıyla daha dar etiketlenmiş, diğerleri `legacy_catalog_topic` olarak kalmıştır.

## Bağımsız örnekleme (13 Ekim 2026)

Sabit `20261013` tohumu ile her `(bank, sınav, ders)` kümesinden bir soru ve o örneklerde bulunmayan kanıt türlerinden ek sorular seçildi. İlk sürümde **21**, kural düzeltmesinden sonraki tekrar seçimde **20** kayıt vardı; birleşimde **24 farklı soru** incelendi. Soru metni ve kaynak kazanımı/bölüm başlığı karşılaştırıldı. Metni boş üç OGM banka sorusu (`sb-85247`, `sb-84845`, `sb-79170`) ve OCR'ı yalnız numaradan oluşan `mn-test-03-01-32` kaynak görselinden okundu.

Örnek kodlar: `AYT_Sayisal-0666`, `AYT_DinKulturu_Sozel-0030`, `AYT_Sozel-0606`, `AYT_Sayisal-0545`, `TYT-1068`, `TYT_DinKulturu-0018`, `TYT-0511`, `TYT-0967`, `sb-3652`, `cd-2021-ayt-genel-deneme-02-39`, `mt-ayt-felsefe-grubu-10-14`, `sb-85247`, `sb-25596`, `sb-40191`, `sb-84845`, `dd-tyt-kimya-67-70`, `2020-TYT-SOS-17`, `sb-28699`, `mn-test-03-01-32`, `3d-ayt-sozel-24-31`, `yk-kimya-test-13-01-02`, `2018-TYT-FEN-12`, `sb-79170`, `md-ayt-sozel-04-34`.

İki katalog etiketi kaynak sorunun açık kavramına göre daraltıldı: `AYT_Sayisal-0666` → **Genetik Araştırmalarda Model Organizmalar**, `2020-TYT-SOS-17` → **Kur’an'ı Anlama ve Tefsir İlkeleri**. `sb-3652` gibi kazanım cümlesinde alt konu adı doğrudan bulunan banka sorularında alt konunun kullanılmasına izin verildi. `yk-kimya-test-13-01-02` model önerisi kaynakta başlık gibi görünmesin diye kanıta model alt konu puanı eklendi. `mn-test-03-01-32` kaydındaki Kimya/Matematik uyuşmazlığı ayrı alanlarda işaretli kaldı. Bu 24 kayıtta düzeltmelerden sonra boş etiket veya **işaretlenmemiş** ders uyuşmazlığı görülmedi; sonuç tüm veri kümesi için doğruluk oranı değildir.

## Öğretim içeriğine geçiş

Branşlar kullanıcı sırasıyla ele alınmalıdır: Türkçe, Tarih, Coğrafya, Felsefe, Din Kültürü, Biyoloji, Kimya. Her dersin notu için önce MEB/OGM konu anlatımı PDF'sindeki tanım ve yöntem, ardından ilgili çıkmış ve OGM sorularının doğrulanmış örnekleri eşleştirilmelidir. Yeni örnek sorular açıkça “yeni üretilmiş” olarak ayrılmalı ve kaynak soruların metni/görseli kopyalanmamalıdır. İnceleme gereken kayıtlar onaylanmadan konu sıklığı veya öğrenme önceliği hesabına yüksek güvenle katılmamalıdır.
