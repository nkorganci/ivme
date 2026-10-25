# Değişiklik akışı

[Mimari dizini](README.md) · [Çalışma kuralları](../../AGENTS.md)

1. `git status` ile kullanıcı değişikliklerini koru; yalnız görevin [ilgili sözleşmesini](../README.md) ve varsa açık adımı oku.
2. Güncel kaynak/sözlük sürümünü ve mevcut çıktı/hash kanıtını kontrol et; aynı girdide pahalı çıkarımı tekrarlama.
3. Değişikliği [bakım kaynağında](veri-kaynaklari.md) yap. Kimlik, öğretmen onayı ve öğrenci geçmişine etkisini belirle; üretilmiş projeksiyonu elle değiştirme.
4. İlgili [denetimi](denetimler.md) çalıştır. Backend testleri yalnız geçici `ivme_test` kullanır. İçerik yayını için şema, kaynak hash'i ve sayfa/zaman sınırlarını doğrula.
5. Uygulama kodu değiştiyse [yerel işletim tarifine](../islemler/uygulama-calistirma-ve-yayin.md) göre sunulan sürümü ve değişen ekranı doğrula.
6. Değişen davranışı teknik belgesinde düzelt; yarım işi [devam notuna](../devam.md) yaz. Kapanan plan maddesini kaldır; tamamen kapanan adım dosyasını sil ve bağlantıları düzelt. Kalıcı mimari ve sözleşmeler korunur.
