# 12. Adım — kalan içerik ve yayın işlerini tamamla

Bağımlılık: ortak katalog, gezinme ve takip entegrasyonu çalışıyor. Bu adım kalan içerik
ve gerçek ortam işlerini tutar; tamamlanan hazırlık yeniden yapılmaz. Aşağıdaki çıktı
dosyaları `veri/` altında Git dışındadır; yerelde yoksa belirtilen betikle yeniden üretilir.

## 12.01 — Kaynak/cevap düzeltmelerini ve resmî arşiv farklarını kapat

Durum: `BEKLIYOR_KAYNAK_KARARI`. Kaynak/alan kanıtı olmadan cevap, soru kimliği veya
geçmiş puan değiştirilemez.

**PDF–banka kapsamı.** `Dersler > PDF envanteri` kesin dosya–hash–soru kodu–sayfa
bağlarını gösterir ([denetim raporu](../../veri/content-labels/integration/pdf-bank-audit-20261024/report.json),
üretici `scripts/pdf-bank-audit.py`). Bağı doğrulanmayan soru/deneme kayıtlarının çoğu
çevrim içi OGM Soru Bankası okul PDF'sidir; bunların gerçekten eksik olup olmadığı sayfa
ve görsel karşılaştırmasıyla belirlenir. Ayrıca iki fiziksel kaynak açıktır:

- `YKS Kampi - TYT Kitabi.pdf`: mevcut kuru çıkarım güvenilir değil (çok sayıda hata/uyumsuzluk).
- `YKS Mini Deneme - Test 04.pdf`: `scripts/pdf-question-candidates.py` 60 soru/60 görsel
  adayı üretti (`veri/content-labels/pdf-extraction/mini-test-04/candidates.json`); bankaya
  alınmadan önce bütün görseller, ders/sınav etiketi ve mevcut sorularla benzerlik incelenir.

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

Durum: `KISMI_KAYNAKLI_ICERIK`. Yayımlanmış rehberler `frontend/public/kaynakli-notlar.json`
içindedir; hepsi öğretmen onayı bekler. Notu olmayan kontrollü konuların kimlik bazlı tek
listesi `python scripts/note-coverage.py` çıktısındaki (`veri/content-labels/note-coverage.json`)
`NO_NOTE` kayıtlarıdır; ikinci eksik listesi açılmaz. Kurallar
[kaynaklı ders notlarında](../KAYNAKLI_DERS_NOTLARI.md).

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

İlgili kaynaklar: `scripts/kur-uygulama-rolu.ps1`, `ivme-yedek-al.ps1`, `ipucu-guvenli-aktar.py`, `frontend/src/activeTime.js`, `docs/KAYNAKLI_DERS_NOTLARI.md`, `docs/KAYNAKLI_SORU_ANALIZI.md`, `README.md`.

## Kopyalanacak prompt

```text
İvme'de 12. adımı uygula (docs/plan/12_KALAN_ICERIK_VE_YAYIN.md).
Önce AGENTS.md, docs/plan/00_CALISMA_BAGLAMI.md ve docs/plan/00_DEVAM.md dosyalarını oku.
Bağımlılıkları ve mevcut kanıtları kontrol et; biten işi yeniden yapma; ilk açık alt işten başla.
00_CALISMA_BAGLAMI.md içindeki kalıcı etiket/adlandırma/kaynak aralığı kurallarını ve
güncel sözlük/şema referanslarını kullan; ikinci sözlük oluşturma.
Önce betik/önbellek, gerekirse yerel model, en son AI. Kaynakları ve geçmiş kayıtları koru;
gerçek veriyi sıfırlama, yetkisiz push yapma. Her biten alt işten sonra 00_DEVAM.md devir
dosyasını ve bu adımın kalan işlerini güncelle. Adım tamamen bitince kalıcı kuralları koru,
görev dosyasını sil; kalan adımların numarasını değiştirme.
```
