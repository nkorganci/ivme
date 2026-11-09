# YKS-10 — Temsilî pilot ve tam geçiş kabulü

**Güncel kullanıcı kuralı:** Hatalı/eksik/uyuşmayan/bulunamayan adayları
`EXCLUDE_NO_RETRY` ile ele; onarım, eksik kanıt arama veya tekrar model/OCR
yapma. Elenenler öğrenci ekranına ve aktarım paketine girmez. Eski açık
istisnalar düzeltilecek bekleyen iş değildir; yalnız kanıtlı seçili küme ve
gerekçeli dışlamalarla ilerle. Güncel seçim `verified-source-selection/`;
önce YKS-07 tamamlanır, diğer aşamalar sonra yürütülür.

[Ana plan ve ortak kurallar](../15-yks-kaynak-birlestirme.md) ·
[Görev durumu](../../gorev-durumu.md) · [Devir](../../devam.md)

## Ajanın başlangıç talimatı

Seçilen görev **YKS-10 / 15.10**. Önce `git status --short`,
[AGENTS.md](../../../AGENTS.md), ana planın ortak sözleşmesi ve görev tablosundaki
bu kimlik okunur. Geçerli tamamlanma kanıtını yeniden üretme. Bu dosyanın açılması
tek başına işlem yetkisi değildir; kullanıcının son uygulama kapsamını esas al.
Tüm zincir yetkilendirilmişse bağımlılıklar ve doğrulama kapıları geçtikçe sıradaki
adıma devam et; tek adım istenmişse o adımın dışına çıkma.

**Ön koşul:** Pilot: YKS-06 ile 07.pilot/08.pilot/09.pilot çıktıları. Son kabul: aynı aşamaların tam kapsam kanıtları.

**Araç/model:** Ajan ve otomatik testler; gereksiz model çıkarımı yok.

**İlgili mevcut tarif:** [Test/devir](../../islemler/test-ve-devir.md), [PDF uzlaştırma kabulü](../../islemler/pdf-kapsam-uzlastirma.md).

## Girdiler

- Pilot/tam kapsam sürümlü paketleri; eski/yeni okuyucular; yedek/geri dönüş.
- İlgili kalite profilleri ve geçici ivme_test ortamı.

## Yapılacaklar

1. İlk pilotta kesin kopya, kısmi aktarım, ortak konu, deneme/anahtar, matematik/geometri, paragraf, taranmış sayfa, permütasyon, anahtarsız soru ve ZIP tekrarı örnekle.
2. Ayrılmış ortamda kaynak çözümleme, aday katalog ve soru paketini birlikte doğrula; gerçek öğrenci DB'sine test yazma.
3. Aynı pilotu ikinci kez çalıştır: yeni soru oluşmasın, geçerli OCR/model işini yinelemesin.
4. Kesinti/atomik yazma/ölü kilit/devam ve geri dönüş provasını yap; geçersiz girdi kanıtı eskitsin.
5. Pilot başarılıysa yalnız pilot kapısını VERIFIED yap; ana YKS-07/08/09 görevlerini erken kapatma. Bu talimatın kapsamına göre tam arşiv sürdürülür.
6. Son kabulde bütün tam kapsam raporları, kaynaklar, geçmiş koruması ve UI/API birlikte sınanır.

## Üretilecek kanıt ve çıktı

- Ayrı pilot ve son kabul raporları; gerçek komut/çıkış/test/kaynak hash'leri.
- Gerekli değişikliklerde güncellenmiş kalite profili; geçiş uygun/uygun değil kararı.

Çıktıları `uygulama/veri/yks-birlestirme/<run-id>/yks-10/` altında
manifest ve gerçek hash/sürüm kimlikleriyle kaydet. Mevcut kaynak/pipeline kanıtını
kopya doğruluk deposuna dönüştürme; ona referans ver.

## Kabul ve çift kontrol

- Pilotun ikinci geçişi ve kesinti sonrası resume güvenilir.
- Sahte UI testi gerçek DB entegrasyonu diye sunulmuyor.
- Son kabulde açıklanmamış kırık kaynak/kimlik/cevap ve etkilenmiş geçmiş kalmıyor.

