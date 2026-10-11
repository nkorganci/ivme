# İvme — numaralı iş listesi

**Güncelleme:** 2026-10-10

**Sıradaki bağımsız iş:** Şu an açık bağımlılıklardan bağımsız uygulanabilecek yeni madde yok. 15.04 aktarım kodu test DB'de tamamlandı; gerçek onaylı ipucu yoktur. Kullanıcının 10 Ekim kararıyla 200 AI tipi geliştirme sırasında **AI geçici kabul** olarak kullanılabilir; 200'ü de `DEVELOPMENT_ONLY` ve `human_review_required=true` olarak ayrı çıktıya alındı. Ana CSV'de 0/200 insan onayı sürer; AI öğretmen onayı diye kaydedilmez. 14.01 ve 14.03 Türkçe öğretmeninin kararını, 15.03 gerçek onaylı not/ipucu ve uzman denetimini bekler. 06.05 ve 05.05 gerçek cihazı, 04.09 ayrı yedek hedefini, 07.09 doğrulanmış zorluk verisini, 04.07 yetkili PostgreSQL erişimini bekler. 16 pilotu 04/05 güvenlik ve yayın kapılarından sonradır.

**Durum kaynağı:** Bu liste. [00_YOL_HARITASI.md](00_YOL_HARITASI.md) ürün hedefini ve geniş adımların kabul ölçütlerini, [01_BEST_PRACTICES.md](01_BEST_PRACTICES.md) çalışma kurallarını açıklar. Plan yalnız repo içindeki `docs/plan` altında güncellenir.

## YAPILMASI GEREKENLER — insan incelemesi

| Kim | Yapılacak işlem | Tamamlanma kanıtı |
|---|---|---|
| Türkçe öğretmeni | [Çevrimdışı Türkçe paketindeki](54_14_01_OGRETMEN_INCELEME_DEVRI.md) 200 TYT Türkçe soru görselini bağımsız inceleyip tip, kısa gerekçe veya belirsizlik/ret nedeni kaydeder; son JSON karar dosyasını kullanıcıya verir. İlk 63 soru önceliklidir, ardından kalan 137 soru da incelenir. | 200 kararın paket kimliği, soru/görsel özeti, öğretmen kimliği ve gerekçeyle doğrulanması; 14.01 insan etiket sayımı. |
| Kullanıcı / Codex | Öğretmene `veri/ogretmen-inceleme-tyt-turkce-200.zip` dosyasını iletir. Dönen JSON'u `scripts/ogretmen-inceleme-aktar.py` ile önce kuru denetler, sonra ana CSV'ye aktarır; AI/öğretmen ayrımlarını 14.03'te ölçer. | [14.01 devri](54_14_01_OGRETMEN_INCELEME_DEVRI.md) ve [14.03 raporu](53_14_03_DOGRULUK_MALIYET_OLCEK.md). |
| Fizik için kullanıcı; diğer dersler için ilgili branş öğretmeni | O dersin taksonomisi ve kaynaklı örneklem hazırlandığında görselleri bağımsız etiketler. Türkçe tip kodları başka derse uygulanmaz. | Her ders için ayrı insan karar dosyası ve sınıf bazlı AI karşılaştırması. |
| Branş öğretmeni ve içerik editörü | Öğrenciye açılacak gerçek ders notunun konusunu/kaynağını ve kısa ipucunun doğruluğunu, cevap sızıntısını ayrı ayrı onaylar. | [15.04 aktarım kapısının](57_15_04_IPUCU_GUVENLI_AKTARIM.md) kabul ettiği gerçek onaylı JSON; 15.03 içerik denetimi. |

**Şimdiki durum:** Türkçe CSV'de 200 AI ön incelemesi vardır, **0/200 insan onayı** vardır. AI notlarıyla pilot inceleme yapılabilir; doğruluk, altın etiket ve geniş ölçek kararı için öğretmen kararları gerekir. Kullanıcının Türkçe sorularını bizzat etiketlemesi beklenmez.

