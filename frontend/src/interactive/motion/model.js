// Bir boyutta hareket motoru. Her cisim parçalı doğrusal bir hız-zaman grafiğiyle tanımlanır:
// düğümler [t, v]; iki düğüm arası sabit ivmedir. Konum, yol ve olaylar bu grafikten
// kapalı biçimde hesaplanır (örnekleme yalnız çizim içindir). Saf JS: tarayıcı ve node testleri kullanır.

export const EPS = 1e-9;
const NEAR = 1e-6;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const snap = (value, step) => (step ? Math.round(value / step) * step : value);
const clean = (value) => (Math.abs(value) < NEAR ? 0 : Number(value.toFixed(9)));

/** Düğümleri zamana göre sıralar; ilk düğüm t=0, son düğüm t=T olacak biçimde tamamlar. */
export function normalizeNodes(nodes, T) {
  const sorted = (nodes ?? []).map(([t, v]) => [clamp(t, 0, T), v]).sort((p, q) => p[0] - q[0]);
  if (!sorted.length) return [[0, 0], [T, 0]];
  if (sorted[0][0] > EPS) sorted.unshift([0, sorted[0][1]]);
  if (sorted.at(-1)[0] < T - EPS) sorted.push([T, sorted.at(-1)[1]]);
  return sorted;
}

/** ∫|v0 + a·s| ds, s ∈ [0, d]: işaret değişirse iki üçgene bölünür. */
function absIntegral(v0, a, d) {
  if (d <= 0) return 0;
  const v1 = v0 + a * d;
  if (v0 * v1 >= 0) return (Math.abs(v0 + v1) / 2) * d;
  const s = -v0 / a;
  return (Math.abs(v0) * s) / 2 + (Math.abs(v1) * (d - s)) / 2;
}

function segmentsOf(body, T) {
  const nodes = normalizeNodes(body.nodes, T);
  const segs = [];
  let x = body.x0 ?? 0;
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const [t0, v0] = nodes[i];
    const [t1, v1] = nodes[i + 1];
    const d = t1 - t0;
    if (d <= EPS) continue; // aynı anda iki düğüm: ani hız değişimi
    const a = (v1 - v0) / d;
    segs.push({ t0, t1, v0, v1, a, x0: x });
    x += ((v0 + v1) / 2) * d;
  }
  if (!segs.length) segs.push({ t0: 0, t1: Math.max(T, EPS), v0: nodes[0][1], v1: nodes[0][1], a: 0, x0: body.x0 ?? 0 });
  return segs;
}

const cache = new WeakMap();

/** Cismin hareketi: x(t), v(t), a(t), yol(t) ve parçalar. Aynı cisim nesnesi için önbelleklidir. */
export function motionOf(body, T) {
  const hit = cache.get(body);
  if (hit && hit.T === T) return hit.motion;
  const segs = segmentsOf(body, T);
  // Düğüm anında sağdaki parça geçerlidir (son an hariç): ivme, yeni parçanın ivmesidir.
  const find = (t) => {
    const time = clamp(t, 0, T);
    for (const seg of segs) if (time < seg.t1 - EPS) return seg;
    return segs.at(-1);
  };
  const x = (t) => {
    const seg = find(t);
    const d = clamp(t, 0, T) - seg.t0;
    return seg.x0 + seg.v0 * d + 0.5 * seg.a * d * d;
  };
  const v = (t) => {
    const seg = find(t);
    return seg.v0 + seg.a * (clamp(t, 0, T) - seg.t0);
  };
  const a = (t) => find(t).a;
  const path = (t) => {
    const time = clamp(t, 0, T);
    let sum = 0;
    for (const seg of segs) {
      if (seg.t0 >= time) break;
      sum += absIntegral(seg.v0, seg.a, Math.min(time, seg.t1) - seg.t0);
    }
    return sum;
  };
  const motion = { T, segs, x0: body.x0 ?? 0, x, v, a, path, nodes: normalizeNodes(body.nodes, T) };
  cache.set(body, { T, motion });
  return motion;
}

/** t anına kadarki özet: konum, hız, ivme, yer değiştirme, yol, ortalama hız ve sürat. */
export function statsAt(motion, t) {
  const x = motion.x(t);
  const v = motion.v(t);
  const disp = x - motion.x0;
  const path = motion.path(t);
  return {
    x: clean(x), v: clean(v), a: clean(motion.a(t)), disp: clean(disp), path: clean(path),
    avgVelocity: t > NEAR ? clean(disp / t) : clean(v), avgSpeed: t > NEAR ? clean(path / t) : Math.abs(clean(v)),
  };
}

/** Hız ve ivmenin işaretinden hareketin niteliği (aynı işaret hızlanır, zıt işaret yavaşlar). */
export function motionKind(v, a) {
  const still = Math.abs(v) < 1e-3;
  if (still && Math.abs(a) < 1e-3) return { key: 'rest', text: 'Duruyor' };
  if (still) return { key: 'turn', text: 'Anlık duruyor' };
  if (Math.abs(a) < 1e-3) return { key: 'steady', text: 'Sabit hızla gidiyor' };
  return v * a > 0 ? { key: 'faster', text: 'Hızlanıyor (v ve a aynı yönde)' } : { key: 'slower', text: 'Yavaşlıyor (v ve a zıt yönde)' };
}

