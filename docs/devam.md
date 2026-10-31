# İvme devir notu

Önce `git status --short`, [AGENTS.md](../AGENTS.md) ve yalnız ilgili açık görev okunur.
Referans günü 31 Ekim 2026: mevcut DB kayıtları korunur; geçmiş kaydedilmemiş
olay/kuyruk/loglar yeniden oynatılmaz. Özgün kaynak arşivi yalnız okunur.

## Şimdi

| Görev | Durum ve sıradaki somut adım |
|---|---|
| TAS-09 / 12.13 | İçerik hattı kuruldu, bölme pilotu taşındı. İkinci konu EBOB–EKOK yarım: taslak aşaması (kuru çalıştırma) geçiyor; konu testi, banka yenileme, `icerik calistir ebob-ekok` ve UI kabulü kaldı. Ayrıntı aşağıda. |
| TAS-08 / 12.12 | Kaynaklı pilotun otomatik kabulü geçti; öğretmen sekiz bölüm/dört soru inceleme kararını kaydetmeli, ardından gerçek öğrenciyle bağımsız aktarım gözlemi yapılmalı. Kabul biçimi [pilot kaydında](icerik/tas08-pilot-kabul.md#kalan-kabul). |
| TAS-02 / 12.06 | Dış makinede webhook/zamanlayıcı kurulumu ve gerçek kesinti/iyileşme bildirimi açık; [işletim tarifi](islemler/saglik-ve-izleme.md). |

## TAS-09 devam noktası (Codex ile sürdürülecek)

Tamamlanan: `scripts/icerik_hatti.py` + `scripts/icerik-hatti-ders.mjs`, `ivme.py icerik`, görev
tanımları `icerik-hatti/gorevler/{bolme-bolunebilme,ebob-ekok}.json`, kanıt kaydı
`frontend/src/learn/content/kanit/` (`index.js` üretilir) ve `content/evidence.js`; `sharedSet`,
`PilotSources`, `QuestionDetail`, `konu-ogrenme-ui.mjs` genelleştirildi; eski `tas08_pilot_*.py`
kaldırıldı. Tarif: [içerik hattı](islemler/icerik-hatti.md).
Doğrulama: `icerik-hatti-test.py` 9/9; bölme pilotunda dogrula aşaması 58 Node testi geçti,
`icerik kontrol` geçti, ikinci çalıştırma bütün aşamaları atladı.

EBOB–EKOK yapılan: kitap s.94–107 ve sözlük s.367 paketlendi; 20 iddia, 10 bölüm notu
(kitapta olmayan bölen sayısı, kalanlı EBOB, son rakam döngüsü “özgün türetim” olarak işaretli).
Görselleri açılıp okunan sorular: rehberli AYT_Sayisal-0035 (s2), AYT_Sayisal-0018 (s2b);
bağımsız TYT-0713 (s1, C·54) ve AYT_Sayisal-0021 (s2b, C·7·8!). Rehberli ikisine `mistake`
eklendi; bağımsız çözümler `content/ebob-transfer-exams.js`. Kuru çalıştırmada taslak geçiyor;
`derle` henüz çalıştırılmadı, bu yüzden EBOB kanıtı yayımlanmadı ve uygulama davranışı değişmedi.

Kalan, sırayla:
0. Tüketici genelleştirmesinden sonra bölme pilotunun UI kabulü yeniden çalıştırılmadı (Node testleri ve `vite build` geçti):
   `python scripts/ivme.py ui konu-ogrenme-ui bolme-bolunebilme --duzey` ve `ui konu-ogrenme-ortak-set-ui --pilot`.
1. `testler/ebob-ekok-pilot.test.mjs`: TYT-0713 (iki basamaklı A,B taraması → 216, seçeneklerden yalnız 54 böler),
   AYT_Sayisal-0021 (A=5760, B=35280, EKOK=282240=7·8!), 0018/0035 için kaba kuvvet tarama.
2. Bağımsız iki soru şu an `grafik-rutin-olmayan` ve `birinci-derece-denklemler` bankalarında.
   `node scripts/konu-ogrenme-banka.mjs` (DB salt okunur; WORKED_EXAMS eşlemesi öncelikli) ve
   `node scripts/ortak-set-tani.mjs --yaz`; yalnız bu iki sorunun taşındığını diff'te doğrula.
3. `python scripts/ivme.py icerik calistir ebob-ekok` → 0 ve REVIEW_REQUIRED beklenir. Bundan sonra EBOB konu
   testi yalnız iki bağımsız soruyu seçer (pilot kuralı).
4. Ders `kaynak:` satırını MEB Matematik 9 kitabına bağla (değişince hat taslak/derle'yi yeniden çalıştırır).
5. UI: `konu-ogrenme-ui.mjs ebob-ekok --duzey`, ortak set ekranı; masaüstü/mobil. `ivme.py kontrol`, commit.
Açık karar: öğretmen incelemesi ve öğrenci gözlemi insan girdisidir; agent `icerik karar/gozlem` çalıştırmaz.

## TAS-08 devam noktası

Tamamlanan kapsam: sekiz bölüm/11 kaynak iddiası, tam MEB kitap paketi; iki rehberli
ve iki bağımsız sorunun kaynaklı çözümü. Ortak PRATIK ekranında çözüm cevaptan sonra
açılır. Çözüm başlığındaki yıl alanı düzeltildi. Sahte API'nin eksik alanları ve
kayıt onayı beklenmeden tıklayan UI testi düzeltildi. Pilot girdi değişiklikleri
commit öncesi otomatik denetlenir.

Doğrulama: kaynak/hash kontrolü ve 20 Node testi; masaüstü/mobil sekiz bölümün
kaynakları, üç anlatım düzeyi ve sorgulamaları; iki açıklamalı soru; temel kavramlarda
12 test/52 çıkmış soru akışı geçti. Ekranlar `veri/ui-denetim/konu-ogrenme/` altında.
Tam ders akışı da masaüstü/mobil geçti: sekiz bölüm, 28 ders olayı, altı ustalık sorusu.
Yerel izleyici yeni sürümü sundu; Windows PowerShell ile kaynak/paket parmak izi
ve HTTP/yerel sürüm eşleşti. Giriş sonrası canlı konu/soru sayfaları hatasız.
`ivme.py plan`, staged 11 dosyada `ivme.py kontrol` ve `git diff --cached --check` geçti.
Testler sahte API kullanır; gerçek öğrenci cevapları veya geçmiş DB olayları yazılmadı.

Açık karar: öğretmen ve öğrenci gözlemi olmadan `teacherApproved` ve
`studentTransferObserved` değiştirilmez; TAS-08 tamamlandı sayılmaz. İki aktarım
sorusu yalnız rakam koşullarını ölçer; bütün konuya ustalık kanıtı değildir.

Sıradaki komut: `git status --short`; sonra `docs/icerik/tas08-pilot-kabul.md`
içindeki kalan kabul ölçütlerini kullan. Kaynak değişmediyse arşivi ve bankayı
baştan üretme. İçerik değişirse `python scripts/ivme.py icerik calistir bolme-bolunebilme`
ile kanıtı, ilgili UI/Node kontrolüyle davranışı doğrula.

Yerel `main` commit'i yapılır; push istenmedi. Diğer açık işler
[görev tablosu](gorev-durumu.md) ve [yol haritasında](plan/README.md).
