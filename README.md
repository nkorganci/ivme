# İvme uygulaması

React/Vite ön yüzü, Spring Boot API'si ve PostgreSQL ile çalışan YKS/KPSS eğitim uygulaması: öğrenci soru çözer, pratik ve deneme yapar; operatör içerik ve etiketleri inceler; yönetici kullanıcıları yönetir. Ayrıntı [API sözleşmesinde](docs/sozlesmeler/api.md).

## Çalıştırma

Java 21, Maven, Node.js 22+, PostgreSQL ve veri hattı için Python gerekir. Windows'ta yerel `test` dalı `http://localhost:1012` adresinde `ivme_local` veritabanıyla çalışır. Geçici otomatik testler `ivme_test` kullanır. Linux kurulumu için [VPS yayını](docs/tarifler/vps-yayini.md) tarifine bak.

## Klasörler

`backend/` Spring Boot, `frontend/` React, `scripts/` araçlar (`python scripts/ivme.py`), `testler/`, `veri/` çalışma verisi (Git dışı), `docs/` belgeler. Kaynak PDF'ler `../Kaynaklar/`, veri hattı `../veri-hatti/`, içe aktarma girdileri `../icerik/data/` altındadır.

## Doğrulama ve belgeler

`python scripts/ivme.py durum --hizli`, `plan`, `test`, `kontrol`; ön yüz için `cd frontend && npm run build`. [Belge dizini](docs/README.md), [yol haritası](docs/plan/README.md), [devir notu](docs/devam.md). Codex `AGENTS.md`'yi, Claude `CLAUDE.md` içindeki `@AGENTS.md` aktarımını kullanır.
