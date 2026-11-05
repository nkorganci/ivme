# Fizik: Hareket ve Kuvvet deneme dersi

Kapsam yalnız yayımlanmış `excel.tyt.fizik.e8dba464c6b583c83c4c` konusudur
(TYT, 9. sınıf). Matematik içerik sırası ve öğrenci geçmişi değiştirilmez.
Pilot `/konuyu-ogrenelim/fizik/hareket-kuvvet` üzerinden, Fizik konu haritasındaki
aynı katalog kartından açılır. Bu ilk denemede bölüm seçimi URL'dedir;
alıştırmalar puanlanmaz ve ustalık olaylarına yazılmaz. Öğretmen kabulü beklenir.

## Etkileşimli deneylerin ikinci tasarımı

Kullanıcı ilk pilotun basit çizimlerini yeterli bulmadı; referans olarak
İnteraktif Öğrenme → Hareket: konum, hız ve ivme laboratuvarını seçti.
Sekiz bölüm artık aynı `MotionLab`, `Scene`, `Graphs` ve `useLab` bileşenlerini
kullanır. Ders yolunun yatay yerleşimi laboratuvara tam içerik genişliğini verir.
Kaynaklı metin/örnekler yeniden üretilmez.

`physics/labScenarios.js` bölüm parametrelerini ortak motorun hız-zaman
düğümlerine çevirir. Sahne, grafik, iz, eğim/alan, yer değiştirme ve okumalar
aynı hareketten hesaplanır. Oynat/durdur, başa dön, adım, hız seçimi, grafikten
zaman seçme ve önemli an düğmeleri ortak kontrollerdir. Grafik ve ivme
bölümlerinde grafik sürüklenerek veya ok tuşlarıyla düzenlenebilir; bu modda
eski parametre değerleri gösterilmez, bölüm deneyine dönüş ayrı düğmedir.

Kuvvetlerde kutu; referansta tren/yolcu ve peron; etki–tepkide patenci şekilleri
kullanılır. Kuvvet diyagramı yalnız ilgili cismin yatay kuvvetlerini karşılaştırır;
düşey denge ayrı etiketlenir. Sürtünmenin rejimi durma anında değişir. Patenciler
ilk 1 s boyunca 80 N ile etkileşir, sonra yatay kuvvet sıfır olur ve hızları korunur.
Bu temas süresi ilk pilotun sürekli kuvvet kabulünden farklı ve ekranda belirtilidir.
Keskin gidiş–dönüş modeli yalnız x–t ve v–t gösterir; dönme anında ivme yorumlanmaz.
Başlangıçta geçen süre sıfırken ortalamalar sayı yerine çizgiyle gösterilir;
net kuvvet okuması işaretini korur. Ortak sahnede iz etiketleri üst üste çizilmez.

Denetim, bütün hazır senaryolarda ders modeli ile ortak motorun konum/hız
eşitliğini, temas sonrası momentum ve sabit hız ilişkisini içerir. UI denetimi
grafik düğümünü klavyeyle değiştirmeyi ve bütün deneylerin oynatılmasını da sınar.

## Kanıt ve model sınırı

Pipeline `taxonomy_v4` içindeki 333 numaralı Hareket ve Kuvvet özeti başlangıç
envanteridir. Kısa/belirsiz özet tek başına ders kanıtı sayılmaz. İşaret ettiği
40 sayfalık soru bankasının metni ve mevcut OGM 9. sınıf 07, 08, 10–16 numaralı
konu notları kullanılır. Notların dokuz sayfası özgün PDF'den WebP olarak
çıkarıldı ve görüntüleri incelendi; dosya ve görüntü SHA256 değerleri korunur.
Ham PDF metnindeki font/karakter bozukluğu nedeniyle mevcut Türkçe OCR önbelleği
yeniden kullanılır. Kaynak PDF'ler yalnız okunur. Arşivin tamamının görsel olarak
incelendiği iddia edilmez. Örnekler özgün alıştırmalardır; çıkmış soru olarak sunulmaz.

`scripts/fizik-pilot-ollama.py` yerel pipeline Python ortamında çalışır. Ham
model girdi/çıktıları `ogm_ders.llm_runs` içinde, kaynak/plan/ara taslaklar
`veri/fizik-pilot/hareket-kuvvet/` altında tutulur. Mevcut pipeline model kilidi
kullanılır; modeller sırayla yüklenir. GPT-OSS plan adayı, Qwen bölüm yazımı ve
aday inceleme içindir. Model incelemesi otomatik fizik doğruluğu veya öğretmen
onayı değildir. İlk adayda referans, grafik alanı ve statik sürtünme eşiği
hataları görüldü; kabul edilmeden kaynak koşullarıyla yeniden üretildi.

