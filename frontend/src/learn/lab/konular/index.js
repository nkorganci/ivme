// Konu laboratuvarı kayıtları. `<kimlik>.js` saf veri ve matematik modelidir (Node testleri doğrudan içe aktarır);
// `../cizim/<kimlik>.jsx` aynı modelin çizimlerini `experiment.view` anahtarıyla verir. Yeni konu buraya eklenir ve
// docs/icerik/matematik-konu-listesi.md lab tablosundaki satırı güncellenir.
//
// Hedef (goal) biçimi: id, label, short, objective (ölçülen beceri), misconception, story (günlük bağlam),
// predict { question, options, insight[] }, experiment { prompt, view, controls, initial, compute, readout,
// target { text, test, example, hint }, diagnose, success }, reasons [{ question, options, answer, feedback[] }],
// proof, rule, condition, trap, transfer [{ id, level, text, options, answer, hints[3], feedback[] }],
// real [{ code, answer, why }] (görseli okunmuş, hedefle eşleşmiş ÖSYM soruları) veya realNote.
// `custom` verilen hedef kendi çalışma alanını kullanır (tek–çift pilotu).
export const LAB_LOADERS = {
  'temel-kavramlar': () => Promise.all([import('./temel-kavramlar.js'), import('../cizim/temel-kavramlar.jsx')]),
  'sayi-basamaklari': () => Promise.all([import('./sayi-basamaklari.js'), import('../cizim/sayi-basamaklari.jsx')]),
  'bolme-bolunebilme': () => Promise.all([import('./bolme-bolunebilme.js'), import('../cizim/bolme-bolunebilme.jsx')]),
  'ebob-ekok': () => Promise.all([import('./ebob-ekok.js'), import('../cizim/ebob-ekok.jsx')]),
  'rasyonel-sayilar': () => Promise.all([import('./rasyonel-sayilar.js'), import('../cizim/rasyonel-sayilar.jsx')]),
  'birinci-derece-denklemler': () => Promise.all([import('./birinci-derece-denklemler.js'), import('../cizim/birinci-derece-denklemler.jsx')]),
  'esitsizlikler': () => Promise.all([import('./esitsizlikler.js'), import('../cizim/esitsizlikler.jsx')]),
  'mutlak-deger': () => Promise.all([import('./mutlak-deger.js'), import('../cizim/mutlak-deger.jsx')]),
  'uslu-ifadeler': () => Promise.all([import('./uslu-ifadeler.js'), import('../cizim/uslu-ifadeler.jsx')]),
  'koklu-ifadeler': () => Promise.all([import('./koklu-ifadeler.js'), import('../cizim/koklu-ifadeler.jsx')]),
};

export const hasLab = (conceptId) => Object.hasOwn(LAB_LOADERS, conceptId);

// Ders keşfi → [konu, hedef]: ilgili ders bölümünden doğrudan o hedefin laboratuvarına geçiş.
export const LAB_KESIF = {
  'temel-kavramlar': ['temel-kavramlar', 'sayi-kumeleri'], 'temel-tekcift': ['temel-kavramlar', 'tek-cift'],
  'temel-isaret': ['temel-kavramlar', 'isaret'], 'temel-ardisik': ['temel-kavramlar', 'ardisik'], 'temel-ucdeger': ['temel-kavramlar', 'uc-deger'],
  'sayi-basamaklari': ['sayi-basamaklari', 'cozumleme'], 'basamak-ters': ['sayi-basamaklari', 'cozumleme'],
  'basamak-ekle': ['sayi-basamaklari', 'yer-degisim'], 'basamak-rakam': ['sayi-basamaklari', 'rakam-kosul'],
  'basamak-sifir': ['sayi-basamaklari', 'basamak-sayisi'], 'basamak-sonrakam': ['sayi-basamaklari', 'basamak-sayisi'],
  'bolme-bolunebilme': ['bolme-bolunebilme', 'bolme-algoritmasi'], 'bolme-basamak': ['bolme-bolunebilme', 'kural'],
  'bolme-bilesik': ['bolme-bolunebilme', 'bilesik'], 'bolme-dongu': ['bolme-bolunebilme', 'kalan-islem'],
  'ebob-ekok': ['ebob-ekok', 'asal-carpan'], 'ebob-bolen': ['ebob-ekok', 'asal-carpan'], 'ebob-venn': ['ebob-ekok', 'ebob-ekok-hesap'],
  'ebob-kare': ['ebob-ekok', 'problem-secim'], 'ekok-zil': ['ebob-ekok', 'periyodik'], 'ebob-takvim': ['ebob-ekok', 'periyodik'],
  'rasyonel-sayilar': ['rasyonel-sayilar', 'kesir-islem'], 'rasyonel-ortakpayda': ['rasyonel-sayilar', 'kesir-islem'],
  'rasyonel-bolme': ['rasyonel-sayilar', 'kesir-islem'], 'rasyonel-virgul': ['rasyonel-sayilar', 'olcek'],
  'rasyonel-devirli': ['rasyonel-sayilar', 'devirli'], 'rasyonel-sayidogrusu': ['rasyonel-sayilar', 'siralama'],
  'birinci-derece-denklemler': ['birinci-derece-denklemler', 'denge'], 'denklem-terazi': ['birinci-derece-denklemler', 'denge'],
  'denklem-ozel': ['birinci-derece-denklemler', 'ozel-durum'], 'denklem-sistem': ['birinci-derece-denklemler', 'sistem'],
  'denklem-jeton': ['birinci-derece-denklemler', 'sistem'],
  'esitsizlikler': ['esitsizlikler', 'aralik'], 'esitsizlik-aralik': ['esitsizlikler', 'aralik'], 'esitsizlik-ayna': ['esitsizlikler', 'yon'],
  'esitsizlik-ifade': ['esitsizlikler', 'aralik-ifade'], 'esitsizlik-bolge': ['esitsizlikler', 'bolge'],
  'mutlak-deger': ['mutlak-deger', 'uzaklik'], 'mutlak-parcali': ['mutlak-deger', 'tanim-acma'], 'mutlak-denklem': ['mutlak-deger', 'uzaklik'],
  'mutlak-bant': ['mutlak-deger', 'bant'], 'mutlak-ortanca': ['mutlak-deger', 'minimum'],
  'uslu-ifadeler': ['uslu-ifadeler', 'negatif-taban'], 'uslu-parantez': ['uslu-ifadeler', 'negatif-taban'],
  'uslu-ortak': ['uslu-ifadeler', 'ortak-paranteze'], 'uslu-buyume': ['uslu-ifadeler', 'siralama'],
  'koklu-ifadeler': ['koklu-ifadeler', 'kok-disi'], 'kok-carpan': ['koklu-ifadeler', 'kok-disi'],
  'kok-eslenik': ['koklu-ifadeler', 'eslenik'], 'kok-denklem': ['koklu-ifadeler', 'denklem'],
};
