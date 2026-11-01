# Görev bazlı test kanıtı ve devir (TAS-12 / 12.16)

Mevcut testler `testler/kalite-profilleri.json` üzerinden seçilir. Bu komut bir
görevin otomatik regresyonlarını çalıştırır; görev tablosunu veya insan kabulünü
kendiliğinden değiştirmez. Claude ve Codex aynı komutu ve raporu kullanır.

```powershell
python scripts/ivme.py kalite plan TAS-12       # komutlar ve ayrı kabul ölçütleri
python scripts/ivme.py kalite durum TAS-12      # son kanıt hâlâ bu girdilere mi ait?
python scripts/ivme.py kalite calistir TAS-12    # yalnız seçilen görevin testleri
```

Yeni değişiklikte önce ilgili görev satırı ve `plan`/`durum` okunur. Geçerli kanıtın
kapsamı değişmediyse testi tekrar çalıştırma. `calistir` bilinçli bir yeniden
çalıştırmadır; otomatik önbellek isabeti veya eski raporu yeni test gibi sunma yoktur.
Birden fazla davranış değiştiyse ilgili profilleri ayrı çalıştır. Bilinmeyen görev
reddedilir; otomatik olarak bütün testlere veya bütün görevlere genişletilmez.

## Profil kapsamı

| Görev | Otomatik regresyon | Ayrıca değerlendirilen kabul |
|---|---|---|
| TAS-01 | Kayıt kuyruğu Node; LearnFlow, LearnReliability, Attempt DB | Kayıt UI, tam ders, sunulan sürüm ve mevcut veri korunması |
| TAS-02 | Dış izleyici birim; HealthMonitoring DB | Dış makinede gerçek kesinti ve iyileşme bildirimi |
| TAS-03 | Katalog ve ders içeriği Node | Canlı katalog, masaüstü/mobil ad ve kapsam |
| TAS-04 | Cevap anahtarı Node; TopicAnswerContract ve AnswerKeys | Ders/not cevabı → Konu takibi |
| TAS-05 | Ortak set Node ve LearnPracticeSet DB | Yeni sekme, doğru sayı, masaüstü/mobil ortak PRATIK |
| TAS-06 | QuestionPreference DB: izolasyon ve yarış | Kişisel tercih UI |
| TAS-07 | PDF kanıt hattı birim | Gerçek kaynak pilotu ve görsel inceleme |
| TAS-08 | Bölme/EBOB pilot Node | Kaynak, UI, öğretmen kararı ve öğrenci aktarım gözlemi |
| TAS-09 | İçerik hattı Python/Node ve pilotlar | Yerel kaynak kontrolü, ikinci konu UI ve insan kabulü |
| TAS-10 | Bildirim, sahte Brevo ve kayıt onayı DB | Bildirim UI ve gerçek alıcıya ulaşma |
| TAS-11 | Video hattı, erişim/playlist, matematik | Zamanlı kaynak/kare, protip UI, öğretmen etiketi |
| TAS-12 | Test kanıtı ve kalite aracı regresyonları; plan bağlantıları | Gerçek sonuçla görev/devir güncellemesi |

Bu tablo yeni bir görev durum tablosu değildir. Profildeki `remainingAcceptance`
alanı otomatik testin dışında kalan **kabul türlerini** belirtir; eski geçerli
kabulü iptal etmez. Gerçek kalan işler yalnız [görev tablosunda](../gorev-durumu.md).
Sahte API ile UI geçişi PostgreSQL entegrasyonu, teknik pilot da öğretmen onayı değildir.

## Kanıt ve sonuçlar

Her çalıştırma `veri/kalite/<TAS>/<runId>/rapor.json` ve ayrı komut günlükleri üretir.
`son.json` son başlayan çalıştırmayı gösterir: yarıda kalan yeni çalışma eski
başarının arkasına saklanmaz. Aşamalar tamamlandıkça rapor atomik güncellenir;
eski çalıştırmalar korunur. Backend alt raporu ayrıca kopyalanır.