**10 Ekim geçici kabul:** 200 Ollama etiketi geliştirme/test akışlarında öğretmen etiketinin geçici yerine kullanılabilir. [AI geçici çıktı](56_15_02_IPUCU_ACIKLAMA_AKISI.md) `veri/ai-gecici-etiket-200.csv` dosyasına ayrı üretilir; gerçek `reviewer_id`, `review_status=approved`, altın doğruluk ve öğrenciye yayın onayı **verilmez**. Türkçe öğretmeni geldiğinde 63 öncelikli soru dahil 200'ün tamamı yeniden kontrol edilir. Ders notu/editör ipucu onayı da bu karardan bağımsızdır.

## Kullanım ve yeni oturum

- `BITTI`: Kod/belge dilimi tamamlandı ve kayıttaki kapsam doğrulandı. Üst adım, tüm alt maddeleri `BITTI` olmadan bitmiş sayılmaz. `SIRADAKI`: bir sonraki bağımsız iş. `YAPILACAK`: açık iş. `KULLANICI`: ileride kullanıcının kendi ortamında yapacağı işlem.
- Her `NN.NN` işi tek oturumda tamamlanabilecek küçük bir çıktıdır. Aynı alanda kısa işler aynı oturumda sürdürülebilir; **bağlam büyüdüğünde veya bağımsız işe geçerken yeni oturum açmak uygundur, zorunlu değildir**. Yeni oturum önce yalnız bu listeyi, seçilen görev dosyasını, ilgili API/kodu ve `git status` sonucunu okusun.
- İşe başlamadan `SIRADAKI` maddesinin kapsamını ve varsa önceki bağımlılıklarını oku. Fikir değişirse bu listeyi ve görev dosyasını önce güncelle; yeni maddeye yeni numara ver, eski numarayı yeniden kullanma. Bir iş yarım kalırsa `YAPILACAK` kalır; tamamlanan dilimi ve eksiği kısa notla ayır.
- İş bitince ilgili UI durumunu masaüstü/telefonda ve gerekli testi doğrula, görev kaydını ve bu listeyi repo içinde güncelle, yalnız ilgili dosyaları feature branch'te **yerel commit** yap. **Kullanıcı tüm işler bitip yorum verene kadar GitHub'a push yapma.** Canlı DB/servis üzerinde doğrulanmamış bir özelliği yalnız test DB kanıtıyla canlıya alınmış sayma.
- **Önerilen model / çaba** sütunu varsayılandır, zorunluluk değildir. Yerel Ollama modeli sınırlı ve doğrulanabilir toplu taslak işlerinde kullanılabilir; kod, güvenlik ve yayın kararlarında test/inceleme kapısı korunur. `.codex/config.toml` yeni oturum için varsayılan model önerisini taşır; açık oturumun modelini değiştirmez. Yerel modelle çalışan ayrı bir Codex CLI oturumu (`--oss`) bu sohbetin modelini veya token kullanımını geriye dönük değiştirmez.
- Durum sütunu ve kanıt kısa tutulur; ayrıntı bağlantılı görev belgesinde veya commit'tedir. Yeni oturumda önce bu listedeki açık bağımlılıkları ve kullanıcıdan gelen yeni kanıtları kontrol et; bağımlılığı çözülen ilk maddeyi uygula. Gerçek insan onayı olmadan 14.01/14.03/15.03 veya içerik yayınına `BITTI` yazma.

## 01 — Envanter ve Git

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 01.01 | BITTI | Kod, eski site, veri hattı ve ekranların mevcut durum envanteri | [04_MEVCUT_DURUM.md](04_MEVCUT_DURUM.md) | — (tamamlandı) |
| 01.02 | BITTI | Feature branch ve doğru `ivme` remote ayrımı; eski çalışma korunumu | [04_MEVCUT_DURUM.md](04_MEVCUT_DURUM.md) | — (tamamlandı) |

## 02 — Veritabanı temeli

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 02.01 | BITTI | `ivme` DB, eski verinin kopyası ve temel Flyway şeması | [05_VERITABANI_GECISI.md](05_VERITABANI_GECISI.md) | — (tamamlandı) |
| 02.02 | BITTI | Yedek ve geçici DB'de geri yükleme provası | [05_VERITABANI_GECISI.md](05_VERITABANI_GECISI.md) | — (tamamlandı) |
| 02.03 | BITTI | Gerçek `ivme` DB'de V9 pratik göçü, sayım ve yeni yedek | [09_SORU_DENEMELERI.md](09_SORU_DENEMELERI.md) | — (tamamlandı) |

