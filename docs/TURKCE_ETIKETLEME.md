# Türkçe ve Türk Dili ve Edebiyatı: kaynaklı soru etiketleri

Bu çalışma, uygulamadaki **aktif** TYT Türkçe ve AYT Türk Dili ve Edebiyatı sorularına birincil konu etiketi önerir. Çıktı [turkce_kaynakli.csv](../ornek-veri/etiketler/turkce_kaynakli.csv) dosyasındadır. Mevcut soru CSV'leri veya veritabanı değiştirilmez. Sorunun tam metni ve görseli çıktı dosyasına kopyalanmaz.

## Kaynak ve kapsam

| Küme | TYT Türkçe | AYT Türk Dili ve Edebiyatı | Toplam |
| --- | ---: | ---: | ---: |
| Çıkmış (OGM YKS Çıkmış Soru Kitapçığı) | 306 | 216 | 522 |
| OGM soru bankası, konu pekiştirme, tarama ve denemeler | 3.787 | 7.260 | 11.047 |
| **Toplam** | **4.093** | **7.476** | **11.569** |

Çıkmış sorular `veri/sorular-tum.csv` ile `../veri-hatti/ogm-yks-cikmis/ham/sorular_son.json` kayıtlarına bağlanır. OGM soruları `veri/sorular-ogm.csv` ile `../veri-hatti/ogm-sorular/kayit/*.json` kayıtlarına bağlanır: 8.627 PDF kartı ve 2.420 OGM Soru Bankası kaydı. İkinci kümenin kazanım alanı `sb.json` içindedir. Kaynak PDF'lerinin ve soru görsellerinin asıl sahipliği ilgili kurumlarındır; bu CSV yalnız kimlik ve etiket metadatası içerir.

## Etiket seçimi

1. Mevcut `Sınıflandırılmamış` olan 34 soru, kaynak soru metni ve şıkları **asistan tarafından** incelenerek tek tek öneri etiketine bağlanır (`evidence_type=assistant_question_text_review`). Bunların tümü `review_required=true` kalır; bağımsız öğretmen onayı değildir.
2. **Soru kökünde açıkça sorulan** yazım, noktalama, ses olayı, nazım biçimi gibi konular varsa dar bir etiket seçilir. Seçeneklerde veya uzun parçada geçen yalnızca ortak kelimeler kanıt sayılmaz. Kaynak test başlığıyla uyumsuz görünen dar etiketler incelemeye gönderilir.
3. OGM Soru Bankası'ndaki belirli bir kazanım (ör. şiirde ahenk) soru kökünün açık olmadığı durumda kullanılabilir. Kazanım aynı gruptaki çok sayıda soruyu kapsadığı için bu satırlar incelemeye açıktır. “Metinden hareketle dil bilgisi çalışmaları yapar” gibi genel kazanımlar alt konu kanıtı sayılmaz. Metni de bulunmayan bu gruptaki sorular `sb_kazanim_general` kanıt türüyle “*ünite*: Dil Bilgisi (Alt Konu Belirsiz)” etiketini, düşük güveni ve zorunlu inceleme bayrağını alır. Metni olup soru kökü açık olmayanlarda kaynak üst konusu korunur, ancak dil bilgisi kazanımıyla uyuşmazlık düşük güven ve inceleme nedeni olarak yazılır.
4. PDF testinin başlığı belirli bir konuyu söylüyorsa kullanılır. Birden çok dönem veya konu içeren başlıklar daraltılmadan bırakılır ve incelemeye işaretlenir.
5. Soru düzeyinde yeterli kanıt yoksa kaynak CSV'deki üst konu korunur. Bu satırların güveni orta veya metin de yoksa düşüktür. Birincil etiket alanı hiçbir satırda boş veya `Sınıflandırılmamış` değildir.

`evidence_type` ve `evidence_ref` kanıtın türünü ve kaynak kaydını gösterir. `source_fingerprint`, kullanılan kaynak metni/başlık/kazanımın kısa SHA-256 özetidir; metni saklamaz. `source_topic`, kayıttaki mevcut konudur; `label`, önerilen birincil etikettir. `label_level=subject` yalnız kanıt yetersizliğinde son çare olarak kullanılır. `review_reason` inceleme nedenini açıklar. `confidence` kaynak kanıtının etiket için gücünü gösterir; soru çözümünün veya cevap anahtarının doğruluğunu göstermez. `approval_status=teacher_pending` tüm satırlarda bulunur. **Hiçbir etiket öğretmen onaylı olarak sunulmaz.**

