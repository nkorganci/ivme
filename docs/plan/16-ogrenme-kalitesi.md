# 16. Adım — Öğrenme kalitesi, kaynak düzeni ve model kullanımı

Durum: plan onaylı; 16.01 BITTI (belge düzeni uygulandı); 16.02 BITTI (ölçüm ve kaynak kaydı); sıradaki görev 16.03 (kullanıcı onayıyla). Kalıcı kurallar
[AGENTS.md](../../AGENTS.md), devam noktası [devir notunda](../devam.md).

## Hedef

YKS öğrencisinin her konuyu sıfırdan ileri düzeye görerek, deneyerek ve ölçülerek öğrendiği,
sade gezinmeli bir ürün. Çalışma alanında yalnız kullanılan dosya ve yalnız güncel belge kalır.

## Kararlar (kullanıcı)

1. Veritabanı PostgreSQL kalır.
2. **Arşiv yok, gereksiz olan silinir.** Video ve ses dosyaları tutulmaz; uygulama videoyu bağlantıdan açar.
3. **Aynı dosya iki yerde tutulmaz.** `D:\workspace\mebi-yks` içeriği `D:\workspace\ivme` içinde de varsa ivme'deki kopya silinir; tek kopya hedef düzene taşınır (`mebi-yks` dosyaları ivme'ye *taşınır*, kopyalanmaz) ve `mebi-yks` klasörü boşalınca kaldırılır.
4. **Soruları sisteme alınmış PDF'in aslı tutulmaz**; ayrıca düzenlenmeden tek bir `soru-referansi/` klasörüne konur (yalnız soru bankası referansı). Konu anlatan PDF kalır; aynı konuda en iyi 4 belge tutulur, fazlası silinir.
5. Kalan konu PDF'leri sınav → ders → ünite → konu klasör düzenine taşınır.
6. Proje, klasör ve dosya adları gerektiğinde değiştirilir, birleştirilir veya silinir; amaç düzenli ve anlaşılır tek yapıdır.
7. Belgeler bilgi kaybı olmadan en aza indirilir; kapanmış iş dosyaları silinir (geçmiş `git log`'dadır).
8. Pratik 2 soru aktarımı 10.959 kabul edilmiş soruda dondurulur.
9. Model erişimi: abonelik + yerel Ollama; API/Batch yok.

## Mevcut durum

| Alan | Bulgu |
|---|---|
| İçerik | Katalogda 542 konu grubu; derin anlatım yalnız 34 matematik dersinde. Diğer derslerde 1 Fizik pilotu ve 2–4 interaktif ünite. |
| Kök neden | Her ders elle, konuya özel JSX/SVG ile yazılıyor; ortak şema, bileşen kataloğu ve kalite rubriği yok. |
| Gezinme | ~40 rota; aynı işi yapan 12 öğrenci girişi. |
| Öğrenme motoru | `frontend/src/learn/engine/` iyi durumda (FSRS, 1-3-7-14-30-60 gün merdiveni, yanlış kuyruğu, %80 ustalık, yerleştirme, seri). Yeniden yazılmaz. |
| Dosyalar | ~12.000 PDF (YKS 8.352, OGM 2.687, KPSS 730, LGS 224). mp4 2.091, mp3 2.039, zip 162. |
| Sabit bağlantı | Videolar üç yolda aynı dosyadır: `mebi-yks`, `Kaynaklar/YKS/Dersler`, `Kaynaklar/YKS/Katalog/EskiYollar`. Tek yolu silmek yer açmaz; bütün bağlantılar silinmelidir. Gerçek disk kullanımı 16.02'de ölçülür. |
| Video adresleri | `mebi-yks/katalog.json` (1.811 sayfa, `assets`) ve `video-boyutlari.json` MEBİ CDN adreslerini taşır; bir kısmı oturum ister (`oturum-gerektiren.json`). YouTube bağlantıları `frontend/src/curriculumVideos.js` içindedir. |
| Çalışma verisi | `uygulama/veri` ~53–60 GB (kırpım, kanıt, önbellek, denetim görüntüsü); `yedekler` 3,7 GB (5 döküm). |
| Hazır temel | `pipeline/`: OGM 2.686 PDF / 58.371 sayfa metne çıkarılmış, 38.321 parça `bge-m3` ile gömülü, 542 konuya eşli. |
| Belgeler | `docs/` + `AGENTS.md` 10.484 satır; kapanmış YKS-00–13 görev dosyaları ~2.700 satır; `veri/` altında 162, `Kaynaklar/` altında ~100 `.md`. |
| Yerel modeller | `gpt-oss:20b`, `qwen3.5:9b`, `gemma3:4b`, `bge-m3`; 8 GB GPU, 32 GB RAM. |

## Hedef ürün

### Dört ana yer

| Yer | İçerik | Birleşen eski girişler |
|---|---|---|
| Bugün | Günün planı: tekrar, yeni konu, yanlışlar | Öneriler, yarım kalan çalışma |
| Öğren | Ders → ünite → konu; her konu tek sayfa | Konuyu Öğrenelim, İnteraktif Öğrenme, Akıllı Öğretmen, Konu Anlatımları, Ders Notları, Özel Ders, Konular ve Kaynaklar |
| Çöz | Konu testi, karışık pratik, çıkmış sorular, deneme | Soru Bankası, Pratik, Pratik 2, Çıkmış Sorular, Sınav |
| İlerleme | Konu ustalığı, netler, geçmiş | İlerleme, Geçmiş, deneme tabloları |

Eski adresler yönlendirilir; yönetim ekranları `/yonetim` altında toplanır; öğrenci geçmişi korunur.

### Konu sayfası (her derste aynı akış)

1. **Neden?** Günlük bağlam ve tahmin sorusu.
2. **Gör ve dene.** Konuya uygun etkileşimli model.
3. **Birlikte çöz.** Adım adım örnek (ne / neden / nasıl kontrol ederim); adımlar giderek öğrenciye bırakılır.
4. **Püf noktası.** Kısa yol, geçerli olduğu koşul, yanılttığı yer, sınavda soruluş biçimi.
5. **Kendini sına.** 4–6 kavram sorusu; her yanlış şıkka özel açıklama.
6. **Gerçek sorular.** Konu testi; her soruda açıklamalı çözüm ve ipucu.
7. **Tekrar.** Ders sonu geri çağırma, sonra aralıklı tekrar.
8. **Video.** Konunun videosu bağlantıdan açılır (MEBİ veya YouTube); yerel dosya yok.

### Derse göre görsel dil

| Dersler | Ana etkileşim |
|---|---|
| Matematik, Geometri | Değeri değişen model, sayı doğrusu, grafik, şekil sürükleme |
| Fizik, Kimya | Simülasyon, senkron grafik |
| Biyoloji | Etiketli şema, süreç akışı, sıralama/eşleştirme |
| Tarih | Zaman şeridi, neden → sonuç zinciri, harita, karar oyunu |
| Coğrafya | Harita katmanları, iklim grafiği |
| Türkçe, Edebiyat | Metin işaretleme, öge ayırma, dönem/eser eşleştirme |
| Felsefe, Din Kültürü | Kavram haritası, görüş karşılaştırma, argüman şeması |

Durağan şema ve akış için Mermaid (tembel yüklenir); etkileşim için `interactive/kit/` ve `learn/lesson/`.

### Bilimsel dayanak → ürün kuralı

| İlke | Kural |
|---|---|
| Geri çağırma pratiği (Roediger ve Karpicke; Dunlosky) | Her bölüm kısa soruyla biter; okumak "tamamlandı" saymaz |
| Aralıklı tekrar (Cepeda) | Ders sonu → 1, 3, 7, 14, 30, 60 gün; son 21 günde sıkışır |
| Çözümlü örnek ve azalan yardım (Sweller; Renkl) | Tam çözüm → eksik adım → bağımsız soru |
| Karışık pratik (Rohrer) | Konu testinden sonra önceki konularla karışık set |
| Çoklu ortam (Mayer) | Görsel ve açıklama yan yana; süs görsel yok; ekranda tek fikir |
| Kendine açıklama (Chi) | "Neden?" soruları, seçenek gerekçesi |
| Ustalık (Bloom) | %80 ve her soru tipinden doğru olmadan konu kapanmaz; geçilemeyen tip geri gelir |
| Uygun zorluk (~%85 başarı; Wilson) | 2 yanlış → ipucu ve kolay kardeş soru; 3 doğru → daha zor |
| Hataya özel geri bildirim (Hattie ve Timperley) | Yanlışta moral bozmayan, nedeni söyleyen mesaj |
| İç motivasyon (Deci ve Ryan) | Kutlama (konfeti/havai fişek) ustalık ve seri dönüm noktalarında; hareket azaltma tercihine uyar |

### Kişisel ders planı (en yüksek net için)

- **Öncelik puanı** = konunun sınavdaki soru ağırlığı × öğrencinin açığı × öğrenilebilirlik (ön koşulları tamam mı).
  Ağırlık kaynağı: `Kaynaklar/mufredat/konu-listeleri/` 2018–2026 konu-soru dağılımları.
- **Başlangıç:** kısa yerleştirme testi; bilinen konu atlanır, eksik ön koşul öne alınır.
- **Günlük sıra:** vadesi gelen tekrar → yanlış kuyruğu → yeni konu → karışık set. Yeni konu payı en çok %40.
- **Haftalık:** bir deneme ve hata analizi; yanlış soru tipleri sonraki haftanın planına girer.
- **Son 21 gün:** yeni konu durur; deneme, yanlışlar ve yüksek ağırlıklı konuların tekrarı.
- Uygulama yeri: `learn/engine/plan.js`, `placement.js`, `selection.js` (ek; mevcut davranış korunur).

## Kaynak düzeni

### Hedef klasör yapısı

```
Kaynaklar/
  konu-anlatim/<Sınav>/<Ders>/<Ünite>/<Konu>/   konu başına sayı sınırı yok; her PDF'in ders/ünite/konusu kayıtta
  soru-bekleyen/<Sınav>/<Ders>/                 sorusu henüz bankaya alınmamış veya kısmen alınmış PDF
  soru-referansi/<Sınav>/                       soruları sistemde olan asıllar; düzenlenmez, yalnız referans
  cikmis-sinavlar/                              resmî ÖSYM kitapçıkları (küçük; cevap itirazında referans)
  mufredat/                                     tek kopya
```

`Sınav`: YKS (TYT/AYT), KPSS, LGS, yurt dışı. `mebi-yks` içindeki dosyalar bu yapıya taşınır, klasör kaldırılır;
`katalog.json` ve `envanter.jsonl` kaynak kaydına aktarılır. `Kaynaklar/YKS/Katalog/EskiYollar` kaldırılır.

### Kaynak kaydı (PostgreSQL, tek tablo)

Her dosya için: SHA-256, boyut, sayfa sayısı, tür (konu anlatımı / soru / deneme / kitap), sınav–ders–ünite–konu,
özgün indirme adresi, bağlı soru sayısı, karar (kalır / silinir / bekler) ve gerekçe. Silinen dosyanın satırı kalır;
adresi olan dosya gerektiğinde yeniden indirilebilir. Birleşecek mevcut kayıtlar: `veri/pdf-source-registry`,
YKS-13 sonuçları, `pipeline` (ogm_ders), `mebi-yks/envanter.jsonl`.

### Silme kuralları

| Ne | Koşul |
|---|---|
| mp4, mp3 | Video adresi kayıtta ve bağlantı denetiminden geçtiyse bütün sabit bağlantılarıyla silinir. Adresi olmayan video listelenir, kullanıcı karar verir |
| zip | İçindeki dosyalar kayıtta varsa silinir |
| Aynı PDF (aynı hash; ya da aynı sayfa sayısı + ilk üç sayfa önizlemesi) | Bir kopya kalır; ivme ve mebi-yks'te ikisi de varsa ivme'dekini sil, mebi-yks'tekini hedef düzene taşı |
| Soru PDF'i | Cevaplı bütün soruları bankada kırpım + cevapla duruyorsa `soru-referansi/`'ne taşınır (düzenlenmez); kısmi alınmışsa `soru-bekleyen/` |
| Konu anlatımı | Sayı sınırı yok (kullanıcı kararı). Yalnız sistemde aynısı varsa (aynı hash) silinir; yoksa kalır, konusu belirsizse belirsiz olarak kayıtlı kalır. Ders–ünite–konu bir kez eşlenir, işlem sırasında tekrar uğraşılmaz |
| Genel ilke | Sistemde karşılığı olmayan dosya silinmez. Kullanılmayan, işe yaramayan, yedek ve tekrar dosya silinir; çalışan sistem (DB, uygulamanın okuduğu görsel/PDF klasörleri) bozulmaz. Referansı sürenler (`yks-birlestirme`, `mebi-pratik-2`, `pdf-accept` dökümleri) okuyan kod ve DB karşılığı doğrulanınca silinir |
| `uygulama/veri` | Uygulamanın sunduğu kırpımlar ve küçük kabul makbuzları kalır; önbellek, geçici dosya, eski denetim görüntüsü, geri yükleme kopyası silinir |
| `yedekler`, `pipeline/backups` | Yalnız son geçerli veritabanı dökümü kalır (öğrenci verisi koruması; arşiv değildir) |
| Kaynak içindeki `.md` durum notları | Bilgisi kayda aktarılır, dosya silinir |

Her silme önce **kuru çalıştırma listesi** üretir (dosya, boyut, gerekçe); kullanıcı kategoriyi onaylar, sonra silinir.
Silmeden önce güncel veritabanı dökümü alınır. Öğrenci kayıtları ve soru kimlikleri değişmez.

## İçerik mimarisi

- **Konu paketi şeması:** [learning-resource-v2](../semalar/learning-resource-v2.schema.json) genişletilir.
  Paket = bölümler → bloklar (anlatım, model, çözümlü örnek, püf noktası, yanılgı, kontrol sorusu, Mermaid şema,
  zaman şeridi, harita, eşleştirme, sıralama, video bağlantısı) + kaynak sayfa referansları + soru bağları.
- **Bileşen kataloğu:** ~15 parametrik blok. Yeni konu veridir; konuya özel JSX yazılmaz.
  Yeni bileşen en az üç konuda kullanılacaksa eklenir.
- Mevcut 34 matematik dersi korunur ve aynı bloklarla çizilir.
- **Kalite rubriği (12–15 ölçüt):** doğruluk, kaynak bağı, sıfırdan anlaşılırlık, görselin işlevi, örnek kalitesi,
  püf noktasının koşulu, soru–kavram uyumu, dil. Eşik altı paket yayımlanmaz.
- Öğretmen onayı olmayan içerik "Öğretmen kontrolü bekliyor" etiketiyle görünür.

## Proje ve belge düzeni

Hedef: tek, sistematik yapı. Ad değiştirme, birleştirme ve silme serbesttir; her taşımada kod, betik, test ve belgelerdeki
yollar aynı işte güncellenir ve `python scripts/ivme.py plan` ile `kontrol` geçer.

### Proje yapısı (kök `D:\workspace\ivme`)

| Klasör | Görev | Değişiklik |
|---|---|---|
| `uygulama/` | Kod, belgeler, testler | `scripts/` alt klasörlere ayrılır: `pratik2/` (donmuş soru aktarma), `yks/`, `icerik/`, `kaynak/`; kapanmış tek seferlik betikler silinir |
| `uygulama/veri/` | Çalışma verisi | Kök `icerik/data` buraya taşınır (yollar tek sabit dosyasında toplanır); önbellek ve eski denetim çıktıları silinir |
| `Kaynaklar/` | Kaynak PDF'ler | Yukarıdaki hedef klasör yapısı |
| `araclar/` | OGM metin çıkarma/embedding ve KPSS soru çıkarma betikleri | `pipeline/` ile `veri-hatti/` birleşir; durum raporları, `.pid`, `.lock`, `.tmp` silinir |
| `yedekler/` | Son veritabanı dökümü | Tek dosya |

Kaldırılır: `D:\workspace\mebi-yks` (dosyalar taşındıktan sonra), kök `icerik/`, `veri-hatti/`, `pipeline/`,
`__pycache__`, `.pytest_cache`.

### Belge düzeni (hedef: ~10.500 satırdan ~2.500 satıra)

| Yeni | Birleşen eski | Sınır |
|---|---|---|
| `AGENTS.md` | Yalnız her işte geçerli kurallar | 60 satır |
| `README.md` (kök) | Çalıştırma ve klasör haritası | 20 satır |
| `docs/README.md` | İçindekiler | 20 satır |
| `docs/devam.md` | Etkin iş, sıradaki komut, açık karar | 40 satır |
| `docs/plan/` | `README.md` (yol haritası + `gorev-durumu.md` birleşir) ve yalnız açık adım dosyaları (07, 12, 14, 16) | |
| `docs/urun/` | `icerik/` (11 dosya) → `ogretim-standardi.md` (öğretim, lab, pilot, ders yazma) + üretilen `matematik-konu-listesi.md` | |
| `docs/sistem/` | `mimari/` (17 dosya) ve `tasarim/kullanici-yonetimi.md` → `veri.md`, `ilerleme.md`, `soru-ve-pratik.md`, `icerik-hatti.md`, `kullanicilar.md` | |
| `docs/tarifler/` | `islemler/` (18 dosya) → `calistirma-ve-yayin.md`, `test-ve-devir.md`, `soru-aktarma.md` (Pratik 2, yurt dışı, içe aktarma), `kaynak-kaydi.md` (pdf-*, yks-kaynak-birlestirme, pgvector, yerel model), `konu-paketi.md` (içerik hattı, öğretim içeriği, video), `izleme.md` (sağlık, bildirimler, devir, doğrulama) | |
| `docs/sozlesmeler/`, `docs/semalar/` | Olduğu gibi | |
| `testler/bilinen-hatalar.md` | Olduğu gibi | |

Silinir: kapanmış YKS-00–13 görev ve işlem dosyaları, 15. adım belgeleri, 826 satırlık inceleme belgesi (model tablosu bu
plandadır), `pipeline/` durum raporları, `veri/` ve `Kaynaklar/` altındaki `.md` notları (bilgisi kaynak kaydına aktarılır).
15. adımdaki "kapanan adımlar silinmez" notu kullanıcının güncel talimatıyla kaldırılır.

**Bilgi kaybı kuralı:** silinen veya birleşen her belgenin hâlâ geçerli kuralı kalan belgeye tek cümleyle taşınır;
tarihçe taşınmaz. Taşınan kuralların listesi commit mesajına yazılır. Tekrarlanan işler skill olur:
`konu-paketi-uret`, `konu-paketi-dogrula`, `bilesen-ekle`, `kaynak-kayit`.

## Hangi iş hangi modelde

| İş | Model |
|---|---|
| Öğretim standardı, şema, bileşen kataloğu, rubrik, altın konular, her dersin ilk konusu | Claude Fable 5.2 |
| Zor konu, mimari inceleme | Claude Opus 5.5 |
| Uygulama kodu, betikler, toplu konu paketi, belge sadeleştirme | Claude Sonnet 5.5 veya GPT-6.1 Sol |
| Bağımsız doğrulama | Yazandan farklı sağlayıcı (GPT-6 Astra ↔ Fable/Opus); önce kendi çözümünü üretir |
| Ekran ve şekil denetimi | GPT-6.1 Terra veya Claude (ekran görüntüsüyle) |
| Küçük düzenleme, etiket | Claude Haiku 5.5 veya GPT-6 Luna |
| Gömme, benzerlik, kaynak–konu eşleme | Ollama `bge-m3` |
| PDF sınıflama, en iyi 4 sıralaması, kanıt paketi taslağı | Ollama `qwen3.5:9b`; kararsız kalanlar `gpt-oss:20b` |
| Görselden ön eleme | Ollama `gemma3:4b` (önce 20 sayfalık deneme) |
| Hash, sayfa sayımı, bağlantı denetimi, silme listesi, test | Betik; model yok |

Token kuralları: bulut modeli PDF taramaz, yalnız betik + Ollama'nın hazırladığı **kanıt paketini** (konunun 10–20
sayfası, görselleri, bağlı soruları) okur; bir oturum bir konu ya da bir iş; girdisi değişmeyen aşama yeniden
çalışmaz; güçlü modele yalnız gözlenebilir hatada (şema, hesap, test) geçilir.

