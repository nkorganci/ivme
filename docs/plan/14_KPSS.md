# 14. Adım — KPSS sınavlarını aynı ekranlara bağla

Bağımlılık: sınav seçimi altyapısı (V79 `exam_tracks`, `user_exam_tracks`,
`GET/PUT /api/exam-tracks`, “Sınavım” seçicisi ve `ExamTrackGate`) main'de çalışır.
Kullanıcı talimatıyla (24 Ekim 2026) altı KPSS sınavının hepsi sırayla hazırlanır:
Ortaöğretim, Ön Lisans, Lisans, A Grubu, Öğretmenlik/ÖABT, DHBT. Her sınav bitince
test edilir, DB doğrulanır ve ayrı commit atılır. 7/12 sırası ve YKS kayıtları korunur.

Kalıcı kurallar [sistem rehberindedir](00_SISTEM_REHBERI.md#hangi-bilginin-tek-kaynağı-var):
menü/sayfa kopyalanmaz; ders/ünite/konu kayıtları ortak katalogda sınav testi
kimliğiyle (`exam` = ör. `KPSS_OO_GY`) yayımlanır; ikinci sözlük açılmaz.

## Bir KPSS sınavını ekleme hattı (her sınav için aynı)

1. **Ders/ünite/konu referansı (önce):** `Kaynaklar/KPPS/<Sınav>/Mufredat/<sınav>-konular.json`.
   Dayanak ÖSYM kılavuzunun testlerin kapsamı tablosu ve en az iki bağımsız konu listesidir.
   Konular çıkmış sorularla tutarlı olmalı; sorusu olmayan veya karşılığı bulunmayan konu raporlanır.
2. **Soru çıkarma:** `veri-hatti/<sınav>/` Python betikleri her PDF'den yalnız soruyu
   (ortak metniyle) kırpar: `icerik/data/<sınav>/ham/<yıl>.json`, `gorsel/<yıl>/<TEST>-<no>.webp`.
3. **Sınıflandırma:** her soru okunarak tek konuya bağlanır:
   `Kaynaklar/KPPS/<Sınav>/Cikmis Sorular/siniflandirma/<yıl>.tsv`
   (`TEST NO KOD GÜVEN [not]`; H/M/L güven, `ESKI` yürürlükten kalkmış mevzuat, `EKSIK` kaynakta eksik).
   Kategorisiz soru kalmaz; emin olunmayan M/L ile işaretlenir ve öğretmen onayı bekler.
4. **Derleme:** `veri-hatti/<sınav>/derle.py` doğrular ve `konular.json`, `sorular.json`,
   `rapor.json` ile dağılım Excel'ini üretir. `konular.json` içinde yayın alanları bulunur:
   `track`, `kategoriOnek`, `kodOnek`, `gorselKlasoru`, `klasor`, `arsivYillari`, `yardimciPdfler`.
5. **Uygulama:** sınavın test kimlikleri `ExamType` ve `QuestionSource` enum'larına eklenir.
   Yeni Flyway göçü üç işi yapar: `questions`, `study_sessions` ve `exam_archive_positions`
   kısıtlarını genişletir; `exam_tracks` kaydını `sections` (ders/soru/dakika) ve
   `ready_features` ile `ACTIVE` yapar.
6. **Yayın:** `python scripts/kpss-yayinla.py icerik/data/<sınav>`. Betik görselleri kopyalar,
   soruları ve tam sınav sıralarını yazar, ortak kataloğa ekler (`scripts/kpss-catalog.mjs`),
   atomik yayınlar ve denetler. Sınav klasörüne `ISLEME_DURUMU.json/.md` işleme etiketini yazar
   (`TUM_PDFLER_ISLENDI` olmadan biter sayılmaz). Tekrar çalıştırılabilir.
7. **Kabul:** `KpssTrackScopeTest` benzeri backend testi, `node testler/exam-track-ui.mjs`
   ve tam backend paketi (bilinen 11 eski hata dışında yeni hata yok).

YKS etiket hattı (`content-label-refresh.py`) KPSS sorularını atlar ve her
`icerik/data/kpss-*` sınavını `kpss-yayinla.py --katalog` ile yeniden ekler.

## 14.01 — KPSS Ortaöğretim (tamamlandı, 24 Ekim 2026)

- Referans: 6 ders, 23 ünite, 85 konu (`kpss-ortaogretim-konular.json`; ÖSYM 2026 kılavuzu Tablo-1).
- Sorular: 2006–2024 arasındaki 10 sınavın 1260 sorusu sınıflandırıldı ve 1223'ü açık.
  Kapalı olanlar: 14 ESKI, 21 EKSIK_SIK, 2 EKSIK_KOK. Güven dağılımı: H 1114, M 144, L 2.
- Tam sınav arşivi: GY 2010–2024 (30/30) ve GK 2014–2024 (27/18/9/6).
- Kod ve DB: V80–V82, `ExamTrackService` kapsamı, sınava duyarlı ekranlar, katalog run
  `labels-v1-cbca1ff6f1bdc5c68c32e54a`.
- Kanıt: işleme etiketi `Kaynaklar/KPPS/KPSS Ortaöğretim/ISLEME_DURUMU.md`,
  [yayın raporu](../../veri/content-labels/integration/kpss-ortaogretim-20261024/rapor.json),
  [UI kabulü](../../veri/content-labels/integration/kpss-ortaogretim-20261024/ui/ui-report.json),
  `KpssTrackScopeTest`, `ExamTrackFlowTest`.
- Açık: KPSS konu anlatımı/video/soru bankası kaynağı yok; ilgili bölümler “henüz hazır değil” gösterir.
  ÖSYM içeriği için web yayın izni belgelenmedi (yalnız yerel kullanım).

## 14.02 — KPSS Ön Lisans

GY/GK; 2006, 2008, 2010 tam kitapçık, 2012 üçüncü taraf, 2014–2026 %10 örnekleri.

## 14.03 — KPSS Lisans

GY/GK (Lisans oturumu); tam kitapçıklar ve sonraki yılların %10 örnekleri.

## 14.04 — KPSS A Grubu

Lisans GY/GK ve alan bilgisi testleri (Hukuk, İktisat, İşletme, Maliye, Muhasebe,
Çalışma Ekonomisi, İstatistik, Kamu Yönetimi, Uluslararası İlişkiler...).

## 14.05 — KPSS Öğretmenlik / ÖABT

Lisans GY/GK, Eğitim Bilimleri ve 2013–2024 ÖABT branş testleri.

## 14.06 — KPSS DHBT

DHBT ortak ve düzeye özel testler (2014–2024).

## Kopyalanacak prompt

```text
D:\workspace\ivme\uygulama projesinde 14. adımı uygula.
Önce AGENTS.md, docs/plan/00_YOL_HARITASI.md ve
 docs/plan/00_CALISMA_BAGLAMI.md dosyalarını oku.
Görev dosyası: docs/plan/14_KPSS.md
Bu prompt uygulama talimatıdır. Bağımlılıkları ve mevcut kanıtları kontrol et;
biten işi yeniden yapma. Bu adımın ilk açık alt işinden başlayıp sırayla ilerle.
Menü/sayfa kopyalama; KPSS ders/konularını ortak katalogda yeni sınav
kimlikleriyle yayımla, ikinci sözlük oluşturma. Konu adlarını uydurma; ÖSYM
kılavuzu ve güvenilir kaynaklarla doğrula, çıkmış sorularla tutarlılığını raporla.
YKS kayıtlarını ve öğrenci geçmişini koru. Gerçek veriyi sıfırlama; mevcut
yetkiyi aşan yayın/push yapma. Kabul ölçütlerini ilgili denetimlerle doğrula.
Her biten alt işten sonra 00_CALISMA_BAGLAMI.md devam noktasını ve bu adımın
kalan işlerini güncelle. Adım tamamen bitince kalıcı kuralları ve kanıtı koru,
görev dosyasını sil. Sonuçta değişikliği, doğrulama kanıtını ve sıradaki görev
kimliğini kısa yaz.
```
