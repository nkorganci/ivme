# YKS-11 — Dosya düzeni ve ortak katalog geçişi

[Ana plan ve ortak kurallar](../15-yks-kaynak-birlestirme.md) ·
[Görev durumu](../../gorev-durumu.md) · [Devir](../../devam.md)

## Ajanın başlangıç talimatı

Seçilen görev **YKS-11 / 15.11**. Önce `git status --short`,
[AGENTS.md](../../../AGENTS.md), ana planın ortak sözleşmesi ve görev tablosundaki
bu kimlik okunur. Geçerli tamamlanma kanıtını yeniden üretme. Bu dosyanın açılması
tek başına işlem yetkisi değildir; kullanıcının son uygulama kapsamını esas al.
Tüm zincir yetkilendirilmişse bağımlılıklar ve doğrulama kapıları geçtikçe sıradaki
adıma devam et; tek adım istenmişse o adımın dışına çıkma.

**Ön koşul:** YKS-10 son kabulü, tam kapsam kanıtları, güncel yedek ve hazır geri dönüş; ilgili yazıcılar checkpoint'te.

**Araç/model:** Hazırlanmış deterministik geçiş araçları; ajan izler, serbest AI DB düzenlemesi yok.

**İlgili mevcut tarif:** [Veri kaynakları](../../mimari/veri-kaynaklari.md), [yayın/işletim](../../islemler/uygulama-calistirma-ve-yayin.md).

## Girdiler

- Doğrulanmış YKS hedef manifesti, uyumlu okuyucular ve eski referans eşlemeleri.
- MEBİ tabanlı aday ortak katalog; projeksiyon üreticileri; korunacak baseline.

## Yapılacaklar

1. Önce gerçek kaynak/hedef mutlak yollarını ve disk/giriş hash'lerini tekrar doğrula; hesaplanmış yanlış yola recursive taşıma yapma.
2. Fiziksel düzeni ve okuyucu ayarını kurtarılabilir manifest/checkpoint ile etkinleştir; dosya sistemi ve DB tek transaction değildir, uyumlu geçiş penceresi kullan.
3. Konu/kaynak kataloğunu mevcut sürümlü atomik yayın yoluyla al; eski kategori ID'leri, counterpart, alias ve dağılım geçmişi korunsun.
4. Frontend ve paketlenmiş JSON projeksiyonlarını üreticilerden yenile; pipeline yeni DB sürümünü snapshot alsın.
5. Eski PDF/video/not/soru bağlantıları ve filtreleri doğrula; eski writer yeniden eski kökü oluşturmasın.
6. Öğrenci/öğretmen/cevap kayıtlarını baseline ve geçiş değişmezleriyle kontrol et; gerçek eşzamanlı öğrenci hareketini veri kaybı sanma.

## Üretilecek kanıt ve çıktı

- Gerçek dosya geçiş manifesti, etkin katalog/okuyucu sürümü ve yayın raporu.
- Eski-yeni kaynak erişimi, geçmiş koruması ve servis edilen sürüm kanıtı.

Çıktıları `uygulama/veri/yks-birlestirme/<run-id>/yks-11/` altında
manifest ve gerçek hash/sürüm kimlikleriyle kaydet. Mevcut kaynak/pipeline kanıtını
kopya doğruluk deposuna dönüştürme; ona referans ver.

## Kabul ve çift kontrol

- Yeni kökte çalışma ve eski kimlikten uyumlu erişim doğru.
- Geçmiş ve diğer sınavlar korunuyor; tek yanıtta eski/yeni katalog karışmıyor.
- Açık geri dönüş yolu ve güncel yazıcı ayarları mevcut.

Otomatik çıktı/şema kontrolünü ilgili özgün kaynak ve uygulama davranışıyla
karşılaştır. Modelin güven puanı, sahte test veya eski rapor tek başına kabul değildir.
Pilot/tam arşiv kapsamı farklıysa ikisini ayrı yaz; pilot bütün görevi bitirmez.

## Bu adımın sınırı

Kaynak kopya temizliği ve toplu soru yayını bu adımda yapılmaz.

## Başarısızlık ve geri dönüş

Uyumlu eski okuyucu/katalog ve manifestten geri çözümleme; yeni öğrenci kayıtlarını eski dump ile ezme. Yeni referansları yetim bırakma.

Girdi/rapor eskimişse gerekçeyi kaydet; yalnız etkilenmiş iş yeniden açılır.
Ön koşul veya kabul geçmeden tehlikeli sonraki iş yapılmaz. Güvenli bağımsız iş
varsa son kullanıcı talimatının kapsamında sürdür; somut engeli gizleme.

## Durum, BITTI ve devam kaydı

- Başlangıçta görev tablosundaki gerçek durumu güncelle; runtime varsa bu adım,
  kapsam ve son imleçle devam et. Runtime henüz yoksa yapılmış gibi kayıt uydurma.
- Her önemli alt parti/engel/doğrulamada tabloya tamamlanan kapsam, kanıt ve kalan
  tek işi yaz; oturum sonunu bekleme. Ana planın ilgili açık işini de güncelle.
- **Bütün kabul ölçütleri geçince** bu dosyanın başlığına ve ana plandaki
  **15.11 / YKS-11** başlığına `— BITTI` ekle. Görev tablosunda
  `TAMAMLANDI — BITTI` ve gerçek kanıtı yaz. Bu işaret aynı durumun görünümüdür;
  ayrı bir tamamlanma tablosu oluşturma. Biten görev dosyasını silme.
- Kısmi/pilot veya doğrulama bekleyen işe BITTI yazma. Yeniden açılırsa BITTI
  işaretini kaldır ve değişen girdi/hata nedenini `YENIDEN_ACILDI` kaydına ekle.
- Sonraki somut işlem, ilgili adım, gerçek doğrulama sonucu ve kanıt yolu devirde
  bulunmalı. Tüm zincir yetkilendirilmişse uygun sonraki adıma devam et.
