# Soru içe aktarma

MEBİ'nin ayrı Pratik 2 bankası `MEBI_PRACTICE_2` kimliğini kullanır.
Kaynak kodları `MEBI2_TYT`/`MEBI2_AYT`; öğrenci yolu `/pratik-2` olur.
Bu banka varsayılan eski pratik havuzuna otomatik eklenmez. Yalnız kaynak,
kırpım, basılı cevap ve kontrollü konu kabulü tamamlanan paketler INSERT_ONLY
ile alınır; yerel inceleme kuyruğu öğrenciye aktarılmaz. Takip ve kabul
[Pratik 2 planındadır](../plan/15-soru-bankasi-pratik-2.md).

CSV/JSON kaydında `code`, `exam_type`, `subject`, `image`, `correct_answer` zorunludur. `topic`, `year`, `source`, `choice_count`, `solution_url`, `active`, `bank` (`CIKMIS`/`OGM`) ve `solution_image` isteğe bağlıdır. Dosya bütünüyle doğrulanır; hata varsa uygulanmaz. Operatör ekranı önce ön izleme yapar. `INSERT_ONLY` mevcut soruları korur; `UPSERT` kayıtları günceller.

Kaynak veri mevcutsa `node ornek-veri/ornek_uret.mjs --tum` çıkmış sorular, `node ornek-veri/ogm_uret.mjs` OGM için Git dışı CSV/görsel çıktısı hazırlar. Girdi `../icerik/data/` altındadır. OGM görselleri varsayılan olarak `veri/resimler-pilot/ogm` altına bağlanır; `--kopyala` kopyalar. Büyük CSV için uygulamayı bir kez `YKS_IMPORT_DOSYASI=<CSV yolu>` ile başlat; varsayılan mod `INSERT_ONLY`'dir. İşlem bitince değişkeni kaldır ve DB ile görselleri ayrı yedekle.

Beyaz dış kenarları ön izlemek için `python scripts/soru-gorsellerini-kirp.py --dry-run --limit 100` kullan. Gerçek kırpılmış kopyalar `veri/resimler-pilot/kirpilmis/` altındadır; özgün görsel, CSV, etiket ve hash değişmez. Özgün görseller yeniden üretilirse `--force` ile kırpılmış kopyaları yenile.
