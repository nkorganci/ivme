// İklim grafiği çözümleme (saf işlevler). Sınav odaklı, basitleştirilmiş kurallar; gerekçeleriyle döner.
export const MONTHS = ['O', 'Ş', 'M', 'N', 'M', 'H', 'T', 'A', 'E', 'E', 'K', 'A'];

// Yaklaşık aylık normaller (°C, mm). Öğretim amaçlı yuvarlatılmış değerler.
export const CLIMATE_PRESETS = [
  { id: 'antalya', name: 'Antalya', T: [10, 11, 13, 16, 20, 25, 28, 28, 25, 20, 15, 11], P: [230, 150, 90, 50, 30, 10, 5, 5, 15, 70, 170, 250] },
  { id: 'rize', name: 'Rize', T: [7, 7, 8, 12, 16, 20, 23, 23, 20, 16, 12, 9], P: [220, 180, 160, 100, 100, 140, 150, 200, 260, 300, 260, 230] },
  { id: 'ankara', name: 'Ankara', T: [0, 2, 6, 11, 16, 20, 24, 23, 19, 13, 7, 2], P: [40, 35, 40, 45, 50, 35, 15, 10, 20, 30, 35, 45] },
  { id: 'erzurum', name: 'Erzurum', T: [-9, -8, -2, 6, 11, 15, 19, 19, 15, 8, 1, -6], P: [20, 25, 35, 55, 75, 50, 30, 20, 25, 45, 30, 20] },
  { id: 'londra', name: 'Londra', T: [5, 5, 7, 9, 13, 16, 18, 18, 15, 12, 8, 5], P: [55, 40, 40, 45, 50, 45, 45, 50, 50, 70, 60, 55] },
  { id: 'moskova', name: 'Moskova', T: [-7, -6, -1, 6, 13, 17, 19, 17, 11, 5, -1, -5], P: [50, 40, 40, 40, 55, 80, 90, 80, 65, 60, 55, 50] },
  { id: 'singapur', name: 'Singapur', T: [27, 27, 28, 28, 28, 28, 28, 28, 28, 27, 27, 27], P: [240, 160, 180, 170, 170, 140, 150, 150, 170, 190, 250, 290] },
  { id: 'mumbai', name: 'Mumbai', T: [24, 25, 27, 29, 30, 29, 28, 28, 28, 29, 28, 26], P: [1, 1, 0, 1, 10, 500, 840, 560, 330, 70, 10, 2] },
  { id: 'savan', name: 'Savan (Sahel güneyi)', T: [26, 28, 30, 31, 30, 28, 26, 25, 26, 27, 27, 26], P: [0, 0, 5, 20, 80, 150, 220, 260, 170, 40, 5, 0] },
  { id: 'kahire', name: 'Kahire', T: [14, 15, 18, 21, 25, 27, 28, 28, 26, 24, 19, 15], P: [5, 4, 4, 1, 0, 0, 0, 0, 0, 1, 3, 5] },
  { id: 'perth', name: 'Perth (Avustralya)', T: [25, 25, 23, 20, 17, 14, 13, 14, 15, 17, 20, 22], P: [10, 15, 20, 40, 120, 180, 170, 140, 80, 50, 25, 10] },
  { id: 'tundra', name: 'Tundra (Kuzey Kanada)', T: [-28, -29, -27, -18, -6, 3, 7, 6, 0, -9, -19, -25], P: [5, 5, 5, 5, 5, 10, 25, 25, 15, 10, 5, 5] },
];

const sum = (list) => list.reduce((p, v) => p + v, 0);
const avg = (list) => sum(list) / list.length;

