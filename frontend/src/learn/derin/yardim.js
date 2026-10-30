// Derin keşif modellerinin ortak metin biçimleri (JSX yok).
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };

/** Türkçe sayı yazımı: eksi işareti “−”, ondalık virgül, binlik boşluk (yalnız 5+ basamaklı tam sayılarda). */
export const show = (n) => {
  const neg = n < 0;
  const abs = Math.abs(n);
  const text = Number.isInteger(abs) && abs >= 10000 ? String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : String(Number(abs.toFixed(4))).replace('.', ',');
  return (neg ? '−' : '') + text;
};
export const sup = (n) => String(n).split('').map((c) => SUP[c] ?? c).join('');
/** Kuvvet: negatif taban parantez içinde, üs üst simgeyle. */
export const power = (base, n) => `${base < 0 ? `(${show(base)})` : show(base)}${sup(n)}`;