## Görev sırası

## 16.01 — Dondur ve belgeleri yeniden düzenle (Sonnet 5.5) — BITTI
- Pratik 2 süreçlerini düzgün kapat, imleci devir notuna yaz, bekleyen değişiklikleri commit et.
- Belge düzenini uygula (yukarıdaki tablo): birleştir, yeniden adlandır, sil; `plan-check.py`, `ivme.py` ve `AGENTS.md` yollarını güncelle.
- `AGENTS.md`'deki "Kaynaklar yalnız okunur" kuralını 16.03'ün silme kurallarıyla değiştir.
- Kabul: `python scripts/ivme.py plan` ve `kontrol` geçer; satır sınırları tutar; kırık bağlantı yok.

## 16.02 — Ölç ve kaynak kaydını kur (betik + Ollama; kod Sonnet 5.5) — BITTI
- Sabit bağlantıları hesaba katan gerçek disk raporu; `uygulama/veri` alt klasör boyutları.
- Kaynak kaydını doldur: hash, tür, konu eşleme (klasör ve `katalog.json` → `bge-m3` → `gpt-oss:20b`), bağlı soru sayısı.
- Video bağlantı tablosu: `katalog.json` + YouTube; bağlantı denetimi; oturum isteyenler MEBİ sayfa adresiyle.
- Kabul: her dosya kayıtta tek satır ve bir karar taşır; kararsız dosya sayısı raporlu.
- Sonuç (`python scripts/ivme.py kaynak …`; rapor `veri/kaynak-kayit/`): görünen 386,7 GiB, gerçek disk 148,3 GiB (238 GiB sabit bağlantı tekrarı); Kaynaklar 87,9 GiB, mebi-yks 76,9 GiB (aynı dosyaların büyük kısmı ortak), `uygulama/veri` 49,7 GiB. Kayıt `kaynak_kaydi.dosyalar`: 12.140 fiziksel dosya = 12.140 satır, hepsinde SHA-256; karar: kalır 6.707 (9,2 GiB), silinir önerisi 4.685 (68,7 GiB: 2.094 video/ses, tekrar kopyalar; konuda 4'ten fazla anlatım önerisi sonradan kaldırıldı), **kararsız (bekler) 748** (668 konusu belirlenemeyen konu anlatımı + 78 zip: içinde kayıtta olmayan üye + 2 adressiz zip). Konu eşleme: katalog/klasör 3.259, bge-m3 83, gpt-oss 110 (150 sınırı), belirsiz 2.940 (çoğu YKS dışı değil; eşik sıkı). Video tablosu `kaynak_kaydi.video_baglari`: MEBİ 2.094 adresin tamamı denetimden geçti (boyut eşit), YouTube 195 geçti / 184 ulaşılamadı (liste/oEmbed; 16.03'te elle bakılır). Silinen dosya yok; "silinir" yalnız öneridir.

