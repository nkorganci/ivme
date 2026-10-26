// Doğru denklemi çekirdeği (saf işlevler): ax + by + c = 0 biçimi.
import { compile, parse } from '../../kit/mathExpr.js';

const gcd = (p, q) => (q ? gcd(q, p % q) : Math.abs(p));

/** "3x + 4y - 12 = 0", "y = 2x + 3" → { a, b, c } (ax + by + c = 0). a parametresi kaydırıcıdan. */
export function parseLine(text, aValue = 0) {
  const vars = ['x', 'y', 'a'];
  const [lhs, rhs] = String(text).split('=');
  const tree = rhs !== undefined && rhs.trim() ? { t: 'sub', a: parse(lhs, vars), b: parse(rhs, vars) } : parse(lhs, vars);
  const f = compile(tree);
  const at = (x, y) => f({ x, y, a: aValue });
  const c = at(0, 0); const a = at(1, 0) - c; const b = at(0, 1) - c;
  if (Math.abs(at(2, -3) - (2 * a - 3 * b + c)) > 1e-9 || Math.abs(at(-1.5, 4) - (-1.5 * a + 4 * b + c)) > 1e-9) throw new Error('Denklem doğrusal değil (x ve y birinci dereceden olmalı).');
  if (Math.abs(a) < 1e-12 && Math.abs(b) < 1e-12) throw new Error('x ve y katsayılarının ikisi birden sıfır olamaz.');
  return { a, b, c };
}

export const lineFromPoints = ([x1, y1], [x2, y2]) => ({ a: y2 - y1, b: x1 - x2, c: -((y2 - y1) * x1 + (x1 - x2) * y1) });

/** Katsayıları küçük tam sayılara indirger (mümkünse). */
export function normalizeLine({ a, b, c }) {
  for (let k = 1; k <= 12; k += 1) {
    const v = [a * k, b * k, c * k];
    if (v.every((x) => Math.abs(x - Math.round(x)) < 1e-9)) {
      const r = v.map(Math.round);
      const g = r.reduce((p, q) => gcd(p, q)) || 1;
      let out = r.map((x) => x / g);
      if (out[0] < 0 || (out[0] === 0 && out[1] < 0)) out = out.map((x) => -x);
      return { a: out[0], b: out[1], c: out[2] };
    }
  }
  return { a, b, c };
}
