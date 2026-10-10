# 14.03 — Ders/tip doğruluğu, maliyet ve ölçek kararı

**Durum:** SIRADAKI (ilk ölçümler var; insan altın etiketleri bekleniyor) · **Tarih:** 2026-10-09 · **Girdi:** [14.02 gerçek yerel model pilotu](52_14_02_AI_TASLAK_VE_INCELEME.md), [14.01 insan inceleme kuyruğu](51_14_01_INSAN_ETIKETLI_ALTIN_ORNEK.md).

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

**Şimdilik 200 soruluk veya 80 bin soruluk AI batch çalıştırılmayacak.** Yedi soru, ders/soru tipi bazında doğruluk ve hata aralığı hesaplamak için yetersizdir; ayrıca [14.01 CSV'sinde](../../ornek-veri/altin-ornek-inceleme-200.csv) gerçek insan onayı 0/200'dür. Kullanıcı önce kaynak görsellerini tek tek inceleyecek. En azından yukarıdaki üç kritik kayıt, ardından tüm 200 kayıt için onay/ret/belirsizlik ve gerekçe yazılınca model çıktısı bu **insan kararlarıyla** karşılaştırılır. Her tip için doğru/yanlış/çekimser sayısı, güven aralığı, yanlış sınıflandırma türü ve süre raporlanır; ancak sonra batch ölçeği kararlaştırılır.

İnceleme ekranı için `scripts/etiket-inceleme-sunucusu.py` çalıştırılır; varsayılan yedi gerçek yerel model taslağını gösterir. İnsan kararı otomatik doldurulmaz. 14.01 gerçek onayları gelene kadar 14.03 `BITTI` değildir.
