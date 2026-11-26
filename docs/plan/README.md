# İvme yol haritası ve görev durumu

Tek güncel durum kaydı bu dosyadır; ayrıntılı gereksinim yalnız açık adım dosyalarındadır. Etkin/yarım işin devam noktası [devir notunda](../devam.md), teknik sözleşmeler [belge dizinindedir](../README.md). Tarihçe `git log` ve `veri/` altındaki sürümlü raporlardadır.

## Açık adımlar

| Adım | Açık iş ve bağımlılık |
|---|---|
| 7 | [Etiket kalitesi ve insan incelemesi](07-etiket-kalitesi.md); 07.02 alan uzmanı/öğretmen kararı bekler |
| 12 | [Kalan içerik ve yayın](12-icerik-ve-yayin.md); içerik kararları 7. adıma bağlıdır |
| 14 | [KPSS sınavları](14-kpss.md); 14.02 Ön Lisans sıradadır; AGS/ÖABT öğretmenlik ailesine ayrıldı, kaynak envanteri DB'de; tam soru/cevap açıkları kaynak raporunda |
| 16 | [Öğrenme kalitesi, kaynak düzeni ve model kullanımı](16-ogrenme-kalitesi.md); 16.01–16.02 BITTI, 16.03 silme kısmı bitti; 16.04 Hareket v2 kod pilotu GPT-6.1 Sol ile bağlı; ilk19/28 → ara24/28; Opus yeniden denetimi 25/28 teknik PASS; B1, A8, öğretmen onayı ve kullanıcı kabulü bekliyor |

## Açık görevler (durum → kalan tek adım)

| Kimlik | Durum | Kalan |
|---|---|---|
| 12.03 | VPS_YAYINDA_CIHAZ_DOGRULAMA_ACIK | Canlı HTTPS, V105, öğrenci kayıtları, medya ve günlük yedek doğrulandı. Gerçek telefonda öğrenci oturumu ve aktif süre kabulü açık |
| MAT-TYT / 12.02 | SURUYOR (etkin) | Önce TYT konu içerikleri, lab en son; sıradaki konu `node scripts/konu-ogrenme-kapsam.mjs --liste --kontrol` ile bulunur ([liste](../urun/matematik-konu-listesi.md); TYT 29/32) |
| MAT-LAB-02 / 12.02 | BEKLEMEDE | TYT 16/32 lab TEKNİK HAZIR; TYT içerikleri bitince ilk eksik lab `hareket-problemleri` |
| PHYS-PILOT-01, PHYS-INTERACTIVE-02 / 12.02 | Kullanıcı değerlendirmesi bekliyor | `/konuyu-ogrenelim/fizik/hareket-kuvvet` (8 bölüm, MotionLab); kabul `python scripts/ivme.py kalite calistir PHYS-PILOT-01`; kullanıcı onaylamadan başka konuya geçme |
| TAS-08 / 12.12 | KISMI | Öğretmen kararı (8 bölüm, 4 soru) ve görülmemiş öğrenciyle gözlem; `teacherApproved`/`studentTransferObserved` insan girdisi olmadan değişmez |
| TAS-09 / 12.13 | TAMAMLANDI; insan girdisi açık | İki konunun (bölme, EBOB–EKOK) öğretmen incelemesi (`icerik karar`) |
| TAS-10 / 12.14 | KISMI | Brevo'da doğrulanmış gönderen + API anahtarı; yeni kayıttan gerçek alıcıya ulaşma kabulü ([tarif](../tarifler/izleme.md)) |
| TAS-02 / 12.06 | KISMI | Dış makinede webhook/zamanlayıcı kurulumu ve gerçek kesinti/iyileşme bildirimi |
| TAS-11 / 12.15 | Teknik pilot tamam | Protip yaygınlaştırması 12.15'te; öğretmen incelemesi ayrı |

## Kapanan işler (satır korunur, ayrıntı git geçmişinde)

- **YKS-00–13 / 15. adım:** BITTI. Seçili doğrulanabilir kapsamda yeni soru kabulü yok (NEW0); YKS-11 katalog geçişi `labels-v1-297a28c219679f08b8dcbef1`, YKS-12 boş INSERT_ONLY, YKS-13 konum doğrulaması; öğrenci/soru/geçmiş parmak izi değişmedi. Kural özeti [kaynak kaydı tarifinde](../tarifler/kaynak-kaydi.md#yks-kaynak-birleştirme-kapalı).
- **MEBİ/Pratik 2 (MAIN-BANK, PDF-CLOSEOUT ve 15.02–15.07 alt partileri):** BITTI; 11.026 soru ana OGM bankasında; 16.01'de dondu ([soru aktarma tarifi](../tarifler/soru-aktarma.md)).
- **YD-01–05:** yurt dışı öğretmenlik (28 kitapçık, 2.554 etkin soru, Dersler, deneme/pratik, ortak görsel) TAMAMLANDI.
- **TAS-01, 03, 04, 05, 06, 07, 12:** TAMAMLANDI ([kayıt güvenilirliği ve sayım](../sistem/ilerleme.md), [test kanıtı](../tarifler/test-ve-devir.md)); TAS-11.UI protip görünümü TAMAMLANDI.
- **MAT-LAB-01** (tek–çift pilotu), **LEARN-MAP-01** (konu haritası), **ADMIN-01** (yönetici hesabına geçiş), **DENEME-01/02** (TYT/AYT takip tabloları, virgüllü net, yetkili sonuç girişi), **DB-VECTOR-01** (pgvector): TAMAMLANDI.
- **BELGE-01–03:** inceleme ve model seçimi 16. adıma, görev güncelleme kuralı AGENTS.md'ye taşındı; inceleme belgesi silindi.

## Güncelleme kuralı

1. Başlamadan ilgili satırı ve kanıtı oku; kanıtı/girdisi değişmeyen tamamlanmış işi tekrar yapma. Yeniden açma gerekçesini (değişen girdi, hata) satıra yaz.
2. Önemli alt adım sonunda, oturum sonunu beklemeden, bu tabloyu ve ilgili adım dosyasını güncelle: tamamlanan kapsam, gerçek doğrulama komutu/raporu, kalan tek adım. Eksik kabul ölçütü varken TAMAMLANDI yazma; engelde nedenini yaz. Önerilen modeli kullanılmış modelmiş gibi yazma.
3. Kapanan işin maddesini adım dosyasından sil; adım tamamen kapanınca dosyayı ve tablo satırını kaldır (kalan kimlikler yeniden numaralanmaz); kalıcı karar teknik belgeye taşınır. Kullanıcı rolleri yönetimi onaylanmamış tasarımdır ([kullanıcılar](../sistem/kullanicilar.md#onaylanmamış-hedef-uygulama-talimatı-bekler)), açık adım değildir.
4. Hash için ayrı commit üretme; rapor bağlantısı ve doğrulama kaydı aynı commit'te yeterlidir. Takip servisi yoktur: güncelleme görevi yürüten agent'ın sorumluluğudur.
