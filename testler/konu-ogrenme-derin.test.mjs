// Pilot derinliğine getirilen derslerin denetimi. Her ders dönüştürüldükçe DERIN listesine eklenir.
// Yapı: en az 8 bölüm, 20 gerekçeli çözümlü örnek, 3 adım tamamlama, 4 etkileşimli keşif, 2 görseli okunmuş gerçek soru.
// Matematik: bölüm keşfi modellerinin değişmezleri ve gerçek soruların bütün olasılıkları tarayan bağımsız çözümü.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLesson } from '../frontend/src/learn/content/parser.js';
import { WORKED_EXAMS } from '../frontend/src/learn/content/worked-exams.js';
import { calculateModel, initialValues } from '../frontend/src/learn/lesson/models.js';

export const DERIN = ['bolme-bolunebilme', 'temel-kavramlar', 'sayi-basamaklari', 'ebob-ekok', 'rasyonel-sayilar', 'birinci-derece-denklemler', 'esitsizlikler', 'mutlak-deger', 'uslu-ifadeler', 'koklu-ifadeler', 'oran-oranti', 'ikinci-derece-denklemler', 'carpanlara-ayirma', 'sayi-kesir-problemleri', 'yas-isci-problemleri', 'yuzde-karisim', 'kar-zarar', 'hareket-problemleri', 'grafik-rutin-olmayan', 'veri-grafikleri', 'merkezi-egilim', 'onermeler'];

const load = (id) => parseLesson(readFileSync(new URL(`../frontend/src/learn/content/dersler/${id}.ders`, import.meta.url), 'utf8'), id);
const model = (id, v = {}) => calculateModel(id, { ...initialValues(id), ...v });
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const even = (n) => n % 2 === 0;

for (const id of DERIN) {
  test(`${id}: pilot derinliği (bölüm, örnek, tamamlama, keşif, gerçek soru)`, () => {
    const lesson = load(id);
    const blocks = lesson.sections.flatMap((s) => s.blocks);
    assert.ok(lesson.sections.length >= 8, `${id}: ${lesson.sections.length} bölüm`);
    assert.ok(blocks.filter((b) => b.type === 'worked').length >= 20, `${id}: çözümlü örnek az`);
    assert.ok(blocks.filter((b) => b.type === 'faded').length >= 3, `${id}: adım tamamlama az`);
    assert.ok(new Set(blocks.filter((b) => b.type === 'exploration').map((b) => b.conceptId)).size >= 4, `${id}: keşif az`);
    const exams = blocks.filter((b) => b.type === 'past_question' && WORKED_EXAMS[b.code]);
    assert.ok(exams.length >= 2, `${id}: görseli incelenmiş gerçek soru az`);
    for (const e of exams) assert.equal(WORKED_EXAMS[e.code].conceptId, id);
  });
}

test('temel-kavramlar: keşif modelleri sayılarla aynı şeyi söyler', () => {
  for (const a of range(1, 9)) for (const b of range(1, 9)) for (const op of [0, 1, 2]) {
    const m = model('temel-tekcift', { a, b, op });
    const r = [a + b, a - b, a * b][op];
    assert.equal(m.result, r); assert.equal(m.even, even(r));
  }
  for (const base of [-3, -2, -1, 0, 2]) for (const n of range(1, 6)) {
    const m = model('temel-isaret', { base, n });
    assert.equal(m.value, base ** n);
    if (base < 0) assert.equal(m.value > 0, even(n));
  }
  for (const a of range(1, 10)) for (const r of range(1, 5)) for (const n of range(2, 10)) {
    const m = model('temel-ardisik', { a, r, n });
    assert.equal(m.sum, m.terms.reduce((s, t) => s + t, 0));
    assert.equal((m.last - a) / r + 1, n);
  }
  for (const x of range(1, 11)) {
    const m = model('temel-ucdeger', { x });
    assert.equal(m.area, 36 - (x - 6) ** 2); assert.ok(m.area <= 36);
  }
});

