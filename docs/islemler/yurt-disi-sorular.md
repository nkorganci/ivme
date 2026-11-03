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
# İsteğe bağlı: metin içeriğine göre yerel model önerisi
..\.venv\Scripts\python.exe -X utf8 scripts/yurt-disi-sorular.py siniflandir-ollama
```
