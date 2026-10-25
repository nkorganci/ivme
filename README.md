# İvme uygulaması

React/Vite ön yüzü, Spring Boot API'si ve PostgreSQL ile çalışan YKS/KPSS eğitim uygulaması. Öğrenci soru çözer, pratik ve deneme yapar; operatör içerik ve etiketleri inceler; yönetici kullanıcıları ve toplu kullanım verisini yönetir. Özellik ve uç noktaların ayrıntısı [API ve mimari sözleşmesinde](docs/API-ve-mimari.md).

## Yerel çalışma

Gerekenler: Java 21, Maven, Node.js 22+, PostgreSQL ve veri hattı için Python. Çalışma alanının üstündeki `Ivme Baslat.bat` tek uygulamayı `http://localhost:1010` adresinde açar. Kaynak izleyicisi normal geliştirme akışında derleme ve yeniden başlatmayı yönetir. Ortam, log, yedek ve yayın komutları [uygulama işletim tarifindedir](docs/islemler/uygulama-calistirma-ve-yayin.md). Gerçek kullanıcı veritabanı `ivme`; test veritabanı geçici `ivme_test`.

Özgün PDF'ler `../Kaynaklar/`, veri üretimi `../veri-hatti/`, içe aktarma girdileri `../icerik/data/` altındadır. Üretilmiş çıktılar ve sırlar Git dışında tutulur.

## Doğrulama

```powershell
python scripts/ivme.py durum --hizli
python scripts/ivme.py plan
python scripts/ivme.py test
cd frontend
npm run build
```

Backend testi geçici DB kullanır; [bilinen test hataları](testler/bilinen-hatalar.md) ayrı listelenir. Değişiklikle ilgili en küçük denetimi seçmek için [doğrulama tarifi](docs/islemler/dogrulama.md) kullanılır.

## Belgeler ve AI ile çalışma

[Belge dizini](docs/README.md) teknik sözleşmeleri, planı, tasarımı ve tekrarlanan işlemleri ayırır. [Yol haritası](docs/plan/00_YOL_HARITASI.md) açık işleri, [devir notu](docs/plan/00_DEVAM.md) yarım işi tutar. Codex `AGENTS.md` dosyasını, Claude ise `CLAUDE.md` içindeki `@AGENTS.md` aktarımını kullanır. Tekrar eden işlemler `python scripts/ivme.py` alt komutlarıyla yürütülür.
