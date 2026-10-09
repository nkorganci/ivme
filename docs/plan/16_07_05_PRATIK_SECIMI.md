# 07.05 — Pratikte aday modu ve konu filtreleri

**Durum:** SIRADAKI · **Bağımlılık:** [07.04](14_07_04_OTURUM_DENEMELERI.md) BITTI.

## Kısa amaç

Öğrenci pratik kurarken yeni, önceki, yanlış veya karışık soru havuzunu seçer. Seçilen filtre ve moddaki gerçek soru sayısını görür; oturumun sırası ve seçimi kaydedilir.

## Bu dilimin sınırı ve kabulü

1. Mevcut `QuestionAvailabilityService`/sınav seçimi mantığını tekrar kullan; `NEW`, `REPEAT`, `WRONG`, `MIXED` aday sayısını aynı tanımla hesapla. Pratik oluşturma API'sine `selectionMode` ekle, varsayılanı eski istemciler için `MIXED` olsun. Gerçek aday sayısı istenen sayıdan azsa 400 ve anlaşılır mesaj dönsün. Soru sırası tekil, kayıtlı ve yenilemede aynı olsun.
2. Mevcut sınav türü, koleksiyon, ders ve konu filtrelerini kullanıcı dostu kurucuda sun. Alt konu/soru tipi etiketi mevcut sorularda güvenilir değilse uydurma seçenek gösterme; veri envanterini kaydet ve bu alt parçayı açık, numaralı işe ayır. Doğrulanmış etiket varsa API/kurucuya ekle.
3. Seçilen mod ve filtreyi oturum özeti ile API yanıtında sakla/göster. `clientRequestId` ağ tekrarında aynı oturumu döndürsün; farklı kullanıcı ve yetersiz havuz denensin.
4. Masaüstü/telefon kurulum, boş havuz, başlatma, oturuma dönüş ve dört mod için anlamlı uçtan uca veya servis testlerini çalıştır. Canlı DB'yi ve çalışan süreci değiştirme.

**Bu işte ertelenenler:** Süreli pratik/sonuç **07.06**, geçmiş listesi **07.07**, OGM PDF'den doğrulanmış konuya geçiş **07.08**, zorluk filtresi **07.09**.

## Oturum sonu kaydı

`Tarih · değişiklik · UI · test · yerel commit · açık risk` ekle. [İş listesini](12_NUMARALI_IS_LISTESI.md) ve dış klasör kopyasını eşitle; bitince **07.05 BITTI**, **07.06 SIRADAKI** yap. GitHub'a push yapma.
