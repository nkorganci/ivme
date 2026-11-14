// Saf kurallar: v1 ilerlemesi v2 kabulü sayılmaz; kanıt ilk denemeyi korur.
export const AYRILAN_OSYM = ['TYT-0910', 'TYT-0912', 'TYT-0913'];
export function secenekSirasi(secenekler, tohum) {
  const hash = s => [...s].reduce((n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  return secenekler.map((s, i) => ({ ...s, id: s.id || `${tohum}-${i}` }))
    .sort((a, b) => hash(`${tohum}:${a.id}`) - hash(`${tohum}:${b.id}`));
}
export function testSonucu(sorular, cevaplar) {
  if (!sorular.every(s => cevaplar[s.id] !== undefined)) return null;
  const dogru = sorular.filter(s => s.secenekler.find(c => c.id === cevaplar[s.id])?.dogru).length;
  return { dogru, toplam: sorular.length, puan: 100 * dogru / sorular.length };
}
export const kazanc = (on, son) => on === 100 ? null : (son - on) / (100 - on);
export function paketHazirla(p) {
  return { ...p, duraklar: p.duraklar.map(d => {
    const bloklar = d.bloklar.filter(b => !AYRILAN_OSYM.includes(b.kod));
    const kodlar = new Set(bloklar.flatMap(b => [b.yanilgi, b.tur === 'yanilgi' ? b.kod : null]).filter(Boolean));
    const havuz = [...p.yanilgilar.filter(y => kodlar.has(y.kod)).flatMap(y => [y.ortayaCikar, y.yenidenSina.soru]),
      ...bloklar.filter(b => b.tur === 'sina').flatMap(b => b.ogeler).flatMap(o => o.secenekler ? [o] : o.tur === 'yargi' ? o.yargilar.map(y => ({ soru: y.metin, secenekler: [{ metin: 'Doğru', dogru: y.dogru, neden: y.neden }, { metin: 'Yanlış', dogru: !y.dogru, neden: y.neden }] })) : [])];
    const sorular = [...new Map(havuz.map(q => [q.soru, q])).values()];
    const yer = bloklar.findIndex(b => b.tur === 'ornek');
    if (yer >= 0 && sorular.length >= 3) bloklar.splice(yer, 0, { tur: 'kavram-kontrol', basamak: 2, sorular });
    return { ...d, bloklar };
  }) };
}
export function dogrulaV2(p) {
  const hatalar = [];
  if (p.surum !== 2) hatalar.push('surum');
  const ys = new Set(p.yanilgilar?.map(y => y.kod));
  const tipler = new Set(p.tipler?.map(t => t.id));
  for (const d of p.duraklar || []) for (const b of d.bloklar || []) {
    if (!b?.tur) hatalar.push(`blok:${d.id}`);
    if (b?.tur === 'yanilgi' && !ys.has(b.kod)) hatalar.push(`yanilgi:${b.kod}`);
    if (AYRILAN_OSYM.includes(b?.kod)) hatalar.push(`ayrilan:${b.kod}`);
  }
  for (const t of p.tipCalismalari || []) if (!tipler.has(t.tip)) hatalar.push(`tip:${t.tip}`);
  return hatalar;
}
