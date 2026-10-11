# Adım 5 — tünel ve arayüz provası

Tarih: 2026-10-09. Durum: sürüyor. Gerçek `ivme` veritabanındaki iki ayrıcalıklı hesabın geçici parolası durduğu için kalıcı üretim yayını başlatılmadı.

## Doğrulanan rota ve paket

- Kullanıcının Cloudflare ayarı `net.ivme.dev` → `http://localhost:5173`. Bu rota değiştirilmedi. Vite geliştirme sunucusu ve React dosyalarını içine alan Spring Boot üretim paketi ayrı ayrı aynı yerel portta denendi. API ve statik dosyalar üretim paketinde aynı kökenden servis edildi.
- Üretim paketi `uretim-derle.bat` ile oluşturuldu. İlk deneme, çalışan geliştirme Java süreci Windows'ta jar dosyasını kilitlediği için durdu; geliştirme süreçleri kapatıldıktan sonra derleme geçti. Statik dosyaları yenileyen PowerShell betiği hedefin depo içindeki gerçek klasör olduğunu ve bağlantı olmadığını kontrol eder.
- Gerçek veritabanı yedeği yalnız **geçici `ivme_e2e` veritabanına** geri yüklendi. Bu kopyada ayrıcalıklı hesapların parolası rastgele güçlü değerlerle değiştirildi ve üretim paketi `PORT=5173`, HTTPS site adresi ve güvenli çerezle başlatıldı. Gerçek hesaplara dokunulmadı. Prova sonunda süreçler kapatıldı, geçici DB silindi.

## Sonuçlar

| Kontrol | Sonuç |
|---|---|
| Arka yüz `mvn test` (Java 21) | 42 test; 0 hata; Windows symlink izni gerektiren 1 test atlandı |
| Ön yüz `npm run build` | Geçti |
| Masaüstü Chrome E2E, 1280 px | 20/20; kayıt, iki koleksiyon, soru, sınav, geçmiş, bildirim, konsol |
| Mobil Chrome E2E, 390 px | 20/20; aynı akış |
| Üretim paketi yerelde | `/giris` 200, `/api/auth/me` 401, JS dosyası 200, HSTS ve Secure CSRF çerezi var |
| Tünel üzerinden üretim paketi | `/giris` 200, doğrudan `/soru/TYT-0001` 200, oturumsuz API 401, HSTS ve Secure CSRF çerezi var |
| Tünel üzerinden oturumlu API | Kayıt 201, giriş 200, OGM listesi 200, görsel 200, çıkış 204 |

İlk üretim başlatma saniyelerinde kısa bir 502 görüldü; sonraki istekler 200 döndü. Origin kapatıldığında 502 beklenir. Kullanıcının normal tarayıcı profilindeki hata bu provada yeniden üretilemedi; eklenti veya yalnız o alan adına ait site verisi etkisi olasıdır, kesin neden değildir. E2E görüntüleri Git dışındaki `veri/ui-e2e/` klasöründedir.

**Açık işler:** Gerçek `ivmeadmin` ve `ivmeoperator` parolalarını yerel Hesap ekranından ayrı, güçlü parolalarla değiştirme; sınırlı DB rolü ve görsel yedeği; üretim ayar dosyası; gerçek veritabanıyla kalıcı başlatma/yeniden başlatma ve gerçek cihazda tam kullanıcı akışı. Kullanıcı normal tarayıcı profilinde `net.ivme.dev` adresinin artık açıldığını bildirdi; bu gözlem tam giriş/soru akışı provası değildir. Kullanıcının son isteği gereği GitHub push yapılmadı.

**Durum: AÇIK.** Tünel kanıtı [05.01–05.02](12_NUMARALI_IS_LISTESI.md) `BITTI`; canlıya alma denetimleri [05.03–05.05](12_NUMARALI_IS_LISTESI.md) açıktır.

## 2026-10-11 — Normal profilde eski JavaScript

Günlük Program güncellemesinden sonra Vite geliştirme sunucusunun `/src/programTime.js` çıktısı tünel üzerinden `Cache-Control: max-age=14400` ile sunuldu; yerel Vite yanıtı `no-cache` idi. Normal tarayıcı profili eski dosyayı tutarken yeni `DailyProgram.jsx` yüklendi. Vite hata kaydında yeni kodun istediği `normalize24Hour` dışa aktarımının eski dosyada bulunmadığı görüldü. Gizli pencerenin açılması bu gözlemle uyumludur; tek başına reklam engelleyiciyi kanıtlamaz.

Güncel React çıktısı Spring Boot paketine kopyalanıp tünelin `5173` hedefinde Vite yerine tek Java süreci başlatıldı. Dış `/` ve sürümlü `/assets/index-B7mSJcK-.js` 200, oturumsuz `/api/auth/me` beklenen 401 yanıtını verdi. İlk açılış saniyelerinde kısa 502 görülebilir. Bu başlatma `dev` profili ve mevcut yerel veritabanı ayarlarını kullanır; README'deki üretim ayarları ve açık güvenlik işleri hâlâ tamamlanmalıdır. Normal profilde bir kez sert yenileme veya bu siteye ait eski önbelleği temizleme gerekebilir.
