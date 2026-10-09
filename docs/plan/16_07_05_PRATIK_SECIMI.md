# 07.05 — Pratikte aday modu ve konu filtreleri

**Durum:** BITTI · **Bağımlılık:** [07.04](14_07_04_OTURUM_DENEMELERI.md) BITTI.

## Kısa amaç

Öğrenci pratik kurarken yeni, önceki, yanlış veya karışık soru havuzunu seçer. Seçilen filtre ve moddaki gerçek soru sayısını görür; oturumun sırası ve seçimi kaydedilir.

## Bu dilimin sınırı ve kabulü

1. Mevcut `QuestionAvailabilityService`/sınav seçimi mantığını tekrar kullan; `NEW`, `REPEAT`, `WRONG`, `MIXED` aday sayısını aynı tanımla hesapla. Pratik oluşturma API'sine `selectionMode` ekle, varsayılanı eski istemciler için `MIXED` olsun. Gerçek aday sayısı istenen sayıdan azsa 400 ve anlaşılır mesaj dönsün. Soru sırası tekil, kayıtlı ve yenilemede aynı olsun.
2. Mevcut sınav türü, koleksiyon, ders ve konu filtrelerini kullanıcı dostu kurucuda sun. Alt konu/soru tipi etiketi mevcut sorularda güvenilir değilse uydurma seçenek gösterme; veri envanterini kaydet ve bu alt parçayı açık, numaralı işe ayır. Doğrulanmış etiket varsa API/kurucuya ekle.
3. Seçilen mod ve filtreyi oturum özeti ile API yanıtında sakla/göster. `clientRequestId` ağ tekrarında aynı oturumu döndürsün; farklı kullanıcı ve yetersiz havuz denensin.
4. Masaüstü/telefon kurulum, boş havuz, başlatma, oturuma dönüş ve dört mod için anlamlı uçtan uca veya servis testlerini çalıştır. Canlı DB'yi ve çalışan süreci değiştirme.

**Bu işte ertelenenler:** Doğrulanmış alt konu/soru tipi filtresi **07.10**, süreli pratik/sonuç **07.06**, geçmiş listesi **07.07**, OGM PDF'den doğrulanmış konuya geçiş **07.08**, zorluk filtresi **07.09**.

## Oturum sonu kaydı

2026-10-09 · `NEW/REPEAT/WRONG/MIXED` seçimi mevcut sınavla aynı aday sorgularına bağlandı; seçilen mod ve kaynak/sınav/ders/konu `V13` ile oturumda saklanır. Kurucuda gerçek aday sayısı ve yetersiz havuz uyarısı var. Test DB ve izole UI verisinde 80.097 soru vardı, `taxonomy_nodes` ve `question_taxonomy` kayıtları **0**: alt konu/tip seçeneği gösterilmiyor, [07.10](12_NUMARALI_IS_LISTESI.md) olarak açık. `StudySessionTest` 4/4, ön yüz derlemesi ve izole masaüstü/mobil E2E ayrı ayrı 39/39 geçti; kurucu ve oturum ekranları 1280/390 px kontrol edildi. Gerçek `ivme` DB V9 ve çalışan 5173/8081 servisleri korunmuştur; canlıya alma [05.03](12_NUMARALI_IS_LISTESI.md) açık. Yerel commit: bu görev tamamlanınca Git geçmişinde.

**BITTI**