test('mutlak değer: parçalı toplam, tek geçerli kök, açık/kapalı bant ve ortanca', () => {
  for (const x of range(-6,8)) {
    const m=model('mutlak-parcali',{x});
    assert.equal(m.total, x < -2 ? 2-2*x : x <= 4 ? 6 : 2*x-2);
    assert.equal(m.total,m.left+m.right);
  }
  for (const b of range(-10,4)) {
    const m=model('mutlak-denklem',{b});
    const expected=b<=-8 ? -4-b : (4-b)/3;
    assert.deepEqual(m.accepted,[expected]);
    assert.ok(Math.abs(Math.abs(expected-4)-2*expected-b)<1e-9);
  }
  for(const m of range(-4,4)) for(const r of range(0,5)) for(const op of range(0,3)) {
    const actual=model('mutlak-bant',{m,r,op});
    const within=(x)=>x>m-r && x<m+r, closed=(x)=>x>=m-r && x<=m+r;
    const expected=range(-10,10).filter((x)=>[within(x),closed(x),!closed(x),!within(x)][op]);
    assert.deepEqual(actual.points,expected);
  }
  for(const c of range(2,9)) {
    const values=range(-6,10).map((x)=>model('mutlak-ortanca',{x,c}));
    assert.equal(Math.min(...values.map((m)=>m.total)),c+3);
    assert.ok(values.every((m)=>m.total>=m.minimum));
    assert.equal(values.find((m)=>m.x===1).total,c+3);
  }
  const A=range(1,30).filter((a)=>[a/2,-a/2].some((x)=>Math.abs(x-a)===6));
  assert.deepEqual(A,[4,12]); assert.equal(A.reduce((a,b)=>a+b,0),16);
  for(let t=-10;t<=25;t+=.25) {
    assert.equal(Math.abs(t-13)<=2,t>=11&&t<=15);
    const goodA=t>-6&&t<4,goodB=t>6&&t<20;
    if([-1,0,3,5,7].includes(t)) assert.equal(!goodA&&!goodB,t===5);
  }
});

test('üslü ifadeler: işaret, toplamda ortak çarpan, tur sayısı ve gerçek örnekler', () => {
  for(const n of range(1,6)) {
    const m=model('uslu-parantez',{n});
    assert.equal(m.inside,m.factors.reduce((a,b)=>a*b,1));
    assert.equal(m.outside,-Number(2n**BigInt(n)));
  }
  for(const n of range(0,5)) for(const d of range(0,3)) {
    const m=model('uslu-ortak',{n,d});
    assert.equal(m.total,Number(2n**BigInt(n)+2n**BigInt(n+d)));
    assert.equal(m.common*(1+m.multiplier),m.total);
  }
  for(const a of [2,3]) for(const n of range(0,6)) {
    const m=model('uslu-buyume',{a,n});
    assert.equal(m.points[0].exp,1);
    for(let i=1;i<m.points.length;i++) {
      assert.equal(m.points[i].exp/m.points[i-1].exp,a);
      assert.equal(m.points[i].linear-m.points[i-1].linear,2);
    }
  }
  let pieces=1; for(let i=0;i<4;i++) pieces*=3;
  assert.equal(pieces,81);
  let players=1000000; for(let i=0;i<6;i++) players-=players/5;
  assert.equal(players,2**18);
  assert.equal(81*16*(35+1),6**6);
  const choices=[[1,2,3],[2,1,3],[2,2,2],[3,0,3],[3,2,1]];
  assert.deepEqual(choices.map(([a,b,c])=>a**(b**c)!==(a**b)**c),[false,true,false,false,false]);
});

test('köklü ifadeler: tam kare çarpanı, eşlenik, tanım koşulu ve gerçek sorular', () => {
  for(const n of range(1,80)) {
    const m=model('kok-carpan',{n});
    assert.equal(m.s*m.s*m.r,n);
    for(let p=2;p*p<=m.r;p++) assert.notEqual(m.r%(p*p),0);
    assert.ok(Math.abs(m.s*Math.sqrt(m.r)-Math.sqrt(n))<1e-12);
  }
  for(const pair of range(0,3)) {
    const m=model('kok-eslenik',{pair});
    assert.ok(Math.abs(m.long*m.short-m.area)<1e-12);
    assert.ok(m.short>0);
    assert.ok(Math.abs(1/m.short-m.long/m.area)<1e-12);
  }
  for(const c of range(1,6)) for(const d of range(0,3)) {
    const m=model('kok-denklem',{c,d});
    assert.equal(m.accepted.length,1);
    for(const x of m.candidates) assert.ok(Math.abs(x+c-(x-d)**2)<1e-10);
    const root=m.accepted[0];
    assert.ok(root>=d && root+c>=0);
    assert.ok(Math.abs(Math.sqrt(root+c)-(root-d))<1e-10);
    assert.ok(m.candidates.filter((x)=>!m.accepted.includes(x)).every((x)=>x<d));
  }
  assert.equal(Math.sqrt(9/16)*16-9,3);
  const a=Math.sqrt(10)+Math.sqrt(6),b=Math.sqrt(10)-Math.sqrt(6);
  assert.ok(Math.abs(a/b-a*b-Math.sqrt(15))<1e-12);
});

