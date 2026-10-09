# İvme — numaralı iş listesi

**Güncelleme:** 2026-10-09

**Sıradaki tek iş:** **10.01 — Soru tipi/beceri/alt konu/önkoşul taksonomisi ve örnek veri**. 12.05'in doğrulanmış konu bağı için bu önkoşul gerekiyor; [24_12_04_TOPLU_IS_VE_HATA_RAPORU.md](24_12_04_TOPLU_IS_VE_HATA_RAPORU.md) kaynak taraması hazır. 04.07'nin canlı rol kurulumu `postgres` yetkili erişimini bekliyor.

**Durum kaynağı:** Bu liste. [00_YOL_HARITASI.md](00_YOL_HARITASI.md) ürün hedefini ve geniş adımların kabul ölçütlerini, [01_BEST_PRACTICES.md](01_BEST_PRACTICES.md) çalışma kurallarını açıklar. Repo içindeki bu dosya ile `D:\workspace\Computer General\ivme projesi yapilacak olanlar\` kopyası birlikte güncellenir.

## Kullanım ve yeni oturum

- `BITTI`: Kod/belge dilimi tamamlandı ve kayıttaki kapsam doğrulandı. Üst adım, tüm alt maddeleri `BITTI` olmadan bitmiş sayılmaz. `SIRADAKI`: bir sonraki bağımsız iş. `YAPILACAK`: açık iş. `KULLANICI`: ileride kullanıcının kendi ortamında yapacağı işlem.
- Her `NN.NN` işi tek oturumda tamamlanabilecek küçük bir çıktıdır. Aynı alanda kısa işler aynı oturumda sürdürülebilir; **bağlam büyüdüğünde veya bağımsız işe geçerken yeni oturum açmak uygundur, zorunlu değildir**. Yeni oturum önce yalnız bu listeyi, seçilen görev dosyasını, ilgili API/kodu ve `git status` sonucunu okusun.
- İşe başlamadan `SIRADAKI` maddesinin kapsamını ve varsa önceki bağımlılıklarını oku. Fikir değişirse bu listeyi ve görev dosyasını önce güncelle; yeni maddeye yeni numara ver, eski numarayı yeniden kullanma. Bir iş yarım kalırsa `YAPILACAK` kalır; tamamlanan dilimi ve eksiği kısa notla ayır.
- İş bitince ilgili UI durumunu masaüstü/telefonda ve gerekli testi doğrula, görev kaydını ve bu listeyi güncelle, dış kopyayı eşitle, yalnız ilgili dosyaları feature branch'te **yerel commit** yap. **Kullanıcı tüm işler bitip yorum verene kadar GitHub'a push yapma.** Canlı DB/servis üzerinde doğrulanmamış bir özelliği yalnız test DB kanıtıyla canlıya alınmış sayma.
- Her açık iş için **Önerilen model / çaba** sütunundaki seçimi kullan. Yeni oturumdan önce `.codex/config.toml` etkin `SIRADAKI` işin önerisine ayarlanıp aynı yerel commit'e eklenir; ayar yeni oturumda geçerlidir. Etkin oturum modelini proje dosyası değiştirmez; model seçicisi yoksa bu sınır kullanıcıya açıkça söylenir.
- Durum sütunu ve kanıt kısa tutulur; ayrıntı bağlantılı görev belgesinde veya commit'tedir. Yeni oturumun ilk mesajı: `İvme 10.01 ile devam et. Model: GPT-6.1 Sol · High. Önce docs/plan/12_NUMARALI_IS_LISTESI.md ve docs/plan/00_YOL_HARITASI.md dosyalarını oku; yalnız bu işi yap, örnek veriyi doğrula, iki plan kopyasını güncelle, yerel commit yap, push yapma.` Numara/model ilerleyince bu cümledeki numara, model ve dosya adı değiştirilir.

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
| 04.08 | YAPILACAK | Öğrencinin veri dışa aktarma/hesap silme akışı; erişim ve UI kontrolü | [07_GUVENLIK_YETKI.md](07_GUVENLIK_YETKI.md) | GPT-6.1 Sol · High |
| 04.09 | YAPILACAK | Ayrı yerde DB ve soru görseli yedeği ile geri yükleme provası | [08_TUNEL_VE_UI_PROVASI.md](08_TUNEL_VE_UI_PROVASI.md) | GPT-6.1 Sol · Medium |
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
| 06.05 | YAPILACAK | Görünür sekme/boşta kalma süresi ve gerçek cihaz davranışını ölçme | [09_SORU_DENEMELERI.md](09_SORU_DENEMELERI.md) | GPT-6 Luna · Medium |
| 06.06 | YAPILACAK | Onaylı soru tipi/alt konu anlık kaydı ve fayda oyu; etiket yoksa açık boş durum | [09_SORU_DENEMELERI.md](09_SORU_DENEMELERI.md) | GPT-6.1 Sol · Medium |

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
| 07.08 | YAPILACAK | OGM konu PDF'sinden aynı doğrulanmış konunun sorularına geçiş; soru sayısı ve yeni/önceki/yanlış/karışık tercihini hazırla | [15_OGM_PDF_VE_KONU_SORU_BAGI.md](15_OGM_PDF_VE_KONU_SORU_BAGI.md); 10.01, 12.05, 13.05 sonrası | GPT-6.1 Sol · Medium |
| 07.09 | YAPILACAK | Uygun soru havuzunda kolay/orta/zor tercihi, gerçek eşleşme sayısı ve yetersiz havuz durumu | [15_OGM_PDF_VE_KONU_SORU_BAGI.md](15_OGM_PDF_VE_KONU_SORU_BAGI.md); 07.08 sonrası | GPT-6.1 Sol · Medium |
| 07.10 | YAPILACAK | Doğrulanmış alt konu/soru tipi etiketleri geldikten sonra pratik ve sınavda bu filtreleri açma | 10.01 ve soru etiket verisi sonrası; [16_07_05_PRATIK_SECIMI.md](16_07_05_PRATIK_SECIMI.md) | GPT-6 Luna · Medium |

## 08 — Öğrenci istatistikleri

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 08.01 | BITTI | Filtreli toplam/çözülen/kalanın tekil soru kuralıyla hesaplanması | [10_SORU_KAPSAMI.md](10_SORU_KAPSAMI.md) | — (tamamlandı) |
| 08.02 | YAPILACAK | Gün/hafta/ay ilk deneme doğru-yanlış-boş ve zaman dilimi sınırı | [00_YOL_HARITASI.md](00_YOL_HARITASI.md) | GPT-6.1 Sol · Medium |
| 08.03 | YAPILACAK | Ders/konu/soru tipi kırılımı; toplam ile detay ve boş veri eşleşmesi | 08.02 sonrası | GPT-6.1 Sol · Medium |
| 08.04 | YAPILACAK | Aktif süre, giriş ve oturum süresi ayrımı; öğrenci zaman çizelgesi | 06.05 sonrası | GPT-6.1 Sol · Medium |

## 09 — Hedefler

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 09.01 | YAPILACAK | Soru/test/deneme hedefi veri modeli ve dönem kuralı | [00_YOL_HARITASI.md](00_YOL_HARITASI.md) | GPT-6.1 Sol · Medium |
| 09.02 | YAPILACAK | Günlük/haftalık/aylık hedef oluştur/düzenle/durdur UI | 09.01 sonrası | GPT-6 Luna · Medium |
| 09.03 | YAPILACAK | Çift saymayan ilerleme ve gün sonu/zaman dilimi testleri | 09.02 sonrası | GPT-6 Luna · Medium |

## 10 — Zayıf alan önerisi

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| **10.01** | **SIRADAKI** | **Soru tipi → beceri → alt konu → önkoşul taksonomisi ve örnek veri** | [00_YOL_HARITASI.md](00_YOL_HARITASI.md); 12.05 önkoşulu | GPT-6.1 Sol · High |
| 10.02 | YAPILACAK | İlk deneme, süre ve örneklem eşiğiyle açıklanabilir öneri hesabı | 10.01 ve 08.03 sonrası | GPT-6.1 Sol · High |
| 10.03 | YAPILACAK | “Neden?” ve “Şimdi çalış” öğrenci ekranı; yanlış etiket bildirimi | 10.02 sonrası | GPT-6 Luna · Medium |

## 11 — Yönetici toplamları

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 11.01 | YAPILACAK | Kayıtlı/aktif kullanıcı ve dönemlik kullanım toplulaştırması | [00_YOL_HARITASI.md](00_YOL_HARITASI.md) | GPT-6.1 Sol · Medium |
| 11.02 | YAPILACAK | Yalnız toplu yönetici paneli; küçük grup gizleme | 11.01 sonrası | GPT-6.1 Sol · High |
| 11.03 | YAPILACAK | ADMIN/OPERATOR/USER çapraz erişim negatif testleri | 11.02 sonrası | GPT-6.1 Sol · High |

## 12 — Soru PDF iş hattı

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 12.01 | BITTI | Mevcut PDF/PNG hattı envanteri ve dengeli kalite örneği | [21_12_01_PDF_PNG_ENVANTERI.md](21_12_01_PDF_PNG_ENVANTERI.md) | — (tamamlandı) |
| 12.02 | BITTI | Kaynak sayfa/kırpım/metin/şık/cevap/checksum sözleşmesi | [22_12_02_SORU_KAYNAK_SOZLESMESI.md](22_12_02_SORU_KAYNAK_SOZLESMESI.md) | — (tamamlandı) |
| 12.03 | BITTI | Metin katmanı/OCR ve inceleme kuyruğu pilotu | [23_12_03_METIN_OCR_PILOTU.md](23_12_03_METIN_OCR_PILOTU.md) | — (tamamlandı) |
| 12.04 | BITTI | Tekrar çalıştırılabilir toplu iş ve hata raporu; kademeli kaynak taraması | [24_12_04_TOPLU_IS_VE_HATA_RAPORU.md](24_12_04_TOPLU_IS_VE_HATA_RAPORU.md) | — (tamamlandı) |
| 12.05 | YAPILACAK | OGM soru bankası ve mevcut kartların kaynak/konu kimliğini denetle; doğrulanmış PDF–soru bağı ve artımlı katalog | [15_OGM_PDF_VE_KONU_SORU_BAGI.md](15_OGM_PDF_VE_KONU_SORU_BAGI.md); 10.01 ve kaynak envanteri sonrası | GPT-6.1 Sol · Medium |

## 13 — Ders notları

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 13.01 | YAPILACAK | Gelecekteki AI desteği için kaynak PDF sayfası, başlık, konu ve sürümle iç not kayıt biçimi; öğrenci görünümü PDF | [00_YOL_HARITASI.md](00_YOL_HARITASI.md) | GPT-6 Luna · Medium |
| 13.02 | YAPILACAK | AI arka planı için PDF metni/OCR, formül ve tablolarla küçük pilot; öğrenci görünümü PDF | 13.01 sonrası | GPT-6.1 Sol · Medium |
| 13.03 | YAPILACAK | İçerik aramasında kaynaklı 1–3 pasaj ve doğru PDF sayfasına dönüş denetimi; öğrenciye ayrı metin notu açma kararı yok | 13.02 sonrası | GPT-6.1 Sol · Medium |
| 13.04 | YAPILACAK | OGM konu anlatımı PDF'lerinin artımlı kataloğu: tür, ders, sınav, konu, kaynak yolu ve checksum | [15_OGM_PDF_VE_KONU_SORU_BAGI.md](15_OGM_PDF_VE_KONU_SORU_BAGI.md); 10.01 ve 12.05 ile eşgüdüm | GPT-6 Luna · Medium |
| 13.05 | YAPILACAK | Öğrenci menüsünde “Konu anlatımları”, filtreli liste ve yalnız özgün PDF'yi güvenli satır içi açma | [15_OGM_PDF_VE_KONU_SORU_BAGI.md](15_OGM_PDF_VE_KONU_SORU_BAGI.md); 13.04 sonrası | GPT-6.1 Sol · High |

## 14 — AI etiketleme

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 14.01 | YAPILACAK | 200–500 insan etiketli, dengeli örnek ve izinli taksonomi | 10.01 ve 12.02 sonrası | GPT-6 Luna · Medium |
| 14.02 | YAPILACAK | Sürümlü AI taslağı, belirsizlik ve inceleme ekranı pilotu | 14.01 sonrası | GPT-6.1 Sol · Medium |
| 14.03 | YAPILACAK | Ders/tip bazlı doğruluk, maliyet ve ölçek kararı | 14.02 sonrası | GPT-6.1 Sol · Medium |

## 15 — Kaynaklı ipucu

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 15.01 | YAPILACAK | Onaylı soru/not kaynağıyla kısa ipucu veri modeli | 13.03 ve 14.02 sonrası | GPT-6.1 Sol · Medium |
| 15.02 | YAPILACAK | Pratikte istekli ipucu, sınavda teslim sonrası açıklama UI | 15.01 sonrası | GPT-6 Luna · Medium |
| 15.03 | YAPILACAK | Uzman incelemesi ve yararlı/hatalı geri bildirimi | 15.02 sonrası | GPT-6 Luna · Low |

## 16 — Pilot ve büyüme

| No | Durum | Tek çıktı / kontrol | Kanıt | Önerilen model / çaba |
|---|---|---|---|---|
|---|---|---|---|
| 16.01 | YAPILACAK | Yaklaşık 50 kişilik davetli pilot ve kritik akış ölçümü | 04/05 güvenlik kapıları sonrası | GPT-6.1 Sol · Medium |
| 16.02 | YAPILACAK | Performans, erişilebilirlik, yedek geri yükleme ve içerik hata raporu | 16.01 sonrası | GPT-6 Astra · Medium |
| 16.03 | YAPILACAK | Bulgulara göre yeni numaralı işler ve büyüme kararı | 16.02 sonrası | GPT-6 Luna · Medium |

**Bu dosya yaşayan iş listesidir; açık işler bulunduğu için BITTI değildir.**