/** Pozitif ve negatif alanlar (0 → t): v-t için yer değiştirme parçaları. */
export function signedAreas(motion, t) {
  const time = clamp(t, 0, motion.T);
  let positive = 0;
  let negative = 0;
  for (const seg of motion.segs) {
    if (seg.t0 >= time) break;
    const d = Math.min(time, seg.t1) - seg.t0;
    const v1 = seg.v0 + seg.a * d;
    const pieces = seg.v0 * v1 < 0 ? [[seg.v0, 0, -seg.v0 / seg.a], [0, v1, d + seg.v0 / seg.a]] : [[seg.v0, v1, d]];
    for (const [p, q, len] of pieces) {
      const area = ((p + q) / 2) * len;
      if (area >= 0) positive += area; else negative += area;
    }
  }
  return { positive: clean(positive), negative: clean(negative) };
}

function breakTimes(motions, T) {
  const times = new Set([0, T]);
  for (const motion of motions) for (const seg of motion.segs) { times.add(seg.t0); times.add(seg.t1); }
  return [...times].sort((p, q) => p - q);
}

function pushUnique(list, item) {
  if (!list.some((other) => Math.abs(other.t - item.t) < 1e-6)) list.push(item);
}

/** İki cismin aynı konumda olduğu anlar (yan yana gelme). Birlikte giderlerse aralık olarak döner. */
export function meetings(first, second, T) {
  const out = [];
  const times = breakTimes([first, second], T);
  for (let i = 0; i < times.length - 1; i += 1) {
    const p = times[i];
    const len = times[i + 1] - p;
    if (len <= EPS) continue;
    const mid = p + len / 2;
    const da = first.a(mid) - second.a(mid);
    const dv = first.v(mid) - second.v(mid) - da * (mid - p);
    const dx = first.x(p) - second.x(p);
    if (Math.abs(da) < EPS && Math.abs(dv) < EPS && Math.abs(dx) < NEAR) { pushUnique(out, { t: p, x: first.x(p), together: true }); continue; }
    const roots = [];
    if (Math.abs(da) < EPS) { if (Math.abs(dv) > EPS) roots.push(-dx / dv); }
    else {
      const disc = dv * dv - 2 * da * dx;
      if (disc >= -NEAR) {
        const root = Math.sqrt(Math.max(0, disc));
        roots.push((-dv - root) / da, (-dv + root) / da);
      }
    }
    for (const s of roots) if (s >= -NEAR && s <= len + NEAR) pushUnique(out, { t: clean(p + clamp(s, 0, len)), x: first.x(p + clamp(s, 0, len)) });
  }
  return out.sort((p, q) => p.t - q.t);
}

/** İki cismin hızlarının eşit olduğu anlar (aradaki uzaklığın uç değer aldığı anlar). */
export function equalVelocityTimes(first, second, T) {
  const out = [];
  const times = breakTimes([first, second], T);
  for (let i = 0; i < times.length - 1; i += 1) {
    const p = times[i];
    const len = times[i + 1] - p;
    if (len <= EPS) continue;
    const mid = p + len / 2;
    const da = first.a(mid) - second.a(mid);
    const dv = first.v(mid) - second.v(mid) - da * (mid - p);
    if (Math.abs(da) < EPS) { if (Math.abs(dv) < NEAR) pushUnique(out, { t: p, together: true }); continue; }
    const s = -dv / da;
    if (s >= -NEAR && s <= len + NEAR) pushUnique(out, { t: clean(p + clamp(s, 0, len)), v: first.v(p + clamp(s, 0, len)) });
  }
  return out.filter((item) => item.t > NEAR || item.together).sort((p, q) => p.t - q.t);
}

/** Hızın sıfır olduğu anlar: yön değiştirme (işaret değişir) ya da anlık durma. */
export function zeroVelocityEvents(motion) {
  const out = [];
  const { segs } = motion;
  segs.forEach((seg, i) => {
    if (seg.v0 * seg.v1 < 0) pushUnique(out, { t: clean(seg.t0 - seg.v0 / seg.a), turn: true });
    const next = segs[i + 1];
    if (next && Math.abs(seg.v1) < NEAR) {
      // Düğümde sıfıra değiyor: önceki ve sonraki işaret farklıysa yön değişir.
      const before = Math.sign(seg.v0);
      const after = Math.sign(next.v1);
      if (before !== 0 || after !== 0) pushUnique(out, { t: clean(seg.t1), turn: before * after < 0 });
    }
    if (!next && Math.abs(seg.v1) < NEAR && Math.abs(seg.v0) > NEAR) pushUnique(out, { t: clean(seg.t1), turn: false, end: true });
  });
  return out.sort((p, q) => p.t - q.t);
}

/** Hareket hiç yön değiştirmiyor mu (hız hep ≥ 0 ya da hep ≤ 0)? */
export function keepsDirection(motion) {
  const values = motion.nodes.map(([, v]) => v);
  return Math.min(...values) >= -NEAR || Math.max(...values) <= NEAR;
}

