export default function DivisionDiagram({ model: m }) {
  if (m.kind === 'division-place') return <>
    {[2, m.a, 1, 6].map((n, i) => <g key={i}>
      <rect x={20 + i * 116} y="38" width="100" height="85" rx="8" className={m.d === 4 && i < 2 ? 'lm-soft' : 'lm-primary-soft'} />
      <text x={70 + i * 116} y="76" textAnchor="middle" className="lm-large">{n}</text>
      <text x={70 + i * 116} y="105" textAnchor="middle">{['binler', 'yüzler', 'onlar', 'birler'][i]}</text>
    </g>)}
    <text x="240" y="166" textAnchor="middle">{m.d === 4 ? `${20 + m.a} yüzlük → kalan 0` : `2 + ${m.a} + 1 + 6 = ${m.sum}`}</text>
    <text x="240" y="204" textAnchor="middle">{m.d === 4 ? '16 → 4 dolu paket → kalan 0' : `${m.sum} ÷ 9 → kalan ${m.r}`}</text>
    <text x="240" y="250" textAnchor="middle">{m.d === 4 ? 'Son iki basamak yeter' : 'Her rakam katkı yapar'}</text>
  </>;
  if (m.kind === 'division-filters') return <>
    <text x="240" y="32" textAnchor="middle">{m.n} kart · hangi kontrolleri geçiyor?</text>
    {[m.a, m.b, m.product].map((d, i) => <g key={i}>
      <rect x={12 + i * 157} y="65" width="142" height="140" rx="8" className={m.results[i] ? 'lm-good-soft' : 'lm-warn-soft'} />
      <text x={83 + i * 157} y="99" textAnchor="middle">{d} ile böl</text>
      <text x={83 + i * 157} y="138" textAnchor="middle" className="lm-large">{m.results[i] ? '✓ Tam' : `Kalan ${m.n % d}`}</text>
      <text x={83 + i * 157} y="179" textAnchor="middle">{i < 2 ? `${i + 1}. koşul` : 'Çarpım'}</text>
    </g>)}
    <text x="240" y="252" textAnchor="middle">{m.pair === 1 ? 'Ortak 2 çarpanını iki kez sayma' : 'İki koşul da gerekli'}</text>
  </>;
  if (m.kind === 'division-cycle') return <>
    <text x="240" y="34" textAnchor="middle">3 ile çarp · 5 ile kalanını al</text>
    {m.cycle.map((r, i) => <g key={i}>
      <rect x={16 + i * 119} y="67" width="92" height="113" rx="8" className={m.index === i ? 'lm-good-soft' : 'lm-soft'} />
      <text x={62 + i * 119} y="99" textAnchor="middle">{i + 1}. adım</text>
      <text x={62 + i * 119} y="139" textAnchor="middle" className="lm-large">{r}</text>
      {i < 3 && <text x={120 + i * 119} y="132" textAnchor="middle">→</text>}
    </g>)}
    <path d="M419 190 V214 H62 V190" fill="none" className="lm-line" />
    <text x="240" y="254" textAnchor="middle">1 × 3 → yeniden 3</text>
  </>;
  return null;
}
