# 12. Adım — kalan içerik ve yayın işlerini tamamla

Bağımlılık: ortak katalog, gezinme ve takip entegrasyonu çalışıyor. Bu adım kalan içerik
ve gerçek ortam işlerini tutar; tamamlanan hazırlık yeniden yapılmaz. Aşağıdaki çıktı
dosyaları `veri/` altında Git dışındadır; yerelde yoksa belirtilen betikle yeniden üretilir.

## 12.01 — Kaynak/cevap düzeltmelerini ve resmî arşiv farklarını kapat

Durum: `YKS_PDF_UZLASTIRMA_SURUYOR`. Kaynak/alan kanıtı olmadan cevap, soru kimliği veya
geçmiş puan değiştirilemez.

**PDF–banka kapsamı.** `Dersler > PDF envanteri` kesin dosya–hash–soru kodu–sayfa
bağlarını ve kanıtlı tamlık durumunu hash tabanlı DB kaydından gösterir.
`scripts/pdf_source_reconcile.py` ve `veri/pdf-source-registry/report.json` güncel
uzlaştırmadır; ilk `pdf-bank-audit.py` anlık kaydı tarihsel girdi olarak korunur.
[İşlem sırası](../islemler/pdf-kapsam-uzlastirma.md) yalnız TYT/AYT kapsamındadır.

- Ders notları dahil bütün kaynaklardaki soru bölgelerini, eksik metinli banka
  görsellerinin OCR'ı ile karşılaştır; mevcut soruya aynı dosya konumundan tekrar
  banka kaydı oluşturma. Seçenek sırası/varyant farkını eşleşme kanıtında koru.
- Kaynağı kesin bağlanmayan banka sorularını kaynak kanıtıyla çöz; başlık benzerliğini
  kesin dosya bağı sayma. Soru içeren ders notlarını ortak `KARMA` biçiminde göster.
- Yeni soru kabulünde basılı cevap, doğru sınav/ders/kontrollü konu, bütün kırpım ve
  mevcut banka ile tekrar denetimi birlikte geçsin. Kaynak eksikse durumu açık kalsın.
- `Bütün sorular alındı` yalnız tam döküm ve değişmemiş banka bağıyla verilsin;
  kaynak/model hash'i değişmedikçe tamamlanmış inceleme yeniden model çalıştırmasın.

İlk açık çıkarım örnekleri:

- `YKS Kampi - TYT Kitabi.pdf`: mevcut kuru çıkarım güvenilir değil (çok sayıda hata/uyumsuzluk).
- `YKS Mini Deneme - Test 04.pdf`: `scripts/pdf-question-candidates.py` 60 soru/60 görsel
  paketinin kaynak okuması, kontrollü konu ve tekrar incelemesi kabul edildi.
  Mevcut sorulara bağlar ve yeni sorular `pdf_question_accept.py` üzerinden kalıcıdır;
  kabul kanıtı `veri/pdf-source-registry/acceptance/<sourceSha256>/` altındadır.
- Ders sunularındaki eşleşmiş soru/cevap paketleri `slide-candidates/` altında;
  `slide-review-proposals.json` model taraması tamamlandı. İncelenmiş kabul kararları
  `slide-content-review.json`, mevcut bankaya doğrulanmış bağlar
  `slide-verified-links.json` / `raw-verified-links.json` içindedir. Kalan kaynak
  hatası, konu boşluğu ve çeldirici varyantı gerekçelerini çöz; ham model önerisini
  kabul kararı sayma. Yeni banka değişiminden sonra karşılaştırmayı tazele.
- Kaynakta da gövdesi olmayan sorular seçimlerden ayrılmıştır. Kaynak onarımı
  gelmeden bu kayıtları yeniden etkinleştirme; `question_source_issues` kanıtını koru.

Yeni soru çıkarımı önce `python scripts/ivme.py pdf sorular <pdf>` ile metin katmanından
yapılır; mevcut cevap/kırpım doğrulama ve kaynak kabul hattından geçer. Yalnız başlık veya
benzer soruya dayanarak banka kaydı ya da tamamlandı kararı yazılmaz. Tamlık kanıtı olmayan
PDF arşivlenmez; `scripts/pdf-archive.py` tam kod dökümünü canlı banka kanıtıyla
karşılaştırır ve aktif `pdf:<id>` bağı varsa arşivi reddeder.

**İçerik düzeltmeleri ve resmî arşiv.** `scripts/content-correction-package.py` branş/konu
uyuşmazlıklarını, biyoloji cevap çelişkisini, resmî iptalleri ve uygulanmış kırpımları ayrı
sürümlü kanıt paketine toplar; `scripts/official-archive-check.py` resmî 2018–2026 TYT/AYT
anahtar eşleşmesini, iptalleri ve birleşik/belirsiz konumları (`missing-bank-positions.jsonl`)
üretir. Resmî iptaller yeni seçimlerden çıkarılmıştır; cevap anahtarları ve geçmiş puanlar
korunur.