export const isConstantVelocity = (motion) => motion.segs.every((seg) => Math.abs(seg.a) < 1e-6);

/** Bütün cisimlerin [0, T] aralığındaki konum sınırları (sahne ve x-t ölçeği için). */
export function positionExtent(motions, T, extra = []) {
  let min = Infinity;
  let max = -Infinity;
  for (const motion of motions) {
    for (let i = 0; i <= 200; i += 1) {
      const value = motion.x((T * i) / 200);
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  for (const value of extra) { min = Math.min(min, value); max = Math.max(max, value); }
  if (!Number.isFinite(min)) return [0, 1];
  if (max - min < 1e-6) return [min - 1, max + 1];
  return [min, max];
}

/** Düğüm taşıma: zaman komşuların arasında, değerler ızgaraya ve hız aralığına oturur. */
export function moveNode(body, index, [t, v], { T, grid = {}, vRange = [-Infinity, Infinity], lockT = false } = {}) {
  const nodes = normalizeNodes(body.nodes, T).map((node) => [...node]);
  const last = nodes.length - 1;
  const dt = grid.dt ?? 0;
  let time = nodes[index][0];
  if (!lockT && index > 0 && index < last) {
    const low = nodes[index - 1][0] + (dt || 0.01);
    const high = nodes[index + 1][0] - (dt || 0.01);
    time = clamp(snap(t, dt), low, Math.max(low, high));
  }
  const value = clamp(snap(v, grid.dv ?? 0), vRange[0], vRange[1]);
  nodes[index] = [clean(time), clean(value)];
  return { ...body, nodes };
}

/** t anına (ızgaraya oturtulmuş) yeni düğüm ekler; hız o andaki değer olur. Mevcut düğüme çok yakınsa eklemez. */
export function insertNode(body, t, { T, grid = {} } = {}) {
  const nodes = normalizeNodes(body.nodes, T).map((node) => [...node]);
  const time = clamp(snap(t, grid.dt ?? 0), 0, T);
  if (nodes.some(([nt]) => Math.abs(nt - time) < (grid.dt ?? 0.01) / 2)) return body;
  const value = snap(motionOf(body, T).v(time), grid.dv ?? 0);
  nodes.push([clean(time), clean(value)]);
  nodes.sort((p, q) => p[0] - q[0]);
  return { ...body, nodes };
}

export function removeNode(body, index, T) {
  const nodes = normalizeNodes(body.nodes, T);
  if (index <= 0 || index >= nodes.length - 1) return body;
  return { ...body, nodes: nodes.filter((_, i) => i !== index) };
}

/** Sabit ivme kısıtı: iç düğümleri ilk ve son düğümü birleştiren doğrunun üstüne taşır. */
export function straighten(body, T) {
  const nodes = normalizeNodes(body.nodes, T);
  const [t0, v0] = nodes[0];
  const [t1, v1] = nodes.at(-1);
  return { ...body, nodes: nodes.map(([t, v], i) => (i === 0 || i === nodes.length - 1 ? [t, v] : [t, clean(v0 + ((v1 - v0) * (t - t0)) / (t1 - t0))])) };
}

/** Sabit ivmeli parçalardan düğüm üretir: { v0, parts: [[süre, ivme], ...] }. */
export function nodesFromAcceleration(v0, parts) {
  const nodes = [[0, v0]];
  let t = 0;
  let v = v0;
  for (const [duration, a] of parts) { t += duration; v += a * duration; nodes.push([clean(t), clean(v)]); }
  return nodes;
}

/** Öğrencinin hız grafiği hedefle aynı mı? İlk farkı döner (yoksa null). */
export function firstNodeDifference(body, target, T, tolerance = 0.51) {
  if (Math.abs((body.x0 ?? 0) - (target.x0 ?? 0)) > tolerance) return { kind: 'x0', expected: target.x0 ?? 0, actual: body.x0 ?? 0 };
  const mine = motionOf(body, T);
  const goal = motionOf(target, T);
  const times = [...new Set([...goal.nodes.map(([t]) => t), ...mine.nodes.map(([t]) => t)])].sort((p, q) => p - q);
  for (const t of times) {
    const expected = goal.v(t);
    const actual = mine.v(t);
    if (Math.abs(expected - actual) > tolerance) return { kind: 'v', t, expected: clean(expected), actual: clean(actual) };
  }
  return null;
}

/** Türkçe kısa sayı: en çok `digits` ondalık, virgül ve gerçek eksi işareti. */
export function fmt(value, digits = 1) {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(digits));
  const text = String(Object.is(rounded, -0) ? 0 : rounded);
  return text.replace('-', '−').replace('.', ',');
}

/** Birim etiketleri: senaryo zaman ve konum birimini verir, hız ve ivme bunlardan türer. */
export function unitsOf(scenario) {
  const t = scenario.units?.t ?? 's';
  const x = scenario.units?.x ?? 'm';
  return { t, x, v: `${x}/${t}`, a: `${x}/${t}²` };
}
