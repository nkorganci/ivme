# Kaynaklı ders notları ve soru etiketi dizini

13 Ekim 2026 tarihli devam kaydı. Bu belge, yarım kalan etiket yayınını ve UI denetimini tamamlayan dilimi; ders notları için gerçekten hazırlanan içerikten ayırır.

## Tamamlanan dilim

- **53.019 etkin yerel soru**, 19 sınav/ders grubunda etiketlendi. Türkçe/Edebiyat 11.569; Tarih/Coğrafya 15.620; Felsefe, Din Kültürü, Biyoloji ve Kimya 25.830. Kaynak ve çıktı kimlik kümeleri birebir aynı, boş birincil etiket sıfır.
- **39.201 kayıt** ek inceleme işaretli. Diğer kayıtlar da öğretmen onaylı değildir. Kaynakta dar konu kanıtı yoksa üst konu korunur; alt konudaki belirsizlik gizlenmez.
- **12 olası ders uyuşmazlığı** ve **2 iptal soru** arayüzde ayrıca işaretlidir. İptal işaretleri yerel etiket dizinine aittir; mevcut soru bankasının cevap/puanlama davranışı bu işte değiştirilmedi.
- Türkçe, AYT Edebiyat, Tarih, Coğrafya, Felsefe, Din Kültürü, Biyoloji, Kimya için **21 konu rehberi / 44 soru kalıbı** hazırlandı. Her rehber PDF sayfaları, bir çıkmış ve bir OGM sorusuyla karşılaştırılır. **42 kaynak soru** ve **51 farklı PDF sayfa bağı** yeniden üretimde denetlenir.
- Bu sekiz dersin **105 başlıklı konu dizini** görünür; **22 başlık** rehbere bağlıdır. Türkçe'de anlatım teknikleri/düşünceyi geliştirme aynı rehberdedir; 16 plan başlığından **15**'i hazır, Sözel Mantık kaynak incelemesindedir. Dizin bağımsız olarak doğrulanmış tam ÖSYM müfredatı sayılmaz.
- Ayrı öğrenci menüsü `/kaynakli-ders-notlari` altındadır. Soru görüntüleyicisine ve özgün PDF dosyasına mevcut adresleriyle bağlanır. Soru bankası, CSV'ler ve öğrenci kayıtlarına yazmaz.

## Bu devamda giderilen sorunlar

1. Etiket yayın denetimi, `Roman: Dil Bilgisi (Alt Konu Belirsiz)` gibi gerçek bir üst konu taşıyan etiketleri yanlışlıkla tamamen etiketsiz sayıyordu. Tamamen boş/yer tutucu etiketler reddedilir; belirsiz alt konu ancak zorunlu inceleme işaretiyle yayımlanabilir.
2. Sunucuda yeni React adresleri için yönlendirme yoktu. Doğrudan açma ve yenileme için `/kaynakli-ders-notlari` ile bir alt adresi eklendi; 10 rota testi vardır.
3. Tarih kaynaklarında gerekçe içinde kalan ders uyuşmazlığı, yayın JSON'unda ayrı bayrağa çevrildi. Felsefe Grubu dalı, kaynak başlığı, dosya/sayfa ve inceleme gerekçesi korundu.
4. Ders notları ekranındaki eski “alt konu dağılımı henüz yok” ifadesi güncellendi; sayılar artık yayın üretiminde etkin envanterden hesaplanır.
5. Güven değerleri Türkçe gösterilir; sayısal eşleme puanı ölçülmüş doğruluk olasılığı olarak sunulmaz. Ders notundan etiket ekranına geçiş doğru ders filtresini açar. Hatalı yüklemelerde yeniden deneme vardır.
6. Mobilde konu dizini kapalı başlar; ders metnine uzun bir dizini geçmeden ulaşılır. Konu ve ders değiştiğinde alıştırma, yanıt ve açık düşünme provası sıfırlanır. Konu araması, kalıp sekmeleri, yanlış yanıt sonrası çalışma yönlendirmesi ve TYT/AYT hazırlık planı eklendi.
7. Araştırmanın kaynak, metin, sayfa, görsel özeti ve rehberleri yerel PostgreSQL `source_research` şemasında sürümlenir. Ayrıntı ve yeniden kullanma komutları [araştırma hafızası kaydındadır](KAYNAKLI_SORU_ANALIZI.md).