## 03 — Tasarım sözleşmesi

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 03.01 | BITTI | Soru ekranı yerleşimi ve mor vurgu onayı; 1280/390 px prototip | [06_TASARIM_SOZLESMESI.md](06_TASARIM_SOZLESMESI.md) | — (tamamlandı) |
| 03.02 | BITTI | Ortak bileşen erişilebilirlik temeli: klavye/odak, etiketli durumlar, 16 px metin ve 44 px hedefler | [18_03_02_ERISILEBILIR_BILESEN_DENETIMI.md](18_03_02_ERISILEBILIR_BILESEN_DENETIMI.md) | — (tamamlandı) |

## 04 — Hesap, yetki ve güvenlik

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 04.01 | BITTI | Kullanıcı adı/şifre/e-posta/telefon kayıt akışı ve hesap tamamlama | [03_KAYIT_VE_ILETISIM.md](03_KAYIT_VE_ILETISIM.md) | — (tamamlandı) |
| 04.02 | BITTI | `ivmeadmin` toplu istatistik, `ivmeoperator` içerik bakımı rol ayrımı | [07_GUVENLIK_YETKI.md](07_GUVENLIK_YETKI.md) | — (tamamlandı) |
| 04.03 | BITTI | CSRF, oturum, hız sınırı, güvenli çerez/HSTS ve görsel yol sınırı için uygulanmış ilk korumalar | [07_GUVENLIK_YETKI.md](07_GUVENLIK_YETKI.md) | — (tamamlandı) |
| 04.04 | BITTI | Ham etkinlik kayıtlarına 90 gün saklama | [07_GUVENLIK_YETKI.md](07_GUVENLIK_YETKI.md) | — (tamamlandı) |
| 04.05 | BITTI | Yeni API'lerin iki hesapla nesne sahipliği ve negatif erişim denetimi; UI'da erişim yok | [07_GUVENLIK_YETKI.md](07_GUVENLIK_YETKI.md) | — (tamamlandı) |
| 04.06 | KULLANICI | İki yetkili hesabın geçici parolasını ayrı, güçlü parolalarla Hesap ekranından değiştirme; sonra üretim açılışı | [07_GUVENLIK_YETKI.md](07_GUVENLIK_YETKI.md) | Kullanıcı · model gerekmez |
| 04.07 | YAPILACAK | Uygulamaya sınırlı PostgreSQL rolü ve gizli ayar denetimi; kurulum yetkili hesap bekliyor | [20_04_07_SINIRLI_DB_ROLU.md](20_04_07_SINIRLI_DB_ROLU.md) | GPT-6.1 Sol · High |
| 04.08 | BITTI | Öğrencinin veri dışa aktarma/hesap silme akışı; erişim ve UI kontrolü | [30_04_08_VERI_DISA_AKTARMA_SILME.md](30_04_08_VERI_DISA_AKTARMA_SILME.md) | — (tamamlandı) |
| 04.09 | YAPILACAK | Ayrı yerde DB ve soru görseli yedeği ile geri yükleme provası; aynı disk provası geçti, ayrı hedef bekliyor | [31_04_09_YEDEK_PROVASI.md](31_04_09_YEDEK_PROVASI.md) | GPT-6.1 Sol · Medium |
| 04.10 | BITTI | Kullanıcı isteğiyle kayıt, parola değiştirme ve yönetici oluşturma alt sınırını 8 karaktere eşitleme | [03_KAYIT_VE_ILETISIM.md](03_KAYIT_VE_ILETISIM.md) | — (tamamlandı) |

