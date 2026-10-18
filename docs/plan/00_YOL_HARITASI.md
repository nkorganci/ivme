# İvme — etiketleme öncelikli yol haritası

Güncelleme: 18 Ekim 2026. Bütün branşlar Ark referansındaki 237 TYT/AYT ünitesini kullanır; çalışma anındaki tek doğruluk kaynağı PostgreSQL'dir. Belirsiz ünite/sınıf etiketleri tahmini olarak filtrelenir ve öğretmen kontrolüyle güncellenir. Kalan insan incelemesi ve dış girdiler 7/12 maddelerindedir.

Tek yapılacaklar kaynağı bu dizindir. “Eksikler” ayrı bir liste değildir; her eksik ilgili numaralı adımda bir yapılacak iştir. Tamamlanan alt işler listeden çıkarılır; bütün alt işleri doğrulanarak kapanan adımın `.md` dosyası silinir. Kalan adımların numaraları ve dosya adları değiştirilmez: 1 bitince liste 2. adımdan devam eder. Kullanıcı yalnız plan düzenlemesi istiyorsa uygulama kodu, DB ve kaynak içerik değiştirilmez; uygulama talimatında ilgili iş yürütülür ve geçmiş kayıtlar korunur.

Önce etiketleme tamamlanır; ardından ekranlar ortak etiketlere bağlanır, menüler sadeleştirilir ve takip tabloları düzenlenir. Mevcut katalog ve sabit kimlikler temel alınır. Planı baştan kurmak, içerik ve geçmişi sıfırlamak anlamına gelmez.

Her yeni prompt önce [güncel çalışma bağlamını ve hazır devam promptunu](00_CALISMA_BAGLAMI.md) okur. Her adım dosyasının sonunda doğrudan kopyalanabilir uygulama promptu vardır.

Sistemin kalıcı kurgusu, tek veri kaynakları, kimlik/sürüm kuralları ve değişiklik
prosedürü [sistem rehberinde](00_SISTEM_REHBERI.md) tutulur. Bu belge adımlar
bittiğinde silinmez; yeni yapılacaklar veya tamamlanan işler listesi olarak kullanılmaz.

## Okuma ve uygulama sırası

| Adım | Yapılacak işin tek ayrıntı dosyası | Bağımlılık |
|---|---|---|
| 7 | [Çoklu etiketleri ve belirsiz kayıtları denetle](07_KALITE_VE_INCELEME.md) | Otomatik işleme ve manuel devir hazır |
| 12 | [Kalan içerik ve yayın işlerini tamamla](12_KALAN_ICERIK_VE_YAYIN.md) | Ortak ekran/takip kabulü hazır; gerçek içerik kararları 7 ile bağlı |

**Devam noktası:** 07.02 (`BEKLIYOR_ALAN_UZMANI`). DB kategori/PDF etiket önceliği, aynı işlemde tutarlı katalog okuması, güncel kaynak bağı ve görünen adlar doğrulandı. Aynı disk yedeği/geri yükleme işi kapandı. Gerçek alan kararı, 335 dar konu notu, 54 birleşik arşiv konumu ve ortam/pilot girdileri ilgili 7/12 maddelerinde etiketli kalır. Güncel teknik kabul kanıtı [çalışma bağlamındadır](00_CALISMA_BAGLAMI.md).

Soru/PDF/video üretimi aynı sözleşme ve doğrulayıcıyı kullanır. Normal üretim önbelleği yeniden kullanır; manuel inceleme kaydı insan onayı veya doğrulanmış konu aralığı sayılmaz.

## Ortak kararlar

- Konu, PDF, soru, video ve ders notu aynı kontrollü kategori kimliklerini kullanacak. Başlık değişikliği yeni kimlik üretmeyecek.
- Çalışma anında kategori tanımı ve otomatik etiket yalnız yayımlanmış DB sürümünden alınır. Dosyalar sürümlü üretim girdisidir; DB kaydı yoksa sessiz yedek sözlük veya başlıktan yeni kimlik oluşturulmaz. Geçmiş sürüm ilişkisi yeni kaynak bağını doğrulamaz.
- Her kaydın en az bir etiketi olacak. İçerik okunamıyorsa bilinen en geniş kapsam ve düşük güven kullanılacak; konu dahi bilinmiyorsa kontrollü inceleme etiketi verilecek. Sayfa veya zaman uydurulmayacak.
- Aynı içerik farklı konularda kopyalanmayacak; tek kaynak kaydına birden fazla konu ilişkisi ve her ilişkiye ayrı kanıt/aralık bağlanacak. Belirsiz adaylar kesin kapsamdan ayrılacak.
- Etiket varlığı, etiketin güveni, kaynak aralığının doğrulanması ve öğretmen onayı ayrı bilgiler olacak. Düşük güvenli etiket kullanımı bütün sistemi öğretmen beklemeye kilitlemeyecek; onay gerektiren ölçme/öneri işlevleri kendi koşulunu koruyacak.
- Tekil kaynak sayısı ile konuya yapılan referans sayısı ayrılacak. Birden fazla etiket bir öğrencinin çözümünü veya izlediği videoyu çoğaltmayacak.
- PDF/video adları ortak sözlükten `Sınav | Branş | Konu | Alt konu(lar) | Kaynak/Hoca` biçiminde üretilecek. Özgün başlık, fiziksel dosya yolu ve kalıcı kimlik ayrıca korunacak; kalıcı kurallar çalışma bağlamında tutulur.
- Tekrarlı işlerde önce mevcut sonuç ve hash önbelleği, sonra kurallar/metin çıkarımı, gerektiğinde OCR ve yalnız çözülemeyen parçalarda AI kullanılacak.