Raporda görev, başlangıç/bitiş UTC zamanı, mevcut commit, gerçek komutlar, çıkış
kodları, test sayıları, bilinen/yeni hata, kaynak dosyalarının SHA-256 değerleri,
günlük hash'i ve tek sonraki adım vardır. Commit çalışma ağacındaki değişiklikleri
temsil etmez; test edilen kaynak **dosya hash'leriyle** belirlenir. Model adı otomatik
uydurulmaz; gerçek model kesin biliniyorsa agent devir kaydına ekler.

- `PASS`: seçilen otomatik kontroller geçti; görev kabulü anlamına gelmez.
- `KNOWN_FAILURES`: yalnız kayıtlı backend hataları; temiz geçiş olarak yazılmaz.
- `INCOMPLETE`: atlanan test veya yarım çalışma; tamamlandı denmez.
- `FAIL`: yeni hata, sıfır test, bozuk/eksik rapor, ortam veya temizleme hatası.
- `STALE`: test sırasında/sonrasında girdi ya da saklanan günlük değişti/kayboldu.

`durum` test çalıştırmaz; profil girdilerini ve günlükleri yeniden hash'ler. Yeni
bağımlılık, kaynak, prompt veya şablon eklendiğinde profilin `inputs` kapsamını da
güncelle. Hash denetimi yalnız tanımlı dosya girdilerini kapsar; araç sürümü, ortam,
gerçek kaynak PDF/kare ve insan kabulü ayrıca değerlendirilir. Test sırasında ortam
veya veri değiştiği biliniyorsa eski kanıt kullanılmaz. Bazı paylaşılan öğrenme
bağımlılıkları ihtiyatlı biçimde birlikte hash'lenir; bu kapsam test seçimi değildir.

`ivme.py test` yalnız **geçici `ivme_test`** kullanır. Güncel Surefire XML dosyaları,
testcase sayıları ve PowerShell'in Maven + DB temizliği tamamlandı işareti birlikte
aranır. Eski rapor, çalışmayan sınıf, tamamen atlanan test veya yeni hata başarı
sayılmaz. Başarılı süreç koduyla başarısız XML de reddedilir. Kısmi atlama
`INCOMPLETE`, bilinen hata `KNOWN_FAILURES` olarak kalır. JSON kanıt
`backend/target/ivme-test-son.json`, ham çıktı `ivme-test-son.log` içindedir.

## Devir ve sürekli kullanım

1. İlgili profil ve mevcut kanıtı oku; yalnız değişen kapsamı doğrula.
2. Otomatik testten ayrı UI/DB/kaynak/insan kabulünün ilgili kısmını değerlendir.
3. Görev tablosuna kapsam → rapor/komut → gerçek sonuç → kalan iş yaz.
4. Devir notuna görev/aşama, commit veya diff, kanıt yolu ve tek sonraki komutu yaz.
5. `python scripts/ivme.py kontrol` ve `git diff --cached --check` sonrasında yerel
   commit yap. Dış yayın/push ayrı talimattır.

Doğrulama aracı/profili değişince pre-commit iki kanıt regresyon takımını da çalıştırır.
Pre-commit tam DB/E2E takımı değildir. Yeni arka plan servis, CI sunucusu, dış izleme
veya zamanlanmış performans/geri yükleme işi bu adımla kurulmaz; ilgili kabul ve
işletim görevleri ayrı kalır. [Yükleme performansı](dogrulama.md#yükleme-performansı)
ve [kurtarma tarifi](uygulama-calistirma-ve-yayin.md) gerektiğinde kullanılır.

TAS-12'nin teknik temeli bu komut, testler ve devir kuralıdır; her yeni değişiklikte
uygulanan disiplin devam eder. Kurulum doğrulaması [sürümlü kanıtta](../../testler/kanit/tas12.json),
son otomatik çalıştırmanın ayrıntısı yerel `veri/kalite/TAS-12/` altındadır.
