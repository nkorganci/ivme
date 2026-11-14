# Hareket v2 içerik devri — 16.04

İçerik taslağı hazırdır; ürün kabulü değildir. Araç kutusu ve sekiz durak son Claude commitinden
(`8a59fe6`) korunmuştur. Ölçme içeriğini GPT-6 Astra tamamladı; Fable veya Opus çalıştırıldığı iddia edilmez.
Kullanıcının durma sınırı: içerik sonunda dur; Sonnet kod aşamasını bu oturumda başlatma.

## İçerik dosyaları

- `frontend/src/learn/konu/paketler/arac-kutusu-fizik.js`: yedi ön koşul mikro dersi.
- `frontend/src/learn/konu/paketler/fizik-hareket.v2.js`: sekiz durak; v1 yeniden kullanım bağları ve ölçme paketi.
- `frontend/src/learn/konu/paketler/fizik-hareket.v2.olcme.js`: Y1–Y13 için tanı, deney yönergesi,
  açıklama, gecikmeli sınama; 10 ön/10 son test; 12 tip tanıma ve 12 alıştırma;
  10 karma soru, 13 tekrar kartı. Sorular özgündür; ÖSYM sorusu veya öğretmen onaylı soru değildir.
- Kaynak çerçevesi `fizik-hareket.harita.md`; bu oturum PDF taramadı, yeni soru edinmedi.

## Sonnet için uygulama sınırı

1. V2 henüz kataloğa bağlı değildir. V1'i silmeden şema v2 ve yeni alanların bileşenlerini ekle.
2. Deney yönergelerini hareket stüdyosuna bağla; yönerge metni çalışan deney değildir.
3. Her basamağın geçiş ölçütünü planın merdiveninden uygula. Şu an içerik verisi ilerleme kilidi sağlamaz.
4. `secenekler` dizilerinde doğru seçenek başta yazılmıştır. Kalıcı seçenek kimliğiyle karıştır;
   cevap ve gerekçeyi seçimden önce gösterme. Test bütün cevaplar kaydedilmeden geri bildirim açmasın.
5. Ön test tanı döngüleriyle ortaktır; son test ayrı yüzeylidir ve derste gösterilmez. İki seçenekli
   maddeler öğretmen denetiminde değerlendirilir; şans etkisi nedeniyle tek başına öğrenme kanıtı değildir.
6. Tip tanıma ve düzeyli set aynı senaryoları kullanır: öğretim alıştırmasıdır, görülmemiş aktarım değildir.
   Tip tanıma turunda sayısal cevabı veren gerekçeyi açma; set sonrası göster.
7. TYT-0910/0912/0913, v1'den devralınan ipucu/çözümlerden ayrılmadan bağımsız ÖSYM ölçümü sayılamaz.
   Kaynak görseli ve basılı anahtarı yeniden doğrulanmadan yeni çözüm veya kabul üretme.
   Daha önce gören öğrenci için bir hafta sonraki görülmemiş soru koşulu ayrıca sağlanmalıdır.
8. Yeni iki tipin banka sayıları `null`; sıklık uydurulmadı. Yeni kaynak görselleri `null` olan
   kayıtlarda yer tutucu/onaylı görüntü üretme; mevcut kaynak kanıtına bağla.
9. Opus ayrı oturumda önce kendi cevaplarını üretir; rubrik, kaynak ve öğretmen kabulü sonra gelir.
   Normalize kazanç hedefi ölçüm değildir; ön=100 için normalize kazanç hesaplanmaz.

## Kontrol

İçerik içe aktarımı, eksik v1 bağları, soru seçenekleri, Y kodları, araç kutusu ve 12 tip kapsamı
yerel Node denetimiyle kontrol edilir. Depo denetimleri: `python scripts/ivme.py plan` ve
`python scripts/ivme.py kontrol`. Bu denetimler öğretmen onayı veya bağımsız fizik denetimi değildir.

Sonuç: 8 durak, 7 mikro ders, 13 yanılgı, 12 tip, 10+10 test maddesi, 10 karma soru ve
13 tekrar kartı bağları geçti. İçe aktarılan içerikte 153 seçenekli soru nesnesi (yeniden kullanılanlar
dahil) tek doğru ve gerekçe yönünden kontrol edildi; örnek sayısal sonuçlar bağımsız aritmetikle
karşılaştırıldı. `plan` ve altı değişen dosya için `kontrol` geçti. Ekran kabulü yapılmadı;
uygulama hâlâ v1'i servis eder.