## 16.03 — Sil ve yeniden düzenle (betik; kullanıcı onayıyla)
- Kategori kategori kuru liste → onay → silme: video/ses, zip, tekrar PDF, önbellekler, eski dökümler (4'ten fazla anlatım kuralı kaldırıldı).
- Soruları sistemde olan PDF'leri `soru-referansi/`'ne, kısmi olanları `soru-bekleyen/`'e, konu anlatımlarını hedef konu klasörlerine taşı.
- `mebi-yks` dosyalarını `Kaynaklar/`'a taşı, ivme'deki tekrarları sil; `mebi-yks` ve `EskiYollar` kaldırılır.
- Proje yapısını uygula (yukarıdaki tablo): `pipeline` + `veri-hatti` → `araclar`, `icerik/data` → `uygulama/veri`, betik alt klasörleri; yollar tek sabit dosyasında.
- Kabul: uygulama, PDF ekranı ve soru görselleri çalışır; öğrenci ve soru sayıları değişmez; boyut önce/sonra raporlu.
- Yapılanlar (onaylı, `scripts/kaynak/sil.py`, günlük `veri/kaynak-kayit/silme-gunlugu.jsonl`): 2.094 video/ses (66,3 GiB) ve 2.591 tekrar dosya silindi; `video-hatti/medya`, `veri/yedek`, önbellekler, eski dökümler, `main-bank-transfer`, `yks-birlestirme` ve `source-inventory` çalışma çıktıları silindi (yalnız `yks-birlestirme/current.json`+`state.json`+`yol-uyumluluk` ve `single-test-crop-pilot` kaldı: canlı etiket hattı ve MebiPractice2PilotTest okur); kapanmış YKS/Pratik 2'nin 332 betik ve test dosyası `git rm` ile kaldırıldı (geri dönüş git), kalite profilinden 75 ölü kontrol çıkarıldı. D: 454 → 342 GiB. 97.061 soru görselinin tamamı `resimler-pilot`'ta; DB 97.061 soru, 12 kullanıcı. Kalan: zip (80), `Kaynaklar` ↔ `mebi-yks` birleştirme, soru PDF taşıma, proje yapısı, tek sabit dosyası.

## 16.04 — Öğretim standardı ve tasarım sistemi (Fable 5.2)
- Konu paketi şeması, bileşen kataloğu, rubrik, dört ana yerin ve konu sayfasının ekran tasarımı, kişisel plan kuralları.
- Durum: kullanıcı kararıyla **tek model konu** üzerinden yürür (TYT Fizik – Hareket, `/konuyu-ogrenelim/ogren/fizik-hareket`). Yapıldı: şema, blok kataloğu, konu sayfası, rubrik ve üretim sırası ([standart](../urun/ogretim-standardi.md#konu-paketi-standardı-v1--1604)); 236 banka sorusunun görseli incelenerek 10 soru tipi çıkarıldı; `node --test testler/konu-paketi.test.mjs` 7/7; masaüstü ve mobil ekran denetimi temiz. Bekleyen: kullanıcı değerlendirmesi. Kalan: dört ana yerin ekran tasarımı ve kişisel plan kuralları (model konu onayından sonra); ustalık motoru bağı 16.06.

## 16.05 — İki altın konu (Fable 5.2 yazar, GPT-6 Astra denetler)
- Sayısal: Fizik — Hareket ve Kuvvet. Sözel: Tarih — Millî Mücadele.
- Kullanıcı ikisini dener ve onaylar; konu başına oturum/token maliyeti ölçülür.

## 16.06 — Ürün kabuğu (Sonnet 5.5 / Sol; ekran denetimi Terra)
- Dört ana yer ve yönlendirmeler, konu sayfası, blok bileşenleri, Mermaid, bağlantıdan video.
- Geri bildirim: kutlama, moral bozmayan yanlış mesajı, ipucu merdiveni.
- Uyarlama: kolay/zor kardeş soru, geçilemeyen tipin tekrarı, ders sonu geri çağırma, hatırlatma, kişisel plan.

## 16.07 — Üretim hattı (konu konu)
```
betik + Ollama: kanıt paketi → Sonnet/Sol: konu paketi taslağı → betik: şema, hesap, bağlantı denetimi
→ farklı sağlayıcı: rubrikle doğrulama → eşik altıysa bir düzeltme turu, yine geçmezse Opus/Fable
→ yayın: "Öğretmen kontrolü bekliyor"
```
Sıra sınav ağırlığına göre: TYT Türkçe, TYT Fen, TYT Sosyal, sonra AYT. Matematik kendi sırasını korur.

## 16.08 — Ölç ve iyileştir
- Konu başına kavram kontrolü başarısı, ipucu kullanımı, gecikmeli tekrar başarısı, terk noktası.
- En düşük puanlı konular yeniden ele alınır; rubrik ve plan ağırlıkları gerçek veriye göre güncellenir.

## Doğrulama

- Her görev sonunda `python scripts/ivme.py kontrol` ve ilgili `kalite calistir` profili.
- Silme: kuru liste ile silinenlerin eşleşmesi; kayıt satırlarının kalması; uygulama testleri.
- Konu paketi: şema + hesap/bağlantı testleri + rubrik puanı + masaüstü/mobil UI testi.
- Ürün kabulü: kullanıcı altın konuları baştan sona dener; gerçek öğrencide görülmemiş soruda yardımsız çözüm gözlenir.
  Otomatik test geçişi pedagojik kabul sayılmaz.