Otomatik çıktı/şema kontrolünü ilgili özgün kaynak ve uygulama davranışıyla
karşılaştır. Modelin güven puanı, sahte test veya eski rapor tek başına kabul değildir.
Pilot/tam arşiv kapsamı farklıysa ikisini ayrı yaz; pilot bütün görevi bitirmez.

## Bu adımın sınırı

Pilot geçmeden pahalı tam yayılım; tam kabul geçmeden canlı cutover yok.

## Gerçek yalıtılmış pilot kabulü — VERIFIED

`yks_izole_prova.py` sürümlü uygulama kaynağını Git arşivinden ayrı bir yerel
kopyaya çıkarır; aday MEBİ bakım sözlüğünü yalnız bu kopyaya koyar. Mevcut
`ivme.py test` ve `backend-test.ps1` geçici `ivme_test` oluşturur, mevcut bir
test DB'sinin üzerine yazmaz ve iş sonunda geçici DB'yi kaldırır. Canlı uygulama
başlatıcısı çalıştırılmaz. Test şablonu `scripts/yks-pilot-fixtures/` içindedir;
normal backend paketine yerel arşive bağımlı koşullu test eklenmez.

Gerçek dört test geçti: üç sorunun ön izlemesi/yazımı/ikinci yazımda sıfır yeni
soru; mevcut 12 kimlik/cevap ve öğrenci cevap/ilerleme satırlarının korunması;
hatalı cevapta bütün partinin reddi ve soru+etiket kuyruğunun geri alınması;
aday kataloğun gerçek API'sinde iki dar konu için 2/1 soru ve öğrenci kaynak
yanıtında cevapların bulunmaması. `isolated-pilot/isolated-import-report.json`
ve `yks-10/pilot/attempt-0001/isolated-pilot-acceptance.json` kanıttır.

`yks_izole_kanit.py` XML'i, DB temizliği işaretini, günlükleri, özgün ve yalıtılmış
uygulama kodunu, gerçek test şablonunu, kaynak paketini ve aday sözlüğü yeniden
kontrol eder. Satır sonu LF/CRLF dışında kod farkını görmezden gelmez. Geçerli
prova tekrar çalıştırılmadı; YKS-10 kalite profili 16 runtime + iki kanıt testiyle
bu bağı kontrol eder. Pilot kapısı yalnız tam kaynak incelemesini açar;
YKS-10'un tamamına BITTI veya canlı geçiş izni vermez.

## Başarısızlık ve geri dönüş

Geçici ortam tarife göre kapatılır; pilot başarısızsa neden düzeltilir, canlı sistem korunur.

Girdi/rapor eskimişse gerekçeyi kaydet; yalnız etkilenmiş iş yeniden açılır.
Ön koşul veya kabul geçmeden tehlikeli sonraki iş yapılmaz. Güvenli bağımsız iş
varsa son kullanıcı talimatının kapsamında sürdür; somut engeli gizleme.

## Durum, BITTI ve devam kaydı

- Başlangıçta görev tablosundaki gerçek durumu güncelle; runtime varsa bu adım,
  kapsam ve son imleçle devam et. Runtime henüz yoksa yapılmış gibi kayıt uydurma.
- Her önemli alt parti/engel/doğrulamada tabloya tamamlanan kapsam, kanıt ve kalan
  tek işi yaz; oturum sonunu bekleme. Ana planın ilgili açık işini de güncelle.
- **Bütün kabul ölçütleri geçince** bu dosyanın başlığına ve ana plandaki
  **15.10 / YKS-10** başlığına `— BITTI` ekle. Görev tablosunda
  `TAMAMLANDI — BITTI` ve gerçek kanıtı yaz. Bu işaret aynı durumun görünümüdür;
  ayrı bir tamamlanma tablosu oluşturma. Biten görev dosyasını silme.
- Kısmi/pilot veya doğrulama bekleyen işe BITTI yazma. Yeniden açılırsa BITTI
  işaretini kaldır ve değişen girdi/hata nedenini `YENIDEN_ACILDI` kaydına ekle.
- Sonraki somut işlem, ilgili adım, gerçek doğrulama sonucu ve kanıt yolu devirde
  bulunmalı. Tüm zincir yetkilendirilmişse uygun sonraki adıma devam et.