## 05 — Yerel yayın ve tünel

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 05.01 | BITTI | `net.ivme.dev` → `localhost:5173` rotası; aynı kökende paket ve tünel provası | [08_TUNEL_VE_UI_PROVASI.md](08_TUNEL_VE_UI_PROVASI.md) | — (tamamlandı) |
| 05.02 | BITTI | Normal tarayıcıdan alan adının açılması (kullanıcı gözlemi); genel uygulama kabulü değildir | Kullanıcı bildirimi | — (tamamlandı) |
| 05.03 | YAPILACAK | Gerçek DB yedeği sonrası V10–V13'ü kontrollü uygulama; canlı API ve UI doğrulama | [09_SORU_DENEMELERI.md](09_SORU_DENEMELERI.md), [16_07_05_PRATIK_SECIMI.md](16_07_05_PRATIK_SECIMI.md) | GPT-6.1 Sol · High |
| 05.04 | YAPILACAK | Üretim paketinin kalıcı başlatma, uyku/yeniden başlama ve hata sonrası dönüş provası | [08_TUNEL_VE_UI_PROVASI.md](08_TUNEL_VE_UI_PROVASI.md) | GPT-6.1 Sol · Medium |
| 05.05 | YAPILACAK | Gerçek telefon/dış ağda giriş, soru, QR, oturum ve güvenli çerez akışı | [08_TUNEL_VE_UI_PROVASI.md](08_TUNEL_VE_UI_PROVASI.md) | GPT-6.1 Sol · High |

## 06 — Soru başına çözüm

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 06.01 | BITTI | İlk/tekrar deneme ve idempotent kalıcı cevap kaydı; iki hesap testi | [09_SORU_DENEMELERI.md](09_SORU_DENEMELERI.md) | — (tamamlandı) |
| 06.02 | BITTI | Tekrar dene, cevabı göster ve atla olayları; eski ilk denemeyi koruma | [09_SORU_DENEMELERI.md](09_SORU_DENEMELERI.md) | — (tamamlandı) |
| 06.03 | BITTI | Soruya ve kullanıcıya bağlı karalama; masaüstü/mobil prova | [09_SORU_DENEMELERI.md](09_SORU_DENEMELERI.md) | — (tamamlandı) |
| 06.04 | BITTI | Pratik denemeyi `study_session` ile ilişkilendirme; yenilemede geçmiş ve UI | [14_07_04_OTURUM_DENEMELERI.md](14_07_04_OTURUM_DENEMELERI.md) | — (tamamlandı) |
| 06.05 | YAPILACAK | Görünür sekme/boşta kalma süresi ve gerçek cihaz davranışını ölçme; sayaç düzeltmesi geçti, fiziksel cihaz açık | [32_06_05_AKTIF_SURE.md](32_06_05_AKTIF_SURE.md) | GPT-6 Luna · Medium |
| 06.06 | BITTI | Onaylı soru tipi/alt konu anlık kaydı ve fayda oyu; etiket yoksa açık boş durum | [33_06_06_ETIKET_ANLIK_KAYIT_FAYDA_OYU.md](33_06_06_ETIKET_ANLIK_KAYIT_FAYDA_OYU.md) | — (tamamlandı) |

## 07 — Soru ve oturum seçimi

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 07.01 | BITTI | Filtreye göre toplam/yeni/çözülen/yanlış sayısı ve boş durum | [10_SORU_KAPSAMI.md](10_SORU_KAPSAMI.md) | — (tamamlandı) |
| 07.02 | BITTI | Sınav kurucusunda yeni/önceki/yanlış/karışık seçim ve sayı-süre koruması | [11_SINAV_SORU_SECIMI.md](11_SINAV_SORU_SECIMI.md) | — (tamamlandı) |
| 07.03 | BITTI | Süresiz pratik oturumu oluştur/sürdür; tekil soru sırasını koru, yenilemede devam et | [13_07_03_PRATIK_OTURUMU.md](13_07_03_PRATIK_OTURUMU.md) | — (tamamlandı) |
| 07.04 | BITTI | Oturum sorusuna cevap denemesi bağlama, sonraki/önceki ve tamamlanan soru durumu | [14_07_04_OTURUM_DENEMELERI.md](14_07_04_OTURUM_DENEMELERI.md) | — (tamamlandı) |
| 07.05 | BITTI | Pratikte dört aday modu, kaynak/sınav/ders/konu filtresi ve yetersiz havuz uyarısı; alt konu/tip veri envanteri | [16_07_05_PRATIK_SECIMI.md](16_07_05_PRATIK_SECIMI.md) | — (tamamlandı) |
| 07.06 | BITTI | Süreli pratik sayacı, süre bitişi, boş sorular ve sonuç; sınav kuralından ayrı | [17_07_06_SURELI_PRATIK.md](17_07_06_SURELI_PRATIK.md) | — (tamamlandı) |
| 07.07 | BITTI | Pratik oturum geçmişi/yeniden açma; hesap ve telefonda boş/hata durumları | [19_07_07_PRATIK_GECMISI.md](19_07_07_PRATIK_GECMISI.md) | — (tamamlandı) |
| 07.08 | BITTI | OGM konu PDF'sinden doğrulanmış üç soru kimliğiyle pratik/test kurucusuna geçiş; sayı ve geçmiş tercihi, kapsam kilidi | [29_07_08_PDF_SORU_GECISI.md](29_07_08_PDF_SORU_GECISI.md) | — (tamamlandı) |
| 07.09 | YAPILACAK | Uygun soru havuzunda kolay/orta/zor tercihi, gerçek eşleşme sayısı ve yetersiz havuz durumu; güvenilir etiket/örneklem bekliyor | [15_OGM_PDF_VE_KONU_SORU_BAGI.md](15_OGM_PDF_VE_KONU_SORU_BAGI.md); 07.08 sonrası | GPT-6.1 Sol · Medium |
| 07.10 | YAPILACAK | Doğrulanmış alt konu/soru tipi etiketleri geldikten sonra pratik ve sınavda bu filtreleri açma | 10.01 ve soru etiket verisi sonrası; [16_07_05_PRATIK_SECIMI.md](16_07_05_PRATIK_SECIMI.md) | GPT-6 Luna · Medium |

