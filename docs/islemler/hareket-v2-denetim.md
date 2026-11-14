# Hareket v2 bağımsız denetimi ve düzeltmeler

Denetçi **GPT-6.1 Sol, extra high**, yazandan ayrı oturum; kullanıcı Opus yerine bu modeli seçti.
İlk hedef `468087f`: **19/28, FAIL** (eşik24; hiçbir ölçütte0 olmamalı).
153 kör maddeden 143 kesin cevap anahtarla uyumlu; sekiz kök netleştirildi.
İki gerçek soru kırpımı ayrıca çözüldü; resmî anahtar/öğretmen onayı kapanmadı.

| Bulgu | Sorun | Düzeltme |
|---|---|---|
| F01 P1 | %80 toplam, eksik tipleri gizliyor | Her tanımlı tipte ilk doğru; yabancı kimlik puana girmez |
| F02 P1 | Yenileme yanlış denemeyi siler | Kullanıcı/sürüm/soru/tur bazında anlık kayıt; seçim, yanlış, aşama ve tur geçmişi geri yüklenir |
| F03 P1 | Yanlış tahmin deneyi kilitler; açıklama erken | Her tahmin deneye geçer; gözlemden sonra açıklama ve ayrı gerekçe seçimi |
| F04 P1 | Çözüm açmak bağımsız doğru sayılır; çıkış önceden görülür | Ayrı24 kavram sorusu; beş aşamalı öğrenci notları; örnek yalnız çalışma, çıkışta iki farklı ilk doğru gerekir |
| F05 P2 | Hareket haritası x–t olur; K/L kaybolur | Eşit zaman damgalı uzay noktaları; çizgi adı ve kesik çizgi |
| F06 P1 | Hız kesişiminde tam doğru seçenek yok | Hızlar eşit; konum ilişkisi belirlenemez. Eşit/farklı konum karşı örnek testi |
| F07 P2 | Tip kartı ve karma tip seçimi eksik | Kural/koşul/tuzak kartları; bilinmeyen sıklık etiketi; çözümden önce tip seçimi |
| F08 P2 | Y4/Y5/Y10 yönergeleri modelde yapılamaz | Zıt yön/eşit sürat; eşit iki yol süre sayaçları; 100m/s sabit hız hazır durumu |

Ek kök düzeltmeleri: çark/salıncak kapsamı, çoklu sınıflama, parçalı sabit hız, pozitif x/t,
tünelde ön/arka uç zamanları, ortalama ivme. Yeni24 madde ayrı kör aşamada çözüldü;
eski sekiz kök önceki bilgi geçmişi açık tutularak yeniden değerlendirildi.

Kanıtlar `testler/kanit/konu/16-04-sol-*.json`: ilk kör cevaplar, manifest, ilk rapor ve
yeni kör cevaplar. İlk rapor yalnız hedef468087f'yi puanlar; düzeltmeleri onaylamaz.
Regresyon: `node testler/konu-paketi-v2-regresyon-ui.mjs [--mobil]` gerçek etkileşim;
`node testler/konu-paketi-v2-ui.mjs [--mobil]` fixture ekran taramasıdır.
19/19 test, masaüstü/mobil 10'ar regresyon senaryosu ve105 ekran kontrolü geçti.
Bağımsız yeniden denetim bekliyor; ilk19/28 kendiliğinden PASS yapılmaz.

Eski `:v2` kayıtları korunur; yeni kabul `:v2:r2` içindedir. Tekrar turu görülmemiş aktarım değildir.
Öğretmen kabulü, resmî kaynak/anahtar, yeni iki tipin banka kanıtı ve gecikmeli öğrenci ölçümü açıktır.
16.04 bütünü BITTI değildir; sonraki adım bağımsız yeniden denetimdir.
