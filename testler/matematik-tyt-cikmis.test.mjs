// TYT tamamlama işinde (MAT-TYT) eklenen gerçek soruların ve benzer soruların bağımsız taraması.
// Her soru: görseli okunmuş kaydın cevabı, ders bankası bağı ve bütün olasılıkların taranması.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLesson } from '../frontend/src/learn/content/parser.js';
import { WORKED_EXAMS } from '../frontend/src/learn/content/worked-exams.js';

const load = (id) => parseLesson(readFileSync(new URL(`../frontend/src/learn/content/dersler/${id}.ders`, import.meta.url), 'utf8'), id);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const INDEPENDENT = ['bolme-bolunebilme', 'ebob-ekok'].flatMap((id) => JSON.parse(readFileSync(new URL(`../frontend/src/learn/content/kanit/${id}.json`, import.meta.url), 'utf8')).independentCodes);
const linked = (code, answer) => {
  assert.ok(!INDEPENDENT.includes(code), code + ' bağımsız aktarım sorusu; derste çözülemez');
  const record = WORKED_EXAMS[code];
  assert.equal(record.answer, answer, code);
  assert.ok(load(record.conceptId).practiceIds.includes(code), code + ' ders bankasında örnek olarak işaretli değil');
};

test('bölme dersi: rakam zinciri örneği (bağımsız TYT-0597 ile aynı kalıp, 4 kuralı)', () => {
  const chain = (top, mid, low) => top !== mid && mid !== low && top !== low && mid !== 0 && low !== 0 && top % mid === 0 && mid % low === 0;
  const exam = [];
  for (const a of range(1, 9)) for (const b of range(0, 9)) for (const c of range(0, 9)) if (chain(a, b, c)) exam.push(100 * a + 10 * b + c);
  assert.deepEqual(exam.filter((n) => n % 3 === 0), [621]);
  const similar = [];
  for (const a of range(1, 9)) for (const b of range(1, 9)) for (const c of range(1, 9)) if (chain(c, b, a)) similar.push(100 * a + 10 * b + c);
  assert.deepEqual(similar.sort((x, y) => x - y), [124, 126, 128, 136, 139, 148, 248]);
  assert.deepEqual(similar.filter((n) => n % 4 === 0), [124, 128, 136, 148, 248]);
  // Sıfır serbest bırakılırsa C=0 da B'nin katıdır; ders bu yüzden “sıfırdan farklı” der.
  const withZero = [];
  for (const a of range(1, 9)) for (const b of range(1, 9)) if (a !== b && b % a === 0) withZero.push(100 * a + 10 * b);
  assert.ok(withZero.some((n) => n % 4 === 0));
});

test('EBOB dersi: iki gruplama örneği (bağımsız TYT-0713 ile aynı kalıp, 270)', () => {
  const pairs = (m, n) => { const out = []; for (const a of range(1, 9)) for (const b of range(1, 9)) if (m * (10 * a + b) === n * (10 * b + a)) out.push(10 * a + b); return out; };
  assert.deepEqual(pairs(3, 8), [72]);
  const total = 3 * 72;
  assert.equal(total, 216);
  assert.deepEqual([40, 48, 54, 56, 60].filter((g) => total % g === 0), [54]);
  assert.deepEqual(pairs(5, 6), [54]);
  assert.equal(5 * 54, 6 * 45);
  assert.deepEqual([36, 40, 45, 50, 60].filter((g) => 270 % g === 0), [45]);
});

test('TYT-0641 ve TYT-0643: A√B yazılışları ve kök bölümü; benzer sorular', () => {
  const sums = (n) => range(1, 40).filter((a) => n % (a * a) === 0).map((a) => a + n / (a * a));
  assert.deepEqual(sums(720), [721, 182, 83, 49, 26, 17]);
  assert.deepEqual([26, 49, 83, 127, 182].filter((x) => !sums(720).includes(x)), [127]);
  linked('TYT-0641', 'D');
  assert.deepEqual(sums(432), [433, 110, 51, 31, 18, 15]);
  assert.deepEqual([15, 18, 31, 52, 110].filter((x) => !sums(432).includes(x)), [52]);
  // a/b tam sayı ⇔ (a/b)² = 720/b² tam kare ve bölüm tam sayı.
  const intRatio = (a2, b2) => { const q = a2 / b2; return Number.isInteger(Math.sqrt(q)) && Number.isInteger(q); };
  assert.deepEqual([5, 20, 45, 60, 80].filter((b2) => !intRatio(720, b2)), [60]);
  linked('TYT-0643', 'D');
  assert.deepEqual([2, 8, 24, 98, 392].filter((b2) => !intRatio(392, b2)), [24]);
  assert.equal(intRatio(392, 18), false);
});