## İptal edilmiş 2026 AYT sorusu

`2026-AYT-TDE-20` yerel katalogda konu listesi olmadan, eski soru kartından taşınan OCR metni ve görselle kalmıştır; uygulama CSV'si onu “Şair, Yazar ve Eser Eşleştirmeleri” altında tutar. Görseldeki görev roman eserini tanımak olduğundan asistanın öneri etiketi **Roman: Eser Tanıma** olarak girildi; `evidence_type=assistant_image_review` ve `review_required=true` kullanıldı. [ÖSYM'nin 2026-YKS sonuç duyurusu](https://www.osym.gov.tr/2026-yks-sonuclari-aciklandi), AYT Türk Dili ve Edebiyatı–Sosyal Bilimler-1 testinin 20. sorusunun iptal edildiğini bildirir. Bu yüzden satırda `official_status=cancelled` bulunur. Yerel CSV'deki `B` cevap harfi geçerli bir cevap olarak kabul edilmemelidir; cevap anahtarı ve uygulamadaki puanlama ayrıca incelenmelidir.

## Bağımsız kalite örneklemesi

13 Ekim 2026'da sabit `20261013` rastgelelik tohumu ile 29 soru; çıkmış soru kökü ve üst konusu, OGM soru kökü, PDF test başlığı, Soru Bankası kazanımı, Soru Bankası ünitesi ve asistanın doğrudan incelediği kayıtlar arasında seçilip kaynak soru metni/başlığı/kazanımıyla karşılaştırıldı. Ardından `20261014` tohumu ile soru kökü kanıtlı 20 soru daha rastgele seçilip karşılaştırıldı. **Toplam 49 örnek**, düzeltmelerden sonra kullanılan kaynak kanıtıyla uyumludur. Bu örnekleme tüm etiketlerin bağımsız öğretmen tarafından doğrulandığı anlamına gelmez.

Örnekleme somut düzeltmeler sağladı: `3a-tyt-turkce-116-01` soru kökündeki “isim-fiil” yüzünden “Fiilimsiler”e kayıyordu; asıl görev cümlenin ögesini bulmak olduğu için **Cümlenin Ögeleri** yapıldı. `AYT_EsitAgirlik-0078` kaynağın “Nesir Bilgisi” üst konusundaydı, fakat beyitlerden metin türünü sorduruyor ve ÖSYM anahtarı `B` seçeneğindeki pendnâmeyi gösteriyor; **Pendnâme (Öğüt Verici Metin)** önerisi asistan incelemesi ve öğretmen inceleme bayrağıyla eklendi. Metni olmayan genel dil bilgisi kazanımlarında roman/hikâye gibi yalnız ünite etiketleri kesin konu gibi görünmesin diye belirsizlik açıkça yazıldı. “İki nokta”nın yalnız soru parçasında geçmesiyle üretilen yanlış noktalama eşleşmesi de kurala eklenen görev koşuluyla giderildi.

## Üretim ve denetim

Uygulama kökünde, kardeş `veri-hatti` kaynakları yerindeyken:

```powershell
python -X utf8 scripts/kaynakli_etiket_turkce.py --write
python -X utf8 scripts/kaynakli_etiket_turkce.py --check
```

`--check` çıktının kaynaklardan deterministik olarak yeniden üretildiğini, aktif soru sayısını ve benzersiz kimlikleri, 34 eski sınıflandırılmamış soru için asistan eşleme kapsamını, iptal sorusunun işaretini ve boş birincil etiket olmadığını doğrular. Kaynakta yeni bir sınıflandırılmamış soru oluşursa sessizce genel konuya atanmaz; yeniden inceleme için hata verir. Son üretimde 11.569/11.569 soruda etiket vardır: 5.531 yüksek, 4.957 orta, 1.081 düşük güven. 6.379 satır öğretmen incelemesine işaretlidir. Kaynağın genişliğinden ötürü geniş üst konu etiketi korunan satırların da öğretmen tarafından örnekleme ve gerektiğinde tek tek denetlenmesi gerekir.
