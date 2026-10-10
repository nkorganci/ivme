# 15.01 — Kaynaklı kısa ipucu veri modeli

**Durum:** BITTI (sözleşme ve yayın uygunluğu denetimi) · **Tarih:** 2026-10-09 · **Girdi:** [13.03 kaynaklı pasaj](50_13_03_KAYNAKLI_PASAJ_ARAMASI.md), [14.02 AI taslak pilotu](52_14_02_AI_TASLAK_VE_INCELEME.md).

[JSON sözleşmesi](sema/kaynakli-ipucu-v1.schema.json) ve [taslak örnek](sema/kaynakli-ipucu-v1.ornek.json), soru görseli ve insan etiketi sürümünü, iç notun onay sürümünü, kaynak PDF özetini ve fiziksel sayfasını bağlar. `pre_answer_hint` cevap verilmeden önce istekle gösterilecek kısa yönlendirmedir; `post_submission_explanation` teslimden sonra gösterilecek açıklamadır. Bunlar ayrı alanlardır. Kaynak not bağlantısı `/api/topic-pdfs/{catalog_id}/file#page={page}` biçiminde, yetkili PDF API'si üzerinden kurulacaktır. İpucu kimliği ve inceleme sürümü düzeltmeleri izler.

`review.status=approved` yalnız editörün içerik doğruluğu ve cevap sızıntısı denetiminden sonra verilir. İpucunun yayın uygunluğu için ayrıca **aynı görsel özetli soruda insan onaylı tip**, **aynı sürüm ve PDF özetli insan onaylı, konusu doğrulanmış not**, **taksonomide soru tipinin atası olan not konusu** gerekir. `scripts/ipucu-kaynak-denetle.py` bu kaynak koşullarını yerel CSV ve iç not kayıtları üzerinden denetler; herhangi biri değişince eski ipucu geçersiz olur. Şema yapısal sözleşmedir; metnin pedagojik doğruluğunu veya sızıntısızlığını otomatik olarak kanıtlamaz. Bunlar editör incelemesinin işidir.

```powershell
$env:PYTHONIOENCODING='utf-8'
D:\workspace\ivme\.venv\Scripts\python.exe scripts\ipucu-kaynak-denetle.py docs\plan\sema\kaynakli-ipucu-v1.ornek.json
```

Mevcut taslak örnek denetimden **geçmemelidir**: 200 soruda 0 insan onayı ve 13.02 pilot notlarının tümünde `needs_review` vardır. Gerçek onaylı ipucu olmadığı için öğrenci API'si veya UI'ye veri bağlanmadı. 15.02 arayüzü uygularken denetim, saklama ve yetkili sunum katmanına taşınmalı; pratikte yalnız istek üzerine, sınavda yalnız teslim sonrası gösterilmelidir. Ders notu PDF'sini öğrenciye açmak mevcut 13.05 yetki sınırını korur. AI ile üretilen bir metin onaydan önce `draft` ya da `needs_review` kalır; özel öğrenci verisi modele gönderilmez.

**Doğrulama:** Sözleşme ve örnek JSON ayrıştırıldı; kaynak denetimi gerçek taslağı reddetti. Geçici insan onaylı fikstürde olumlu yol, görsel özeti ve not sürümü değişikliğinde ret, cevap sızıntısı kontrolü yokken ret denendi. Bu yalnız veri modeli ve yerel yayın kapısıdır; canlı DB'ye veya öğrenci arayüzüne uygulanmış özellik değildir.
