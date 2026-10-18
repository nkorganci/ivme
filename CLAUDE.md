## Tablo kuralları

- Projedeki tüm tablolar için yalnızca AG Grid Community kullan (`ag-grid-community`, `ag-grid-react`).
- Başka tablo kütüphanesi ekleme (TanStack Table, MUI DataGrid, shadcn Table vb.) ve düz `<table>` yazma.
- Her tabloyu `frontend/src/components/DataGrid.jsx` sarmalayıcısı üzerinden çiz. Sıralama, filtreleme, sayfalama ve tema gibi ortak ayarları bu dosyada tut; sayfalarda tekrarlama.
- AG Grid Enterprise özelliklerini kullanma. Bir özelliğin Community sürümünde olup olmadığından emin değilsen önce resmi belgelerde `(e)` işaretini kontrol et.
- Renkleri yalnızca `frontend/src/theme.css` içinde tanımlı değişkenlerden al. Yeni renk ekleme.
