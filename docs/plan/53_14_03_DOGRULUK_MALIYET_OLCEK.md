# 14.03 — Ders/tip doğruluğu, maliyet ve ölçek kararı

**Durum:** DEVAM (200 soruluk iki AI geçişi ve AI kalite kontrolü tamam; doğruluk için insan altın etiketleri bekleniyor) · **Tarih:** 2026-10-09 · **Girdi:** [14.02 gerçek yerel model pilotu](52_14_02_AI_TASLAK_VE_INCELEME.md), [14.01 insan inceleme kuyruğu](51_14_01_INSAN_ETIKETLI_ALTIN_ORNEK.md).

## İlk yedi sorunun ölçümü

Model `qwen3.5:4b`, digest `d8b0f5e9760cd1682034f292d7ef72ec46f432149be0df7574bf2d6e92e38c04`. Yedi TYT Türkçe kaynak konusundan birer soru kullanıldı. Küçük, kaynaklı çıktı [pilot JSON'unda](../../ornek-veri/ai-etiket-qwen35-pilot-7.json) korunur; `scripts/ollama-etiket-denetle.py` kaynak görseli ve alan bütünlüğünü kontrol eder.

| Ölçü | Sonuç | Sınır |
|---|---:|---|
| Geçerli AI taslağı / API hatası | 7 / 0 | Tek model ve yedi soru |
| Kaynak konu eşlemesiyle aynı / çatışan | 5 / 2 | Bu, **doğruluk değil**; kaynak konu taslaktır |
| Çekimser | 0 | Belirsiz sınıfta da model etiket seçti |
| Güven değeri | 7 kez `0.95` | Ayırt edici veya kalibre edilmiş görünmüyor |
| Prompt / çıktı token | 10.588 / 718 | Yerel modelin bildirdiği sayaç |
| Toplam model süresi | 207,2 sn | İlk istek 180,2 sn; sonraki altı istek yaklaşık 27 sn |
| Para maliyeti | Ölçülmedi | Yerel elektrik/donanım gideri bu sayaçtan çıkarılamaz |

`TYT-0062` için model `cumle_yorum` seçti; görsel, numaralı cümlelerden düşünce akışını bozanı soruyor ve kaynak `paragraf_yapi` önerisiyle uyuşmazlık var. `TYT-0001` için `cumle_yorum` seçildi; soru paragraftaki iki boşluğa uygun sözcükleri istiyor ve tip sınırı insan incelemesi gerektiriyor. `TYT-0100` kodu kaynakla eşleşti fakat AI gerekçesi sorudaki **“gönderme yapılmamıştır”** yönünü doğru yansıtmıyor. Bu üç kayıt ilk manuel inceleme önceliğidir. Görselden yapılan bu nitel denetim, bağımsız uzman altın etiketi yerine geçmez.

## Ölçek kararı ve açık kabul

Kullanıcı 2026-10-09'da 200 sorunun **AI ile ön incelenmesini**, her soruya AI inceleyen notu ve gerektiğinde insan incelemesi uyarısı eklenmesini istedi. Bu karar önceki 200 soruluk batch bekletme kararını değiştirir. Yerel `qwen3.5:4b` ile tüm 200 kaynak görsel için ilk batch tamamlandı. [İlk geçiş JSON'u](../../ornek-veri/ai-etiket-qwen35-200.json) 200 geçerli taslak, sıfır kalıcı hata, 55 kaynak konu çatışması, sıfır çekimserlik, 389.670 prompt / 20.890 çıktı token ve toplam 1238,0 sn model süresi içerir. Bir HTTP 500 tekrar denemede düzeldi. Güven değeri 200/200 kez `0.95` olduğundan ayırt edici puan değildir. İlk geçişten sonra CSV'de 57 `oncelikli`, 143 `normal` AI inceleme notu ve 0/200 insan onayı vardı.

Kaynak konu önerisiyle çatışmaların dağılımı: Paragrafta Anlam 5/62, Paragrafın Yapısı 14/32, Sözcükte Anlam 23/30, Cümlede Anlam 8/28, Yazım 0/18, Noktalama 0/18, Cümlenin Ögeleri 5/12. Bu oranlar doğruluk değildir; kaynak başlıkları da otomatik eşleme temellidir. Özellikle sözcük/cümle ve paragraf anlamı/yapısı sınırları ilk promptta açık tanımlanmamıştı.

Aynı yerel modele altı sabit soru, daha açık sınıf tanımlarıyla yeniden soruldu: `TYT-0062` ve `TYT-0098` cümle yorumundan paragraf yapısına, `TYT-0001` cümle yorumundan bağlamda sözcüğe döndü. `TYT-0199` anlatım tekniği sınırında hâlâ tartışmalı; `TYT-0100` yeni gerekçede olumsuz soru kökünü doğru aktardı. [Altı soruluk karşılaştırma](../../ornek-veri/ai-etiket-sinir-denemesi-6.json), sorunun yalnız model boyutu olmadığını gösterir. Kullanıcı, ilk geçişteki olası yanlış etiketleri düzeltmeyi istediği için aynı açık kurallar 200 soruya uygulanır; ilk geçiş saklanır, ikinci geçişte değişenler ayrıca işaretlenir. Bu ikinci model görüşü de insan altın etiketi değildir.

