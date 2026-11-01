# Matematik konu listesi (9–12. sınıf, TYT → AYT)

Bu belge Konuyu Öğrenelim matematiğinin **tek takip listesidir**. Claude, Codex/ChatGPT ve
diğer agent'lar matematik içerik işine başlamadan önce yalnız bu listeyi okur;
**✅ BİTTİ satırına yeniden bakmaz**, ilk 🟡/⬜ satırdan devam eder. Girdisi değişmemiş
bitmiş dersi yeniden yazmak, baştan taramak veya testlerini sebepsiz tekrarlamak yasaktır.

**Etkin aşama: TYT.** AYT satırlarına TYT listesinin hepsi ✅ olana kadar başlanmaz
(kullanıcı kararı). Yeni ders yazılmaz; yalnız TYT kapsamındaki mevcut dersler tamamlanır.

## “Bitti” nasıl belirlenir

Durum sütunu elle yazılmaz. `node scripts/konu-ogrenme-kapsam.mjs --liste` ders dosyalarını
ölçer ve aşağıdaki tabloyu yeniden yazar; `--liste --kontrol` belge ölçümle uyuşmazsa
hata verir ve `python scripts/ivme.py kontrol` bunu commit öncesi çalıştırır. Bir satır
yalnız dört ölçütün hepsi sağlanınca ✅ olur:

1. **Ders derinliği** (bölme pilotu standardı): en az 8 bölüm, 20 gerekçeli çözümlü örnek,
   3 adım tamamlama, 4 etkileşimli keşif; her bölümde üç düzeyli `::duzey` ve `::sorgula`.
   Biçim ve matematik denetimi `testler/konu-ogrenme-bicim.test.mjs`,
   `testler/konu-ogrenme-derin.test.mjs` (ders `DERIN` listesine eklenir).
2. **Çıkmış soru:** en az 3 görseli okunmuş, cevabı DB anahtarıyla karşılaştırılmış rehberli
   ÖSYM çözümü (`::cikmis`, `WORKED_EXAMS`). Her birine aynı kalıpta özgün “benzer soru”
   (`::ornek`/`::soru`) eşlik eder. Çıkmış sorular `veri/sorular-tum.csv` kategorisinden
   seçilir; görsel başka konuyu soruyorsa kullanılmaz.
3. **Video protip:** iki TYT kampı listesindeki ilgili videodan en az 2 kaynaklı protip
   (alıntı + kare + koşul + karşı örnek; [video hattı](../islemler/video-kanit-hatti.md)).
   Listede o konuya video yoksa ölçüt uygulanmaz.
4. **Ders anlatım PDF'i:** yalnız özet değil, `pdfAnlatim` altındaki ders anlatım sunusu
   veya TYT video notu sayfaları okunmuş olmalı. Okunan dosya/sayfalar
   `scripts/matematik-konu-listesi.json` → `pdfOkundu` alanına yazılır (örn.
   `"TYT-AYT Ortak/Ders Anlatim Sunulari 9. Sinif/28 - SAYI PROBLEMLERI.pdf s.1-17"`).

Bu ölçütler teknik/yapısal kabuldür; öğretmen onayı veya öğrencide ölçülmüş öğrenme değildir.

## Bir konuyu bitirme sırası

1. `node scripts/konu-ogrenme-kapsam.mjs --liste --kontrol` → sıradaki konu.
2. `pdfAnlatim` dosyalarını oku (metin + gerekli sayfa görselleri); konunun alt başlıklarını,
   tanımlarını ve çözümlü örnek türlerini çıkar. Okunanı `pdfOkundu`'ya yaz.
3. `videolar` içinden konu anlatım videolarının altyazısını al, püf noktası adaylarını
   bul, karesiyle doğrula; görev/ipucu dosyası yaz ve `video protips` üret.
