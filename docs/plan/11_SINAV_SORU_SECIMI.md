# Adım 7 — sınav sorusu seçimi

Tarih: 2026-10-09. Durum: sınav kurucusu dilimi. Serbest pratik oturumu hâlâ ayrı bir alt iştir.

## Yapılanlar

- Sınav kurucusu kaynak/sınav/ders/konu, soru sayısı, süreli/süresiz ve soru geçmişi seçimini birlikte sunar. Seçenekler `MIXED` (tümü), `NEW` (cevaplanmamış), `REPEAT` (cevaplanmış), `WRONG` (en az bir yanlış) olarak tanımlandı. Aday sayıları öğrencinin kendi pratik ve teslim edilmiş sınav cevaplarından hesaplanır.
- Yetersiz havuzda form uyarı verir; sunucu da istenen soru sayısından az sınav oluşturmayı reddeder. Rastgele seçilen kimlikler sınav kaydında pozisyonlarıyla saklanır, aynı soru aynı sınavda iki kez bulunmaz. Oturumdaki cevap ve sonuç gizliliği mevcut kurallarla sürer.
- `V11__sinav_soru_secimi.sql`, `exams.selection_mode` sütununu ekler; önceki sınavlar `MIXED` kabul edilir. İstek alanı eksikse yine `MIXED` kullanılır. Gerçek `ivme` veritabanına geçiş, çalışan sitenin yeniden başlatılmasıyla yapılacak; V9 yedeği korunur.

## Kontrol ve kalan işler

İki öğrenciyle dört aday havuzu, yetersiz sayı, sınavda kalıcı seçim modu ve eski sınav akışı ayrı `ivme_test` DB'sinde doğrulandı: 46 test geçti, 2 test atlandı. V9 yedeğinden geri alınan geçici `ivme_e2e` DB'si V11'e yükseldi. Ayrı `8082/5174` sunucularında masaüstü ve telefon Chrome akışları ayrı ayrı 31/31 denetim geçti; az soru uyarısı, yeni soru seçimi, sınav başlangıcı ve teslim sonrası akış kontrol edildi. Görüntüler Git dışı `veri/ui-selection/` altındadır. Canlı `8081/5173` süreçleri ve gerçek `ivme` verisi bu provada değiştirilmedi.

`study_sessions` üzerinden süresiz pratik oluşturma ve soru sırasını sürdürme [07.03](13_07_03_PRATIK_OTURUMU.md) kapsamında eklendi. Oturuma bağlı deneme olayları [07.04](14_07_04_OTURUM_DENEMELERI.md) ve pratik seçim modları [07.05](16_07_05_PRATIK_SECIMI.md) tamamlandı. Süre bitişi [07.06](17_07_06_SURELI_PRATIK.md), alt konu/soru tipi filtresi onaylı taksonomi verisiyle [07.10](12_NUMARALI_IS_LISTESI.md) işidir.

Bu belgenin [07.02](12_NUMARALI_IS_LISTESI.md) sınav soru seçimi dilimi tamamlandı. Gerçek DB'de V11 açılışı [05.03](12_NUMARALI_IS_LISTESI.md) açık işidir. Süresiz pratik oturumu [07.03](13_07_03_PRATIK_OTURUMU.md) kapsamında ayrı eklendi.

**BITTI**