/** Ölçüler: ortalama, fark, toplam yağış, yarım küre, mevsimlik yağışlar, Gaussen kurak ayları (P < 2T). */
export function climateMetrics(T, P) {
  const maxT = Math.max(...T); const minT = Math.min(...T);
  const hottest = T.indexOf(maxT);
  const south = [11, 0, 1].includes(hottest);
  const idx = (months) => months.map((m) => (south ? (m + 6) % 12 : m));
  const summer = idx([5, 6, 7]); const winter = idx([11, 0, 1]); const spring = idx([2, 3, 4]); const autumn = idx([8, 9, 10]);
  const seasonP = { kış: sum(winter.map((i) => P[i])), ilkbahar: sum(spring.map((i) => P[i])), yaz: sum(summer.map((i) => P[i])), sonbahar: sum(autumn.map((i) => P[i])) };
  const wettest = Object.entries(seasonP).sort((p, q) => q[1] - p[1])[0][0];
  const driest = Object.entries(seasonP).sort((p, q) => p[1] - q[1])[0][0];
  const dryMonths = T.map((t, i) => (P[i] < 2 * t ? i : -1)).filter((i) => i >= 0);
  return { mean: avg(T), maxT, minT, range: maxT - minT, total: sum(P), hottest, south, seasonP, wettest, driest, dryMonths };
}

/** İklim tipi ve gerekçeleri (sıralı kurallar). */
export function classifyClimate(T, P) {
  const m = climateMetrics(T, P);
  const reasons = [];
  const r = (text) => reasons.push(text);
  let type;
  if (m.maxT < 10) { type = 'Tundra / kutup iklimi'; r(`En sıcak ay bile 10 °C'nin altında (${m.maxT} °C).`); }
  else if (m.total < 250) { type = 'Çöl iklimi'; r(`Yıllık yağış 250 mm'den az (${m.total} mm).`); }
  else if (m.minT >= 18) {
    const everyMonth = P.every((p) => p >= 60);
    if (everyMonth && m.range < 5) { type = 'Ekvatoral iklim'; r('Her ay sıcak (≥ 18 °C) ve yıllık sıcaklık farkı çok küçük.'); r('Her ay yağışlı; konveksiyonel yağış.'); }
    else if (m.total >= 1500 && Math.max(...P) > 300 && m.seasonP.yaz > 0.6 * m.total) { type = 'Muson iklimi'; r('Yazlar aşırı yağışlı, kışlar kurak (rüzgâr yön değiştirir).'); r(`Yıllık yağış yüksek (${m.total} mm), yağışın çoğu yaz mevsiminde.`); }
    else { type = 'Savan iklimi'; r('Her ay sıcak; yağışlı (yaz) ve kurak (kış) mevsim belirgin.'); }
  } else if (m.total < 500 && m.range >= 18) {
    type = m.minT < -5 ? 'Karasal iklim (sert)' : 'Karasal iklim (step / bozkır)';
    r(`Yıllık yağış az (${m.total} mm) ve sıcaklık farkı büyük (${m.range} °C).`);
    if (m.minT < -5) r(`Kışlar çok soğuk (en soğuk ay ${m.minT} °C).`);
    r(`En yağışlı mevsim ${m.wettest}, en kurak mevsim ${m.driest}.`);
  } else if (m.seasonP.yaz < 0.25 * m.seasonP.kış && m.minT > 2) {
    type = 'Akdeniz iklimi'; r('Yazlar sıcak ve kurak, kışlar ılık ve yağışlı.'); r(`Yaz yağışı (${m.seasonP.yaz} mm) kış yağışının (${m.seasonP.kış} mm) çok altında.`);
  } else if (m.minT >= 0 && m.range <= 17 && P.every((p) => p >= 30)) {
    type = m.total >= 1000 ? 'Karadeniz iklimi (ılıman, her mevsim yağışlı)' : 'Ilıman okyanusal iklim';
    r('Her mevsim yağışlı; yazlar serin, kışlar ılık.'); r(`Sıcaklık farkı küçük (${m.range} °C), yıllık yağış ${m.total} mm.`);
  } else if (m.minT < 0 && m.range >= 20) {
    type = 'Nemli karasal iklim'; r(`Kışlar soğuk (${m.minT} °C), yazlar ılık; sıcaklık farkı büyük (${m.range} °C).`); r(`Yağış en çok ${m.wettest} mevsiminde.`);
  } else { type = 'Geçiş (ara) iklim özellikleri'; r('Hiçbir tip ölçütü tam sağlanmıyor; birden çok iklimin özelliğini taşıyor.'); }
  r(`${m.south ? 'Güney' : 'Kuzey'} Yarım Küre: en sıcak ay ${['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][m.hottest]}.`);
  return { type, reasons, metrics: m };
}