4. Çıkmış soruları görselinden çöz, CSV cevabıyla karşılaştır, `worked-*.js` kaydı ve
   kanıt satırı ekle ([öğretim sözleşmesi](konuyu-ogrenelim.md#pilot-derinliğindeki-dersler)).
5. `.ders` dosyasını 8 bölüme genişlet (eski kimlikler korunur; yeni bölümler `s1b`…),
   `frontend/src/learn/derin/<ders>.js` + `-cizim.jsx` keşiflerini yaz, `DERIN` listesine ekle.
6. Denetimler: `node --test testler/konu-ogrenme-*.test.mjs`, `node scripts/cevap-anahtari.mjs`,
   banka (`node scripts/konu-ogrenme-banka.mjs`, `node scripts/ortak-set-tani.mjs --yaz`),
   `--kesif <ders>` UI testi; sonra `--liste`, `python scripts/ivme.py kontrol`, yerel commit.

Konu tamamlanınca bu listeyi aynı commit'te yeniden üret; devir notuna yalnız yarım kalan
konunun konumunu yaz.

## Liste

<!-- liste:basla (node scripts/konu-ogrenme-kapsam.mjs --liste üretir; elle düzenleme) -->
TYT: **1/32 bitti**. Sıradaki TYT konusu: `sayi-basamaklari`.

### TYT (şu anki aşama)

| # | Durum | Kimlik | Konu | Sınıf | Aşama | Bölüm/örnek/tamamla/keşif | Rehberli çıkmış / TYT 2018–26 | Video protip · liste | PDF okundu | Kalan iş |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ✅ BİTTİ | `temel-kavramlar` | Sayı Kümeleri ve Temel Kavramlar | 9 | TYT | 10/28/3/5 | 4 / 50 (Sayı Kümeleri) | 2 · PL1 10, PL2 10 | 3/3 | — · PDF karşılaştırmasında eksik bulunan dört kalıp eklendi: harfli ardışık çift ifadeler (±2), bir sayının ardışık katları, ortak harfli iki çarpım, irrasyonel katsayıları sıfırlama. |
| 2 | 🟡 EKSİK | `sayi-basamaklari` | Sayı Basamakları | 9 | TYT | 8/22/3/6 | 5 / 50 (Sayı Kümeleri) | 0 · PL1 2, PL2 0 | 2/3 | video protip 0/2 · PDF karşılaştırmasıyla iki kalıp eklendi: AB+BA=(A+B)² / AB−BA=A²−B² türü ve ABC+BCA+CAB=111(A+B+C). |
| 3 | 🟡 EKSİK | `bolme-bolunebilme` | Bölme ve Bölünebilme Kuralları | 9 | TYT | 8/27/3/4 | 4 / 11 (Bölünebilme Kuralları) | 0 · PL1 2, PL2 3 | 3/3 | video protip 0/2 · Bu konunun OGM ders anlatım sunusu veya TYT video notu yok; konu özetleri ve MEBİ özeti okundu. MEBİ'deki “önce birler, sonra son iki/üç basamak, en son rakam toplamı” sırası dersteki aday-eleme stratejisiyle örtüşüyor. |
| 4 | 🟡 EKSİK | `ebob-ekok` | Asal Çarpanlar, EBOB–EKOK ve Periyodik Problemler | 9 | TYT | 10/27/4/6 | 2 / 50 (Sayı Kümeleri) | 0 · PL1 2, PL2 3 | 0/3 | çıkmış soru 2/3; video protip 0/2; ders anlatım PDF okunmadı · Ders anlatım sunusu veya TYT video notu yok; konu özetleri ve MEBİ özeti kaynak. |
| 5 | 🟡 EKSİK | `rasyonel-sayilar` | Rasyonel Sayılar ve Ondalık Sayılar | 9 | TYT | 10/25/4/6 | 5 / 50 (Sayı Kümeleri) | 0 · PL1 4, PL2 5 | 0/4 | video protip 0/2; ders anlatım PDF okunmadı |
| 6 | 🟡 EKSİK | `birinci-derece-denklemler` | Birinci Dereceden Denklemler ve Denklem Sistemleri | 9 | TYT | 8/23/5/5 | 3 / 28 (Birinci Dereceden Denklemler ve Eşitsizlikler) | 0 · PL1 2, PL2 1 | 0/3 | video protip 0/2; ders anlatım PDF okunmadı |
| 7 | 🟡 EKSİK | `esitsizlikler` | Aralıklar ve Birinci Dereceden Eşitsizlikler | 9 | TYT | 8/22/5/5 | 4 / 28 (Birinci Dereceden Denklemler ve Eşitsizlikler) | 0 · PL1 2, PL2 2 | 0/3 | video protip 0/2; ders anlatım PDF okunmadı |
| 8 | 🟡 EKSİK | `mutlak-deger` | Mutlak Değer | 9 | TYT | 8/24/3/5 | 4 / 28 (Birinci Dereceden Denklemler ve Eşitsizlikler) | 0 · PL1 2, PL2 3 | 0/3 | video protip 0/2; ders anlatım PDF okunmadı |
| 9 | 🟡 EKSİK | `uslu-ifadeler` | Üslü İfadeler ve Üslü Denklemler | 9 | TYT | 8/24/3/4 | 4 / 18 (Üslü İfadeler ve Denklemler) | 0 · PL1 2, PL2 5 | 0/4 | video protip 0/2; ders anlatım PDF okunmadı |
| 10 | 🟡 EKSİK | `koklu-ifadeler` | Köklü İfadeler ve Köklü Denklemler | 9 | TYT | 8/26/3/4 | 4 / 18 (Üslü İfadeler ve Denklemler) | 0 · PL1 2, PL2 3 | 0/4 | video protip 0/2; ders anlatım PDF okunmadı |
| 11 | 🟡 EKSİK | `carpanlara-ayirma` | Çarpanlara Ayırma ve Rasyonel İfadeler | 10 | TYT | 8/25/3/4 | 3 / 3 (Polinomlar) | 0 · PL1 2, PL2 2 | 4/4 | video protip 0/2 · 8 bölüme derinleştirildi (3 keşif modeli: ortak kenar, kare içinde kare, çapraz çarpım). Çıkmış: TYT-0792, TYT-0794, AYT_Sayisal-0095. Sunulardan eklenen: üslü ifadede değişken değiştirme, büyük sayılarda iki kare farkı, sadeleşen kesir parametresi. |
| 12 | 🟡 EKSİK | `oran-oranti` | Oran ve Orantı | 9 | TYT | 8/34/3/4 | 4 / 100 (Denklemler ve Eşitsizlikler ile İlgili Uygulamalar) | 0 · PL1 2, PL2 4 | 3/3 | video protip 0/2 · PDF karşılaştırmasıyla eklenenler: katsayılı genişletme, ax=by=cz, altın oran, dişli çark, oran zinciri, kalan kişi-gün, aritmetik/geometrik ortalama (hiçbir derste yoktu). Çıkmış: TYT-0701, TYT-0723 eklendi. |
| 13 | 🟡 EKSİK | `sayi-kesir-problemleri` | Sayı ve Kesir Problemleri | 9 | TYT | 4/8/1/1 | 0 / 100 (Denklemler ve Eşitsizlikler ile İlgili Uygulamalar) | 0 · PL1 6, PL2 3 | 0/3 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 14 | 🟡 EKSİK | `yas-isci-problemleri` | Yaş, İşçi ve Havuz Problemleri | 9 | TYT | 4/8/1/1 | 0 / 100 (Denklemler ve Eşitsizlikler ile İlgili Uygulamalar) | 0 · PL1 4, PL2 2 | 0/2 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 15 | 🟡 EKSİK | `yuzde-karisim` | Yüzde ve Karışım Problemleri | 9 | TYT | 4/8/1/1 | 1 / 100 (Denklemler ve Eşitsizlikler ile İlgili Uygulamalar) | 0 · PL1 4, PL2 2 | 0/2 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 1/3; video protip 0/2; ders anlatım PDF okunmadı |
| 16 | 🟡 EKSİK | `kar-zarar` | Kâr–Zarar ve İndirim Problemleri | 9 | TYT | 4/8/2/1 | 0 / 100 (Denklemler ve Eşitsizlikler ile İlgili Uygulamalar) | 0 · PL1 2, PL2 1 | 0/2 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 17 | 🟡 EKSİK | `hareket-problemleri` | Hareket Problemleri | 9 | TYT | 4/8/2/1 | 1 / 100 (Denklemler ve Eşitsizlikler ile İlgili Uygulamalar) | 0 · PL1 2, PL2 2 | 0/2 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 1/3; video protip 0/2; ders anlatım PDF okunmadı |
| 18 | 🟡 EKSİK | `grafik-rutin-olmayan` | Rutin Olmayan Problemler: Grafik, Tablo ve Strateji | 9 | TYT | 4/8/1/1 | 0 / 100 (Denklemler ve Eşitsizlikler ile İlgili Uygulamalar) | 0 · PL1 1, PL2 2 | 0/2 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 19 | 🟡 EKSİK | `veri-grafikleri` | Verilerin Grafikle Gösterilmesi | 9 | TYT | 4/8/1/1 | 0 / 17 (Veri) | 0 · PL1 1, PL2 1 | 0/2 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 20 | 🟡 EKSİK | `merkezi-egilim` | Merkezi Eğilim ve Yayılım Ölçüleri | 9 | TYT | 4/8/1/1 | 0 / 17 (Veri) | 0 · PL1 1, PL2 1 | 0/2 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 21 | 🟡 EKSİK | `onermeler` | Önermeler ve Bileşik Önermeler | 9 | TYT | 4/8/2/1 | 0 / 6 (Önermeler ve Bileşik Önermeler) | 0 · PL1 2, PL2 1 | 0/2 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 22 | 🟡 EKSİK | `kosullu-onerme` | Koşullu Önerme ve Niceleyiciler | 9 | TYT | 4/8/1/1 | 0 / 6 (Önermeler ve Bileşik Önermeler) | 0 · PL1 2, PL2 1 | 0/1 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 23 | 🟡 EKSİK | `kumeler-temel` | Kümelerde Temel Kavramlar ve Alt Küme | 9 | TYT | 4/8/1/1 | 0 / 9 (Kümeler) | 0 · PL1 2, PL2 1 | 0/3 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 24 | 🟡 EKSİK | `kume-islemleri` | Kümelerde İşlemler ve Küme Problemleri | 9 | TYT | 4/8/2/1 | 0 / 9 (Kümeler) | 0 · PL1 4, PL2 2 | 0/5 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 25 | 🟡 EKSİK | `fonksiyon-kavrami` | Fonksiyon Kavramı ve Fonksiyon Çeşitleri | 10 | TYT | 4/8/1/1 | 0 / 11 (Fonksiyonlar) | 0 · PL1 4, PL2 4 | 0/3 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 26 | 🟡 EKSİK | `fonksiyon-grafikleri` | Fonksiyon Grafikleri ve Doğrusal Modeller | 10 | TYT | 4/8/1/1 | 0 / 11 (Fonksiyonlar) | 0 · PL1 2, PL2 2 | 0/3 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 27 | 🟡 EKSİK | `bileske-ters` | Bileşke Fonksiyon ve Ters Fonksiyon | 10 | TYT | 4/8/2/1 | 0 / 11 (Fonksiyonlar) | 0 · PL1 2, PL2 2 | 0/4 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 28 | 🟡 EKSİK | `polinom-islemleri` | Polinom Kavramı, İşlemler ve Bölme | 10 | TYT | 4/8/1/1 | 0 / 3 (Polinomlar) | 0 · PL1 0, PL2 2 | 0/4 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 29 | 🟡 EKSİK | `ikinci-derece-denklemler` | İkinci Dereceden Denklemler ve Kök-Katsayı İlişkileri | 10 | TYT | 8/24/3/4 | 3 / 3 (Polinomlar) | video yok | 0/3 | ders anlatım PDF okunmadı · İki TYT kampı listesinde ikinci derece denklem videosu yok; video ölçütü başka kaynak bulunana kadar uygulanamaz. |
| 30 | 🟡 EKSİK | `sayma-permutasyon` | Saymanın Temel İlkesi ve Permütasyon | 10 | TYT | 4/8/2/1 | 0 / 9 (Sıralama ve Seçme) | 0 · PL1 2, PL2 2 | 0/1 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 31 | 🟡 EKSİK | `kombinasyon` | Kombinasyon ve Seçme Problemleri | 10 | TYT | 4/8/1/1 | 0 / 9 (Sıralama ve Seçme) | 0 · PL1 2, PL2 2 | 0/1 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 1/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |
| 32 | 🟡 EKSİK | `olasilik` | Olasılık: Basit Olayların Olasılıkları | 10 | TYT | 4/8/2/1 | 0 / 9 (Basit Olayların Olasılıkları) | 0 · PL1 2, PL2 2 | 0/4 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı |

### AYT (TYT bitince)

| # | Durum | Kimlik | Konu | Sınıf | Aşama | Bölüm/örnek/tamamla/keşif | Rehberli çıkmış / TYT 2018–26 | Video protip · liste | PDF okundu | Kalan iş |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 🟡 EKSİK | `binom` | Binom Açılımı ve Pascal Üçgeni | 10 | AYT | 4/8/2/1 | 0 / 9 (Sıralama ve Seçme) | 0 · PL1 2, PL2 1 | 0/3 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 0/3; video protip 0/2; ders anlatım PDF okunmadı · Katalogda yalnız AYT; iki TYT kampı da binomu işler. AYT aşamasında tamamlanır. |
| 2 | 🟡 EKSİK | `kosullu-olasilik` | Koşullu Olasılık, Bağımsız ve Bileşik Olaylar | 11 | AYT | 4/8/2/1 | 0 | video yok | 0/0 | derinleştir (bölüm 4/8, örnek 8/20, tamamla 2/3, keşif 1/4); çıkmış soru 0/3; ders anlatım PDF okunmadı |
| 3 | ⬜ DERS YOK | `ispat-yontemleri` | Tanım, aksiyom, teorem ve ispat yöntemleri | 9 | AYT | — | — | — | 0/0 | ders yok |
| 4 | ⬜ DERS YOK | `karmasik-sayilar` | Karmaşık sayılar | 10 | AYT | — | — | — | 0/0 | ders yok |
| 5 | ⬜ DERS YOK | `ikinci-derece-esitsizlikler` | İkinci derece ve rasyonel eşitsizlikler | 11 | AYT | — | — | — | 0/0 | ders yok |
| 6 | ⬜ DERS YOK | `denklem-esitsizlik-sistemleri` | İkinci derece denklem ve eşitsizlik sistemleri | 11 | AYT | — | — | — | 0/0 | ders yok |
| 7 | ⬜ DERS YOK | `fonksiyon-donusumleri` | Fonksiyon uygulamaları ve dönüşümleri | 11 | AYT | — | — | — | 0/0 | ders yok |
| 8 | ⬜ DERS YOK | `parabol` | İkinci dereceden fonksiyon ve grafikleri | 11 | AYT | — | — | — | 0/0 | ders yok |
| 9 | ⬜ DERS YOK | `trigonometri-acilar` | Yönlü açılar, derece, radyan ve birim çember | 11 | AYT | — | — | — | 0/0 | ders yok |
| 10 | ⬜ DERS YOK | `trigonometrik-fonksiyonlar` | Trigonometrik fonksiyonlar ve grafikleri | 11 | AYT | — | — | — | 0/0 | ders yok |
| 11 | ⬜ DERS YOK | `sinus-kosinus-teoremleri` | Sinüs ve kosinüs teoremleri | 11 | AYT | — | — | — | 0/0 | ders yok |
| 12 | ⬜ DERS YOK | `ters-trigonometrik-fonksiyonlar` | Ters trigonometrik fonksiyonlar | 11 | AYT | — | — | — | 0/0 | ders yok |
| 13 | ⬜ DERS YOK | `toplam-fark-iki-kat` | Toplam, fark ve iki kat açı formülleri | 12 | AYT | — | — | — | 0/0 | ders yok |
| 14 | ⬜ DERS YOK | `trigonometrik-denklemler` | Trigonometrik denklemler | 12 | AYT | — | — | — | 0/0 | ders yok |
| 15 | ⬜ DERS YOK | `ustel-fonksiyon` | Üstel fonksiyon | 12 | AYT | — | — | — | 0/0 | ders yok |
| 16 | ⬜ DERS YOK | `logaritma` | Logaritma fonksiyonu ve denklemleri | 12 | AYT | — | — | — | 0/0 | ders yok |
| 17 | ⬜ DERS YOK | `diziler` | Gerçek sayı dizileri, aritmetik ve geometrik dizi | 12 | AYT | — | — | — | 0/0 | ders yok |
| 18 | ⬜ DERS YOK | `limit` | Limit | 12 | AYT | — | — | — | 0/0 | ders yok |
| 19 | ⬜ DERS YOK | `sureklilik` | Süreklilik | 12 | AYT | — | — | — | 0/0 | ders yok |
| 20 | ⬜ DERS YOK | `turev` | Anlık değişim oranı ve türev | 12 | AYT | — | — | — | 0/0 | ders yok |
| 21 | ⬜ DERS YOK | `turev-uygulamalari` | Türevin uygulamaları | 12 | AYT | — | — | — | 0/0 | ders yok |
| 22 | ⬜ DERS YOK | `belirsiz-integral` | Belirsiz integral | 12 | AYT | — | — | — | 0/0 | ders yok |
| 23 | ⬜ DERS YOK | `belirli-integral` | Belirli integral | 12 | AYT | — | — | — | 0/0 | ders yok |
| 24 | ⬜ DERS YOK | `integral-uygulamalari` | İntegralin alan ve diğer uygulamaları | 12 | AYT | — | — | — | 0/0 | ders yok |
<!-- liste:bitis -->

Sütunlar: *Bölüm/örnek/tamamla/keşif* ders dosyasından sayılır (hedef 8/20/3/4).
*Rehberli çıkmış*: derste görseli okunmuş ÖSYM çözüm sayısı / o kategorideki TYT
2018–2026 soru sayısı (kategori birden çok derse paylaşılır). *Video protip*: konu
sayfasındaki protip sayısı ve iki listedeki ilgili video sayısı. Video kimlikleri,
PDF yolları ve kategori eşlemesi `scripts/matematik-konu-listesi.json` içindedir;
listelerin tamamı `veri/video-hatti/listeler/tam/` altında (PL1 175, PL2 78 video).
