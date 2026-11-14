// Konu paketi kaydı: kimlik -> tembel yüklenen paket ve soru bağları. Yeni konu bu listeye bir satır ekler.
export const PAKETLER = {
  'fizik-hareket': {
    ders: 'Fizik', baslik: 'Hareket', motor: 'hareket-lab',
    yukle: () => Promise.all([import('./fizik-hareket.js'), import('./fizik-hareket.sorular.json')]).then(([p, s]) => ({ paket: p.default, sorular: s.default })),
  },
};

// Yayımlanmış katalog kimliğinden pakete: konu haritası bu bağla yeni sayfaya yönlendirir.
export const KATEGORI_PAKETI = { 'excel.tyt.fizik.e8dba464c6b583c83c4c': 'fizik-hareket' };
