# 03.02 — Erişilebilir bileşen denetimi

**Tarih:** 2026-10-09  
**Kapsam:** Kalan ekranlara temel olacak ortak React bileşenleri ve görsel/etkileşim stilleri. Bu kayıt, her ekranın WCAG uygunluk beyanı değildir; ekranlar geliştikçe ayrıca kontrol edilir.

## Denetim ve düzeltmeler

| Alan | Bulgu | Düzeltme |
|---|---|---|
| Tipografi | Kök yazı boyutu 15 px idi; temel metin hedefi 16 px. | Kök 16 px yapıldı; açıklama ölçeği `rem` ile birlikte büyüyor. |
| Kontrol hedefleri | Küçük düğmeler, yıldızlar ve soru şıkları 44 px hedefin altındaydı. | Düğme, form kontrolü, yıldız, ikon düğmesi ve şık hedefleri en az 44 px; checkbox/radio istisnası korundu. |
| Modal klavyesi | Odak modal dışına çıkabiliyor, başlık erişilebilir ada bağlı değildi. | Tab/Shift+Tab modal içinde döner; Escape kapatır; başlık `aria-labelledby` ile bağlandı; açan kontrole odak geri verilir. |
| Soru aracı sekmeleri | Sekmelerde ok tuşu gezinmesi ve roving tab index yoktu. | Sol/sağ ok, Home/End ve tek Tab durağı eklendi. |
| Görsel büyütme | Lightbox'ta Tab odak dolaşımı sınırlandırılmamış, arka plana tıklama kontrol tıklamasını da kapatabiliyordu. | Odak kapatma düğmesinde tutulur, Escape kapatır, odak geri döner; yalnız arka plan tıklaması kapatır. |
| Formlar/durumlar | `Field`, `Loading`, `ErrorBox`, `Alert` ve seçim bileşenlerinde etiket/yardım/hata veya canlı bölge kalıpları mevcuttu. | Mevcut kalıplar korundu; yeni ekranların bu ortak bileşenleri kullanması kabul ölçütüdür. |

## Kalan ekranlar için uygulama kontrolü

- Her etkileşim klavyeyle ulaşılır; odak görünür ve DOM sırası görsel akışla tutarlıdır.
- Form kontrollerinin görünür etiketi, gerekli olduğunda ilişkili yardım ve alan hatası vardır; hata rengi tek başına kullanılmaz.
- Yükleniyor, boş, hata, başarı ve yetkisiz durumlar metinle açıklanır; dinamik geri bildirim uygun canlı bölgededir.
- Sekme/akordeon/diyalog semantiği gerçek davranışla uyumludur; açma-kapama ve odak dönüşü klavyeyle çalışır.
- Metin temel ölçekte 16 px; etkileşim hedefi en az 44 px; 320 px genişlikte taşma ve dar ekranda kullanım gözle kontrol edilir.
- Bilgi yalnız renkle, simgeyle veya görsel şekille aktarılmaz; grafik/karalama için anlamlı metin eşdeğeri sağlanır.

## Kontrol sonucu ve sınır

Kaynak denetiminde ortak bileşenlerin etiket, `aria-*`, canlı bölge, görünür odak ve doğal HTML semantiği kullanımı incelendi. Değişen ön yüz için üretim derlemesi doğrulanır. Gerçek ekranların 320 px/telefon/masaüstü ve ekran okuyucu kontrolü kendi işlerinde sürer; 03.02 bunları peşinen uygun ilan etmez.

**Durum: BITTI (2026-10-09).**
