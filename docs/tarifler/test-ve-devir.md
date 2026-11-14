# Test kanıtı, doğrulama ve devir

Claude ve Codex aynı kuralları ([AGENTS.md](../../AGENTS.md)) ve aynı komutları kullanır; devir dosyası geçmiş raporu değildir.

## Doğrulama komutları

| Amaç | Komut |
|---|---|
| Çalışan sürüm, izleyici, DB göçü, katalog | `python scripts/ivme.py durum [--hizli]`; `bekle` izleyici döngüsü bitene kadar bekler ("Yeni sürüm yayımlandı"; "Yenileme başarısız" ise `backend/target/live-watch.log`) |
| Backend testi | `python scripts/ivme.py test [SinifA,SinifB]` — izleyiciden ayrı `backend/target-tests`, geçici `ivme_test` kurup kaldırır, `testler/bilinen-hatalar.md` ile karşılaştırır (`KNOWN_FAILURES`, yeni hata/bozuk rapor/ortam hatası `FAIL`, kısmi atlama `INCOMPLETE`); hiç test çalışmaması başarı değildir; çıktı `backend/target/ivme-test-son.log` ve `.json`; gerçek `ivme` DB'sinde test çalıştırılmaz |
| Ekran denetimi | `python scripts/ivme.py sayfa /yol [--rol student|admin|teacher|parent|operator] [--mobil] [--icerir "metin"] [--tablo-tara]` (başlık, düğme, tablo, taşma, konsol/istek hatası; sorun varsa görüntü `veri/ui-denetim/`'e) |
| Hazır UI betikleri | `python scripts/ivme.py ui [betik.mjs]`; yeni betikte `testler/lib/tarayici.mjs` (`tarayiciAc`, `goto`, `login(rol)`, `evalJs`, `wait`, `clippedGridCells`, `screenshot`); giriş yerel `/api/auth/dev-switch/{ROL}` ile (CSRF `XSRF-TOKEN` → `X-XSRF-TOKEN`), tünelden çalışmaz |
| İnteraktif Öğrenme | `node --test testler/interaktif-motorlar.test.mjs testler/interaktif-hareket.test.mjs`; `node testler/interaktif-uniteler-ui.mjs [kimya/gazlar]`; `node testler/interaktif-ogrenme-ui.mjs` (paket yenilenirken `ERR_CONNECTION_REFUSED` olursa `bekle` sonrası yeniden) |
| Yükleme performansı | `node testler/loading-performance.mjs veri/performance/son.json` (yeni profil; soru/cevap yazmaz) |
| Belge/plan, commit öncesi | `python scripts/ivme.py plan`, `python scripts/ivme.py kontrol` |

Windows: Python için `PYTHONIOENCODING=utf-8` (ivme.py ayarlar); PDF/OCR betikleri `..\.venv\Scripts\python.exe` ister (ivme.py seçer); Git Bash `/yol` argümanını çevirir, doğrudan `node` çağırırken `MSYS_NO_PATHCONV=1` kullan.

## Görev bazlı kanıt (TAS-12)

`testler/kalite-profilleri.json` profillerini seçer; görev tablosunu veya insan kabulünü değiştirmez.

```powershell
python scripts/ivme.py kalite plan TAS-12       # komutlar ve ayrı kabul ölçütleri
python scripts/ivme.py kalite durum TAS-12      # son kanıt hâlâ bu girdilere mi ait? (test çalıştırmaz)
python scripts/ivme.py kalite calistir TAS-12   # yalnız seçilen görevin testleri
```

Geçerli kanıtın kapsamı değişmediyse tekrar çalıştırma; bilinmeyen görev reddedilir, kendiliğinden genişlemez; birden çok davranış değiştiyse profilleri ayrı çalıştır. Profil kapsamı: TAS-01 kayıt kuyruğu/LearnFlow/Attempt; TAS-02 dış izleyici/HealthMonitoring; TAS-03 katalog ve ders içeriği; TAS-04 cevap anahtarı/TopicAnswerContract; TAS-05 ortak set; TAS-06 QuestionPreference; TAS-07 PDF kanıt hattı; TAS-08/09 pilot ve içerik hattı; TAS-10 bildirim/Brevo/kayıt onayı; TAS-11 video hattı; TAS-12 kalite aracı. Profildeki `remainingAcceptance` otomatik testin dışındaki kabul türlerini söyler (sahte API ile UI geçişi PostgreSQL entegrasyonu, teknik pilot öğretmen onayı değildir).

Rapor `veri/kalite/<TAS>/<runId>/rapor.json` (+ günlükler; `son.json` son başlayanı gösterir, eskiler korunur): görev, UTC zaman, commit, komutlar, çıkış kodları, test sayıları, bilinen/yeni hata, **kaynak dosya SHA-256'ları**, günlük hash'i, tek sonraki adım. Sonuçlar: `PASS` (otomatik kontroller geçti, kabul değil), `KNOWN_FAILURES`, `INCOMPLETE` (atlanan/yarım), `FAIL` (yeni hata, sıfır test, bozuk rapor, ortam hatası), `STALE` (girdi/günlük değişti). Yeni bağımlılık, kaynak, prompt veya şablon eklenince profilin `inputs`'ını güncelle; hash araç sürümü, ortam, gerçek kaynak ve insan kabulünü kapsamaz. Profil/araç değişince pre-commit iki kanıt regresyon takımını çalıştırır (tam DB/E2E değildir). Sürümlü kurulum kanıtı: [tas12.json](../../testler/kanit/tas12.json).

## Devir

1. İlgili görev satırını ([plan/README.md](../plan/README.md)), [devir notunu](../devam.md) ve yalnız ilgili adım dosyasını oku; değişmeyen girdi ve geçerli kanıtla biten işi tekrarlama.
2. Her önemli alt adım sonunda, oturum sonunu beklemeden, plan satırına tamamlanan kapsamı, gerçek doğrulamayı, kanıt yolunu ve kalan tek adımı yaz (kısmi sonuç, engel, başarısız test de); kabulü eksik iş tamamlandı sayılmaz.
3. Yarım kalan işte `devam.md`'ye görev/öğe kimliği, çıktı yolu ve sonraki komutu yaz; geçmiş liste ekleme (geçmiş `git log`'dadır).
4. `python scripts/ivme.py kontrol` ve `git diff --cached --check` sonrası yerel `main`'e commit; dış yayın/push ayrı talimattır. Devirde kısa girdi: "İvme'de docs/devam.md dosyasındaki yarım işe, yoksa sıradaki açık göreve devam et."