test('ikinci derece: alan, sıfır çarpımı, diskriminant, Vieta ve özgün AYT çözümleri', () => {
  for(const x of range(1,8)) {
    const m=model('ikinci-derece-denklemler',{x});
    assert.equal(m.area,x*x+2*x);
    assert.equal(m.area===24,x===4);
  }
  for(const r of range(-4,4)) for(const s of range(-4,4)) {
    const m=model('ikinci-carpan',{r,s});
    assert.deepEqual(m.roots,[...new Set([r,s])].sort((a,b)=>a-b));
    for(const [x,y] of m.points) assert.ok(Math.abs(y-(x-r)*(x-s))<1e-10);
    const v=model('ikinci-vieta',{r,s});
    assert.equal(v.S*v.S-2*v.P,r*r+s*s);
    if(r&&s) assert.ok(Math.abs(v.reciprocal-(1/r+1/s))<1e-12);
    else assert.equal(v.reciprocal,null);
  }
  for(const a of [-2,-1,1,2]) for(const b of range(-6,6)) for(const c of range(-3,6)) {
    const m=model('ikinci-delta',{a,b,c});
    const vertexValue=c-b*b/(4*a);
    const crosses=a>0 ? vertexValue<0 : vertexValue>0;
    assert.equal(m.roots.length,vertexValue===0?1:crosses?2:0);
    for(const root of m.roots) {
      assert.ok(root>=m.lo&&root<=m.hi,'kök grafik penceresinin içinde');
      assert.ok(Math.abs(a*root*root+b*root+c)<1e-9);
    }
  }
  const ratios=new Set();
  for(const m of range(-12,12).filter(Boolean)) for(const n of range(-24,24).filter(Boolean)) if(m!==n) {
    const x=m-n;
    if(x*x+(m+1)*x+n-m===0) ratios.add(n/m);
  }
  assert.deepEqual([...ratios],[2]);
  // 2020 AYT: a,b>0; önce çarpım a²=4 verir. Pozitiflik a=2 dalını seçer.
  const a=2,b=8;
  assert.equal(a+b,5*b/(2*a)); assert.equal(a*b,8*b/(2*a));
  assert.equal(2*a*a*a-5*b*a+8*b,0);
  assert.equal(2*a*b*b-5*b*b+8*b,0);
  const cs=[(23-Math.sqrt(17))/32,(23+Math.sqrt(17))/32];
  for(const c of cs) {
    const d=4-4*c;
    assert.ok(d>=0 && Math.abs(d*d-2*d+c)<1e-12);
  }
  assert.ok(Math.abs(cs[0]*cs[1]-.5)<1e-12);
  for(const [code,answer] of [['AYT_Sayisal-0097','A'],['AYT_Sayisal-0099','C'],['AYT_Sayisal-0102','D']]) {
    assert.equal(WORKED_EXAMS[code].answer,answer);
    assert.ok(load('ikinci-derece-denklemler').practiceIds.includes(code));
  }
});

test('oran-orantı: korunan bölüm/çarpım, bütünü koruyan paylar, birim verim', () => {
  for(const x of range(1,8)) {
    const m=model('oran-tur',{x});
    assert.equal(m.direct/x,3); assert.equal(m.inverse*x,24);
  }
  for(const k of range(1,4)) {
    const m=model('oran-pay',{k});
    assert.equal(m.direct.reduce((a,b)=>a+b,0),m.total);
    assert.equal(m.inverse.reduce((a,b)=>a+b,0),m.total);
    for(const [i,w] of [2,3,6].entries()) {
      assert.equal(m.direct[i]/w,6*k); assert.equal(m.inverse[i]*w,66*k);
    }
  }
  for(const w of range(2,6)) for(const h of range(2,8)) for(const d of range(1,5)) {
    const m=model('oran-bilesik',{w,h,d});
    let count=0;
    for(let day=0;day<d;day++) for(let worker=0;worker<w;worker++) for(let hour=0;hour<h;hour++) count+=2;
    assert.equal(m.total,count);
    assert.equal(m.total,m.cells*m.perCell);
  }
  const boxes=[18,24,36];
  const common=range(0,18).filter((n)=>boxes.some((b)=>n/b===1/2)&&boxes.some((b)=>n/b===1/3));
  assert.deepEqual(common,[12]); assert.equal(3*common[0],36);
  const areas=[];
  for(const x of range(1,150)) if(110+10===(4/3)*(70+2*10)&&110+10===(4/3)*(x+3*10)) areas.push(x);
  assert.deepEqual(areas,[60]);
  for(const [code,answer] of [['TYT-0605','A'],['TYT-0608','B'],['TYT-0618','D'],['TYT-0630','E'],['TYT-0632','B'],['TYT-0634','C'],['TYT-0644','B'],['TYT-0633','C'],['TYT-0637','B'],['TYT-0680','E'],['TYT-0740','E']]) {
    assert.equal(WORKED_EXAMS[code].answer,answer);
    assert.ok(load(WORKED_EXAMS[code].conceptId).practiceIds.includes(code));
  }
});