- Düzeltme paketindeki branş/konu uyuşmazlıkları ve biyoloji cevabı için bağımsız alan kararı al. Onaylanan düzeltmeyi kaynak damgası, özgün kanıt ve etkilenen geçmiş olay sayılarıyla ayrı işlem olarak uygula; cevap ve yeniden puanlamayı sessizce değiştirme.
- Birleşik pasaj/belirsiz kimlikleri resmî soru konumu ve görseliyle tek tek doğrula. Eski birleşik kimliği koruyan tekil soru kabulü hazırla; alternatif din/felsefe konumlarını birleştirme.
- Tekil soru kabulünden sonra özgün konum bağını `exam_archive_positions` kaydına ekle ve yıl/alanın özgün soru sayısını yeniden doğrula; başka yılın tamamlayıcı sorusunu özgün konum gibi kaydetme.

Kabul: kaynak düzeltmesi, arşivde bulunmayan soru ve inceleme bekleyen kayıt ayrılmış; eski soru kodları ve öğrenci kayıtları korunmuş.

**Gereken kişi/girdi:** içerik kayıtları için ilgili branş uzmanının gerekçeli kararı;
birleşik/belirsiz konumlar için resmî PDF'deki tekil soru ve görsel eşleştirmesi.
`3a-tyt-biyoloji-16-02` için kaynak/CSV cevabı B, görsel ve AI önerisi D'dir; AI önerisi
bağımsız cevap doğrulaması değildir.
**Tamamlanma kanıtı:** her kaydın karar/gerekçe/kaynak hash'i, yeni tekil soru kimliği
veya belirsizlik nedeni ve etkilenen geçmiş olay sayısı.

## 12.02 — Eksik ders notu ve gerçek kaynaklı ipucu kapsamını genişlet

**Konuyu Öğrenelim öğretim standardı:** Yeni dersler ve mevcut derslerin yeni bölümleri
[ortak öğretim sözleşmesine](../icerik/konuyu-ogrenelim.md) uyar: günlük bağlam, temelden
kavram açıklaması, etkileşimli model, gerekçeli örnek, örnekten sonra koşullu hızlı yol,
öğrenci denemesi ve özgün gerçek soru. Mevcut 33 dersin keşif katmanını baştan üretme.
Görseli incelenmiş altı gerçek örneği diğer derslere/alt soru tiplerine genişlet; otomatik
banka konu eşlemelerini görsel okuma kanıtı olmadan doğrulanmış sayma. Her dersin bütün
alt konularının aynı derinlikte görsel kapsama ulaşması ayrı içerik genişletmesidir;
ilk bölümdeki keşif, tüm alt konuların uzman incelemesi yerine geçmez.

Durum: `KISMI_KAYNAKLI_ICERIK`. Yayımlanmış rehberler `frontend/public/kaynakli-notlar.json`
içindedir; hepsi öğretmen onayı bekler. Notu olmayan kontrollü konuların kimlik bazlı tek
listesi `python scripts/note-coverage.py` çıktısındaki (`veri/content-labels/note-coverage.json`)
`NO_NOTE` kayıtlarıdır; ikinci eksik listesi açılmaz. Kurallar
[kaynaklı ders notlarında](../icerik/kaynakli-ders-notlari.md).

- `NO_NOTE` kimliklerinden çalış; geniş giriş notunu bütün dar alt konuların tamamlanması sayma. Edebiyatın dar alt konuları ve AYT sözel kapsamının eksik kaynak/örnek bağlarını tamamla.
- Türkçe Sözel Mantık/Fiilde Çatı, tarih, coğrafya, felsefe, din ve TYT biyoloji/kimya taslaklarındaki örnek bağlarını alan uzmanıyla değerlendir; hazır konuları baştan yazma.
- Yeni not yayımlandıktan sonra araştırma arşivini güncelle (`kaynakli_arastirma_db.py --write`) ve `--status` rehber sayısının yayınla eşleştiğini doğrula.
- Gerçek ipucu/not içeriğinin alan kararını al; onaylı ipucunu `scripts/ipucu-guvenli-aktar.py` ve cevap sızıntısı denetimiyle bağla. Faydalı/hatalı geri bildirimini gerçek içerik pilotunda doğrula.

Kabul: eksik kapsam kimlik bazında azalıyor; her yeni not/ipucu ortak etiket ve kaynak aralığını taşıyor; alan uzmanı incelemesi gerektiren içerik açıkça ayrılıyor.

**Yapılacak işlem:** `NO_NOTE` kimliğini seç; `ornek-veri/kaynakli-notlar/` biçiminde
anlatım, kaynak sayfası, gerçek örnek, soru kalıbı ve özgün alıştırma ekle;
`scripts/yayinla_kaynakli_notlar.py --check` ile denetle.
**Tamamlanma kanıtı:** güncellenmiş kapsam sayacı, kaynak denetimi, gerçek öğretmen kararı
ve içerik pilotundan faydalı/hatalı geri bildirimi.

## 12.03 — Kalıcı yayın öncesi açık işletim koşullarını doğrula

