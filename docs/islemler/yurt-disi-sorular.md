# Yurt dışı öğretmenlik sorularını aktarma

Kaynaklar salt okunur; çıktılar `veri/yurt-disi` altında tutulur.
Resmî kapsam: MEB 2026 kılavuzu PDF sayfa 10, basılı sayfa 6, **yazılı sınav**
konuları. Sözlü sınav ve temsil yeteneği tablosu soru ağacına karıştırılmaz.
Geçmiş mevzuat soruları kendi sınav yılı ve özgün cevaplarıyla korunur.

Hat PyMuPDF metin/koordinat çıkarımı ve PNG kırpımı kullanır. Cevaplar PDF
anahtarından alınır; model cevap üretmez. Varsayılan konu eşlemesi kılavuzdaki
resmî dört bölüm ve kitapçık sırasına dayanır. İsteğe bağlı Ollama önerileri
öğretmen onayı değildir. Eksik anahtarlı sorular yayına alınmaz.

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/yurt-disi-sorular.py cikarim
..\.venv\Scripts\python.exe -X utf8 scripts/yurt-disi-sorular.py siniflandir
..\.venv\Scripts\python.exe -X utf8 scripts/yurt-disi-sorular.py yayinla --database ivme
..\.venv\Scripts\python.exe -X utf8 scripts/yurt-disi-sorular.py envanter --database ivme
..\.venv\Scripts\python.exe -X utf8 scripts/yurt-disi-sorular.py kitapciklar --database ivme
..\.venv\Scripts\python.exe -X utf8 scripts/yurt-disi-sorular.py cevap-denetle --database ivme
..\.venv\Scripts\python.exe -X utf8 scripts/yurt-disi-sorular.py kirp
# İsteğe bağlı: metin içeriğine göre yerel model önerisi
..\.venv\Scripts\python.exe -X utf8 scripts/yurt-disi-sorular.py siniflandir-ollama
```

Dersler'in konu takibi ve yıllık dağılımı DB kataloğundan; PDF envanteri
`exam_source_documents` kayıtlarından gelir. Çalışma istatistikleri geçmişteki
`track_id` seçimini, konu sayımları soru sınav kimliğini kullanır. Görsel kaynaklar
yalnız seçili yurt dışı sınavında ve envantere kayıtlı güvenli yollarla açılır.

`kitapciklar` her tarih/kitapçık/oturumu `official_exam_booklets` ve
`official_exam_booklet_questions` tablolarında özgün sırayla saklar. Eski sınav
süresi kapaktan okunur; e-sınav süresi 75 dakikadır. İptaller dışarıda tutulur.
Genel deneme 60 soru/75 dakika ve 18/18/12/12 dağılımındadır. Filtresiz genel pratik
aynı 30/30/20/20 oranını en büyük kalan yöntemiyle soru sayısına uyarlar; konu veya
kişisel filtreyle oluşturulan pratik öğrencinin seçimini uygular.

`cevap-denetle` PDF metin satırlarını ve koordinatlı kelimelerini ayrı okur;
anahtarları, manifesti ve DB'yi karşılaştırır. E-sınavda altı haneli özgün kimlik
kullanılır, sayısal sıralama cevap eşlemesi değildir. İptal sorular etkinleşemez.
Rapor `veri/yurt-disi/cevap-denetimi.json` içindedir; kaynak hash'i ve farklar
saklanır. Bu, resmî anahtara uygunluk kontrolüdür; soruları yeniden çözme değildir.
Seçenek sayısı soru metninden okunur: 2013 kitapçığının 100 sorusunda beş seçenek
vardır. Gövde içindeki yıl/yüzyıl numarası sütun kenarında olmadığı için soru
başlangıcı sayılmaz. Yayın, eksik soru veya seçenek dışında cevap varsa durur.

`kirp`, PDF kaynağından soru bölgesini tekrar çizer; başlık/numara/ayırıcı çizgiyi
dışlar ve beyaz kenarları kırpar. Kopyalar ortak görsel deposundaki
`kirpilmis/yurt-disi/` yolunda sunulur; kaynak PDF ve ilk PNG korunur. Kaynak,
koordinat ve çıktı hash'i eşleşen görsel yeniden üretilmez. Aynı QuestionImage ve
ekran yüksekliği ölçümü YKS/KPSS/yurt dışı soru ve deneme ekranlarında kullanılır.
Ortak metne bağlı soruların her birine ilgili metin eklenir; 2013'teki 4–6. şiir
soruları bu şekilde korunur. Üçgen/harita gibi içerik çizgileri kırpılmaz; yalnız
sayfa ayırıcıları soru alanı dışında bırakılır.
