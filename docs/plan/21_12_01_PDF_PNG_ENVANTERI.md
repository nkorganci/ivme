# 12.01 — PDF/PNG hattı envanteri ve dengeli kalite örneği

**Durum:** BITTI · **Model:** GPT-6 Luna · Low.

## Kapsam

Mevcut kaynak PDF'leri, soru kırpımı/görsel üretimi, cevap ve konu bilgisinin geliş yolunu dosya/komut düzeyinde kaydet. Veri türleri ve dersler arasında küçük, dengeli bir örnek seç; varlık, okunabilirlik, kırpım ve cevap eşleşmesi risklerini gözle. Gerçek kaynakları değiştirme ve toplu iş çalıştırma. Sonraki 12.02 kaynak sözleşmesine somut girdi bırak.

## Oturum sonu

Tarih · envanter · örnekleme yöntemi/bulguları · test · yerel commit · açık risk. Planı repo içinde güncelle.

## 2026-10-09 envanteri

| Hat | Girdi → işlem → çıktı | Bugünkü dosya/veri sayısı |
|---|---|---|
| Çıkmış kitapçık | `Kaynaklar/yks-cikmis-sorular/OGM Kitapciklari/` → `veri-hatti/ogm-yks-cikmis/cozumle.py`, `kirp.py`, `kontrol.py`, `birlestir.py`, `site_veri.py` → `site/data/ogmck/` → `uygulama/ornek-veri` veya Git dışı `uygulama/veri` CSV | 6 PDF, 2.592 WebP; tam içe alma CSV'si 2.564 tek cevaplı soru, örnek CSV 50 soru |
| OGM kartları | `Kaynaklar/ogm-materyal/`, `veri-hatti/ogm-indirme` kataloğu → `veri-hatti/ogm-sorular` kaynak ailesi işlemcileri ve `birlestir_ogm.py` → `site/data/ogm/` → `uygulama/veri/sorular-ogm.csv` | Klasörde 2.687 PDF ve 51 HTML; `site/data/ogm/img` altında 84.926 WebP (soru ve çözüm birlikte); içe alma CSV'si 77.533 soru |

Önceden üretilen OGM `ICINDEKILER.md` belgesi 2.680 PDF diyor; bugünkü disk sayısı **7 fazla**. Katalogun son üretiminden sonraki eklemeler/türevler 13.04'te dosya bazında uzlaştırılmalı. `uygulama/veri/resimler-pilot` içinde 87.490 WebP var; bunlar büyük ölçüde yukarıdaki ağaçlara bağlantı, bağımsız yeni kaynak sayılmamalı. Eski ayrı PNG hattı kaldırılmış; bugünkü uygulama görselleri WebP. Ara mozaikler geçici PNG olabilir.

Çıkmış hatta `ham/sorular.json` kayıtları kitap, PDF sayfası, sütun ve `parcalar` kırpımını; `ham/sorular_son.json` kayıtları cevap kaynak/kanıt notlarını saklıyor. İçe alma CSV'si kaynak açıklaması, konu, görsel yolu ve tek cevabı taşır; **PDF dosya kimliği, sayfa, kırpım ve kaynak/görsel SHA-256 alanlarını taşımaz**. OGM CSV'sinde de bu iz alanları yok. 12.02 sözleşmesinin ana açığı bu. Çıkmış hat ara aşamada PDF için SHA-1, kırpma manifestinde imza kullanıyor; merkezi, sürümlü SHA-256 kaydı bulunmadı. OGM Soru Bankası ailesinde PDF, kaynak HTML'den oluşturulur; tüm OGM PDF'lerinin özgün indirilen belge olduğu varsayılmamalı.

## Dengeli kalite örneği

Kural: `sorular-ogm.csv` içinde dokuz kaynak ailesinin TYT ve AYT kayıtlarından sabit `20261009` tohumuyla birer kart; `sorular-tum.csv` içinde TYT Türkçe/Matematik ve AYT Matematik/Edebiyat'tan birer kart. Toplam **22** kartın göreli görsel yolu bulundu, PIL ile WebP doğrulaması geçti, boyutları 721–1200 px genişlikteydi ve SHA-256 özetleri hesaplandı. Bu bir tam arşiv doğrulaması değildir. Örnek kimlikler:

| Tür | İncelenen kimlikler | Gözlem |
|---|---|---|
| Çıkmış | `TYT-0108`, `TYT-0756`, `AYT_Sayisal-0312`, `AYT_EsitAgirlik-0189` | Dört görsel açıldı. Matematik ve Edebiyat kırpımı gözle okunabilir; şıklar içeride. `TYT-0756` için kaynak `TYT.pdf` sayfa 287, `AYT_EsitAgirlik-0189` için `AYT_EsitAgirlik.pdf` sayfa 78 metin eşleşmesi doğrulandı. |
| OGM | Her kaynak ailesinde TYT ve AYT birer kart; gözle `sb-17737`, `dd-ayt-matematik-145-06`, `3a-tyt-fizik-10-04`, `mn-test-01-01-49` | Görseller okunabilir ve şıklar yerinde. Mini Deneme `mn-test-01-01-49` kırpımında sorudan sonra yaklaşık yarım görsel boyunda boş alt alan var; düzeltme adayı. |

Görsel açılması veya kaynak metninin eşleşmesi cevap anahtarının doğruluğunu tek başına kanıtlamaz. 12.02'de sayfa/kırpım/cevap kanıtı alanları; 12.03'te insan inceleme kuyruğu ve küçük güvenilir anahtar örneği gerekir. Bu envanter kaynakları değiştirmeden, toplu üretim çalıştırmadan yapıldı. Yerel commit: bu işin Git kaydı.
