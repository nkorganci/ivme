# Sistem rehberi — Yeni kaynak kabulü

[Rehber dizini](../00_SISTEM_REHBERI.md) · Ne zaman okunur: Yeni PDF/video/sınav eklerken.

## Yeni kaynak kabulü

`scripts/resource-intake.mjs` soru/PDF/video taslağını aynı kontrollü sözlük,
`enrichResource` ve `validateResource` ile üretir. Bilinmeyen dar başlık geniş
kontrollü kapsama, branş da bilinmiyorsa başarıdan hariç sistem kapsamına gider.
Yeni bağımsız kategori üretilmez; özgün başlık ve kaynak bilgisi korunur.

`QuestionImportService` CSV/JSON için yalnız etiket metadatasını bu doğrulayıcıya
tek parti halinde gönderir; cevap/öğrenci verisi göndermez. Doğrulama başarısızsa
soru yazımı başlamaz. V43 `learning_catalog.question_intake`, doğrulanmış taslağı
soru ile aynı işlemde ve soru kaynak damgasıyla saklar. Atlanan satır bu kaydı
ezmez. Yeni/değişen kaydın katalog yayını ana üretim hattında atomik yapılır;
önceki yayımlanmış sürüm bu arada korunur. Yayın, karşılık gelen kabul kaydını
`PUBLISHED` yapar. İçe alınmış yeni sürüm eski AI araştırması/PDF sayfasına
sessizce yeniden bağlanmaz; eski kanıt korunarak yeniden incelemeye ayrılır.

Bu yerel kurulumun içe alma hizmeti Node.js ve uygulamanın `scripts/` dizinine
ihtiyaç duyar; doğrulayıcı sabit argümanlarla, JSON standart girdi üzerinden
çalışır. Kaynak okuma/OCR/model/ağ çağrısı bu HTTP işleminde yapılmaz. Yeni
tanınmayan yerel PDF, genel inceleme kimliği ve özgün dosya/hash'iyle envantere
alınır; açılabilirliği ve kapsamı ayrı denetlenir.
