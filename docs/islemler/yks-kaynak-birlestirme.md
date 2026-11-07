# YKS birleştirme kontrolü

[Plan ve görev dosyaları](../plan/15-yks-kaynak-birlestirme.md) gerçek iş kapsamını,
[görev tablosu](../gorev-durumu.md) tamamlanma kanıtını belirler.

```powershell
python scripts/ivme.py yks plan
python scripts/ivme.py yks durum
python scripts/ivme.py yks baslat
python scripts/ivme.py yks adim YKS-00 --resume
python scripts/ivme.py yks dogrula YKS-00
python scripts/ivme.py kalite calistir YKS-00
```

`plan`/`durum` salt okunurdur; `baslat` mevcut run varsa onu korur. `adim` yalnız
uygulanmış yürütücü ve doğrulanmış ön koşullarla çalışır. `--scope pilot` yalnız
YKS-07–10 içindir; tam yayılım pilot kabulünü atlayamaz. `--resume` aynı giriş
kimliğinde geçerli işi yeniden yapmaz; imleç yalnız aynı giriş için kullanılır.

Kontrol verisi Git dışında `veri/yks-birlestirme/<runId>/` içindedir. `current.json`
seçili run'ı gösterir; `state.json` atomik güncellenir, `events.jsonl` revizyon ve
işlem izini tutar. Her deneme ayrı `yks-xx/<scope>/attempt-NNNN/` altında kalır.
Eksik/değişmiş çıktı ve girdi hash'i doğrulamayı eskitebilir. OS kilidi süreç
ölümünde bırakılır; PID dosyasını silerek ikinci writer başlatılmaz.

YKS-00 yalnız kontrol aracını sınar; kaynak tarama/taşıma, DB ve model işi yapmaz.
Başka bir görev dosyasının bulunması yürütücüsünün mevcut olduğu anlamına gelmez;
`yks plan` çıktısındaki `implemented` alanı kontrol edilir.

Kabul geçince görev ve plan başlığında **BITTI**, durum tablosunda
**TAMAMLANDI — BITTI** tutulur. Pilot kabulü bütün adımı bitirmez. Kalan gerçek
iş ve tek sonraki komut devirde güncellenir.
