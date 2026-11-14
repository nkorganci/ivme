# Soru içe aktarma

MEBİ'nin mevcut11.026 sorusu ana `OGM` bankasına taşındı; yeni soru arama/çıkarım
ve aktarımı kapalıdır. Eski `MEBI_PRACTICE_2`, `MEBI2_TYT`/`MEBI2_AYT` ve
`/pratik-2` bağlantıları ana bankayla uyumludur. Kaynak/PDF kimliği, kategori,
inceleme ve kabul kayıtları [kalıcı işlem belgesindedir](mebi-pratik-2.md).
Silinen eski planı veya aktarım kuyruğunu yeniden oluşturma.

CSV/JSON kaydında `code`, `exam_type`, `subject`, `image`, `correct_answer` zorunludur. `topic`, `year`, `source`, `choice_count`, `solution_url`, `active`, `bank` (`CIKMIS`/`OGM`) ve `solution_image` isteğe bağlıdır. Dosya bütünüyle doğrulanır; hata varsa uygulanmaz. Operatör ekranı önce ön izleme yapar. `INSERT_ONLY` mevcut soruları korur; `UPSERT` kayıtları günceller.

Kaynak veri mevcutsa `node ornek-veri/ornek_uret.mjs --tum` çıkmış sorular, `node ornek-veri/ogm_uret.mjs` OGM için Git dışı CSV/görsel çıktısı hazırlar. Girdi `../icerik/data/` altındadır. OGM görselleri varsayılan olarak `veri/resimler-pilot/ogm` altına bağlanır; `--kopyala` kopyalar. Büyük CSV için uygulamayı bir kez `YKS_IMPORT_DOSYASI=<CSV yolu>` ile başlat; varsayılan mod `INSERT_ONLY`'dir. İşlem bitince değişkeni kaldır ve DB ile görselleri ayrı yedekle.

Beyaz dış kenarları ön izlemek için `python scripts/soru-gorsellerini-kirp.py --dry-run --limit 100` kullan. Gerçek kırpılmış kopyalar `veri/resimler-pilot/kirpilmis/` altındadır; özgün görsel, CSV, etiket ve hash değişmez. Özgün görseller yeniden üretilirse `--force` ile kırpılmış kopyaları yenile.
