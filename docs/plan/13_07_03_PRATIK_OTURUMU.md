# 07.03 — Süresiz pratik oturumunu oluşturma ve sürdürme

**Durum:** BITTI · **Bağımlılık:** [07.01 ve 07.02](12_NUMARALI_IS_LISTESI.md) BITTI.

## Kısa amaç

Öğrenci seçtiği erişilebilir soru havuzundan belirli sayıda **süresiz** pratik oturumu başlatır; sunucu seçilen tekil soru kimliklerini ve sırasını `study_sessions` / `session_questions` içinde saklar. Sayfa yenilenince veya tekrar giriş yapınca aynı oturumu aynı sırayla açar. Mevcut soru çözme ve sınav akışları bozulmaz.

## Bu dilimin sınırı

1. Mevcut tablo ve API'yi incele; mümkünse yeni göç eklemeden en küçük sunucu sözleşmesini kur. Oturum oluştururken kullanıcı sahipliği, yetkili soru havuzu, istenen sayı ve idempotent/çift tıklama davranışı net olsun. Rastgele seçim bir oturum içinde tekrar soru üretmesin.
2. Oturum kimliğiyle yalnız sahibinin okuyabileceği soru sırası ve sürdürme uç noktasını ekle. Başka kullanıcı kimliği 403/404 almalı; sunucu doğru cevabı erken göndermemeli.
3. React'ta erişilebilir küçük bir “Pratik başlat / devam et” akışı kur. Sayı, mevcut aday sayısı, yetersiz soru, boş/yükleniyor/hata durumları ve dar ekran görünümünü kontrol et. Soruya ulaşmak için var olan pratik sayfasını kullan.
4. İki kullanıcı, az/yok soru, yinelenmeyen sıra, yenileme ve eski sınav/pratik uyumluluğu için anlamlı test yap. Ayrı test DB kullan; gerçek `ivme` DB'yi ve çalışan `8081/5173` süreçlerini değiştirme. Canlı V10/V11 geçişi ayrı **05.03** işidir.

**Bu dilimde ertelenen işler:** Denemeyi oturum sorusuna bağlama **07.04/06.04** ve dört seçim modu **07.05** daha sonra tamamlandı. Alt konu/soru tipi doğrulanmış etiketler sonrası **07.10**; süreli pratik ve sonuç **07.06**; geçmiş listesi **07.07** açık.

## UI ve BITTI ölçütü

Masaüstü ve telefon ekranında öğrenci 1) uygun sayı seçer, 2) süresiz oturumu açar, 3) yenileme/yeniden girişten sonra aynı oturum ve soru sırasını görür, 4) yetersiz havuzda neden başlayamadığını anlar. Başka öğrenci aynı oturuma erişemez. İlgili testler geçer. [12_NUMARALI_IS_LISTESI.md](12_NUMARALI_IS_LISTESI.md) içindeki **07.03** ancak bu kanıtla `BITTI` yapılır; ardından **07.04** `SIRADAKI` olur.

## Oturum sonu kaydı

`Tarih · karar/kapsam · UI kontrolü · test ve sonuç · commit · açık risk · sonraki numara` biçiminde buraya kısa kayıt ekle. Repo `docs/plan` ve dış plan klasörünü eşitle; yalnız ilgili dosyaları yerel feature branch'te commit et. **GitHub'a push yapma.**

**2026-10-09 kayıt:** `V12` kullanıcı/istek kimliğini tekilleştirdi. API süresiz `MIXED` oturumu ve tekil soru sırası saklıyor, yalnız sahibi okuyor, doğru cevabı döndürmüyor. React'ta başlatma, devam etme ve oturum soru listesi eklendi; doğrudan SPA yolları sunucudan açılıyor. `StudySessionTest` 2/2, ön yüz derlemesi ve yedekten ayrılmış `ivme_e2e_0703` DB'sinde 1280/390 px Chrome akışları ayrı ayrı 35/35 geçti. Ekran görüntüleri Git dışı `veri/ui-study-session/` klasöründe. Gerçek `ivme` DB V9 ve çalışan 8081/5173 süreçleri değiştirilmedi. Deneme-oturum bağı, oturum içi geçiş ve tamamlanma durumu **07.04**'e bırakıldı. Yerel commit bu görevle birlikte oluşturulur; push yapılmaz.

**BITTI**