test('TYT-0594 ve TYT-0599: ters sayılar ve iki kalan; benzer sorular', () => {
  const sums = (k) => [...new Set(range(1, 9).flatMap((a) => range(1, 9).filter((b) => ((10 * a + b) * (10 * b + a)) % k === 0).map((b) => a + b)))].sort((x, y) => x - y);
  assert.deepEqual(sums(30), [9]);
  linked('TYT-0594', 'B');
  assert.deepEqual(sums(45), [6, 9, 12]);
  const digitsA = (mid, m) => [...new Set(range(1, 9).filter((a) => range(0, 9).some((b) => { const n = 1000 * a + mid + b; return n % 5 === n % m; })))];
  assert.deepEqual(digitsA(340, 9), [2, 6]);
  linked('TYT-0599', 'A');
  const similar = digitsA(150, 3);
  assert.deepEqual(similar, [1, 3, 4, 6, 7, 9]);
  assert.equal(similar.reduce((x, y) => x + y, 0), 30);
});

test('TYT-0701 ve TYT-0723: gruptan gruba geçiş ve adet × birim oranı; benzer sorular', () => {
  const k701 = range(1, 200).filter((k) => 3 * (k + 12) === 2 * (2 * k - 12));
  assert.deepEqual(k701, [60]); assert.equal(3 * k701[0], 180);
  linked('TYT-0701', 'D');
  const kSim = range(1, 100).filter((k) => 2 * k + 6 === 5 * k - 6);
  assert.deepEqual(kSim, [4]); assert.equal(7 * kSim[0], 28);
  // 2k·c / (3k·p) = 8/5 → p/c = 5/12
  assert.equal((2 * 12) / (3 * 5), 8 / 5);
  linked('TYT-0723', 'A');
  assert.equal((3 * 6) / (4 * 1), 9 / 2);
});

test('çarpanlara ayırma: TYT-0792, TYT-0794, AYT-0095 ve benzer sorular', () => {
  for (const a of range(2, 12)) for (const b of range(1, a - 1)) {
    const [I, II, IV] = [b * b, b * (a - b), (a - b) ** 2];
    assert.equal(a * a - 2 * a * b + 2 * b * b, I + IV);
    assert.equal(2 * a * b - 2 * b * b, 2 * II);
  }
  linked('TYT-0792', 'B');
  // Sabitleri karışmış çarpanlama: bütün tam sayı m,r,n,s yerleşimleri tek bir b verir.
  const swappedB = (lead, wrongMid, c) => {
    const out = new Set();
    for (const m of range(-lead, lead)) for (const r of range(-lead, lead)) for (const n of range(-40, 40)) for (const s of range(-40, 40)) {
      if (m * r !== lead || n * s !== c || m * n + s * r !== wrongMid) continue;
      out.add(m * s + n * r);
    }
    return [...out];
  };
  assert.deepEqual(swappedB(2, 1, -21), [11]);
  linked('TYT-0794', 'A');
  assert.deepEqual(swappedB(3, 13, -10), [-1]);
  const field = range(1, 200).filter((x) => (x + 20) * (2 * x + 30) - x * x === 1400);
  assert.deepEqual(field, [10]); assert.equal(2 * (30 + 50), 160);
  linked('AYT_Sayisal-0095', 'C');
  const sim = range(1, 200).filter((x) => (x + 12) * (2 * x + 8) - x * x === 624);
  assert.deepEqual(sim, [12]); assert.equal(2 * (24 + 32), 112);
});