test('temel-kavramlar: gerçek soruların bağımsız taraması', () => {
  // TYT-0554: üç ifadeden ikisi tek, biri çift → II ve III her zaman çift, I her zaman tek.
  const ok554 = [];
  for (const a of range(-12, 12)) for (const b of range(-12, 12)) {
    const odd = [a + 5 * b, 2 * a + 3 * b, 3 * a + b].filter((v) => !even(v)).length;
    if (odd === 2) ok554.push([a, b]);
  }
  assert.ok(ok554.length > 50);
  assert.ok(ok554.every(([a, b]) => !even(a + b) && even(2 * a + b) && even(a * b)));
  // TYT-0582: (a+b)/c çift tam sayı, (a+c)/b tek tam sayı → I ve III her zaman çift; II değil.
  const ok582 = [];
  for (const a of range(1, 40)) for (const b of range(1, 40)) for (const c of range(1, 40)) {
    if ((a + b) % c === 0 && even((a + b) / c) && (a + c) % b === 0 && !even((a + c) / b)) ok582.push([a, b, c]);
  }
  assert.ok(ok582.every(([a, b, c]) => even(a + b + c) && even(a * b * c)));
  assert.ok(ok582.some(([a, b, c]) => !even(a * (b + c))));
  // AYT_Sayisal-0012: a−b<0<c<c−b → I ve III her zaman; II bazen.
  const ok12 = [];
  for (const a of range(-8, 8)) for (const b of range(-8, 8)) for (const c of range(-8, 8)) if (a - b < 0 && 0 < c && c < c - b) ok12.push([a, b, c]);
  assert.ok(ok12.every(([a, b, c]) => a * b * c > 0 && b - a + c > 0));
  assert.ok(ok12.some(([a, b, c]) => (a + c) * b > 0) && ok12.some(([a, b, c]) => (a + c) * b < 0));
  // TYT-0588: A÷B = A−B = 3 → A·B − (A+B) = 3/4.
  const B = 3 / 2, A = 3 * B;
  assert.equal(A / B, 3); assert.equal(A - B, 3); assert.equal(A * B - (A + B), 0.75);
  for (const [code, answer] of [['TYT-0554', 'E'], ['TYT-0582', 'D'], ['AYT_Sayisal-0012', 'D'], ['TYT-0588', 'E']]) assert.equal(WORKED_EXAMS[code].answer, answer);
});

test('sayi-basamaklari: keşif modelleri ve gerçek soruların bağımsız taraması', () => {
  for (const A of range(1, 9)) for (const B of range(1, 9)) {
    const m = model('basamak-ters', { A, B });
    assert.equal(m.diff, 9 * (A - B)); assert.equal(m.sum, 11 * (A + B));
  }
  for (const x of range(10, 99)) for (const d of range(0, 9)) {
    assert.equal(model('basamak-ekle', { x, d, side: 0 }).result, Number(`${x}${d}`));
    assert.equal(model('basamak-ekle', { x, d, side: 1 }).result, Number(`${d}${x}`));
  }
  for (const S of range(1, 27)) for (const distinct of [0, 1]) {
    const ok = range(100, 999).filter((n) => { const ds = String(n).split('').map(Number); return ds[0] + ds[1] + ds[2] === S && (!distinct || new Set(ds).size === 3); });
    const m = model('basamak-rakam', { S, distinct });
    assert.equal(m.count, ok.length);
    if (ok.length) { assert.equal(m.smallest, ok[0]); assert.equal(m.largest, ok.at(-1)); }
  }
  for (const a of range(0, 9)) for (const b of range(0, 9)) {
    const n = 2 ** a * 5 ** b, m = model('basamak-sifir', { a, b });
    assert.equal(m.number, n); assert.equal(m.digits, String(n).length);
    assert.equal(String(n).length - String(n).replace(/0+$/, '').length, Math.min(a, b));
  }
  for (const base of range(2, 9)) for (const n of range(1, 12)) assert.equal(model('basamak-sonrakam', { base, n }).last, Number(BigInt(base) ** BigInt(n) % 10n));
  const rows = [];
  for (const A of range(0, 9)) for (const B of range(0, 9)) if (11 + 42 + 23 + 10 * A + 2 === 10 * B + 4 + 30 + B + 10 + A + 51) rows.push([A, B]);
  assert.deepEqual(rows, [[8, 5]]); assert.equal(85 + 58, 143);
  const abc = [];
  for (const A of range(1, 9)) for (const B of range(1, 9)) for (const C of range(1, 9)) if (new Set([A, B, C]).size === 3 && 10 * A + B + 10 * B + C === 10 * C + A - 1) abc.push(100 * A + 10 * B + C);
  assert.deepEqual(abc, [146, 247, 348]);
  let s = '123';
  const seen = [];
  for (let step = 1; step <= 75; step++) { s = step % 2 ? s[1] + s[0] + s[2] : s[0] + s[2] + s[1]; seen.push(s); }
  assert.equal(seen[5], '123'); assert.equal(s, '321');
  for (const [code, answer] of [['TYT-0578', 'E'], ['TYT-0573', 'C'], ['AYT_Sayisal-0006', 'A']]) assert.equal(WORKED_EXAMS[code].answer, answer);
});

