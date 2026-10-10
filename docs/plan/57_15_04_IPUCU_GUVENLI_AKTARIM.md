# 15.04 — Kaynaklı ipucunun güvenli aktarımı

**Durum:** BITTI (aktarım kodu ve yalnız sentetik test DB kanıtı) · **Tarih:** 2026-10-10 · **Bağımlılık:** [15.01 kaynak kapısı](55_15_01_KAYNAKLI_IPUCU_VERI_MODELI.md), [15.02 sunum akışı](56_15_02_IPUCU_ACIKLAMA_AKISI.md).

`scripts/ipucu-guvenli-aktar.py` varsayılan olarak yalnız yerel kaynak denetimini çalıştırır. `--apply` verildiğinde aynı denetimden geçen JSON'u `scripts/sql/ipucu-aktar.sql` ile tek PostgreSQL işleminde V18 `question_hints` tablosuna alır. SQL, soru kodunun etkin olmasını ve veritabanında aynı tip/sürüm için `HUMAN` kaynaklı `APPROVED` taksonomi bağını zorunlu tutar. İpucu editör onayı ve cevap sızıntısı denetimi yoksa reddeder. Aynı kayıt tekrar gönderilebilir; aynı soru için farklı içerik sessizce üzerine yazılmaz. Test dışı veritabanında aktarım ayrıca `--allow-live` gerektirir. Bağlantı bilgileri psql'in `PG*` ortam değişkenlerinden gelir; parola komut satırına konmaz.

```powershell
$env:PYTHONIOENCODING='utf-8'
D:\workspace\ivme\.venv\Scripts\python.exe scripts\ipucu-guvenli-aktar.py docs\plan\sema\kaynakli-ipucu-v1.ornek.json
```

Mevcut örnek taslaktır ve **reddedilir**; gerçek CSV'de 0/200 insan onayı vardır. Onaylı JSON hazırlandığında önce yukarıdaki kuru denetim, ardından yetkili operatörün ayarladığı `PGDATABASE`, `PGUSER`, `PGPASSWORD`/güvenli parola kaynağıyla `--apply --psql <psql.exe yolu>` çalıştırılır. Canlı DB aktarımı ayrıca yedek, ayrı DB rolü ve 04/05 yayın kapıları tamamlanmadan yapılmaz. Bu iş gerçek içerik yayımlandı anlamına gelmez.

**Test:** `scripts/ipucu-aktar-smoke.py` yalnız `ivme_test` içinde geçici insan onaylı soru/not/ipucu fikstürü kullandı. Olumlu aktarım, idempotent tekrar, DB soru tipi `PROPOSED` iken ret, aynı sürümde farklı metnin reddi ve CSV'deki insan onayının geri alınmasında ret geçti. Fikstür soru ve ipucu satırı test sonunda silindi. Gerçek örnek JSON'un kuru denetimi beklenen biçimde `İpucu insan onaylı değil` diyerek reddetti.

**Açık yayın sınırı:** Kaynak notu veya PDF daha sonra değişirse V18 satırını kendiliğinden geri çeken bir olay bağı yoktur. İçerik bakımında onayı geri çekme/yeniden denetleme işlemi ve gerçek öğretmen/editör onayları 15.03 kapsamında tamamlanmadan gerçek ipucu öğrenciye açılmamalı. Soru tipi onayı/sürümü değişirse mevcut API zaten ipucunu gizler.