CSV'de izinli soru tipi, görsel gerekçe, öznel güven ve model kimliği ayrı `ai_` alanlarında tutulur. Kaynak konu çatışması, iki AI geçişinin ayrılması, çekimserlik ve bilinen gerekçe/taksonomi sınırı problemi `oncelikli` olur. Diğer satırlarda da **altın etiket için insan incelemesi gerekir** notu vardır. `review_status`, `reviewer_id` ve insan karar alanları bu işlemle değiştirilmez.

## 200 soruluk ikinci geçiş ve düzeltmeler

[İkinci geçiş JSON'u](../../ornek-veri/ai-etiket-qwen35-v2-200.json) aynı model digest'iyle, açık taksonomi sınırları ve gerçek görsellerle üretildi: 200 geçerli sonuç, sıfır kalıcı hata, ilk geçişe göre **43 değişen** tip, kaynak konu önerisiyle **26 ham çatışma**, sıfır çekimserlik. İkinci model süresi 987,2 sn; güven beyanı 194 kez `0.95`, 6 kez `0.98`. `TYT-0052` görseli varsayılan bağlama sığmadı; yalnız bu istekte `num_ctx=8192`, `num_predict=512` ile tamamlandı ve çıktıdaki `retry_num_ctx` / `retry_num_predict` alanlarına yazıldı.

Ham ikinci çıktının 26 kaynak çatışması soru kökleriyle karşılaştırıldı. Bunların **15'inde** belirli sözün anlamı, kişisel yargı/aynı düşünce veya özne-nesne-yer tamlayıcısı-öge dizilişi gibi açık ipuçlarına rağmen model farklı sınıf seçmişti. `scripts/ai-etiket-v2-uzlastir.py` bu 15 kimlik için kaynak metindeki ilgili ifadeyi doğrular, AI önerisini düzeltir ve `ai_reviewer_id=Codex AI QA + qwen3.5:4b (taslak v2)` ile gerekçeyi kaydeder. Bu bir **AI kalite kontrol kararıdır**, insan onayı değildir. Ham ikinci çıktının kalan **11** kaynak çatışması açık kalır. Tüm 43 model değişikliği, 15 kalite kontrol düzeltmesi, 11 kalan kaynak çatışması ve bilinen gerekçe/taksonomi sınırı sorunları inceleme önceliğine girer; birleşik sonuç **63 öncelikli / 137 normal** satırdır. Her iki sırada da altın etiket için insan incelemesi gerekir.

İlk geçiş, ikinci geçiş ve kalite kontrol düzeltmesi birbirinden ayrı izlenebilir. [CSV](../../ornek-veri/altin-ornek-inceleme-200.csv) son AI önerisini ve notu gösterir; eski model önerisi ilk/ikinci JSON'da kalır. `scripts/altin-ornek-kuyrugu.py --check` 200 benzersiz görsel özetini ve **0/200 insan onayı** durumunu doğruladı. İnceleme ekranının 200 taslağı göstermesi, geçersiz insan kararını reddetmesi, geçerli kararı yalnız geçici CSV kopyasına yazması test edildi.

Yeniden üretim sırası: `scripts/ollama-etiket-pilotu.py --model qwen3.5:4b --all`, `scripts/ollama-taksonomi-sinir-denemesi.py --all`, çıktıların `ornek-veri/ai-etiket-qwen35-200.json` ve `ornek-veri/ai-etiket-qwen35-v2-200.json` olarak korunması, ardından `scripts/ai-etiket-v2-uzlastir.py` ve `scripts/altin-ornek-kuyrugu.py --check`. İlk geçişin CSV'ye tek başına yazılması gerektiğinde `scripts/ai-etiket-inceleme-kaydet.py` kullanılır. Betikler kaynak görsel SHA-256'sını kontrol eder; `--write` ile insan/AI inceleme CSV'sini sıfırdan üretmek mevcut notları sileceği için kullanılmaz.

Kaynak katalogda her sorunun cevap anahtarı ve metni bulunur. Cevap anahtarı soru tipi etiketinin doğruluğunu tek başına göstermediğinden AI onayı yerine kullanılmaz; 200 sorunun kaynak kaydı/görsel bütünlüğü `scripts/altin-ornek-kuyrugu.py --check` ile denetlenir. Ders notları bu görsel tip sınıflandırmasının doğrudan kanıtı değildir. AI gerekçeleri model üretimidir; özellikle pilotta görülen yanlış soru yönü yorumu nedeniyle kaynakla eşleşenler de bağımsız doğrulanmış sayılmaz.

Yedi soru veya 200 AI taslağı, ders/soru tipi bazında **doğruluk** ve hata aralığı hesaplamak için yeterli değildir; [14.01 CSV'sinde](../../ornek-veri/altin-ornek-inceleme-200.csv) gerçek insan onayı henüz 0/200'dür. İnsan incelemesi yapılınca model çıktısı bu kararlarla karşılaştırılır. Her tip için doğru/yanlış/çekimser sayısı, güven aralığı, yanlış sınıflandırma türü ve süre raporlanır; 80 bin soruya ölçek kararı sonra verilir.

İnceleme ekranı için `scripts/etiket-inceleme-sunucusu.py` çalıştırılır; varsayılan 200 ikinci geçiş taslağını ve CSV'deki son AI kalite kontrol önerisini gösterir. İnsan kararı otomatik doldurulmaz. Kullanıcı kendi uzmanlık alanı olan **fizik** sorularını ileride etiketleyebileceğini belirtti; bu TYT Türkçe kümesinde onu alan dışı hakem olarak kullanmıyoruz. 14.01 gerçek onayları gelene kadar 14.03 `BITTI` değildir.