## Etiketlemeden sonraki aşamaya geçiş

Bütün kayıtlar etiketli, sözlük/kimlik bağları geçerli ve işlenebilir kaynakların konuya özel aralıkları denetlenmiş olmalı. Erişilemeyen veya okunamayan kaynaklar düşük güvenli etiketi, eksik konum nedeni ve açık takip işiyle korunur; eksikliği kapatılmış sayılmaz. Bu dış bağımlılıklar, denetimden geçmiş kaynakların ekran entegrasyonunu tek başına durdurmaz. 9. adım yalnız doğrulanmış kapsamı veya açıkça geçici olarak işaretlenmiş kayıtları kullanır. Öğretmen onayı gerektiren öneri/ölçme ayrıca kendi kabul koşulunu korur.

## Görev ve oturum düzeni

Görev kimliği `NN.NN` biçimindedir; tanımı yalnız ilgili adım dosyasında tutulur. Yeni oturum bu dosyayı, seçili adımı ve görevdeki ilgili kodu okur; bütün arşivi yeniden okumaz. Görev kapanınca aktif maddesi çıkarılır, diğer kimlikler yeniden numaralanmaz. Adımın tüm işleri kapanınca dosyası silinir; yol haritasındaki satırı kaldırılır, bağımlılık ve bağlantıları güncellenir. Kalıcı kurallar, sözlük/şema yolları ve doğrulama kanıtı önce çalışma bağlamına veya ilgili teknik belgeye aktarılır; tamamlanan adım için özet dosyası bırakılmaz. Kanıt sürümlü raporda veya commit kaydında tutulur; ayrı “yapılanlar/eksikler” belgesi açılmaz.

Kısa görev girdisi: `görev kimliği + girdi yolları + kaynak/sözlük sürümü + beklenen çıktı + kabul ölçütü`. Kısa sonuç: `işlenen/atlanan/hatalı sayısı + çıktı yolu + doğrulama sonucu + kalan neden`. İçerik işçisi kod veya öğrenci verisi değiştirmez. Ajan kullanımı şart değildir; betikle çözülen işte model çağrılmaz.

Her uygulama işinde mevcut kullanıcı değişiklikleri korunur. Gerçek DB'yi sıfırlayan betik/test çalıştırılmaz. İlgili testler ayrı test ortamında yürütülür. Sırlar ve büyük kaynak arşivleri Git'e alınmaz. Kullanıcının yayın talimatı olmadan push veya dağıtım yapılmaz. Tablolar projedeki `DataGrid.jsx` üzerinden AG Grid Community kullanır; renkler `theme.css` değişkenlerinden alınır.

## Docs altında korunacak dosyalar

`docs/plan` yalnız açık adımları, yol haritasını, çalışma bağlamını ve kullanılan `sema/` sözleşmelerini tutar. Tamamlanan görev dosyaları silinir; `00_` belgeleri ve kullanılan şemalar kalıcıdır. Başka bir “eksikler/yapılanlar” dizini açılmaz.

Plan dışındaki beş belge görev listesi değildir; şu teknik ihtiyaçlar için korunur:

| Belge | Neden gerekli? |
|---|---|
| [API ve mimari](../API-ve-mimari.md) | Güncel API, veri modeli, erişim ve kurulum sözleşmesi |
| [Öğretmen doğrulaması](../OGRETMEN_DOGRULAMASI.md) | İnceleme ekranı, karar sürümleri, yetki ve kayıt akışı |
| [Ortak etiket kapsamı](../ORTAK_ETIKET_KAPSAMI.md) | Merkezi katalog, üretim komutları ve kaynak denetimi |
| [Kaynaklı ders notları](../KAYNAKLI_DERS_NOTLARI.md) | Araştırma betiğinin okuduğu kaynak/rehber ve devir kaydı |
| [Kaynaklı soru analizi](../KAYNAKLI_SORU_ANALIZI.md) | Araştırma betiğinin okuduğu kanıt ve araştırma hafızası |

Son iki dosya `scripts/kaynakli_arastirma_db.py` tarafından doğrudan okunur; yalnız görünümü sadeleştirmek için silinmez. Bu belgelerdeki tarihli sayılar canlı veri yerine geçmez. Kalıcı teknik bilgi bu belgelerde, yapılacak işler yalnız açık adımlarda tutulur.