## Öğretim taslakları

| Ders | Hazır başlık | PDF sayacı |
|---|---|---|
| TYT Türkçe | Sözcükte Anlam | OGM MEBİ Türkçe, 11 |
| AYT Edebiyat | Şiirde Ölçü, Uyak ve Redif | OGM MEBİ Edebiyat, 13–15 |
| TYT Tarih | Tarih Bilimi ve Belgeden Çıkarım | OGM MEBİ Tarih, 11 |
| TYT Coğrafya | Harita Türü ve Ölçek | OGM MEBİ Coğrafya, 26–28 |
| TYT Felsefe | Bilgi Felsefesi: İmkân, Kaynak ve Ölçüt | OGM MEBİ TYT/AYT Felsefe, 29–31 |
| TYT Din Kültürü | İbadetin Kapsamı ve Salih Amel | OGM İslam ve İbadet video notları, 9–10 |
| TYT Biyoloji | Canlıların Ortak Özellikleri ve Enerji | OGM MEBİ Biyoloji, 11–13 |
| TYT Kimya | Atom Modelleri: Kanıt ve Sınırlar | OGM MEBİ Kimya, 25–26 |

Tanımlar kaynakların kısa özeti; çözüm yöntemleri asistanın karşılaştırmalı öğretim önerileridir. Özgün alıştırmalar kurumların soruları gibi sunulmaz. Kaynak soru metni, şiir veya görseller bu notlara kopyalanmaz. Bütün notlar `teacher_pending` durumundadır.

## Dosyalar ve yeniden üretim

Etiketlerin kaynak CSV çıktıları `ornek-veri/etiketler/` altında, branş yöntemleri [Türkçe](TURKCE_ETIKETLEME.md), [Tarih/Coğrafya](TARIH_COGRAFYA_ETIKETLEME.md) ve [diğer branşlar](DIGER_BRANSLAR_ETIKETLEME.md) belgelerindedir. Büyük PDF/soru kaynakları Git dışında kalır.

Notların temel girdisi `ornek-veri/kaynakli-ders-notlari.json`, genişletmeleri `ornek-veri/kaynakli-notlar/*.json`; öğrenci çıktısı `frontend/public/kaynakli-notlar.json` dosyasıdır. Kalıp sayıları ve hazır konu kapsamı bu dosyalardan hesaplanır. Kaynak PDF checksum'u ve soru metni fingerprint'i tutulur. Sayfa numaraları **1 tabanlı PDF sayacı**dır.

Uygulama kökünden, `pymupdf` bulunan proje Python ortamıyla:

```powershell
python -X utf8 scripts/kaynakli_etiket_turkce.py --check
python -X utf8 scripts/kaynakli_etiket_tarih_cografya.py --check
python -X utf8 scripts/kaynakli_etiket_diger.py --check
python -X utf8 scripts/analiz_kaynakli_sorular.py --check
python -X utf8 scripts/yayinla_kaynakli_etiketler.py --check
python -X utf8 scripts/yayinla_kaynakli_notlar.py --check
python -X utf8 testler/source-data-test.py
```

Yayın çıktısı güncellenecekse son iki yayın betiğini `--write` ile çalıştırın. `--check`, kaynak sayfalarında belirtilen kavramların bulunmasını, örneklerin etkin ve doğru sınav/branşta olmasını, iptal/uyuşmazlık işareti taşımamasını, yerel CSV ile kaynak çıkarımının cevap anahtarlarının uyumunu ve deterministik çıktı eşitliğini denetler. Bu, çözüm gerekçelerinin bağımsız öğretmen doğrulaması değildir.

