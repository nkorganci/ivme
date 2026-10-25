# Sistem rehberi — Yeni değişiklik yaparken

[Rehber dizini](../00_SISTEM_REHBERI.md) · Ne zaman okunur: Her kod/veri değişikliğinden önce kontrol listesi.

## Yeni değişiklik yaparken

Tek çalışma ağacı `D:\workspace\ivme\uygulama`, dal `main`, port 1010,
kalıcı uygulama veritabanı `ivme`dir. Geliştirme ve çalışan yerel uygulama bu
tek kaynak ağacını kullanır. Değişiklikler yerel main dalına commit edilir;
GitHub push açık kullanıcı talimatıyla yapılır.

Görsel ve PDF katalog dizinleri bu uygulamaya aittir. Özgün
`Kaynaklar/ogm-materyal` PDF arşivi yalnız okunur. Bakım betikleri
`scripts/yerel_ortam.py` ile varsayılan olarak `ivme`yi seçer; açık DB seçimleri
her işlemde doğrulanır. Gerçek öğrenci kayıtları testlerde kullanılmaz.

Kullanıcının kalıcı talimatıyla derleme/yeniden başlatma uygulama işinin
parçasıdır. `yerel-ortam.ps1` main/1010/ivme ve çerez ayarlarını seçer;
`yeniden-baslat.ps1` uygulama sürecini değiştirerek dönüşümlü
JAR klasörlerine derler. HTML/asset ve `app-version.txt` gerçek HTTP yanıtıyla
doğrulanır. Yerel otomatik giriş davranışı için Spring `dev` profili
korunur; HTTPS üretim dağıtımı `uretim-calistir.bat` akışındadır.

Cloudflare tüneli doğrudan main'in `http://localhost:1010` adresine bağlanır;
kullanıcı hedefi Cloudflare'da ayarlar. Yeniden başlatıcı eski JAR'ı bulur ve
çalışan derleme yuvasını korur.

`canli-izle.ps1` kaynak hash'ini ve 1010 portunu izler. Depo
mutex'i ikinci izleyiciyi önler. Windows başlangıç kısayolu `yerel-baslat.ps1`,
üst dizindeki `Ivme Baslat.bat` aynı main uygulamasını başlatır.
Sağlık kanıtı `backend/target/live-watch.status`
dosyasındaki yaşayan süreç ve güncel dosya zamanıdır. Hatalar `live-watch.log`,
`live-build.stderr.log` ve `application.stderr.log` dosyalarındadır.
Tarayıcı `app-version.txt` değişimini yaklaşık beş saniyede algılayıp yeniler.
Görev sonunda izleyici açık kalır. Bu yerel çalışma düzeni Git push veya
yeni bir dış dağıtım yetkisi vermez.

1. `git status` ile mevcut kullanıcı değişikliklerini gör ve koru. Yalnız görevin
   gerektirdiği [belgeyi](../../README.md) ve varsa ilgili açık adımı oku.
2. Önce güncel sürümü ve mevcut kanıtı kontrol et. Daha önce doğrulanmış aynı
   kaynak/hash için pahalı çıkarımı veya model çağrısını tekrarlama.
3. Kaynak/kimlik/sözlük değişikliğini doğru bakım kaynağında yap. Başlık için
   yeni kimlik üretme; değişikliğin öğretmen onayına ve öğrenci geçmişine etkisini belirle.
4. İlgili üreticiyi ve değişiklikle ilgili denetimleri çalıştır. Testler için
   geçici ayrı DB kur; gerçek `ivme` öğrenci kayıtlarını sıfırlama.
5. Yerel aday ile yayımlanmış sürümü ayır. Yayın öncesi şema, kaynak hash'i,
   kategori, sayfa/zaman sınırı ve cevap sızıntısı denetimlerini tamamla.
6. İlgili teknik sözleşmeyi ve gerekiyorsa bu rehberi güncelle.
   Kapanan alt işi aktif listeden çıkar. Bütün kabulü tamamlanan adım dosyasını sil,
   bağlantıları düzelt; kalan numaraları değiştirme. Bu rehber ve `00_` belgeleri kalır.
