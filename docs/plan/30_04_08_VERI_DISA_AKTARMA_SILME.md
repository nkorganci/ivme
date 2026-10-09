# 04.08 — Öğrenci verisi dışa aktarma ve hesap silme

**Durum:** BITTI (kod ve izole doğrulama) · **Tarih:** 2026-10-09

## Davranış

Öğrenci Hesap ekranında mevcut şifresiyle JSON dosyası indirir. Dosya hesap/iletişim bilgileri, sınav ve pratik oturumları, soru kimlikleri ve seçimleri, denemeler, karalamalar, geri bildirimler, hedefler ve ham etkinlik olaylarını içerir. Parola özeti, başka kullanıcının kayıtları, ortak soru bankasının içeriği ve sürmekte olan sınavların doğru cevapları dosyaya konmaz. Yanıt `Cache-Control: no-store` ile döner.

Silme için mevcut şifre ve tam `HESABIMI SIL` onayı gerekir. Tek veritabanı işleminde öğrencinin geri bildirimleri, karalamaları, soru denemeleri, pratik/sınav kayıtları, hedefleri, etkinlikleri ve hesabı silinir. `session_questions` ile `exam_questions` üst kayda bağlı kaskatla silinir. Ortak soru kayıtları ve diğer öğrencilerin verileri kalır. Oturum geçersizleşir. API yalnız `USER` hesabına izin verir; yönetici/operatör kendi hesaplarını bu akıştan silemez.

Önceden alınmış veritabanı yedekleri ayrı saklanıyor olabilir. Ekran bu sınırı açıkça belirtir; yedek saklama/silme politikası [04.09](12_NUMARALI_IS_LISTESI.md) kapsamında ayrıca düzenlenmelidir.

## Kontrol

- `AccountDataTest` ve `AuthTest` geçti. İki öğrenci ve bir ortak soru ile dışa aktarma ayrımı, yanlış şifre/onay reddi, ilişkili kayıtların silinmesi, diğer öğrenci ve ortak sorunun korunması, oturumun 401'e dönmesi ve yönetici erişim reddi sınandı.
- `npm run build` geçti. İzole API yanıtlarıyla 1280 ve 390 px Hesap ekranında iki işlem ve yatay taşma kontrol edildi.
- Canlı hesaplar veya gerçek `ivme` veritabanı üzerinde silme denenmedi. Test DB `ivme_test` kullanıldı.
