# Claude ↔ Codex devri

Her iki araç [AGENTS.md](../../AGENTS.md) kurallarını kullanır; [CLAUDE.md](../../CLAUDE.md) yalnız onu içe alır. Devir dosyası geçmiş rapor değildir.

Test seçimi ve kanıt için [TAS-12 tarifini](test-ve-devir.md) kullan:
`python scripts/ivme.py kalite durum TAS-XX` mevcut kanıtı denetler,
`kalite plan TAS-XX` gerekli komutları gösterir. Devirde görev/aşama, mevcut
commit veya diff, rapor yolu, geçen/başarısız/atlanmış testler ve tek sonraki adım
bulunur. Otomatik test geçişi insan/dış ortam kabulünü kapatmaz.

Devam isteği için kısa girdi:

```text
İvme'de docs/devam.md dosyasındaki yarım işe, yoksa sıradaki açık göreve devam et.
```

Başlarken [görev durum tablosundaki](../gorev-durumu.md) ilgili satırı, [devir notundaki](../devam.md) konumu ve yalnız ilgili görev dosyasını aç. Yeni kullanıcı talimatı varsa onu uygula. Değişmeyen girdi ve geçerli kanıtla tamamlanmış işi tekrar yapma.

Her önemli görev/alt adım sonunda, oturum sonunu beklemeden durum satırına tamamlanan kapsamı, gerçek doğrulama sonucunu, çıktı/kanıt bağlantısını ve kalan somut adımı yaz. Kısmi sonuç, engel veya başarısız test de güncellenir; kabul ölçütü eksik iş tamamlandı sayılmaz. İlgili plan ve teknik belgeyi değişen kapsamla eşleştir. Bu güncelleme işin tesliminin parçasıdır.

İş yarıda kalırsa görev kimliği, dosya/öğe kimliği, mevcut çıktı yolu ve bir sonraki komutu devir notuna yaz. Tamamlanan işin kısa durum satırını koru; ayrıntılı geçmişi `git log` veya sürümlü raporda tut. Devir notuna geçmiş liste ekleme. Yeni hata/girdi nedeniyle işi yeniden açarken nedenini ve yalnız tekrar incelenecek kapsamı durum tablosuna yaz.
