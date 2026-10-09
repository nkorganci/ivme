# İvme — uygulama ilkeleri ve düşük maliyetli AI çalışma yöntemi

Bu belge [yol haritası](00_YOL_HARITASI.md) ile birlikte güncellenir. Mevcut kodun sözleşmesi [API ve mimari](../API-ve-mimari.md) belgesindedir; çelişki görülürse ilgili adımda kod, API belgesi ve bu plan birlikte düzeltilir.

## 1. Gereken kadar mimari

| Alan | İlk 50 kullanıcı için karar | Büyüme tetikleyicisi |
|---|---|---|
| Ön yüz | Var olan React/Vite, ortak tasarım bileşenleri, mobil ve klavye desteği | Gerçek performans ölçümü iyileştirme gösterirse kod bölme |
| API | Var olan Java/Spring Boot modüler tek uygulama; iş kuralları servislerde | Bağımsız dağıtım ihtiyacı kanıtlanırsa ayırma |
| Veri | PostgreSQL `ivme`, Flyway göçleri, transaction ve indeksler | Ölçülmüş yavaş sorgular için indeks/önbellek/ölçek |
| Medya | Soru görseli dosyada, DB'de yalnız kimlik/yol/checksum; görüntü için uygun boyut | Disk veya aktarım darboğazında R2/S3 benzeri nesne deposu |
| PDF/AI işleri | Mevcut Python veri hattı, çevrimdışı ve tekrar çalıştırılabilir işler | Kuyruk/ayrı işçi ancak birikim ve gecikme ölçülünce |
| Arama | Önce konu filtresi ve PostgreSQL tam metin araması | Gerçek arama başarısızlığı ölçülürse embedding/vektör araması |

Tek köken: tarayıcı aynı `net.ivme.dev` adresinden arayüz ve `/api`yi alır. Yerelde `localhost:8081` üretim biçiminde prova edilir. `net.ivme.dev` tünelinin origin'i yerel süreçtir; veritabanı veya Vite geliştirme sunucusu dışarı açılmaz. Tünel erişim kontrolünün uygulama içi yetkilendirmeyi değiştirmediği kabul edilir.

## 2. Veri doğruluğu

- `question_id` değişmezdir. Kaynak PDF kimliği, sayfa, kırpım koordinatı, sınav/koleksiyon, sürüm, soru metni, görsel ve cevap ayrı alanlardır. Soru düzeltmesi eski öğrenci denemesini yeniden puanlamaz; cevap anındaki doğru cevap veya soru sürümü deneme kaydında korunur.
- `attempt_id` tekil; istemci ağ tekrarında aynı idempotency anahtarıyla gönderir. Sunucu zamanı (`timestamptz`, UTC) asıldır. Kullanıcı saat dilimi yalnız rapor dönemini belirler.
- İlk deneme doğruluğu, en son deneme doğruluğu, tekrar sayısı ve benzersiz soru sayısı ayrı ölçüdür. “Toplam soru”, “çözdüm”, “kalan” her ekranda aynı tanımı kullanır. Silinmiş/pasif soru rapor geçmişini yok etmez.
- Aktif süre yalnız görünür ve etkileşimli aralıkların toplamıdır; sunucuda olağandışı değerler sınırlandırılır. Okuma, çözme ve oturum açık kalma süresi aynı metrik değildir.
- İstatistik sorgularında kullanıcı sahipliği veritabanı düzeyine kadar korunur; testlerde iki farklı hesapla çapraz erişim denenir. Yönetici toplamları ile öğrenci kişisel panosu ayrı servislerdir.
- Her kategoriye makine tarafından anlaşılır sabit kimlik ver; görünen ad değişebilir. `exam_type` sabit `TYT/AYT` enumu olarak büyümeye zorlanmaz; taksonomi veri tablosu ve sürümle genişler. Soru birden çok beceri etiketi alabilir; bir ana konu da bulunur.

## 3. Soru/PDF ve ders notu iş hattı