## 08 — Öğrenci istatistikleri

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 08.01 | BITTI | Filtreli toplam/çözülen/kalanın tekil soru kuralıyla hesaplanması | [10_SORU_KAPSAMI.md](10_SORU_KAPSAMI.md) | — (tamamlandı) |
| 08.02 | BITTI | Gün/hafta/ay ilk deneme doğru-yanlış-boş ve zaman dilimi sınırı | [34_08_02_ILK_DENEME_DONEMLERI.md](34_08_02_ILK_DENEME_DONEMLERI.md) | — (tamamlandı) |
| 08.03 | BITTI | Ders/konu/soru tipi kırılımı; toplam ile detay ve boş veri eşleşmesi | [35_08_03_ISTATISTIK_KIRILIMLARI.md](35_08_03_ISTATISTIK_KIRILIMLARI.md) | — (tamamlandı) |
| 08.04 | BITTI | Aktif süre, giriş ve oturum süresi ayrımı; fiziksel ölçüm 06.05'te açık | [36_08_04_ZAMAN_CIZELGESI.md](36_08_04_ZAMAN_CIZELGESI.md) | — (tamamlandı) |

## 09 — Hedefler

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 09.01 | BITTI | Soru/test/deneme hedefi veri modeli ve dönem kuralı | [37_09_01_HEDEF_DONEM_MODELI.md](37_09_01_HEDEF_DONEM_MODELI.md) | — (tamamlandı) |
| 09.02 | BITTI | Günlük/haftalık/aylık hedef oluştur/düzenle/durdur UI | [38_09_02_HEDEF_YONETIMI.md](38_09_02_HEDEF_YONETIMI.md) | — (tamamlandı) |
| 09.03 | BITTI | Çift saymayan ilerleme ve gün sonu/zaman dilimi testleri | [39_09_03_HEDEF_ILERLEMESI.md](39_09_03_HEDEF_ILERLEMESI.md) | — (tamamlandı) |
| 09.04 | BITTI | Bugün ve hafta hedeflerinin açık görünümü; kaçırılan güne yargılayıcı olmayan öneri | [40_09_04_HEDEF_OZETI.md](40_09_04_HEDEF_OZETI.md) | — (tamamlandı) |
| 09.05 | BITTI | Excel kökenli günlük/haftalık/aylık çalışma planı, deneme ve konu takvimini ayrı takip panelinde göster | [58_09_05_ILERLEME_TAKIP_PANELI.md](58_09_05_ILERLEME_TAKIP_PANELI.md) | — (tamamlandı) |

