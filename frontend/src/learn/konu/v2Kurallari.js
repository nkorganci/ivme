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

export function sinavGecisi(sorular, cevaplar) {
  const yanitlanan = sorular.filter(q => cevaplar[q.id] !== undefined);
  const ilkDogru = sorular.filter(q => cevaplar[q.id] === true);
  const tipler = [...new Set(sorular.map(q => q.tip))];
  const eksikTipler = tipler.filter(t => !ilkDogru.some(q => q.tip === t));
  const oran = sorular.length ? ilkDogru.length / sorular.length : 0;
  return { gecti: sorular.length > 0 && yanitlanan.length === sorular.length && oran >= .8 && !eksikTipler.length, oran, eksikTipler };
}

export const kazanc = (on, son) => on === 100 ? null : (son - on) / (100 - on);
export function paketHazirla(p) {
  return { ...p, duraklar: p.duraklar.map(d => {
    const bloklar = d.bloklar.filter(b => !AYRILAN_OSYM.includes(b.kod));
    const sorular = p.kavramKontrolleri?.[d.id] || [];
    const model = bloklar.find(b => b.tur === 'model');
    for (let i = 0; i < bloklar.length; i++) {
      if (bloklar[i].tur === 'neden') bloklar[i] = { ...bloklar[i], deneyBlok: model };
      if (bloklar[i].tur === 'tipler') bloklar[i] = { ...bloklar[i], tipler: d.tipler };
    }
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
