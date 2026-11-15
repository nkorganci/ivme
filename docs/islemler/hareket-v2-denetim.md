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
| F04 P1 | Çözüm açmak bağımsız doğru sayılır; çıkış önceden görülür | Ayrı24 kavram sorusu; beş aşamalı öğrenci notları; örnek yalnız çalışma, ayrı nicel kapıda iki farklı ilk doğru gerekir |
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
20/20 test, masaüstü/mobil 11'er regresyon senaryosu ve113 ekran kontrolü geçti.
Bağımsız yeniden denetim bekliyor; ilk19/28 kendiliğinden PASS yapılmaz.

Eski `:v2` kayıtları korunur; yeni kabul `:v2:r2` içindedir. Tekrar turu görülmemiş aktarım değildir.
Öğretmen kabulü, resmî kaynak/anahtar, yeni iki tipin banka kanıtı ve gecikmeli öğrenci ölçümü açıktır.
16.04 bütünü BITTI değildir; sonraki adım bağımsız yeniden denetimdir.


## Nicel kapsam düzeltmesi

`0c6b9e0` ara denetimi 24/28 verdi: yedi bulgu kapalı, F04 kısmi kaldı.
Bu ara rapor `testler/kanit/konu/16-04-sol-ara-denetim.json` içindedir.
Her durağa öğretilen nicel ilişkiden iki yeni madde ve ayrı `nicel-kontrol` kapısı eklendi.
Örnekleri açmak veya kavram sorularını çözmek bu kapıyı geçirmez; iki soruda ilk doğru gerekir.
Yeni16 madde anahtar gösterilmeden bağımsız çözdürülür. Kalıcı kabul `:v2:r3` içindedir;
önceki `:v2` ve `:v2:r2` verileri silinmez. Son bağımsız denetim bu ek kapıları ayrıca inceler.

Yeni16 nicel sorunun bağımsız kör kontrolü16/16 uyumlu; cevap ve karşılaştırma kanıtları aynı klasörde `16-04-sol-nicel-*.json`.


## Opus 5.5 yeniden denetimi (`d99dcc7`)

Sonuç **23/28, FAIL** (sıfır yok; eşik 24). Bağımsızlık kısmi: aynı konuşmada Fable 5.2 haritayı ve v2 durak
taslağını yazmıştı; Sol düzeltmelerini yazan değil. Testler 17/17, masaüstü/mobil regresyon 11/11; yeni nicel,
tip seti, yanılgı ve araç kutusu maddeleri elle yeniden hesaplandı, hepsi doğru. Kanıt `testler/kanit/konu/16-04-opus-denetim.json`.

| Bulgu | Sorun | Önerilen düzeltme |
|---|---|---|
| A1 P1 | Tahmin sonrası "doğru açıklama" sorusunda yanlış şıkların gerekçeleri de doğru cümleler; 15 blokta birden çok doğru seçenek | Gerekçe sorusu için ayrı, gerçekten yanlış akıl yürütmeler yaz (içerik) ya da soruyu kaldır, açıklamayı göster |
| A2 P1 | Ölçme maddelerinin çoğu iki seçenekli; düzeyli sette yeni tur aynı maddelerle, ikinci turda cevap elemeyle bilinir | Ön/son test, set ve karma için 3–4 seçenek; yeni turda eşdeğer yeni madde ya da sayı değişen ikiz |
| A3 P2 | Yeni turdaki doğru `ilk:true` kaydedilir, tur numarası yok | Kayda `tur` yaz; yeni turda şık sırasını tura göre karıştır |
| A4 P2 | v2 sayısal içeriği bağımsız hesap testinde yok | `konu-paketi-v2.test.mjs`'e bağımsız hesap |
| A5 P2 | Haritadaki düzey 4 (ÖSYM, süreli) yok; ayrılan ÖSYM soruları yalnız dış bağlantı | Düzey 4'ü sayfada ölçülen ayrı adım yap |
| A6 P3 | Kavram kapısında düzeltilen yanlış seriyi 1 başlatır | Yanlışta seri 0 kalmalı |
| A7 P3 | "sürattten" yazım hatası (`fizik-hareket.v2.js:178`) | Metni düzelt |
| A8 P3 | Yeni iki tipin banka sorusu ve MEBİ kaynak görselleri yok | Banka taraması, kaynak görseli |

Geçmek için en az A1 ve A2 (ölçüt 10 ve 12) gerekir; A4 ölçüt 1'i tamamlar.

### Düzeltme turu: içerik (Fable 5.2)

- **A1 kapandı:** 8 açılış tahmini ve 13 yanılgı döngüsü için ayrı gerekçe soruları yazıldı (`paketler/fizik-hareket.gerekce.js`): bir doğru açıklama ve deney gözlemiyle çürütülen iki yanlış akıl yürütme. `TahminDeney` bu alanı okur.
- **A2 içerik kısmı kapandı:** ön test, son test, karma tur ve düzeyli set 4 seçenek; ilk hamle ve kavram kapısı 3 seçenek (`paketler/fizik-hareket.ek-secenek.js`, 118 yeni çeldirici, her biri kendi geri bildirimiyle). Düzeyli setin 12 maddesine aynı ilkeyi farklı sayı ve yüzeyle soran ikiz yazıldı (`tipCalismalari[].ikiz`).
- **A7 kapandı:** yazım hatası düzeltildi.
- **Kalan kod işi (Sonnet 5.5):** yeni turda yanlış yapılan maddenin yerine `ikiz`'i göstermek (A2'nin kod yarısı), A3 tur kaydı ve şık sırası, A4 bağımsız hesap testi (yeni ikizler ve ek seçenekler dahil), A5 düzey 4, A6 seri sayacı.
- Doğrulama: `node --test` 17/17; regresyon masaüstü/mobil 11/11; ekran taraması 113 kontrol, taşma yok. Regresyon testindeki gerekçe adımı yeni alanı okuyacak biçimde güncellendi (eski test hatalı davranışı bekliyordu).
