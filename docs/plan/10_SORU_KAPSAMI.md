# Adım 7/8 — soru kapsamı sayıları

Tarih: 2026-10-09. Durum: ilk dilim. Seçilebilir çalışma oturumundan önce öğrencinin hangi filtrede kaç yeni/çözdüğü soru olduğunu güvenilir biçimde göstermeye başlar.

## Kural ve uygulama

- `GET /api/questions/availability` `bank`, `examType`, `subject`, `topic` filtrelerinde yalnız etkin tekil soruları sayar. `total`, `solved`, `remaining`, `everWrong` döner. Öğrenci kimliği oturumdan alınır; başka kullanıcı kimliği parametresi yoktur.
- `solved`: pratikte en az bir `ANSWER` veya teslim edilmiş sınavda cevap. `REVEAL`, `SKIP`, boş cevap ve devam eden sınav sayılmaz. Pratik ile sınavdaki aynı soru bir kez sayılır.
- `everWrong`: en az bir yanlış cevap. Daha sonra doğru yapılmış olsa da bu sayı düşmez; gelecekteki “son hatalarım” filtresi ayrı tanımlanacak.
- Soru listesi seçili filtre için dört sayıyı gösterir. Yeni API henüz çalışmayan geliştirme sunucusunda sayılar gizlenir ve eski liste çalışır.
- Kaynak veriler üzerinden SQL toplulaştırması kullanılır; her soru için ayrı sayaç sütunu tutularak eşzamanlama sorunu yaratılmaz. Yeni tablo/göç gerekmez.

## Denetim ve sıradaki iş

Yalıtılmış `ivme_test` veritabanında iki öğrencinin ayrı sayıları, banka/konu filtresi, etkin olmayan soru, yanlış→doğru pratik, teslim edilmiş sınav ve çift saymama doğrulandı. Toplam 45 arka yüz testi geçti, 2 test atlandı. V9 yedeğinden alınan geçici `ivme_e2e` veritabanında ayrı `8082/5174` sunucularıyla masaüstü ve telefon akışları ayrı ayrı 28/28 denetim geçti; yeni öğrencinin sıfır durumu ve yanıttan sonra sayı artışı görüldü. Ekran görüntüleri Git dışı `veri/ui-availability/` altındadır. Gerçek `ivme` DB'sine yalnız okuma yapıldı; çalışan site yeniden başlatılmadı.

Sınav kurucusunda dört aday havuzu, sayı/süre seçimi ve yetersiz soru uyarısı [bir sonraki dilimde](11_SINAV_SORU_SECIMI.md) bağlandı. Sonraki iş: `study_sessions` ve `session_questions` ile sınavdan ayrı kalıcı pratik oturumu; bu sayılar pratik oturumunun aday havuzuna da bağlanacak.

Bu belge [07.01/08.01](12_NUMARALI_IS_LISTESI.md) filtreli soru kapsamı dilimini kaydeder. Kalıcı pratik oturumu [07.03](13_07_03_PRATIK_OTURUMU.md) açık işidir.

**BITTI**