Durum: `BEKLIYOR_ORTAM_YETKI`. Yerel yedek ve yalıtılmış geri yükleme
`scripts/ivme-yedek-al.ps1` / `ivme-yedek-provasi.py` ile yapılır; kullanıcı aynı disk
yedeğini seçmiştir.

- Uygulama rolü ayrımı: çalışma bağlantısı hâlâ `root` rolüyle yapılır; `ivme_app` rolü yok ve mevcut rolün `CREATEROLE` yetkisi bulunmuyor. Yönetici erişimiyle sınırlı rolü kur, çalışma/Flyway rolünü ayır; parolayı sohbete veya rapora yazma.
- Kalıcı başlatma, yeniden başlama/uyku sonrası toparlanma ve hata durumunu doğrula. Gerçek telefon/dış ağda giriş, soru, PDF/video, QR, oturum ve güvenli çerez akışını dene.
- Yaklaşık aktif süreyi gerçek telefonda ekran kilidi/arka plan/60 saniyeyi aşan boşta kalma/geri dönüş ve masaüstü pencere geçişleriyle ölç.
- E-posta/telefon sahiplik doğrulaması gerektiren bir kullanım açılacaksa önce hizmeti ve doğrulamayı tamamla; biçim kontrolünü sahiplik onayı sayma.

Kabul: yalnız gerçekten açık işletim koşulları kapatılıyor; yayına hazır denebilmesi için somut ortam/cihaz/yedek kanıtı var.

**Gereken kişi/girdi — veritabanı rolü:** PostgreSQL rol oluşturma yetkisine sahip yerel
yönetici kendi terminalinde çalıştırır ve parolayı gizli girişle yazar:

```powershell
pwsh -NoProfile -File scripts/kur-uygulama-rolu.ps1 -Database ivme
```

Oluşan `ivme_app` bilgileriyle çalışma bağlantısı ayarlanır; Flyway/katalog yayını ayrı
yetkili bağlantıda kalır. **Kanıt:** `ivme_app` ile veri okuma/yazma başarılı; rol/DB/şema
oluşturma ve Flyway geçmişine yazma reddedilir, uygulama sağlık kontrolü geçer.

**Gereken kişi/girdi — telefon ve kalıcı ortam:** dış ağdan erişebilen gerçek telefon,
normal kullanıcı hesabı ve kalıcı sunucu/alan adı. 390 px tarayıcı testi gerçek cihaz
testi sayılmaz. Telefonda mobil veriden HTTPS adresini aç; giriş/çıkış, soru görseli, PDF
sayfası, video, QR ve oturuma geri dönüşü dene. Aktif süre için 20 saniye etkileşim,
90 saniye ekran kilidi/arka plan, geri dönüş ve 70 saniye dokunmadan bekleme senaryosunu
uygula: kilit/arka plan süresi eklenmemeli, görünür boşta kalmada son etkileşimden sonra en
çok 60 saniye sayılmalı, masaüstünde başka pencereye geçiş süreyi durdurmalı.
**Kanıt:** cihaz/işletim sistemi/tarayıcı, URL/sürüm, tarih ve her senaryonun beklenen/gözlenen sonucu.

**Koşullu iş — iletişim sahipliği:** ürün e-posta/telefon sahibini doğruladığını iddia
edecekse doğrulama sağlayıcısı, hizmet hesabı ve ürün kararı gerekir; açılırsa doğru/yanlış/
süresi dolmuş kod, yeniden gönderim ve oran sınırı kanıtı alınır.

## 12.04 — Küçük pilotu ölç ve yalnız yeni bulguları iş listesine al

Durum: `BEKLIYOR_GERCEK_PILOT`. Gerçek katılımcı, sorumlu ve tarih sağlanmadı. Sentetik
kullanıcı veya tarayıcı testi gerçek öğrenme ve kullanım sonucu olarak raporlanmaz.

- Güvenlik/yedek ve içerik koşulları sağlandıktan sonra davetli küçük pilotu yürüt; kişi sayısını ihtiyaca göre belirle.
- Kaynak bulma süresi, yanlış etiket/aralık, yinelenen kaynak, soru sonuçları, performans, erişilebilirlik ve geri yükleme başarısını ölç.
- Her yeni bulguyu ilgili mevcut adımın yeni alt görevi olarak ekle; ayrı “eksikler” dosyası açma.

Kabul: ölçülen sorunların görev kimliği ve kabul ölçütü var; büyüme kararı gözleme dayanıyor.

**Gereken kişi/girdi:** davetli gerçek kullanıcılar, pilot sorumlusu, deneme tarihleri ve kullanılacak sürüm.
**Tamamlanma kanıtı:** ölçüm dönemi, gerçek katılımcı sayısı, anonimleştirilmiş bulgular ve her yeni sorunun görev kimliği.

İlgili kaynaklar: `scripts/kur-uygulama-rolu.ps1`, `ivme-yedek-al.ps1`, `ipucu-guvenli-aktar.py`, `frontend/src/activeTime.js`, `docs/icerik/kaynakli-ders-notlari.md`, `docs/icerik/soru-analizi.md`, `README.md`.