## 10 — Zayıf alan önerisi

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 10.01 | BITTI | Soru tipi → beceri → alt konu → önkoşul taksonomisi ve 50 gerçek kodlu taslak örnek | [25_10_01_TAKSONOMI_VE_ORNEK.md](25_10_01_TAKSONOMI_VE_ORNEK.md) | — (tamamlandı) |
| 10.02 | BITTI | İlk deneme, süre ve örneklem eşiğiyle açıklanabilir öneri hesabı | [41_10_02_ZAYIF_ALAN_HESABI.md](41_10_02_ZAYIF_ALAN_HESABI.md) | — (tamamlandı) |
| 10.03 | BITTI | “Neden?” ve “Şimdi çalış” öğrenci ekranı; yanlış etiket bildirimi | [42_10_03_ONERI_EKRANI.md](42_10_03_ONERI_EKRANI.md) | — (tamamlandı) |

## 11 — Yönetici toplamları

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 11.01 | BITTI | Kayıtlı/aktif kullanıcı ve dönemlik kullanım toplulaştırması | [43_11_01_TOPLU_KULLANIM_HESABI.md](43_11_01_TOPLU_KULLANIM_HESABI.md) | — (tamamlandı) |
| 11.02 | BITTI | Yalnız toplu yönetici paneli; küçük grup gizleme | [44_11_02_YONETICI_GIZLILIK_PANOSU.md](44_11_02_YONETICI_GIZLILIK_PANOSU.md) | — (tamamlandı) |
| 11.03 | BITTI | ADMIN/OPERATOR/USER çapraz erişim negatif testleri | [45_11_03_ROL_SINIRI.md](45_11_03_ROL_SINIRI.md) | — (tamamlandı) |
| 11.04 | BITTI | Etkin ve koleksiyona atanmış soru kapsamının yalnız toplu yönetici sayıları | [46_11_04_ICERIK_KAPSAMI.md](46_11_04_ICERIK_KAPSAMI.md) | — (tamamlandı) |
| 11.05 | BITTI | Temel hizmet hatalarının anonim dönemlik ölçümü ve yönetici görünümü | [47_11_05_ANONIM_HATA_OLCUMU.md](47_11_05_ANONIM_HATA_OLCUMU.md) | — (tamamlandı) |

## 12 — Soru PDF iş hattı

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 12.01 | BITTI | Mevcut PDF/PNG hattı envanteri ve dengeli kalite örneği | [21_12_01_PDF_PNG_ENVANTERI.md](21_12_01_PDF_PNG_ENVANTERI.md) | — (tamamlandı) |
| 12.02 | BITTI | Kaynak sayfa/kırpım/metin/şık/cevap/checksum sözleşmesi | [22_12_02_SORU_KAYNAK_SOZLESMESI.md](22_12_02_SORU_KAYNAK_SOZLESMESI.md) | — (tamamlandı) |
| 12.03 | BITTI | Metin katmanı/OCR ve inceleme kuyruğu pilotu | [23_12_03_METIN_OCR_PILOTU.md](23_12_03_METIN_OCR_PILOTU.md) | — (tamamlandı) |
| 12.04 | BITTI | Tekrar çalıştırılabilir toplu iş ve hata raporu; kademeli kaynak taraması | [24_12_04_TOPLU_IS_VE_HATA_RAPORU.md](24_12_04_TOPLU_IS_VE_HATA_RAPORU.md) | — (tamamlandı) |
| 12.05 | BITTI | OGM kart kaynak/konu kimliği denetimi, sayfa bağı örneği ve artımlı inceleme kataloğu | [26_12_05_OGM_KAYNAK_KONU_BAGI.md](26_12_05_OGM_KAYNAK_KONU_BAGI.md) | — (tamamlandı) |

## 13 — Ders notları

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 13.01 | BITTI | Gelecekteki AI desteği için kaynak PDF sayfası, başlık, konu ve sürümle iç not kayıt biçimi; öğrenci görünümü PDF | [48_13_01_IC_NOT_KAYIT_BICIMI.md](48_13_01_IC_NOT_KAYIT_BICIMI.md) | — (tamamlandı) |
| 13.02 | BITTI | AI arka planı için PDF metni/OCR, formül ve tablolarla küçük pilot; öğrenci görünümü PDF | [49_13_02_KONU_PDF_METIN_OCR_PILOTU.md](49_13_02_KONU_PDF_METIN_OCR_PILOTU.md) | — (tamamlandı) |
| 13.03 | BITTI | İçerik aramasında kaynaklı 1–3 pasaj ve doğru PDF sayfasına dönüş denetimi; öğrenciye ayrı metin notu açma kararı yok | [50_13_03_KAYNAKLI_PASAJ_ARAMASI.md](50_13_03_KAYNAKLI_PASAJ_ARAMASI.md) | — (tamamlandı) |
| 13.04 | BITTI | OGM konu PDF'lerinin tür, ders, sınav, göreli yol ve checksum artımlı kataloğu | [27_13_04_OGM_KONU_PDF_KATALOGU.md](27_13_04_OGM_KONU_PDF_KATALOGU.md) | — (tamamlandı) |
| 13.05 | BITTI | Öğrenci menüsünde “Konu anlatımları”, filtreli liste ve özgün PDF'yi güvenli açma | [28_13_05_KONU_PDF_GORUNTULEME.md](28_13_05_KONU_PDF_GORUNTULEME.md) | — (tamamlandı) |