test('ebob-ekok: keşif modelleri ve gerçek soruların bağımsız taraması', () => {
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const lcm = (a, b) => (a * b) / gcd(a, b);
  for (const n of [12, 16, 18, 24, 30, 36, 48, 60, 64, 100]) {
    const m = model('ebob-bolen', { n });
    assert.equal(m.count, range(1, n).filter((d) => n % d === 0).length);
    assert.equal(m.square, Number.isInteger(Math.sqrt(n))); assert.equal(m.count % 2 === 1, m.square);
  }
  for (const a of [12, 18, 24, 36, 40, 45, 60, 72, 90]) for (const b of [12, 18, 24, 35, 36, 40, 45, 60, 90]) {
    const m = model('ebob-venn', { a, b });
    assert.equal(m.ebob, gcd(a, b)); assert.equal(m.ekok, lcm(a, b)); assert.equal(m.ebob * m.ekok, a * b);
  }
  for (const shape of [0, 1, 2]) for (const s of range(1, 10)) {
    const m = model('ebob-kare', { shape, s });
    assert.equal(m.fits, m.w % s === 0 && m.h % s === 0);
    if (m.fits) assert.equal(m.tiles * s * s, m.w * m.h);
    assert.equal(m.g, gcd(m.w, m.h));
  }
  for (const a of range(2, 9)) for (const b of range(2, 9)) {
    const m = model('ekok-zil', { a, b });
    assert.equal(m.l, lcm(a, b));
    assert.deepEqual(m.together, range(0, m.T).filter((t) => t % a === 0 && t % b === 0));
  }
  for (const start of range(0, 6)) for (const n of range(0, 100)) assert.equal(model('ebob-takvim', { start, n }).end, (start + n) % 7);
  // AYT_Sayisal-0018: EBOB + EKOK = 289 ve m + n ≠ 289 → m + n = 41.
  const sums = new Set();
  for (const m of range(1, 289)) for (const n of range(1, 289)) if (gcd(m, n) + lcm(m, n) === 289 && m + n !== 289) sums.add(m + n);
  assert.deepEqual([...sums], [41]);
  // AYT_Sayisal-0035: M = 6^a·5^b, N = 10^c·9^d; EBOB = 2³·3²·5, EKOK = 2⁵·3³·5⁵ → a+b+c+d = 10.
  const g = (x, y) => (y ? g(y, x % y) : x);
  const totals = new Set();
  for (const a of range(1, 8)) for (const b of range(1, 8)) for (const c of range(1, 8)) for (const d of range(1, 8)) {
    const M = 6n ** BigInt(a) * 5n ** BigInt(b), N = 10n ** BigInt(c) * 9n ** BigInt(d), e = g(M, N);
    if (e === 360n && (M * N) / e === 2700000n) totals.add(a + b + c + d);
  }
  assert.deepEqual([...totals], [10]);
  for (const [code, answer] of [['AYT_Sayisal-0018', 'A'], ['AYT_Sayisal-0035', 'C']]) assert.equal(WORKED_EXAMS[code].answer, answer);
});