Makinedeki özel Qwen GGUF'un şablonu yalnız `{{ .Prompt }}` olduğu için düz
`/generate` istemi doğru konuşma sınırlarını taşımıyordu. Pilot, kullanıcının
modelini değiştirmeden `raw=true` ve açık ChatML kullanıcı/asistan sınırlarıyla
çalışır; düşünme kapalı, presence penalty 0, num_ctx 8192, temperature 0.2.
Bu ayarların diğer arşiv çağrılarına otomatik uygulanması bu pilotun kapsamı değildir.

Şablon düzeltmesi tek başına doğruluk sağlamadı. Gemma dar bir kontrolde de
referans hızlarını karıştırdı; bu aday ders metni sayılmadı. GPT-OSS'un dar
`/api/chat`, medium düşünme kontrolü dört kritik fizik ilişkisini doğru ifade
etti; geniş JSON planları yine güvenilir kabul edilmedi. Son metin, yerel
taslaklardan kaynaklarla karşılaştırılan **Codex teknik düzeltmesidir**;
tamamının hatasız yerel model çıktısı olduğu iddia edilmez.
`hareket-kuvvet.editorial.json` düzeltmeleri açıkça taşır; üretilmiş JSON elle
değiştirilmez. `scripts/fizik-pilot-ollama.py --curate` aynı girdilerden son
paketi üretir; `--review` son metnin sınırlı GPT-OSS aday denetimini saklar.

## Öğretim ve denetim

Sekiz durak: referans, yol/yer değiştirme, hız/sürat, iki hareket grafiği,
ivme/yön değişimi, bileşke kuvvet, statik/kinetik sürtünme, etki/tepki.
Her durakta ön tahmin ve yanlışa özel gerekçe, deterministik görsel deney,
üç anlatım düzeyi, iki gerekçeli çözüm, koşullu kısa yol, yanılgı ve
günlük sorgulama bulunur. Sonunda altı bağımsız özgün aktarım sorusu vardır.
Kaynak görüntüleri ilgili bölümden büyütülebilir.

Sayısal modeller bir boyutlu, SI birimli ve eylemsiz referansta çalışır.
Grafikte ani yön değişimi idealizasyonu açıkça belirtilir. Yatay sürtünme
modeli başlangıçta durgun veya sağa kayan kutuyla sınırlıdır; durduğunda
statik rejime geçer, kendi kendine geriye hızlanmaz. Statik eşik eşitliği
zorunlu kayma sayılmaz. Etki–tepki ayrı cisimlerde, normal/ağırlık aynı cisimdedir.

Doğrulama: `node --test testler/fizik-pilot.test.mjs` ve yalıtılmış sahte API ile
`node testler/fizik-pilot-ui.mjs`. UI denetimi sekiz bölüm/24 düzey, yanlış-doğru
geri bildirimi, zaman ve parametre kontrolü, kaynak büyütme/Escape, bağımsız
sorular ve öğrenci yazımı olmamasını masaüstü/mobilde kontrol eder.
Rapor ve ekran görüntüleri `veri/ui-denetim/fizik-pilot/` altındadır.
Öğrenme etkisi ve öğretmen kabulü ayrıca insan incelemesi gerektirir.

Güncel teknik kabul: ders adaptörü/kaynak bağı 12/12 ve ortak hareket motoru
8/8 (toplam 20/20); iki ekranda sekiz bölüm, 24 düzey,
sekiz kaynak penceresi ve altı aktarım sorusu geçti. Dersler arası gezinme
masaüstü/mobil ve 16 katalog regresyon kontrolünden geçti. Son metinde
96 model alanı açık kaynak düzeltmesinden geçmiştir; ham taslak doğrudan sunulmaz.
Tam metni tek çağrıda inceleyen model çıktı bütçesinde son yanıt üretemeyince
bu deneme `incomplete` olarak saklandı, ikişer bölümlük sınırlı incelemeye geçildi.
Boş model yanıtı temiz denetim veya onay sayılmaz.

İkişer bölümlük dört inceleme tamamlandı. İlk altı bölümde model bulgu
üretmedi; son ikisinde “Durgunluk bu kuvvetleri sıfır yapmaz” cümlesini
gerekçesiz hata saydı. Bu yanlış pozitif kabul edilmedi: duvarı iten durgun
kişide etkileşim kuvvetleri bulunabilir; diğer kuvvetlerle dengelenir.
Kuvvetlerin dengelenmesi (not 13) ve etki–tepki (not 15) kaynaklarıyla
çelişen bir model yargısı son metni değiştirmez. Son sınırlı model raporu
`veri/fizik-pilot/hareket-kuvvet/final-local-review.json` içindedir.
Ham yeniden üretim yalnız `veri/` altına aday yazar; denetlenmiş uygulama
JSON'unu otomatik ezmez. Uygulama çıktısı yalnız açık `--curate` adımıyla üretilir.
