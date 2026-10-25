# İvme — yol haritası

Tek yapılacaklar kaynağı bu dizindir. Her açık iş ilgili numaralı adım dosyasında bir
alt görevdir; ayrı “eksikler” veya “yapılanlar” listesi açılmaz. Etkin/yarım iş
[devir dosyasında](00_DEVAM.md), kalıcı kurallar ve güncel sürüm dayanakları
[çalışma bağlamında](00_CALISMA_BAGLAMI.md), sistemin nasıl çalıştığı
[sistem rehberinde](00_SISTEM_REHBERI.md) tutulur.

## Açık adımlar

| Adım | Ayrıntı dosyası | Durum / bağımlılık |
|---|---|---|
| 7 | [Çoklu etiketleri ve belirsiz kayıtları denetle](07_KALITE_VE_INCELEME.md) | Teknik hat hazır; alan uzmanı/öğretmen kararı bekler |
| 12 | [Kalan içerik ve yayın işlerini tamamla](12_KALAN_ICERIK_VE_YAYIN.md) | İçerik kararları 7 ile bağlı; ortam işleri yönetici/cihaz bekler |
| 13 | [Kullanıcı rolleri ve site yönetimi](13_KULLANICI_ROLLERI_VE_YONETIM.md) | Tasarım önerisi; ayrı uygulama talimatı bekler |
| 14 | [KPSS sınavlarını aynı ekranlara bağla](14_KPSS.md) | 14.02 Ön Lisans sırada; 7/12'den bağımsız |

Etkin görev ve sıradaki görev devir dosyasındadır.

## Ortak kararlar

- Konu, PDF, soru, video ve ders notu aynı kontrollü kategori kimliklerini kullanır. Başlık değişikliği yeni kimlik üretmez.
- Ders/ünite/konu yapısı Excel'in yalnız ilk KONULAR sayfasından gelir; çalışma anındaki tek doğruluk kaynağı PostgreSQL'dir.
- YKS ve KPSS aynı menü ve ekranları kullanır; öğrenci “Sınavım” seçicisiyle sınavını seçer (`exam_tracks` / `user_exam_tracks`). Hazır olmayan sınav “henüz hazır değil” notuyla listelenir.
- Çalışma anında kategori tanımı ve otomatik etiket yalnız yayımlanmış DB sürümünden alınır. DB kaydı yoksa sessiz yedek sözlük veya başlıktan yeni kimlik oluşturulmaz.
- Her kaydın en az bir etiketi vardır. İçerik okunamıyorsa bilinen en geniş kapsam ve düşük güven; konu dahi bilinmiyorsa kontrollü inceleme etiketi kullanılır. Sayfa veya zaman uydurulmaz.
- Aynı içerik farklı konularda kopyalanmaz; tek kaynak kaydına birden fazla konu ilişkisi ve her ilişkiye ayrı kanıt/aralık bağlanır.
- Etiket varlığı, güveni, kaynak aralığının doğrulanması ve öğretmen onayı ayrı bilgilerdir. Düşük güvenli etiket bütün sistemi öğretmen beklemeye kilitlemez.
- Tekil kaynak sayısı ile konuya yapılan referans sayısı ayrıdır; birden fazla etiket bir öğrencinin çözümünü çoğaltmaz.
- Yıla ait tam sınavda eksik sorular aynı sınav ve dersin havuzundan açıkça “Tahmini soru” işaretli tamamlayıcılarla doldurulabilir; bu, 12.01 kaynak incelemesini kapatmaz.
- Tekrarlı işlerde önce mevcut sonuç ve hash önbelleği, sonra kurallar/metin çıkarımı, gerektiğinde OCR ve yerel model, yalnız çözülemeyen parçada büyük AI kullanılır.

## Görev ve oturum düzeni

Görev kimliği `NN.NN` biçimindedir; tanımı yalnız ilgili adım dosyasında tutulur. Görev
kapanınca adım dosyasından çıkarılır, diğer kimlikler yeniden numaralanmaz. Adımın tüm
işleri kapanınca kalıcı kuralları ilgili rehber bölümüne/teknik belgeye aktarılır, adım
dosyası silinir, bu tablodaki satırı kaldırılır; tamamlanan adım için özet dosyası
bırakılmaz. Kanıt commit mesajında veya sürümlü raporda tutulur.

Kısa görev girdisi: `görev kimliği + girdi yolları + kaynak/sözlük sürümü + beklenen çıktı + kabul ölçütü`.
Kısa sonuç: `işlenen/atlanan/hatalı sayısı + çıktı yolu + doğrulama sonucu + kalan neden`.
Betikle çözülen işte model çağrılmaz.

Kullanıcı yalnız plan düzenlemesi istiyorsa uygulama kodu, DB ve kaynak içerik
değiştirilmez. Gerçek DB'yi sıfırlayan betik/test çalıştırılmaz; testler geçici
`ivme_test` veritabanında yürür. Sırlar ve büyük kaynak arşivleri Git'e alınmaz.
Kullanıcının yayın talimatı olmadan push veya dağıtım yapılmaz.

## Belgeler

`docs/plan` yalnız `00_` belgelerini, açık adımları, `rehber/` bölümlerini ve kullanılan
`sema/` sözleşmelerini tutar. Plan dışındaki teknik belgeler çalışan sistemin güncel
sözleşmesidir; görev listesi değildir:

| Belge | İçerik |
|---|---|
| [API ve mimari](../API-ve-mimari.md) | API, veri modeli, erişim ve kurulum sözleşmesi |
| [Öğretmen doğrulaması](../OGRETMEN_DOGRULAMASI.md) | İnceleme ekranı, karar sürümleri, yetki ve kayıt akışı |
| [Ortak etiket kapsamı](../ORTAK_ETIKET_KAPSAMI.md) | Merkezi katalog, üretim/yayın komutları ve kaynak denetimi |
| [Kaynaklı ders notları](../KAYNAKLI_DERS_NOTLARI.md) | Konu rehberlerinin üretim ve yayın kuralları |
| [Kaynaklı soru analizi](../KAYNAKLI_SORU_ANALIZI.md) | Kaynak taraması ve `source_research` araştırma arşivi |
| [İşlem tarifleri](../islemler/README.md) | Tekrar eden işlerin adım adım komutları |

Son iki KAYNAKLI belgesi `scripts/kaynakli_arastirma_db.py` tarafından girdi olarak
hash'lenir; silinmez veya yeniden adlandırılmaz.