test('rasyonel-sayilar: keşif modelleri ve gerçek soruların bağımsız taraması', () => {
  for (const f of range(0, 9)) for (const g of range(0, 9)) for (const op of [0, 1]) {
    const m = model('rasyonel-ortakpayda', { f, g, op });
    const exact = op ? Math.abs(m.a * m.d - m.c * m.b) : m.a * m.d + m.c * m.b;
    assert.equal(m.R * m.b * m.d, exact * m.l);
    assert.equal(m.l % m.b, 0); assert.equal(m.l % m.d, 0);
  }
  for (const f of range(0, 4)) for (const g of range(0, 5)) {
    const m = model('rasyonel-bolme', { f, g });
    assert.equal(m.whole * m.den + m.rest, m.a * m.d); assert.equal(m.den, m.b * m.c);
    assert.ok(m.rest >= 0 && m.rest < m.den);
  }
  for (const x of range(0, 4)) for (const k of range(-3, 3)) {
    const m = model('rasyonel-virgul', { x, k });
    const num = (t) => Number(t.replace(',', '.'));
    assert.ok(Math.abs(num(m.to) - num(m.from) * 10 ** k) < 1e-9 * Math.max(1, num(m.to)));
  }
  const twoFive = (n) => { while (n % 2 === 0) n /= 2; while (n % 5 === 0) n /= 5; return n === 1; };
  for (const a of range(1, 12)) for (const n of range(0, 11)) {
    const m = model('rasyonel-devirli', { a, n });
    assert.equal(m.finite, twoFive(m.q));
    const head = m.finite ? m.digits : m.digits.slice(0, m.start), cyc = m.finite ? [] : m.digits.slice(m.start);
    let value = m.whole + head.reduce((s, d, i) => s + d / 10 ** (i + 1), 0);
    if (cyc.length) value += Number(cyc.join('')) / (10 ** head.length * (10 ** cyc.length - 1));
    assert.ok(Math.abs(value - m.p / m.q) < 1e-12, `${a}/${m.q}`);
    if (!m.finite) assert.ok(cyc.length <= m.q - 1);
  }
  for (const a of range(1, 15)) for (const b of range(2, 15)) for (const [c, d] of [[3, 4], [5, 7], [11, 14], [1, 2]]) {
    const m = model('rasyonel-sayidogrusu', { a, b, c, d });
    assert.equal(m.cmp, a / b > c / d + 1e-12 ? '>' : a / b < c / d - 1e-12 ? '<' : '=');
    assert.ok(m.mid >= Math.min(m.x, m.y) - 1e-12 && m.mid <= Math.max(m.x, m.y) + 1e-12);
  }
  // TYT-0574: toplamı 1 olan iki ikili kurulunca dışarıda kalan sayı.
  const list = [[1, 3], [1, 6], [6, 8], [8, 12], [9, 36]];
  const one = ([p, q], [r, s]) => p * s + r * q === q * s;
  const left = list.filter((x, i) => { const rest = list.filter((_, j) => j !== i); return one(rest[0], rest[1]) && one(rest[2], rest[3]) || one(rest[0], rest[2]) && one(rest[1], rest[3]) || one(rest[0], rest[3]) && one(rest[1], rest[2]); });
  assert.deepEqual(left, [[1, 6]]);
  // TYT-0557: kuruşla hesap; para üstü 20 kuruş.
  assert.equal(1000 - (5 * 99 + 110 + 3 * 125), 20);
  // TYT-0566: A, B, C delikleri 1., 3. ve 6. delik; milimetreyle.
  const gap = (781 - 743) / 2;
  assert.equal(743 + 5 * gap, 838);
  // TYT-0562: leke 1,2 m ile 4/3 m arasında; seçeneklerden yalnız 1,3.
  assert.deepEqual([11, 13, 14, 16, 17].filter((t) => t > 12 && 3 * t < 40), [13]);
  for (const [code, answer] of [['TYT-0574', 'A'], ['TYT-0557', 'A'], ['TYT-0566', 'B'], ['TYT-0562', 'B']]) assert.equal(WORKED_EXAMS[code].answer, answer);
});

