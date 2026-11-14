# İvme uygulaması

React/Vite ön yüzü, Spring Boot API'si ve PostgreSQL ile çalışan YKS/KPSS eğitim uygulaması: öğrenci soru çözer, pratik ve deneme yapar; operatör içerik ve etiketleri inceler; yönetici kullanıcıları yönetir. Ayrıntı [API sözleşmesinde](docs/sozlesmeler/api.md).

## Çalıştırma

Java 21, Maven, Node.js 22+, PostgreSQL ve veri hattı için Python gerekir. Çalışma alanının üstündeki `Ivme Baslat.bat` uygulamayı `http://localhost:1010` adresinde açar; kaynak izleyicisi derleme ve yeniden başlatmayı yönetir ([tarif](docs/tarifler/calistirma-ve-yayin.md)). Gerçek DB `ivme`, test DB geçici `ivme_test`.

## Klasörler

`backend/` Spring Boot, `frontend/` React, `scripts/` araçlar (`python scripts/ivme.py`), `testler/`, `veri/` çalışma verisi (Git dışı), `docs/` belgeler. Kaynak PDF'ler `../Kaynaklar/`, veri hattı `../veri-hatti/`, içe aktarma girdileri `../icerik/data/` altındadır.

## Doğrulama ve belgeler

`python scripts/ivme.py durum --hizli`, `plan`, `test`, `kontrol`; ön yüz için `cd frontend && npm run build`. [Belge dizini](docs/README.md), [yol haritası](docs/plan/README.md), [devir notu](docs/devam.md). Codex `AGENTS.md`'yi, Claude `CLAUDE.md` içindeki `@AGENTS.md` aktarımını kullanır.
