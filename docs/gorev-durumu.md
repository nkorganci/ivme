# Görev durumu ve tekrar çalışmayı önleme

Bu dosya önemli işlerin **tek güncel durum tablosudur**. Ayrıntılı gereksinimler [yol haritasında](plan/README.md), yaklaşım ve model önerileri [inceleme belgesinde](tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md), etkin işin devam noktası [devir notunda](devam.md) bulunur. Aynı durum tablosunu başka dosyaya kopyalama.

Başlangıç kapsamı bu inceleme ve `TAS-01–12` önerileridir. Önceki bütün uygulama geçmişi buraya aktarılmadı; eski açık işler plan dosyalarında kalır. Eski bir işe gerçekten dönüldüğünde mevcut görev kimliğiyle satır eklenir; geçmişi baştan tarayıp yeniden üretme. Satır bulunmaması, işin daha önce yapılmadığının kanıtı değildir: önce ilgili plan/devir/çıktı kontrol edilir.

## Güncelleme kuralı

1. Başlamadan ilgili satırı, bağlı gereksinimi ve mevcut kanıtı oku. `TAMAMLANDI` ve girdiler aynıysa işi tekrar yapma.
2. Kullanıcı uygulamayı istediğinde ilgili öneriyi mevcut numaralı plana bağla; tabloya plan kimliğini yaz. `ONERI` durumunu uygulama yetkisi sayma.
3. İşe başlarken `SURUYOR`; önemli alt adım sonunda tamamlanan kapsamı ve kanıtı hemen güncelle. Bütün oturumun bitmesini bekleme.
4. Kod/içerik/karar değiştiyse ilgili teknik belgeyi de güncelle. Plan ayrıntılı kalan işi, bu tablo kısa durumu, devir notu tek sonraki adımı taşır.
5. Test/inceleme eksikse `KISMI` veya `DOGRULAMA_BEKLIYOR`; dış girdi gerekiyorsa `ENGELLI` yaz ve somut nedeni belirt. Eksik kabul ölçütü varken `TAMAMLANDI` yazma.
6. Tamamlanınca sonucu, gerçek doğrulama komutu/raporunu ve çıktı bağlantısını kaydet. Kod değişikliği varsa testin ilgili kod/girdi sürümünü kapsadığını belirt. Kullanılan gerçek model biliniyorsa kanıt paketine ekle; önerilen modeli çalışmış gibi yazma.
7. Tamamlanan satırı koru; numaralı plandan kapanan işi ancak bu kısa sonuç/kanıt kaydı güncellendikten sonra kaldır. Yeni oturumda tarihçe yerine bu kaydı kullan.
8. Yeni hata, değişen kaynak/hash, kod/şema/prompt veya geçersizleşen kanıt varsa `YENIDEN_ACILDI` yaz; nedenini ve yalnız etkilenen kapsamı belirt. Eski doğru çıktıyı sebepsiz baştan üretme.

Önemli iş: davranış/veri/şema/içerik/yayın kararı değişikliği, anlamlı hata düzeltmesi, kabul edilebilir bir pilot veya bir sonraki agent'ın yeniden yapmak zorunda kalabileceği tamamlanmış analiz. Her dosya okuması ve her komut ayrı görev değildir. Büyük görev kısmen biterse mevcut alt görev kimliği veya `TAS-01.a` gibi kararlı alt kimlik kullan; ana görevi erken kapatma.

Durumlar: `ONERI`, `BEKLIYOR`, `SURUYOR`, `KISMI`, `DOGRULAMA_BEKLIYOR`, `ENGELLI`, `TAMAMLANDI`, `YENIDEN_ACILDI`, `IPTAL`. `BEKLIYOR` yetkilendirilmiş fakat başlanmamış işi; `ONERI` henüz uygulama istenmemiş yaklaşımı ifade eder. Bunlar belge durumlarıdır; içerik/öğretmen onayı değildir.

## Güncel tablo