test('birinci-derece-denklemler: keşif modelleri ve gerçek soruların bağımsız taraması', () => {
  for (const a of range(1, 5)) for (const b of range(0, 12)) for (const c of range(0, 4)) for (const d of range(0, 24)) {
    const m = model('denklem-terazi', { a, b, c, d });
    if (a === c) { assert.equal(m.root, null); assert.equal(m.all, b === d); continue; }
    assert.ok(Math.abs(a * m.root + b - (c * m.root + d)) < 1e-9);
  }
  for (const a of range(-3, 3)) for (const b of range(-4, 4)) {
    const m = model('denklem-ozel', { a, b });
    if (a) { assert.equal(m.sol, 'tek'); assert.ok(Math.abs(a * m.root - b) < 1e-12); } else assert.equal(m.sol, b === 0 ? 'sonsuz' : 'yok');
  }
  for (const s of range(2, 10)) for (const k of range(-3, 3)) for (const c of range(-6, 8)) {
    const m = model('denklem-sistem', { s, k, c });
    if (k === -1) { assert.equal(m.x, null); assert.equal(m.same, c === -s); continue; }
    assert.ok(Math.abs(m.x + m.y - s) < 1e-9 && Math.abs(k * m.x - m.y - c) < 1e-9);
  }
  for (const sc of [0, 1, 2]) for (const g of range(0, 20)) {
    const m = model('denklem-jeton', { sc, g });
    const sol = range(0, m.s.N).filter((x) => x * m.s.q + (m.s.N - x) * m.s.p === m.s.T);
    assert.deepEqual(sol, [m.answer]);
    assert.equal(m.g + m.diff / m.step, m.answer);
  }
  // TYT-0604: B'den bir ağırlık (20 ya da 25) A'ya geçer, B'ye seçeneklerden biri eklenir; denge korunur.
  const added = [10, 15, 30, 35, 40].filter((x) => [20, 25].some((w) => 45 + w === 45 - w + x));
  assert.deepEqual(added, [40]);
  // TYT-0607: 3 bardak + 1 fincan = 2 bardak + 3 fincan; şişe kaç fincan?
  const cups = [];
  for (const b of range(1, 30)) for (const f of range(1, 30)) if (3 * b + f === 2 * b + 3 * f) cups.push((3 * b + f) / f);
  assert.deepEqual([...new Set(cups)], [7]);
  // TYT-0611: |bina − ağaç| = 8, ağaç iki katına çıkınca fark 3; bina yüksekliği adayları.
  const heights = new Set();
  for (let a = 0.5; a <= 40; a += 0.5) for (const b of [a + 8, a - 8]) if (b > 0 && Math.abs(b - 2 * a) === 3) heights.add(b);
  assert.deepEqual([...heights].sort((x, y) => x - y), [13, 19]);
  for (const [code, answer] of [['TYT-0604', 'E'], ['TYT-0607', 'B'], ['TYT-0611', 'C']]) assert.equal(WORKED_EXAMS[code].answer, answer);
});

test('esitsizlikler: keşif modelleri ve gerçek soruların bağımsız taraması', () => {
  for (const a of range(-5, 5)) for (const b of range(-5, 5)) for (const k of range(-3, 3)) {
    const m = model('esitsizlik-ayna', { a, b, k });
    assert.equal(m.flipped, k < 0 && a !== b);
  }
  // Kesişim gösterimi, yarım adımlarla taranan üyelikle aynı olmalı.
  const member = (cap, x) => {
    if (cap === '∅') return false;
    if (cap.startsWith('{')) return x === Number(cap.slice(1, -1).replace('−', '-'));
    const [lo, hi] = cap.slice(1, -1).split(', ').map((t) => Number(t.replace('−', '-')));
    return (cap[0] === '[' ? x >= lo : x > lo) && (cap.at(-1) === ']' ? x <= hi : x < hi);
  };
  for (const p of range(-4, 4)) for (const q of range(-4, 4)) for (const r of range(-4, 4)) for (const s of range(-4, 4)) {
    const m = model('esitsizlik-aralik', { p, q, r, s });
    for (let x = -6; x <= 6; x += 0.5) assert.equal(member(m.cap, x), p <= x && x < q && r < x && x <= s, `${p} ${q} ${r} ${s} ${x} ${m.cap}`);
  }
  for (const a1 of range(-3, 3)) for (const a2 of range(-3, 3)) for (const b1 of range(-3, 3)) for (const b2 of range(-3, 3)) for (const op of range(0, 3)) {
    const m = model('esitsizlik-ifade', { a1, a2, b1, b2, op });
    const vals = [];
    for (let a = Math.min(a1, a2); a <= Math.max(a1, a2) + 1e-9; a += 0.25) for (let b = Math.min(b1, b2); b <= Math.max(b1, b2) + 1e-9; b += 0.25) vals.push([(x, y) => x + y, (x, y) => x - y, (x, y) => x * y, (x, y) => 2 * x - 3 * y][op](a, b));
    assert.ok(Math.abs(Math.min(...vals) - m.min) < 1e-9 && Math.abs(Math.max(...vals) - m.max) < 1e-9);
  }
  for (const a of range(1, 4)) for (const b of range(1, 4)) for (const c of range(4, 16)) for (const strict of [0, 1]) for (const zero of [0, 1]) {
    const m = model('esitsizlik-bolge', { a, b, c, strict, zero });
    let n = 0;
    for (let x = 1 - zero; x <= 16; x++) for (let y = 1 - zero; y <= 16; y++) if (strict ? a * x + b * y < c : a * x + b * y <= c) n++;
    assert.equal(m.count, n);
    assert.ok(m.points.every(([x,y]) => x <= m.xMax && y <= m.yMax));
  }
  assert.equal(model('esitsizlik-bolge', { a:1, b:1, c:16, strict:0, zero:1 }).count, 153);
  // TYT-0614: S + Ç = K, Ç + M > K, M + S ≤ K → S < M ≤ Ç her zaman.
  for (const S of range(1, 12)) for (const M of range(1, 12)) for (const C of range(1, 12)) {
    const K = S + C;
    if (C + M > K && M + S <= K) assert.ok(S < M && M <= C);
  }
  // TYT-0620: a > ab > 2a > ac → a < 0, 1 < b < 2, c > 2.
  for (let a = -3; a <= 3; a += 0.5) for (let b = -3; b <= 3; b += 0.25) for (let c = -3; c <= 4; c += 0.25) {
    if (a > a * b && a * b > 2 * a && 2 * a > a * c) assert.ok(a < 0 && b > 1 && b < 2 && c > 2);
  }
  // TYT-0613: K = 1 + t, L = 2 − t, 0 < t < 1/2 → 2 < KL < 2,25.
  for (let t = 0.01; t < 0.5; t += 0.01) { const p = (1 + t) * (2 - t); assert.ok(p > 2 && p < 2.25); }
  // TYT-0616: a > 0, b < 0, c < 0, d < 0 → bölge iki doğrunun altında, kesim üçüncü bölgede; (0, −10) çözüm.
  const [a, b, c, d] = [1, -1, -1, -1];
  assert.ok(0 + a * -10 <= b && 0 + c * -10 >= d);
  for (const [code, answer] of [['TYT-0614', 'D'], ['TYT-0620', 'A'], ['TYT-0613', 'D'], ['TYT-0616', 'A']]) assert.equal(WORKED_EXAMS[code].answer, answer);
});