## Doğrulama kanıtı

- Üç branş üreticisinin ve iki yayın betiğinin kaynak/çıktı denetimi geçti.
- `testler/source-data-test.py`: **11 test**, boş/yer tutucu, belirsizlik, yinelenen/eksik/fazla kimlik, değişen kaynak konusu, ders uyuşmazlığı, Türkçe PDF/satır sonu dayanağı ve soru kökü–parça kelimesi ayrımı.
- `SourceNotesRoutesTest`: **11 test**, veritabanından bağımsız MVC adres yönlendirmesi.
- `frontend/` içinde `npm run build`: geçti. Ortak uygulama paketinin mevcut boyut uyarısı sürüyor; bu işte geniş kapsamlı paket düzenlemesi yapılmadı.
- `node testler/source-labels-ui.mjs`: gerçek Chrome/Edge, **1280 ve 390 px**; 19 etiket grubu, 8 ders, **21 konu / 44 kalıp**, konu araması/seçimi, düşünme provaları, yanlış/doğru yanıt ve yeniden deneme, filtre/sayfalama, iptal uyarısı, yükleme hatası, geçersiz adres ve yatay taşma.
- Ekran görüntüleri Windows geçici dizininde `kaynakli-etiketler-{1280,390}.png` ve `kaynakli-notlar-{1280,390}.png` adlarıyla üretilir; masaüstü/mobil görünüm ayrıca görsel olarak incelendi.

Tarayıcı testi derlenmiş ön yüz ve statik içerikle, **yalıtılmış API yanıtları** üzerinde çalışır; gerçek görsel/PDF API akışı uçtan uca denenmiş sayılmaz. Yerel PostgreSQL araştırma aktarımı ayrıca `kaynakli_arastirma_db.py` ile yapılır ve sayım/idempotans/arama kontrolleri ayrı kanıttır. Genel `mvn test`, diğer bekleyen uygulama göçleri veya canlı servis yeniden başlatma bu işte yapılmadı.

## Kalan çalışma ve devam noktası

1. Türkçe'de Sözel Mantık kaynak dayanağını ve kaynak etiketlerindeki Sözcükte Yapı/Fiilde Çatı kapsamını doğrulayın. Diğer 15 plan başlığı rehbere bağlıdır; bu, bütün soruların tek tek incelendiği anlamına gelmez.
2. Aynı yöntemi kullanıcı sırasıyla Tarih, Coğrafya, Felsefe, Din Kültürü, Biyoloji ve Kimya'nın kalan konularına uygulayın; AYT ders notlarının kapsamını ayrıca açın. AYT Felsefe Grubu'nda Psikoloji, Sosyoloji ve Mantık birbirine karıştırılmamalıdır.
3. ÖSYM kitapçıklarıyla bağımsız arşiv tamlık denetimi yapın. Yerel TYT Türkçe 2018–2026 arşivi yılda 34 kayıttır; 40 soruluk testin tüm soruları değildir. Bu boşluk kapanmadan “bütün çıkmış sorular analiz edildi” demeyin.
4. 12 ders uyuşmazlığı ve iptal sorularının mevcut soru bankası davranışını ayrı veri düzeltme işi olarak ele alın; bu salt okunur çalışma kendiliğinden bankaya aktarılmamalıdır.
5. Notların ve dar etiketlerin gerçek branş öğretmeni incelemesi açık iştir. Asistan karşılaştırması insan onayı olarak kaydedilmemelidir.

Bu kayıt **tam müfredat analizinin tamamlandığı iddiası değildir**. Etiket/UI altyapısını, 21 somut konu rehberini, araştırma arşivini ve kalan adımları gösterir. Yalnız bu işe ait dosyalar/hunk'lar yerel commit edilir; push yapılmaz.