1. Kaynağı değişmeden sakla: PDF, hak/lisans notu, indirme tarihi, SHA-256. Web'e veya AI hizmetine aktarım hakkı doğrulanmadan kaynak yayınlama.
2. PDF metin katmanı varsa doğrudan metin çıkar; yoksa sayfa görselinde OCR uygula. Soru görselini ayrı koru. Metin, şık, formül, şekil, tablo ve cevap anahtarını tek bir düz metne körlemesine birleştirme.
3. Normalleştirilmiş soru kaydı: `id`, kaynak, sayfa, kırpım, sınav, ders, konu, alt konu, soru tipi, soru/şık metni, doğru cevap, çözüm, görsel yolu, güven/inceleme durumu. Eksik alan `null` kalır; uydurulmaz.
4. Not kaydı: `note_id`, kaynak PDF/sayfa, başlık zinciri, konu kimliği, metin/Markdown, formül/şekil bağlantısı, sürüm ve yayın durumu. Tek bir devasa PDF metni yerine başlık ve sayfa sınırlarında küçük, anlamlı parçalar tut.
5. Soruyla notu konu kimliği, beceri ve gerektiğinde metin eşleşmesiyle bağla. Her ipucu kaynağına dönebilir olsun. OCR ve AI sonuçları sürümlü, gözden geçirilebilir ve yeniden üretilebilir olmalı.
6. Önce yüzlerce çeşitli soru ve birkaç ders notunda pilot yap; doğruluk, manuel düzeltme süresi ve soru başı maliyeti ölç. Ancak sonra 80 bin soruya kademeli iş planla. Aynı kaynak checksum'ı yeniden işlenmesin; hatalı satırlar diğerlerini durdurmasın.

## 4. AI kullanımı: en az token, ölçülebilir kalite

- **Kod işi:** Her oturumda yalnız yol haritası, ilgili API bölümü ve değişecek birkaç dosyayı AI'ya ver. Tüm repo veya PDF arşivini sohbet bağlamına yükleme. Aşağıdaki görev şablonunu kullan.
- **İçerik işi:** İlk aşamada kurallı taksonomi ve mevcut etiketler. AI'yı belirsiz kayıtlara, küçük örneklemde veya toplu çevrimdışı etiketlemeye kullan. Tek soruda her ziyarette yeniden model çağırma; onaylı sonucu cache/veritabanında tut.
- **Girdi:** Kısa yapılandırılmış JSON; görev için gerekli soru görseli/metni ve ilgili 1–3 not parçası. Öğrencinin adı, e-postası veya bütün çözüm geçmişi modele gönderilmez. Model görselle çalışmıyorsa metin/OCR belirsizliğini bildir; şekil yorumunu uydurma.
- **Çıktı:** Şemaya uyan JSON (`etiketler`, `guven`, `gerekce`, `kaynaklar`, `emin_degilim`). İzinli kategori listesi dışındaki terimler reddedilir. Cevap ve açıklama ayrı doğrulanır; AI sorunun cevap anahtarını yetkili kaynak olmadan değiştirmez.
- **İnceleme:** Otomatik sonuç `taslak` kalır. Düşük güven, OCR bozukluğu, kaynak/cevap çelişkisi ve yüksek etkili konular insan kuyruğuna gider. Ölçüt: ders ve soru tipi bazında doğruluk, hata türü, inceleme süresi, maliyet ve öğrencinin “yardımcı oldu” yanıtı.
- **Öğrenci analizi:** İlk sürüm hesaplanabilir kural + açık gerekçe. AI yalnız onaylı kaynaklardan açıklama cümlesi yazabilir; deneme istatistiklerini hesaplayan gerçek kaynak PostgreSQL'dir.

**Bir AI geliştirme oturumuna verilecek kısa görev:**