test('carpanlara-ayirma: keşif modelleri sayılarla aynı şeyi söyler', () => {
  for (const a of range(1, 6)) for (const b of range(1, 6)) for (const c of range(1, 6)) {
    const m = model('carpan-ortak', { a, b, c });
    assert.equal(m.left + m.right, m.total); assert.equal(m.total, a * (b + c));
  }
  for (const b of range(1, 4)) for (const d of range(1, 5)) {
    const m = model('carpan-alan', { b, d });
    assert.equal(m.I + m.II + m.III + m.IV, m.total);
    assert.equal(m.IV, m.a ** 2 - 2 * m.a * b + b ** 2);
    assert.equal(m.II + m.III + m.IV, m.a ** 2 - b ** 2);
  }
  for (const mm of range(1, 3)) for (const r of range(1, 3)) for (const n of range(-7, 7)) for (const s of range(-7, 7)) {
    const m = model('carpan-capraz', { m: mm, r, n, s });
    for (const x of [-2, 0, 1, 3]) assert.equal((mm * x + n) * (r * x + s) + 0, m.lead * x * x + m.middle * x + m.constant + 0);
    for (const x of [-2, 0, 1, 3]) assert.equal((mm * x + s) * (r * x + n) + 0, m.lead * x * x + m.swapped * x + m.constant + 0);
  }
});

test('sayi-kesir-problemleri: keşif modelleri sayılarla aynı şeyi söyler', () => {
  for (const a of range(3, 20)) for (const b of range(3, 20)) for (const k of range(0, 8)) {
    const m = model('sk-sira', { a, b, k });
    // Güler önde: Güler a, Ömer n−b+1; aralarında k kişi.
    assert.equal((m.nMax - b + 1) - a - 1, k);
    if (m.nMin !== null) {
      assert.equal(a - m.front - 1, k); assert.equal(m.nMin - b + 1, m.front); assert.ok(m.nMin >= a);
    } else assert.ok(a - k - 1 < 1 || b < k + 2);
  }
  for (const q of range(2, 5)) for (const p of range(1, 4)) for (const n of range(1, 4)) {
    const m = model('sk-kalan', { q, p, n });
    const pe = Math.min(p, q - 1);
    assert.ok(Math.abs(m.steps[n].kalan - ((q - pe) / q) ** n) < 1e-12);
    assert.ok(m.steps[n].kalan > 0);
    assert.equal(m.steps[n].butun, Math.max(0, 1 - n * pe / q));
  }
  for (const N of range(8, 20)) for (const x of range(0, 20)) for (const d of range(1, 4)) {
    const m = model('sk-adet', { N, x, d });
    const xe = Math.min(x, N);
    assert.equal(m.total, 3 * (N - xe) + (3 + d) * xe);
    assert.equal((m.total - 3 * N) / d, xe);
  }
});
