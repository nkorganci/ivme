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
};

export const hasLab = (conceptId) => Object.hasOwn(LAB_LOADERS, conceptId);

// Ders keşfi → [konu, hedef]: ilgili ders bölümünden doğrudan o hedefin laboratuvarına geçiş.
export const LAB_KESIF = {
  'temel-kavramlar': ['temel-kavramlar', 'sayi-kumeleri'], 'temel-tekcift': ['temel-kavramlar', 'tek-cift'],
  'temel-isaret': ['temel-kavramlar', 'isaret'], 'temel-ardisik': ['temel-kavramlar', 'ardisik'], 'temel-ucdeger': ['temel-kavramlar', 'uc-deger'],
};