## 14 — AI etiketleme

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 14.01 | YAPILACAK | 200–500 insan etiketli örnek; 200 geçici kabul, 0 gerçek insan onayı | [51_14_01_INSAN_ETIKETLI_ALTIN_ORNEK.md](51_14_01_INSAN_ETIKETLI_ALTIN_ORNEK.md) | GPT-6 Luna · Medium |
| 14.02 | BITTI | Sürümlü gerçek yerel modelde 7 görsel taslak, belirsizlik/çatışma ve masaüstü/mobil inceleme ekranı pilotu | [52_14_02_AI_TASLAK_VE_INCELEME.md](52_14_02_AI_TASLAK_VE_INCELEME.md) | — (tamamlandı) |
| **14.03** | **DEVAM** | **200 soruluk iki AI geçişi, 15 AI QA düzeltmesi, 63 öncelikli kontrol; insan altın etiketi ve doğruluk kararı bekleniyor** | [53_14_03_DOGRULUK_MALIYET_OLCEK.md](53_14_03_DOGRULUK_MALIYET_OLCEK.md) | GPT-6.1 Sol · Medium |
| 14.04 | BITTI | 200 AI etiketini öğretmen kaydıyla karıştırmadan geliştirme için ayrı geçici çıktıya al | [56_15_02_IPUCU_ACIKLAMA_AKISI.md](56_15_02_IPUCU_ACIKLAMA_AKISI.md) | — (tamamlandı) |

## 15 — Kaynaklı ipucu

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 15.01 | BITTI | Onaylı soru/not kaynağıyla kısa ipucu veri modeli ve yerel yayın kapısı | [55_15_01_KAYNAKLI_IPUCU_VERI_MODELI.md](55_15_01_KAYNAKLI_IPUCU_VERI_MODELI.md) | — (tamamlandı) |
| 15.02 | BITTI | Pratikte istekli ipucu, sınavda teslim sonrası açıklama UI; onaysız içerik kapalı | [56_15_02_IPUCU_ACIKLAMA_AKISI.md](56_15_02_IPUCU_ACIKLAMA_AKISI.md) | — (tamamlandı) |
| 15.03 | YAPILACAK | Gerçek kaynaklı ipucunda uzman incelemesi ve yararlı/hatalı geri bildirimi; onaylı içerik bekliyor | 15.02 ve 15.04 sonrası | GPT-6 Luna · Low |
| 15.04 | BITTI | Onaylı ipucunu 15.01 kapısından ve DB insan tipi denetiminden geçirerek V18'e aktarma; yalnız sentetik test, gerçek içerik yok | [57_15_04_IPUCU_GUVENLI_AKTARIM.md](57_15_04_IPUCU_GUVENLI_AKTARIM.md) | — (tamamlandı) |

## 16 — Pilot ve büyüme

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 16.01 | YAPILACAK | Yaklaşık 50 kişilik davetli pilot ve kritik akış ölçümü | 04/05 güvenlik kapıları sonrası | GPT-6.1 Sol · Medium |
| 16.02 | YAPILACAK | Performans, erişilebilirlik, yedek geri yükleme ve içerik hata raporu | 16.01 sonrası | GPT-6 Astra · Medium |
| 16.03 | YAPILACAK | Bulgulara göre yeni numaralı işler ve büyüme kararı | 16.02 sonrası | GPT-6 Luna · Medium |

**Bu dosya yaşayan iş listesidir; açık işler bulunduğu için BITTI değildir.**