test('çarpanlara ayırma: yeni örneklerin sayısal sonuçları', () => {
  assert.equal((2 ** 12 - 2 ** 10) / (2 ** 10 + 2 ** 9), 2);
  const pos = (f) => { const r = []; for (const x of range(1, 30)) for (const y of range(1, 30)) if (f(x, y)) r.push([x, y]); return r; };
  assert.deepEqual([...new Set(pos((x, y) => x * y + x + y === 14).map(([x, y]) => x + y))], [6]);
  assert.equal((37 * 45 + 37 * 55) / 74, 50);
  assert.equal(Math.max(...pos((a, b) => a * b - a - b === 11).map(([a, b]) => a + b)), 15);
  assert.equal(Math.max(...pos((x, y) => x * y + 2 * x + y === 10).map(([x, y]) => x + y)), 5);
  assert.equal(64 - 48, 16); assert.equal(125 - 90, 35); assert.equal(36 - 22, 14);
  for (const x of [-5, -2, 0.5, 3, 7]) {
    assert.ok(Math.abs((x ** 2 + x) ** 2 - 8 * (x ** 2 + x) + 12 - (x + 2) * (x - 1) * (x + 3) * (x - 2)) < 1e-9);
    if (![1, -1, -3, 0, 2, 3, -2].includes(x)) {
      assert.ok(Math.abs(1 / (x - 1) - 1 / (x + 1) - 2 / (x * x - 1)) < 1e-9);
      assert.ok(Math.abs(((x * x - 4) / (x + 3)) / ((x - 2) / (x * x + 3 * x)) - x * (x + 2)) < 1e-9);
      assert.ok(Math.abs(((x * x - x - 6) / (x * x - 9)) * ((x + 3) / (x + 2)) - 1) < 1e-9);
    }
  }
  assert.deepEqual([1, 2, -2].map((x) => x ** 3 - x * x - 4 * x + 4), [0, 0, 0]);
  assert.equal((1001 ** 2 - 1) / 1000, 1002);
});

test('çarpanlara ayırma: sunu kalıpları (üslü değişken, iki kare farkı, sadeleşen kesir)', () => {
  for (const x of [-1, 0, 0.5, 1, 2]) {
    assert.ok(Math.abs(9 ** x - 3 ** (x + 1) + 2 - (3 ** x - 1) * (3 ** x - 2)) < 1e-9);
    assert.ok(Math.abs(2 ** (2 * x + 1) - 5 * 2 ** x + 3 - (2 * 2 ** x - 3) * (2 ** x - 1)) < 1e-9);
  }
  assert.equal(5555 ** 2 - 4444 ** 2, 11108889);
  assert.equal(String(5555 ** 2 - 4444 ** 2).length, 8);
  const as = range(-40, 40).filter((a) => [2, 3].some((r) => r * r + a * r + 12 === 0));
  assert.deepEqual(as, [-8, -7]);
});

test('AYT-0022: asal bölen kümeleri; benzer soru 14 ve 21', () => {
  const primes = (n) => { const out = new Set(); for (let p = 2; n > 1; p++) while (n % p === 0) { out.add(p); n /= p; } return out; };
  const P = range(2, 60).filter((p) => primes(p).size === 1 && primes(p).has(p));
  const semi = P.flatMap((p) => P.filter((q) => q > p).map((q) => p * q));
  assert.deepEqual(semi.filter((n) => primes(66 * n).size === 5 && primes(70 * n).size === 3), [35]);
  linked('AYT_Sayisal-0022', 'A');
  assert.deepEqual(semi.filter((n) => primes(30 * n).size === 4 && primes(42 * n).size === 3).sort((a, b) => a - b), [14, 21]);
});

test('rasyonel sayılar: a,b̄ + b,ā = 10 sayımı', () => {
  const ok = [];
  for (const a of range(1, 9)) for (const b of range(0, 9)) if (Math.abs(a + b / 9 + b + a / 9 - 10) < 1e-9) ok.push(10 * a + b);
  assert.deepEqual(ok, [18, 27, 36, 45, 54, 63, 72, 81, 90]);
});

test('birinci derece denklemler: derece koşulu ve üçerli toplamlar', () => {
  const n = -7; assert.equal(n + 2 + 5, 0); assert.notEqual(n + 2, 0); assert.equal(3 + n, -4);
  const found = [];
  for (const a of range(-20, 20)) for (const b of range(a + 1, 25)) for (const c of range(b + 1, 30)) for (const d of range(c + 1, 35)) {
    const sums = [a + b + c, a + b + d, a + c + d, b + c + d].sort((x, y) => x - y);
    if (sums.join() === '20,24,27,31') found.push([a, b, c, d]);
  }
  assert.deepEqual(found, [[3, 7, 10, 14]]);
});
