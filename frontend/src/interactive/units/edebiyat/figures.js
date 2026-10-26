// Benzetme çözümleme (saf işlev): ögelerin varlığına göre teşbih / istiare türü ve örnek cümle.
/** Benzetme ögelerinin varlığına göre sanat adı ve örnek cümle. */
export function figureOf({ benzeyen, benzetilen, yon, edat, ozellik }, inc) {
  const B = benzeyen.trim(); const T = benzetilen.trim(); const Y = yon.trim(); const E = edat.trim() || 'gibi'; const F = ozellik.trim();
  const cap = (x) => x.charAt(0).toLocaleUpperCase('tr') + x.slice(1);
  if (inc.benzeyen && inc.benzetilen) {
    if (inc.yon && inc.edat) return { name: 'Ayrıntılı (tam) teşbih', sentence: `${cap(B)} ${T} ${E} ${Y}.`, why: 'Dört öge de var: benzeyen, benzetilen, benzetme yönü ve edatı.' };
    if (inc.edat) return { name: 'Kısaltılmış teşbih (yönü söylenmemiş)', sentence: `${cap(B)} ${T} ${E}.`, why: 'Benzetme yönü atılmış; temel ögeler (benzeyen, benzetilen) duruyor.' };
    if (inc.yon) return { name: 'Kısaltılmış teşbih (edatı söylenmemiş)', sentence: `${cap(B)} ${Y} bir ${T}.`, why: 'Benzetme edatı atılmış; temel ögeler duruyor.' };
    return { name: 'Teşbih-i beliğ (güçlü benzetme)', sentence: `${cap(B)} bir ${T}.`, why: 'Yalnız iki temel öge kaldı: benzeyen ve benzetilen. En güçlü benzetme.' };
  }
  if (inc.benzetilen && !inc.benzeyen) return { name: 'Açık istiare', sentence: `Bir ${T} ${F || 'göründü'}.`, why: `Yalnız benzetilen (${T}) söylendi; asıl kastedilen benzeyen (${B}) gizli.` };
  if (inc.benzeyen && !inc.benzetilen) return { name: 'Kapalı istiare', sentence: `${cap(B)} ${F || 'parladı'}.`, why: `Yalnız benzeyen (${B}) söylendi; benzetilenin (${T}) bir özelliği (${F || '…'}) ona verildi.` };
  return { name: 'Benzetme yok', sentence: '—', why: 'Temel ögelerden en az biri (benzeyen ya da benzetilen) bulunmalı.' };
}
