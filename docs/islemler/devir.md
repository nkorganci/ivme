# Claude ↔ Codex devri

Süreklilik sohbet geçmişine değil üç şeye dayanır: `docs/plan/00_DEVAM.md`, yerel
commit'ler ve `veri/` altındaki sürümlü çıktılar. İki AI de aynı `AGENTS.md` kurallarını
okur (`CLAUDE.md` yalnız `@AGENTS.md` içerir).

## Oturum açarken

```text
İvme'de devam et: docs/plan/00_DEVAM.md'deki yarım işe, yoksa sıradaki göreve.
```

AI şunları yapar: `python scripts/ivme.py durum` → `00_DEVAM.md` → gerekiyorsa ilgili adım
dosyası ve rehber bölümü. Claude Code'da oturum başında `durum` çıktısı kanca ile
otomatik bağlama girer (`.claude/settings.json`).

## Çalışırken ve bırakırken

Her anlamlı adımın sonunda (ve token/limit bitmeden önce) `00_DEVAM.md` “Şimdi” tablosu
güncellenir ve yerel commit atılır:

| Alan | Ne yazılır |
|---|---|
| Güncelleme | Tarih ve AI (Claude / Codex) |
| Etkin görev | `NN.NN` |
| Yarım iş | Ne yapılıyordu; nerede kalındı (`itemKey`, sayfa, parti, dosya); kalan miktar |
| Commit'lenmemiş değişiklik | Bilinçli bırakılan dosyalar ve nedeni; yoksa “Yok” |
| Sıradaki komut | Diğer AI'nın ilk çalıştıracağı komut |

İş bitince “Yarım iş: Yok” yazılır ve “Son kapanan iş” tek satıra (commit kısa kimliğiyle)
güncellenir. Geçmiş işler listesi tutulmaz; `git log` yeterlidir.

Uzun toplu işler (`ollama-sor.py toplu`, PDF çıkarımı, etiket üretimi) önbellek ve çıktı
dosyasıyla devam eder; yarıda kalırsa aynı komut yeniden çalıştırılır, biten satırlar
önbellekten gelir.
