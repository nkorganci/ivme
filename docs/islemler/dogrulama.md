# Değişikliği doğrulama

## Çalışan uygulama

- Kaynak izleyicisi (`canli-izle.ps1`) `frontend/src`, `backend/src/main/java`,
  `backend/src/main/resources/db` değişikliğinden ~3 sn sonra paketi yeniler (~2,5 dk).
  Test dosyaları izlenmez. Günlük: `backend/target/live-watch.log`.
- `python scripts/ivme.py bekle` döngü bitene kadar bekler (son satır “Yeni sürüm
  yayımlandı” olmalı; “Yenileme başarısız” ise günlükteki ayrıntıya bak).
- `python scripts/ivme.py durum` sunulan `index-*.js` sürümünü, izleyiciyi, DB göçünü ve
  katalog sürümünü gösterir.

## Backend testleri

```powershell
python scripts/ivme.py test                          # tam paket
python scripts/ivme.py test ExamTrackFlowTest,KpssTrackScopeTest
```

Komut izleyici derliyorsa önce bekler (ikisi de `backend/target` yazar), geçici `ivme_test`
veritabanını kurup kaldırır ve sonucu `testler/bilinen-hatalar.md` ile karşılaştırır:
yalnız **YENİ** hatalar dikkat ister. Tam çıktı `backend/target/ivme-test-son.log`.
Gerçek `ivme` veritabanında test çalıştırılmaz.

## Ekran denetimi (ekran görüntüsü yerine)

```powershell
python scripts/ivme.py sayfa /dersler-ve-konular --tablo-tara
python scripts/ivme.py sayfa /yonetim --rol admin --mobil --icerir "Kullanıcılar"
python scripts/ivme.py ui                      # hazır UI betiklerini listeler
python scripts/ivme.py ui exam-track-ui.mjs
```

`sayfa` yerel test hesabıyla (`--rol student|admin|teacher|parent|operator`) giriş yapar,
sayfayı açar ve JSON verir: başlıklar, düğmeler, tablo başlıkları ve satır sayısı, sayfa
taşması, konsol hataları, başarısız istekler, `--tablo-tara` ile AG Grid'de kırpılan hücre.
Sorun varsa ekran görüntüsü `veri/ui-denetim/` altına kaydedilir; yalnız o zaman açılır.

Yeni UI betiği yazarken Chrome/CDP kurulumunu tekrarlama: `testler/lib/tarayici.mjs`
içindeki `tarayiciAc()` → `goto`, `login(rol)`, `evalJs`, `wait`, `clippedGridCells`,
`screenshot`. Giriş yerel `/api/auth/dev-switch/{ROL}` ile yapılır (CSRF çerezi
`XSRF-TOKEN` → `X-XSRF-TOKEN`); tünelden çalışmaz.

## Windows ipuçları

- Türkçe çıktı yazan Python için `PYTHONIOENCODING=utf-8` (ivme.py bunu kendisi ayarlar).
- PDF/OCR betikleri depo ortamını ister: `..\.venv\Scripts\python.exe` (ivme.py otomatik seçer).
- Git Bash `/yol` argümanını Windows yoluna çevirebilir; `ivme.py` üzerinden çağırınca sorun olmaz,
  doğrudan `node` ile çağırırken `MSYS_NO_PATHCONV=1` kullan.
