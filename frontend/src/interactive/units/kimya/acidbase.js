// Çözelti ve asit–baz hesapları (saf işlevler; 25 °C, Kw = 1e-14).
export const KW = 1e-14;
export const SOLUTES = {
  NaCl: { M: 58.5, ions: [['Na⁺', 1], ['Cl⁻', 1]], kind: 'tuz' },
  NaOH: { M: 40, ions: [['Na⁺', 1], ['OH⁻', 1]], kind: 'baz', oh: 1 },
  KOH: { M: 56, ions: [['K⁺', 1], ['OH⁻', 1]], kind: 'baz', oh: 1 },
  HCl: { M: 36.5, ions: [['H⁺', 1], ['Cl⁻', 1]], kind: 'asit', h: 1 },
  HNO3: { M: 63, ions: [['H⁺', 1], ['NO₃⁻', 1]], kind: 'asit', h: 1 },
  H2SO4: { M: 98, ions: [['H⁺', 2], ['SO₄²⁻', 1]], kind: 'asit', h: 2 },
  CaCl2: { M: 111, ions: [['Ca²⁺', 1], ['Cl⁻', 2]], kind: 'tuz' },
  KNO3: { M: 101, ions: [['K⁺', 1], ['NO₃⁻', 1]], kind: 'tuz' },
  'C6H12O6': { M: 180, ions: [], kind: 'molekül (iyonlaşmaz)' },
};

/** Güçlü asit/baz çözeltisinin pH'ı (derişim M, H⁺ ya da OH⁻ katsayısı). */
export function strongPH(kind, molarity, factor = 1) {
  if (molarity <= 0) return 7;
  const c = molarity * factor;
  // Suyun iyonlaşması da hesaba katılır (çok seyreltikte pH 7'ye yaklaşır).
  const x = (c + Math.sqrt(c * c + 4 * KW)) / 2;
  return kind === 'asit' ? -Math.log10(x) : 14 + Math.log10(x);
}

/**
 * Titrasyon: analit (asit HA, Ka; güçlü asit için Ka büyük) ya da güçlü baz; titrant güçlü baz/asit.
 * Yük denkliği sayısal olarak çözülür: [H⁺] + [Na⁺] = [OH⁻] + [A⁻] (+ [Cl⁻]).
 */
export function titrationPH({ analyte, Ca, Va, Cb, Vb, Ka }) {
  const Vt = (Va + Vb) / 1000;
  if (Vt <= 0) return 7;
  let f;
  if (analyte === 'baz') {
    const cNa = (Ca * Va) / 1000 / Vt; const cCl = (Cb * Vb) / 1000 / Vt;
    f = (h) => h + cNa - KW / h - cCl;
  } else {
    const cA = (Ca * Va) / 1000 / Vt; const cNa = (Cb * Vb) / 1000 / Vt;
    const k = analyte === 'guclu' ? 1e8 : Ka;
    f = (h) => h + cNa - KW / h - (cA * k) / (k + h);
  }
  let lo = -15; let hi = 1;
  for (let i = 0; i < 100; i += 1) { const mid = (lo + hi) / 2; if (f(10 ** mid) > 0) hi = mid; else lo = mid; }
  return -((lo + hi) / 2);
}

export const equivalenceVolume = ({ Ca, Va, Cb }) => (Ca * Va) / Cb;

/** Karışım/seyreltme: aynı çözünenden iki çözelti (M, mL). */
export const mixMolarity = (M1, V1, M2, V2) => (V1 + V2 > 0 ? (M1 * V1 + M2 * V2) / (V1 + V2) : 0);

export function indicatorColor(pH) {
  if (pH < 8.2) return { name: 'renksiz', tone: 'none' };
  if (pH < 10) return { name: 'açık pembe', tone: 'pink-light' };
  return { name: 'pembe', tone: 'pink' };
}
