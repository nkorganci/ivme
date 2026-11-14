export function deneyVarsayilanlari(tur) {
  return { v: tur === 'karsilasma' || tur === 'esit-surat' ? 3 : tur === 'sabit-buyuk' ? 100 : 0, a: tur === 'sabit-buyuk' ? 0 : 2, vb: -2, x: 20 };
}
export function deneySenaryosu(tur, s) {
  const iki = ['karsilasma', 'esit-surat'].includes(tur);
  return { T: 8, lessonLayout: true, step: .5, strobe: 1, graphs: ['x', 'v', 'a'], grid: { dt: .5, dv: 1, dx: 1 },
    layers: { strobe: true, arrows: true, area: true, slope: true, disp: true, events: true },
    bodies: [{ id: 'K', label: 'K', name: 'K aracı', tone: 'red', shape: 'car', x0: 0, nodes: [[0, s.v], [8, s.v + (iki ? 0 : s.a) * 8]] },
      ...(iki ? [{ id: 'L', label: 'L', name: 'L aracı', tone: 'blue', shape: 'car', x0: s.x, nodes: [[0, tur === 'esit-surat' ? -s.v : s.vb], [8, tur === 'esit-surat' ? -s.v : s.vb]] }] : [])] };
}
export function esitYolDurumu({ yol, v1, v2 }, zaman = 0) {
  if (![yol,v1,v2].every(n => Number.isFinite(n) && n > 0)) throw new RangeError('Yol ve süratler pozitif olmalı.');
  const t1 = yol/v1, t2 = yol/v2, toplam = t1+t2, t = Math.max(0, Math.min(zaman, toplam));
  const ilkSure = Math.min(t,t1), ikinciSure = Math.max(0,t-t1);
  return { t1, t2, toplam, ilkSure, ikinciSure, konum: ilkSure*v1+ikinciSure*v2, ortalama: 2*yol/toplam };
}