```text
İvme deposu: uygulama/. Önce docs/plan/00_YOL_HARITASI.md ve ilgili API bölümünü oku.
Sadece Adım N, şu kabul ölçütü: ...
Mevcut kullanıcı değişikliklerini koru. İlgili UI'ı masaüstü/telefonda kontrol et.
Gerekli testleri çalıştır; plan durumunu, API/README'yi güncelle.
Yalnız kendi dosyalarını stage et, feature branch'e commit ve ivme remote'a push et.
Sonuçta: ne değişti, UI kontrolü, test, commit, kalan sorun.
```

## 5. Güvenlik ve gizlilik kapıları

- Ortam dosyası, DB şifresi, tünel token'ı, oturum anahtarı, gerçek öğrenci verisi, tam PDF/görsel arşivi ve yedekler Git'e girmez. `.gitignore` öncesinde de `git diff --cached` ve dosya boyutu kontrolü yap. Önceden paylaşılan geliştirme parolalarını internete açık kurulumda değiştir; uygulamaya ayrı, sınırlı yetkili DB rolü ver.
- Öğrenci verisini sunucuda kimlik doğrulama/nesne sahipliği ile koru. Yönetici arayüzünün dar olması tek başına yeterli değildir; API yetkisi de dar olmalı. CSRF, güvenli çerez, oturum sonlandırma, hız sınırlama, dosya yolu ve dosya tipi denetimi, güvenilen proxy başlıkları test edilir.
- Aktivite takibi için öğrenciye anlaşılır açıklama ve kendi kayıtlarına erişim sağla. Saklama, dışa aktarma ve silme davranışı ürün kararı olarak yazılır. Yönetici raporlarında küçük gruplar bireyi ele verebiliyorsa ayrıntıyı gizle.
- Giriş/çıkış ve uygulama hatalarını kaydet; parola, cevap anahtarı, hassas öğrenci verisi ve model girdisini düz log'a yazma. Yedek yalnız alınmış sayılmaz: ayrı yerde saklanır ve düzenli geri yükleme provası yapılır.

## 6. Kod ve Git düzeni

| Konum | İçerik | Git'e gider mi? |
|---|---|---|
| `uygulama/frontend`, `backend`, `docs`, küçük sentetik örnek veri | Ürün kodu, göçler, testler, belgeler | Evet |
| `uygulama/docs/plan` | Yaşayan plan, ilkeler, kaynak listesi | Evet |
| `D:\workspace\Computer General\ivme projesi yapilacak olanlar` | Planın kolay erişim kopyası | Bu klasör Git deposu dışında; repo sürümü push edilir |
| `D:\workspace\ivme\Kaynaklar`, `veri-hatti` | Mevcut kaynak/işleme hattı; ayrı envanter sonrası taşınabilir kod | Yalnız kod ve lisanslı küçük örnekler seçilerek |
| PDF, toplu görsel, gerçek öğrenci verisi, yedek, `.env`, `node_modules`, derleme çıktısı | Büyük/gizli/üretilmiş veri | Hayır |

Mevcut `origin` başka GitHub deposuna bakıyor; bu proje için açıkça `ivme` remote'u kullan. Feature branch'te küçük, konu odaklı commit oluştur; `main` birleşimi ayrı inceleme adımıdır. Var olan commit edilmemiş değişiklikleri otomatik olarak stage etme. Her kullanıcı fikri için: ilgili adımı güncelle → bağımlılığı yeniden sırala → kodu yap → UI/test → belge → commit/push. Bir iş yarım kalırsa durum `sürüyor` ve eksik kabul ölçütü açık kalır; “tamamlandı” yazılmaz.

## 7. Ölçülecek kalite

İlk pilotta uygulama erişilebilirliği, giriş ve soru çözme başarısı, sonuç doğruluğu, yeni sorunun açılma hızı, geri yükleme süresi, içerik kırpım/cevap eşleşme hatası, zayıf alan önerisinin isabeti ve AI başına gerçek maliyet izlenir. Hedef değerler pilot verisiyle belirlenir; doğrulanmamış “%99 doğru” gibi rakamlar vaat edilmez. Öğrenci ekranında kısa açıklama ve “hatalı bildir” yolu bulunur.