| Kimlik | İş / durum | Tamamlanan kapsam | Çıktı ve doğrulama kanıtı | Kalan / sonraki adım |
|---|---|---|---|---|
| BELGE-01 | İnceleme ve yaklaşım — **TAMAMLANDI** | Kullanıcının 22 maddesi; kod/belge incelemesi, öncelik ve kabul ölçütleri | [İnceleme](tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md); commit `13286d5`; `ivme.py plan` ve `ivme.py kontrol` geçti | İncelemeyi baştan yapma; uygulama istenirse yalnız ilgili görev/girdiyi tazele |
| BELGE-02 | Göreve göre model seçimi — **TAMAMLANDI** | TAS-01–12 için model, düşünme düzeyi, alternatif ve inceleme/yükseltme koşulları | [Model tablosu](tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md#193-her-görev-için-uygulanabilir-model-ataması); commit `56b2cc0`; plan/kural kontrolleri geçti | Model bilgisi değişirse ilgili resmî kaynağı kontrol et; proje benchmark'ı henüz yapılmadı |
| BELGE-03 | Kalıcı görev güncelleme kuralı — **TAMAMLANDI** | Ortak agent kuralı, tek durum tablosu, plan/devir bağlantıları | [AGENTS.md](../AGENTS.md), [devir tarifi](islemler/devir.md), bu dosya; `python scripts/ivme.py plan`, `python scripts/ivme.py kontrol` ve `git diff --check` geçti; kayıt bu belge değişikliğiyle birlikte sürümlenir | Her önemli görevde bu kuralı uygula; arka plan takip servisi kurulmadı |
| TAS-01 | Kayıt güvenilirliği — **ONERI** | Bulgular ve kabul senaryoları hazır; uygulama başlamadı | [§4](tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md#4-tas-01-öğrenci-kayıtlarında-güvenilir-kalıcılık) | Uygulama talimatıyla P0 kayıt paketi |
| TAS-02 | Sağlık ve izleme — **ONERI** | Katmanlar ve ölçümler önerildi; kurulmadı | [§13](tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md#13-tas-02-pgadmin-yerine-doğru-sağlık-ve-kayıt-denetimi) | Uygulama talimatıyla TAS-01'e eşlik eden sağlık/uyarı kapsamı |
| TAS-03 | Ortak katalog ve kapsam — **ONERI** | Kimlik/ad/sınav ayrımı tasarlandı; kod değişmedi | [§5](tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md#5-tas-03-tek-dersünitekonu-referansı-ve-sınav-kapsamı) | Yetkilendirilince eşleme/etki analizi |
| TAS-04 | Ortak cevap ve sayım — **ONERI** | Sayım sözleşmesi önerildi; entegrasyon yapılmadı | [§6](tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md#6-tas-04-her-yerdeki-çözümü-konu-takibine-bağlama) | TAS-01/03 sonrası uygulama |
| TAS-05 | Ortak PRATIK seti — **ONERI** | Doğru adet ve tekrar tanılama planı hazır; düzeltme yapılmadı | [§7](tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md#7-tas-05-tek-çözüm-ekranı-yeni-sekme-ve-gerçek-soru-seti) | TAS-03/04 sonrası uygulama |
| TAS-06 | Kişisel zorluk/tekrar — **ONERI** | Mevcut oy altyapısına eklenecek kapsam belirlendi | [§8](tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md#8-tas-06-öğrenciye-özel-zorluk-ve-tekrar-tercihleri) | TAS-03/05 sonrası uygulama |
| TAS-07 | PDF kanıt hattı — **ONERI** | Aşama hash'i, şekil/kanıt paketi ve pilot yöntemi hazır | [§9](tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md#9-tas-07-binlerce-pdf-için-tekrar-etmeyen-kaynak-işleme-hattı) | Mevcut çıktıları kullan; yeni çıkarım henüz yetkilendirilmedi |
| TAS-08 | Öğretim pilotunun ek kabul kapsamı — **ONERI** | Önceki pilot mevcut; bu incelemenin yeni uçtan uca kabul kapsamı uygulanmadı | [§10](tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md#10-tas-08-kaliteli-pilot-ana-kaynak-ve-açıklamalı-çözümler) | Mevcut pilotu baştan üretme; TAS-05/07 sonrası eksikleri tamamla |
| TAS-09 | İçerik otomasyonu — **ONERI** | Görev manifesti ve aşamalar önerildi; yeni agent/CLI kurulmadı | [§11](tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md#11-tas-09-ve-tas-12-tekrarlanan-işleri-agent-iş-akışına-dönüştürme) | TAS-08 sonrası otomasyon pilotu |
| TAS-10 | Yeni kayıt bildirimi — **ONERI** | Kalıcı bildirim/retry yaklaşımı hazır; e-posta gönderimi eklenmedi | [§15](tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md#15-tas-10-yeni-kayıtta-yöneticiye-bildirim) | Yetkilendirilince sağlayıcı/alıcı ve uygulama |
| TAS-11 | Video/transkript/ipucu — **ONERI** | Kaynak/ASR/kare yöntemi hazır; video işlenmedi | [§12](tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md#12-tas-11-youtubedan-zamanlı-metin-soru-karesi-ve-ipucu) | TAS-07 sonrası yetkilendirilmiş küçük pilot |
| TAS-12 | Test ve devir disiplini — **KISMI** | Belge/görev güncelleme kuralı eklendi; mevcut test altyapısı korunuyor | BELGE-03; [test yaklaşımı](tasarim/ogrenme-icerik-ve-guvenilirlik-incelemesi.md#16-test-stratejisi-var-olanı-tamamla) | Yeni uygulama testleri/izleme henüz yapılmadı; ilgili görev yetkilendirilince ekle |

## Kanıtı güncel tutma

Tamamlanma kaydı kısa olmalı: **ne değişti → hangi çıktı → nasıl doğrulandı → ne kaldı**. “Testler geçti” tek başına yeterli değil; komut/rapor ve kapsam belirtilmeli. Belge bağlantı kontrolü, uygulama entegrasyon testi veya pedagojik kabul olarak sunulmaz.

Commit hash'i oluşmadan aynı commit'i dosyaya yazmaya çalışma: çıktı/rapor bağlantısı ve doğrulama kaydı aynı commit'te yeterlidir; commit bağlantısı sonraki doğal güncellemede eklenebilir. Sırf hash eklemek için tekrar tekrar commit üretme. Git dışındaki kanıtlar için manifest/yedek konumu bulunmalı; eksik kanıt otomatik olarak işi baştan üretme gerekçesi değildir, önce mevcut kaynak/rapor aranır.

Bu, Claude/Codex'in her önemli adımda uygulaması gereken **çalışma kuralıdır**. Arka planda kendiliğinden çalışan bir takip servisi kurulmadı; MD'nin güncellenmesi görevi yürüten agent'ın sorumluluğudur.
