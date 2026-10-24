# 14. Adım — KPSS Ortaöğretim içeriğini aynı ekranlara bağla

Bağımlılık: sınav seçimi altyapısı (V79 `exam_tracks`, `user_exam_tracks`,
`GET/PUT /api/exam-tracks`, “Sınavım” seçicisi ve `ExamTrackGate`) main'de çalışır.
KPSS Ortaöğretim `PREPARING` durumundadır: öğrenci seçebilir, içerik sayfaları
“hazırlanıyor” bilgisini gösterir. Diğer beş KPSS türü (Ön Lisans, Lisans,
A Grubu, Öğretmenlik/ÖABT, DHBT) `PLANNED` kalır; kullanıcı talimatıyla şimdilik
yalnız KPSS Ortaöğretim hazırlanır. 7/12 sırası ve mevcut YKS kayıtları korunur.

Kalıcı kurallar [sistem rehberindedir](00_SISTEM_REHBERI.md#hangi-bilginin-tek-kaynağı-var):
menü/sayfa kopyalanmaz, ders/konu kayıtları ortak katalogda `exam` =
`KPSS_OO_GY` (Genel Yetenek) veya `KPSS_OO_GK` (Genel Kültür) ile yayımlanır.

## 14.01 — KPSS Ortaöğretim ders/konu kaynağını ekle

Kullanıcının vereceği KPSS Ortaöğretim konu listesi (Türkçe, Matematik, Tarih,
Coğrafya, Vatandaşlık, Güncel Bilgiler) YKS Excel'iyle aynı üretim hattından
(`content-taxonomy.json` → `learning_catalog`) yeni sınav kimlikleriyle
yayımlanır. Konu adı prompt içinde uydurulmaz; kaynak dosya `Kaynaklar/mufredat`
altında tutulur. YKS kimlikleri ve 530 seçilebilir konu değişmez.

## 14.02 — Sayfaları etkin sınavın bölümlerinden okut

`FilterSelects`, `FullExamForm`, `QuestionCollection`, `Curriculum`,
`curriculum.js`, `questionSources.js`, `studyStatistics.js` ve benzeri yerlerdeki
sabit `['TYT','AYT']` listeleri `useExamTrack().track.sections[].examId`
değerinden okunur. YKS davranışı ve URL parametreleri aynı kalır; KPSS için
deneme süresi/soru sayısı `exam_tracks` kaydından gelir.

## 14.03 — KPSS soru, konu anlatımı ve video içeriğini yükle

Sorular mevcut içe aktarma sözleşmesiyle (`exam_type` yeni sınav değeri,
`bank`), videolar/PDF'ler ortak etiket ve adlandırma sözleşmesiyle eklenir.
Her içerik en az bir KPSS konu kimliğine bağlanır; tahmini etiket öğretmen
onayı sayılmaz.

## 14.04 — KPSS Ortaöğretim'i yayına al

14.01–14.03 doğrulanınca yeni Flyway göçüyle `status='ACTIVE'` yapılır ve not
güncellenir. Kabul: `node testler/exam-track-ui.mjs` güncellenmiş beklentiyle,
KPSS seçiliyken Dersler/Soru Çöz/Pratik/İstatistik ekranlarının yalnız KPSS
içeriği göstermesi, YKS seçiliyken mevcut YKS kabul testlerinin değişmeden geçmesi.

Mevcut kanıt: [sınav seçimi kabulü](../../veri/content-labels/integration/exam-tracks-20261024/ui-report.json),
`backend/src/test/java/com/hedefyks/ExamTrackFlowTest.java`.

## Kopyalanacak prompt

```text
D:\workspace\ivme\uygulama projesinde 14. adımı uygula.
Önce AGENTS.md, docs/plan/00_YOL_HARITASI.md ve
 docs/plan/00_CALISMA_BAGLAMI.md dosyalarını oku.
Görev dosyası: docs/plan/14_KPSS_ORTAOGRETIM.md
Bu prompt uygulama talimatıdır. Bağımlılıkları ve mevcut kanıtları kontrol et;
biten işi yeniden yapma. Bu adımın ilk açık alt işinden başlayıp sırayla ilerle.
Menü/sayfa kopyalama; KPSS ders/konularını ortak katalogda yeni sınav
kimlikleriyle yayımla, ikinci sözlük oluşturma. Konu adlarını uydurma;
kullanıcının verdiği kaynak dosyayı kullan. YKS kayıtlarını ve öğrenci
geçmişini koru. Gerçek veriyi sıfırlama; mevcut yetkiyi aşan yayın/push yapma.
Kabul ölçütlerini ilgili denetimlerle doğrula. Her biten alt işten sonra
00_CALISMA_BAGLAMI.md devam noktasını ve bu adımın kalan işlerini güncelle.
Adım tamamen bitince kalıcı kuralları ve kanıtı koru, görev dosyasını sil.
Sonuçta değişikliği, doğrulama kanıtını ve sıradaki görev kimliğini kısa yaz.
```
