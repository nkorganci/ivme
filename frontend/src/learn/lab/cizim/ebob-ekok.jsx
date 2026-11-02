// EBOB–EKOK laboratuvarı çizimleri: bölen tablosu, asal çarpan Venn şeması, kare ızgara, zil zaman çizgisi.
function Divisors({ result }) {
  const { a, b, c } = result;
  const cols = b + 1, rows = a + 1;
  const cw = Math.min(46, 300 / cols), rh = Math.min(22, 120 / rows);
  return <svg className="tl-svg" viewBox="0 0 360 170" role="img" aria-label={`${result.n} sayısının bölen tablosu: ${rows} satır, ${cols} sütun, ${c + 1} katman; ${result.count} bölen`}>
    <text x="8" y="14" className="tl-svg-small">{`Satır: 2 üssü 0…${a} · Sütun: 3 üssü 0…${b} · ${c > 0 ? `her hücre × ${c + 1} (5’in kuvvetleri)` : '5 yok'}`}</text>
    {Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => <g key={`${i}-${j}`}>
      <rect x={40 + j * cw} y={22 + i * rh} width={cw - 3} height={rh - 3} rx="4" className="tl-rect" />
      {rh > 14 && cw > 30 && <text x={40 + j * cw + (cw - 3) / 2} y={22 + i * rh + rh / 2 + 2} textAnchor="middle" className="tl-svg-small">{2 ** i * 3 ** j}</text>}
    </g>))}
    <text x="352" y="164" textAnchor="end" className="tl-svg-label">{rows} × {cols} × {c + 1} = {result.count} bölen</text>
  </svg>;
}

function Venn({ result }) {
  const primes = [...new Set([...Object.keys(result.fa), ...Object.keys(result.fb)])].map(Number).sort((x, y) => x - y);
  const left = [], mid = [], right = [];
  for (const p of primes) {
    const ea = result.fa[p] ?? 0, eb = result.fb[p] ?? 0, m = Math.min(ea, eb);
    for (let i = 0; i < m; i++) mid.push(p);
    for (let i = m; i < ea; i++) left.push(p);
    for (let i = m; i < eb; i++) right.push(p);
  }
  const list = (items, x) => items.map((p, i) => <text key={`${x}-${i}`} x={x + (i % 3) * 22} y={70 + Math.floor(i / 3) * 20} textAnchor="middle" className="tl-svg-label">{p}</text>);
  return <svg className="tl-svg" viewBox="0 0 360 170" role="img" aria-label={`a’ya özgü ${left.join(' ') || 'yok'}, ortak ${mid.join(' ') || 'yok'}, b’ye özgü ${right.join(' ') || 'yok'}`}>
    <ellipse cx="130" cy="80" rx="105" ry="62" className="tl-set" /><ellipse cx="230" cy="80" rx="105" ry="62" className="tl-set tl-set-q" />
    <text x="40" y="20" className="tl-svg-small">a = {result.a}</text><text x="320" y="20" textAnchor="end" className="tl-svg-small">b = {result.b}</text>
    {list(left, 62)}{list(mid, 158)}{list(right, 262)}
    <text x="180" y="160" textAnchor="middle" className="tl-svg-label">ortak = EBOB {result.g} · hepsi = EKOK {result.l}</text>
  </svg>;
}

function Tiles({ result }) {
  const { w, h, s, mode, fits } = result;
  if (mode === 'kur') {
    const scale = Math.min(6, 130 / Math.max(s, w));
    return <svg className="tl-svg" viewBox="0 0 360 160" role="img" aria-label={`${s} m kenarlı kare, 18 × 12 tarlalardan ${fits ? 'kuruluyor' : 'kurulamıyor'}`}>
      {Array.from({ length: Math.ceil(s / w) }, (_, i) => Array.from({ length: Math.ceil(s / h) }, (_, j) =>
        <rect key={`${i}-${j}`} x={20 + i * w * scale} y={14 + j * h * scale} width={w * scale - 1} height={h * scale - 1} className="tl-rect" />))}
      <rect x="20" y="14" width={s * scale} height={s * scale} className="tl-boundary" fill="none" style={{ fill: 'none', strokeWidth: 2 }} />
      <text x="200" y="40" className="tl-svg-label">Kare kenarı {s} m</text>
      <text x="200" y="62" className="tl-svg-small">{fits ? `${result.count} tarla ile tam kare` : 'Kesikli kare tarlalarla tam dolmuyor'}</text>
    </svg>;
  }
  const scale = 7;
  return <svg className="tl-svg" viewBox="0 0 360 160" role="img" aria-label={`18 × 12 tarlada ${s} m kareler ${fits ? 'artansız sığıyor' : 'artan bırakıyor'}`}>
    <rect x="20" y="14" width={w * scale} height={h * scale} className="tl-set" />
    {Array.from({ length: Math.floor(w / s) }, (_, i) => Array.from({ length: Math.floor(h / s) }, (_, j) =>
      <rect key={`${i}-${j}`} x={20 + i * s * scale} y={14 + j * s * scale} width={s * scale - 2} height={s * scale - 2} className="tl-rect" />))}
    {!fits && <text x="20" y="112" className="tl-svg-small">Taralı olmayan şerit: artan kalıyor</text>}
    <text x="160" y="40" className="tl-svg-label">18 m × 12 m</text>
    <text x="160" y="62" className="tl-svg-small">{fits ? `${result.count} kare parsel` : `${s} m ortak bölen değil`}</text>
  </svg>;
}

function Bells({ result }) {
  const X = (m) => 20 + (m / 120) * 320;
  const rows = result.periods;
  return <svg className="tl-svg" viewBox="0 0 360 160" role="img" aria-label={`${result.t}. dakika; ${rows.map((p, i) => `${p} dk ${result.ringing[i] ? 'çalıyor' : 'çalmıyor'}`).join(', ')}`}>
    {rows.map((p, i) => <g key={p}>
      <text x="4" y={34 + i * 34} className="tl-svg-small">{p}</text>
      <line x1="20" x2="340" y1={30 + i * 34} y2={30 + i * 34} className="tl-axis" />
      {Array.from({ length: Math.floor(120 / p) + 1 }, (_, k) => <circle key={k} cx={X(k * p)} cy={30 + i * 34} r="4" className={k * p <= result.t ? 'tl-dot-ok' : 'tl-set'} />)}
    </g>)}
    <line x1={X(result.t)} x2={X(result.t)} y1="12" y2={30 + rows.length * 34 - 14} className="tl-mean" />
    <text x={Math.min(330, X(result.t))} y="152" textAnchor="middle" className="tl-svg-label">{result.t}. dk {result.all ? '— hepsi birlikte!' : ''}</text>
  </svg>;
}

export default { divisors: Divisors, venn: Venn, tiles: Tiles, bells: Bells };
