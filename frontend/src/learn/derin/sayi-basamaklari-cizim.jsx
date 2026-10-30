import { C, L, R, T, times } from './svg.jsx';
import { show } from './yardim.js';

/** Onluk (uzun kutu) ve birlik (kare) parçalarıyla iki basamaklı sayı. */
function Blocks({ tens, ones, y, label, tone }) {
  return <g>
    <T x={52} y={y + 26}>{label}</T>
    {times(tens, (i) => <R key={`t${i}`} x={100 + i * 22} y={y} w={18} h={40} rx={3} tone={tone} />)}
    {times(ones, (i) => <R key={`o${i}`} x={108 + tens * 22 + i * 13} y={y + 29} w={10} h={10} rx={2} tone="warn-soft" />)}
  </g>;
}

function Ters({ model: m }) {
  return <>
    <Blocks tens={m.A} ones={m.B} y={22} label={`${m.ab}`} tone="primary-soft" />
    <Blocks tens={m.B} ones={m.A} y={84} label={`${m.ba}`} tone="good-soft" />
    <T x={360} y={16} style={{ fontSize: 12 }}>uzun kutu = 10 · küçük kare = 1</T>
    <R x={30} y={150} w={200} h={96} tone="soft" />
    <T x={130} y={176}>Fark</T>
    <T x={130} y={206} size="large">{`9 × ${show(m.A - m.B)}`}</T>
    <T x={130} y={234}>{`= ${show(m.diff)}`}</T>
    <R x={250} y={150} w={200} h={96} tone="soft" />
    <T x={350} y={176}>Toplam</T>
    <T x={350} y={206} size="large">{`11 × ${m.A + m.B}`}</T>
    <T x={350} y={234}>{`= ${m.sum}`}</T>
    <T x={240} y={276}>Her yer değiştiren rakam 9 değer kazanır ya da kaybeder</T>
  </>;
}

const PLACES = ['binler', 'yüzler', 'onlar', 'birler'];
function Ekle({ model: m }) {
  const cell = (digits, row, tone, highlight) => digits.map((d, i) => {
    const col = 4 - digits.length + i;
    return <g key={`${row}-${i}`}>
      <R x={70 + col * 90} y={row} w={78} h={56} tone={highlight(i) ? 'warn-soft' : tone} />
      <T x={109 + col * 90} y={row + 37} size="large">{d}</T>
    </g>;
  });
  const newDigit = (i) => (m.side === 0 ? i === m.digitsNew.length - 1 : i === 0 && m.d !== 0);
  return <>
    {PLACES.map((p, i) => <T key={p} x={109 + i * 90} y={24} style={{ fontSize: 13 }}>{p}</T>)}
    <T x={36} y={74}>eski</T>
    {cell(m.digitsOld, 40, 'primary-soft', () => false)}
    <T x={36} y={164}>yeni</T>
    {cell(m.digitsNew, 130, 'good-soft', newDigit)}
    {m.side === 0 && m.digitsOld.map((_, i) => {
      const from = 109 + (2 + i) * 90, to = 109 + (1 + i) * 90;
      return <L key={i} x1={from} y1={98} x2={to} y2={128} tone="accent-line" />;
    })}
    <T x={240} y={226}>{m.side === 0 ? 'Eski rakamlar bir basamak sola kaydı: × 10' : 'Eski rakamlar yerinde; yeni basamak açıldı'}</T>
    <T x={240} y={262} size="large">{`Değişim: +${show(m.change)}`}</T>
  </>;
}

function Rakam({ model: m }) {
  const row = (n, y, label, tone) => <g>
    <T x={70} y={y + 34}>{label}</T>
    {String(n).padStart(3, '0').split('').map((d, i) => <g key={i}>
      <R x={150 + i * 76} y={y} w={66} h={54} tone={tone} />
      <T x={183 + i * 76} y={y + 36} size="large">{m.count ? d : '–'}</T>
    </g>)}
  </g>;
  return <>
    <T x={240} y={24}>{`Rakamlar toplamı ${m.S}${m.distinct ? ', rakamlar farklı' : ''}`}</T>
    {['yüzler', 'onlar', 'birler'].map((p, i) => <T key={p} x={183 + i * 76} y={48} style={{ fontSize: 13 }}>{p}</T>)}
    {row(m.smallest, 60, 'en küçük', 'good-soft')}
    {row(m.largest, 136, 'en büyük', 'primary-soft')}
    <T x={240} y={232}>{m.count ? `Koşulu sağlayan ${m.count} üç basamaklı sayı var` : 'Bu koşulu sağlayan üç basamaklı sayı yok'}</T>
    <T x={240} y={266}>{m.count ? 'Küçükte yük sağda, büyükte yük solda' : 'Toplamı veya koşulu değiştir'}</T>
  </>;
}

function Sifir({ model: m }) {
  const twos = Array.from({ length: m.a }, (_, i) => i), fives = Array.from({ length: m.b }, (_, i) => i);
  return <>
    <T x={30} y={52} anchor="start">2’ler</T>
    {twos.map((i) => <g key={`2-${i}`}><C x={110 + i * 38} y={46} r={14} tone={i < m.tens ? 'good-soft' : 'warn-soft'} /><T x={110 + i * 38} y={52}>2</T></g>)}
    <T x={30} y={122} anchor="start">5’ler</T>
    {fives.map((i) => <g key={`5-${i}`}><C x={110 + i * 38} y={116} r={14} tone={i < m.tens ? 'good-soft' : 'warn-soft'} /><T x={110 + i * 38} y={122}>5</T></g>)}
    {times(m.tens, (i) => <L key={i} x1={110 + i * 38} y1={60} x2={110 + i * 38} y2={102} tone="accent-line" />)}
    <T x={240} y={168}>{`${m.tens} eşleşme → ${m.tens} tane 10 → sonda ${m.tens} sıfır`}</T>
    <R x={60} y={186} w={360} h={84} tone="soft" />
    <T x={240} y={216}>{`Artan çarpan ${show(m.rest)} (${m.restDigits} basamak)`}</T>
    <T x={240} y={252} size="large">{`${m.digits} basamaklı`}</T>
  </>;
}

function SonRakam({ model: m }) {
  const w = 74;
  const x0 = 240 - (m.cycle.length * (w + 12)) / 2;
  return <>
    <T x={240} y={28}>{`${m.base} tabanının son rakam döngüsü`}</T>
    {m.cycle.map((d, i) => <g key={i}>
      <R x={x0 + i * (w + 12)} y={44} w={w} h={64} tone={i === m.index ? 'good-soft' : 'soft'} />
      <T x={x0 + i * (w + 12) + w / 2} y={86} size="large">{d}</T>
      <T x={x0 + i * (w + 12) + w / 2} y={126} style={{ fontSize: 12 }}>{`${i + 1}. sıra`}</T>
    </g>)}
    <T x={240} y={162}>{`İlk ${m.n} kuvvetin son rakamları`}</T>
    {m.seq.map((d, i) => <g key={i}>
      <R x={24 + i * 37} y={176} w={32} h={34} rx={4} tone={i === m.n - 1 ? 'warn-soft' : 'primary-soft'} />
      <T x={40 + i * 37} y={199}>{d}</T>
    </g>)}
    <T x={240} y={256} size="large">{`Son rakam: ${m.last}`}</T>
  </>;
}

export const diagrams = { 'basamak-ters': Ters, 'basamak-ekle': Ekle, 'basamak-rakam': Rakam, 'basamak-sifir': Sifir, 'basamak-sonrakam': SonRakam };
