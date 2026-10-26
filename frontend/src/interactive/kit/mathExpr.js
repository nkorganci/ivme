// İnteraktif matematik çekirdeği: eval kullanmayan ifade ayrıştırıcı (örtük çarpım: 2x, 3(x+1), 2sin(x)),
// sembolik türev, sadeleştirme, okunur yazım, polinom katsayıları ve sayısal kök/ekstremum/integral.

const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, cot: (v) => 1 / Math.tan(v),
  asin: Math.asin, acos: Math.acos, atan: Math.atan, arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
  sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp,
};
const CONSTS = { pi: Math.PI, e: Math.E };
const SUPERSCRIPT = { '²': '^2', '³': '^3', '⁴': '^4' };

function normalize(text) {
  return String(text)
    .replace(/[²³⁴]/g, (ch) => SUPERSCRIPT[ch])
    .replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/[−–]/g, '-').replace(/[·×]/g, '*')
    .replace(/(\d),(\d)/g, '$1.$2');
}

function tokenize(text) {
  const tokens = [];
  const source = normalize(text);
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) { i += 1; continue; }
    const number = /^(\d+(\.\d+)?|\.\d+)/.exec(source.slice(i));
    if (number) { tokens.push({ type: 'num', value: Number(number[0]) }); i += number[0].length; continue; }
    const name = /^[A-Za-z]+/.exec(source.slice(i));
    if (name) {
      // Bitişik harfler: bilinen fonksiyon/sabit önce, kalanı tek harfli değişkenlere bölünür (ax → a·x).
      let word = name[0];
      while (word) {
        const known = [...Object.keys(FUNCS), ...Object.keys(CONSTS)].sort((p, q) => q.length - p.length).find((k) => word.startsWith(k));
        const piece = known ?? word[0];
        tokens.push({ type: 'name', value: piece });
        word = word.slice(piece.length);
      }
      i += name[0].length;
      continue;
    }
    if ('+-*/^(),|'.includes(ch)) { tokens.push({ type: 'op', value: ch }); i += 1; continue; }
    throw new Error(`Tanınmayan karakter: ${ch}`);
  }
  return tokens;
}

const num = (v) => ({ t: 'num', v });
const isNum = (node, value) => node.t === 'num' && (value === undefined || Math.abs(node.v - value) < 1e-12);

/** Metni ağaca çevirir. variables: izinli değişken adları (varsayılan x). */
export function parse(text, variables = ['x']) {
  const tokens = tokenize(text);
  if (!tokens.length) throw new Error('İfade boş.');
  const allowed = new Set(variables);
  let pos = 0;
  const peek = () => tokens[pos];
  const take = (value) => {
    const token = tokens[pos];
    if (!token || (value !== undefined && token.value !== value)) throw new Error(value ? `"${value}" bekleniyordu.` : 'İfade eksik.');
    pos += 1;
    return token;
  };
  const startsPrimary = (token) => token && (token.type === 'num' || token.type === 'name' || token.value === '(' || token.value === '|');

  function primary() {
    const token = peek();
    if (!token) throw new Error('İfade eksik.');
    if (token.type === 'num') { pos += 1; return num(token.value); }
    if (token.value === '(') { take('('); const inner = expression(); take(')'); return inner; }
    if (token.value === '|') { take('|'); const inner = expression(); take('|'); return { t: 'fn', n: 'abs', a: inner }; }
    if (token.type === 'name') {
      pos += 1;
      if (Object.hasOwn(FUNCS, token.value)) {
        let arg;
        if (peek()?.value === '(') { take('('); arg = expression(); take(')'); }
        else arg = power();
        return { t: 'fn', n: token.value, a: arg };
      }
      if (allowed.has(token.value)) return { t: 'var', n: token.value };
      if (Object.hasOwn(CONSTS, token.value)) return { t: 'const', n: token.value };
      throw new Error(`Bilinmeyen ad: ${token.value}`);
    }
    throw new Error(`Beklenmeyen simge: ${token.value}`);
  }
  function power() {
    const base = primary();
    if (peek()?.value === '^') { take('^'); return { t: 'pow', a: base, b: unary() }; }
    return base;
  }
  function unary() {
    if (peek()?.value === '-') { take('-'); return { t: 'neg', a: unary() }; }
    if (peek()?.value === '+') { take('+'); return unary(); }
    return power();
  }
  function term() {
    let left = unary();
    for (;;) {
      const token = peek();
      if (token?.value === '*' || token?.value === '/') { take(); const right = unary(); left = { t: token.value === '*' ? 'mul' : 'div', a: left, b: right }; continue; }
      if (startsPrimary(token) && !(token.value === '|' && closingBar())) { const right = power(); left = { t: 'mul', a: left, b: right }; continue; }
      return left;
    }
  }
  // "|x|+2" içinde ikinci | kapanıştır; örtük çarpım sanılmamalı.
  function closingBar() {
    let depth = 0;
    for (let k = 0; k < pos; k += 1) if (tokens[k].value === '|') depth += 1;
    return depth % 2 === 1;
  }
  function expression() {
    let left = term();
    while (peek()?.value === '+' || peek()?.value === '-') {
      const op = take().value;
      const right = term();
      left = { t: op === '+' ? 'add' : 'sub', a: left, b: right };
    }
    return left;
  }
  const tree = expression();
  if (pos < tokens.length) throw new Error(`Fazla simge: ${tokens[pos].value}`);
  return tree;
}

/** Ağacı hızlı işleve çevirir: env = { x: 2, a: 1 } */
export function compile(node) {
  switch (node.t) {
    case 'num': return () => node.v;
    case 'const': { const v = CONSTS[node.n]; return () => v; }
    case 'var': return (env) => env[node.n];
    case 'neg': { const a = compile(node.a); return (env) => -a(env); }
    case 'add': { const a = compile(node.a); const b = compile(node.b); return (env) => a(env) + b(env); }
    case 'sub': { const a = compile(node.a); const b = compile(node.b); return (env) => a(env) - b(env); }
    case 'mul': { const a = compile(node.a); const b = compile(node.b); return (env) => a(env) * b(env); }
    case 'div': { const a = compile(node.a); const b = compile(node.b); return (env) => a(env) / b(env); }
    case 'pow': {
      const a = compile(node.a); const b = compile(node.b);
      return (env) => {
        const base = a(env); const exponent = b(env);
        // Negatif tabanın tek paydalı kesir kuvveti (∛x gibi) gerçel kalsın.
        if (base < 0 && !Number.isInteger(exponent)) {
          const inverse = 1 / exponent;
          if (Number.isInteger(Math.round(inverse)) && Math.abs(inverse - Math.round(inverse)) < 1e-9 && Math.round(inverse) % 2 !== 0) return -((-base) ** exponent);
        }
        return base ** exponent;
      };
    }
    case 'fn': { const a = compile(node.a); const fn = FUNCS[node.n]; return (env) => fn(a(env)); }
    default: throw new Error('Bilinmeyen düğüm');
  }
}

/** Metinden tek değişkenli işlev; hata varsa { error } döner. */
export function makeFunction(text, variable = 'x', extra = []) {
  try {
    const tree = parse(text, [variable, ...extra]);
    const run = compile(tree);
    return { tree, f: (value, env = {}) => run({ ...env, [variable]: value }), error: null };
  } catch (error) {
    return { tree: null, f: null, error: error.message };
  }
}

function dependsOn(node, variable) {
  switch (node.t) {
    case 'var': return node.n === variable;
    case 'num': case 'const': return false;
    case 'neg': case 'fn': return dependsOn(node.a, variable);
    default: return dependsOn(node.a, variable) || dependsOn(node.b, variable);
  }
}

/** Sembolik türev (sadeleştirilmiş). */
export function derivative(node, variable = 'x') {
  const d = (n) => derivative(n, variable);
  if (!dependsOn(node, variable)) return num(0);
  switch (node.t) {
    case 'var': return num(1);
    case 'neg': return simplify({ t: 'neg', a: d(node.a) });
    case 'add': return simplify({ t: 'add', a: d(node.a), b: d(node.b) });
    case 'sub': return simplify({ t: 'sub', a: d(node.a), b: d(node.b) });
    case 'mul': return simplify({ t: 'add', a: { t: 'mul', a: d(node.a), b: node.b }, b: { t: 'mul', a: node.a, b: d(node.b) } });
    case 'div': return simplify({ t: 'div', a: { t: 'sub', a: { t: 'mul', a: d(node.a), b: node.b }, b: { t: 'mul', a: node.a, b: d(node.b) } }, b: { t: 'pow', a: node.b, b: num(2) } });
    case 'pow': {
      if (!dependsOn(node.b, variable)) {
        return simplify({ t: 'mul', a: { t: 'mul', a: node.b, b: { t: 'pow', a: node.a, b: { t: 'sub', a: node.b, b: num(1) } } }, b: d(node.a) });
      }
      if (!dependsOn(node.a, variable)) {
        const lnBase = node.a.t === 'const' && node.a.n === 'e' ? num(1) : { t: 'fn', n: 'ln', a: node.a };
        return simplify({ t: 'mul', a: { t: 'mul', a: node, b: lnBase }, b: d(node.b) });
      }
      // a^b = e^(b ln a)
      return simplify({ t: 'mul', a: node, b: { t: 'add', a: { t: 'mul', a: d(node.b), b: { t: 'fn', n: 'ln', a: node.a } }, b: { t: 'div', a: { t: 'mul', a: node.b, b: d(node.a) }, b: node.a } } });
    }
    case 'fn': {
      const u = node.a; const du = d(u);
      const outer = {
        sin: () => ({ t: 'fn', n: 'cos', a: u }),
        cos: () => ({ t: 'neg', a: { t: 'fn', n: 'sin', a: u } }),
        tan: () => ({ t: 'add', a: num(1), b: { t: 'pow', a: { t: 'fn', n: 'tan', a: u }, b: num(2) } }),
        cot: () => ({ t: 'neg', a: { t: 'add', a: num(1), b: { t: 'pow', a: { t: 'fn', n: 'cot', a: u }, b: num(2) } } }),
        sqrt: () => ({ t: 'div', a: num(1), b: { t: 'mul', a: num(2), b: { t: 'fn', n: 'sqrt', a: u } } }),
        abs: () => ({ t: 'div', a: u, b: { t: 'fn', n: 'abs', a: u } }),
        ln: () => ({ t: 'div', a: num(1), b: u }),
        log: () => ({ t: 'div', a: num(1), b: { t: 'mul', a: u, b: { t: 'fn', n: 'ln', a: num(10) } } }),
        exp: () => ({ t: 'fn', n: 'exp', a: u }),
        asin: () => ({ t: 'div', a: num(1), b: { t: 'fn', n: 'sqrt', a: { t: 'sub', a: num(1), b: { t: 'pow', a: u, b: num(2) } } } }),
        acos: () => ({ t: 'neg', a: { t: 'div', a: num(1), b: { t: 'fn', n: 'sqrt', a: { t: 'sub', a: num(1), b: { t: 'pow', a: u, b: num(2) } } } } }),
        atan: () => ({ t: 'div', a: num(1), b: { t: 'add', a: num(1), b: { t: 'pow', a: u, b: num(2) } } }),
      };
      outer.arcsin = outer.asin; outer.arccos = outer.acos; outer.arctan = outer.atan;
      return simplify({ t: 'mul', a: outer[node.n](), b: du });
    }
    default: return num(0);
  }
}

const same = (p, q) => JSON.stringify(p) === JSON.stringify(q);

/** Sadeleştirme: sabit katlama, 0/1 kuralları, katsayıları öne alma. */
export function simplify(node) {
  switch (node.t) {
    case 'num': case 'var': case 'const': return node;
    case 'neg': {
      const a = simplify(node.a);
      if (a.t === 'num') return num(-a.v);
      if (a.t === 'neg') return a.a;
      if (a.t === 'mul' && a.a.t === 'num') return simplify({ t: 'mul', a: num(-a.a.v), b: a.b });
      return { t: 'neg', a };
    }
    case 'fn': {
      const a = simplify(node.a);
      if (a.t === 'num' && ['abs', 'sqrt'].includes(node.n)) { const v = FUNCS[node.n](a.v); if (Number.isInteger(v)) return num(v); }
      if (a.t === 'num' && node.n === 'ln' && a.v === 1) return num(0);
      return { t: 'fn', n: node.n, a };
    }
    case 'add': case 'sub': {
      const a = simplify(node.a); let b = simplify(node.b);
      if (a.t === 'num' && b.t === 'num') return num(node.t === 'add' ? a.v + b.v : a.v - b.v);
      if (isNum(b, 0)) return a;
      if (isNum(a, 0)) return node.t === 'add' ? b : simplify({ t: 'neg', a: b });
      if (node.t === 'add' && b.t === 'neg') return simplify({ t: 'sub', a, b: b.a });
      if (node.t === 'add' && b.t === 'num' && b.v < 0) return { t: 'sub', a, b: num(-b.v) };
      if (node.t === 'sub' && b.t === 'num' && b.v < 0) return { t: 'add', a, b: num(-b.v) };
      if (node.t === 'add' && b.t === 'mul' && b.a.t === 'num' && b.a.v < 0) return { t: 'sub', a, b: simplify({ t: 'mul', a: num(-b.a.v), b: b.b }) };
      if (node.t === 'sub' && b.t === 'mul' && b.a.t === 'num' && b.a.v < 0) return { t: 'add', a, b: simplify({ t: 'mul', a: num(-b.a.v), b: b.b }) };
      if (node.t === 'sub' && same(a, b)) return num(0);
      return { t: node.t, a, b };
    }
    case 'mul': {
      let a = simplify(node.a); let b = simplify(node.b);
      if (a.t === 'num' && b.t === 'num') return num(a.v * b.v);
      if (isNum(a, 0) || isNum(b, 0)) return num(0);
      if (isNum(a, 1)) return b;
      if (isNum(b, 1)) return a;
      if (isNum(a, -1)) return simplify({ t: 'neg', a: b });
      if (isNum(b, -1)) return simplify({ t: 'neg', a });
      if (b.t === 'num') [a, b] = [b, a];
      if (a.t === 'num' && b.t === 'mul' && b.a.t === 'num') return simplify({ t: 'mul', a: num(a.v * b.a.v), b: b.b });
      if (a.t === 'num' && b.t === 'neg') return simplify({ t: 'mul', a: num(-a.v), b: b.a });
      if (a.t === 'neg') return simplify({ t: 'neg', a: { t: 'mul', a: a.a, b } });
      if (b.t === 'neg') return simplify({ t: 'neg', a: { t: 'mul', a, b: b.a } });
      if (a.t === 'mul' && a.a.t === 'num') return simplify({ t: 'mul', a: a.a, b: { t: 'mul', a: a.b, b } });
      if (b.t === 'mul' && b.a.t === 'num') return simplify({ t: 'mul', a: b.a, b: { t: 'mul', a, b: b.b } });
      if (a.t === 'div' && same(a.b, b)) return a.a;
      if (b.t === 'div' && same(b.b, a)) return b.a;
      if (same(a, b)) return { t: 'pow', a, b: num(2) };
      if (a.t === 'var' && b.t === 'pow' && same(b.a, a) && b.b.t === 'num') return { t: 'pow', a, b: num(b.b.v + 1) };
      if (b.t === 'var' && a.t === 'pow' && same(a.a, b) && a.b.t === 'num') return { t: 'pow', a: b, b: num(a.b.v + 1) };
      return { t: 'mul', a, b };
    }
    case 'div': {
      const a = simplify(node.a); const b = simplify(node.b);
      if (isNum(a, 0)) return num(0);
      if (isNum(b, 1)) return a;
      if (a.t === 'num' && b.t === 'num' && b.v !== 0) return num(a.v / b.v);
      if (same(a, b)) return num(1);
      if (a.t === 'num' && a.v < 0) return simplify({ t: 'neg', a: { t: 'div', a: num(-a.v), b } });
      if (a.t === 'neg') return simplify({ t: 'neg', a: { t: 'div', a: a.a, b } });
      return { t: 'div', a, b };
    }
    case 'pow': {
      const a = simplify(node.a); const b = simplify(node.b);
      if (isNum(b, 0)) return num(1);
      if (isNum(b, 1)) return a;
      if (a.t === 'num' && b.t === 'num') return num(a.v ** b.v);
      if (a.t === 'pow' && a.b.t === 'num' && b.t === 'num') return { t: 'pow', a: a.a, b: num(a.b.v * b.v) };
      return { t: 'pow', a, b };
    }
    default: return node;
  }
}

const PREC = { add: 1, sub: 1, neg: 2, mul: 3, div: 3, pow: 5, fn: 6, num: 7, var: 7, const: 7 };
const numberText = (v) => {
  if (!Number.isFinite(v)) return String(v);
  const r = Number(v.toFixed(6));
  // Sonlu ondalıklar (2,5 gibi) ondalık kalır; 1/3 gibi devirli olanlar kesirle yazılır.
  if (!Number.isInteger(r) && Math.abs(r * 1000 - Math.round(r * 1000)) > 1e-6) {
    for (const den of [3, 6, 7, 9, 11, 12]) {
      const top = Math.round(r * den);
      if (Math.abs(top / den - v) < 1e-9) return `${top}/${den}`.replace(/^-/, '-');
    }
  }
  return String(Object.is(r, -0) ? 0 : r).replace('.', ',');
};
const isFractionText = (text) => text.includes('/');

/** Okunur yazım: 3x^2 - 6x, 2(x + 1), sin(2x). MathText bileşeni ^ işaretini üst simgeye çevirir. */
export function toText(node, parentPrec = 0) {
  let out;
  switch (node.t) {
    case 'num': out = numberText(node.v); if ((node.v < 0 && parentPrec > 1) || (isFractionText(out) && parentPrec > 3)) out = `(${out})`; return out;
    case 'var': return node.n;
    case 'const': return node.n === 'pi' ? 'π' : node.n;
    case 'neg': out = `-${toText(node.a, 2)}`; break;
    case 'add': out = `${toText(node.a, 1)} + ${toText(node.b, 1.1)}`; break;
    case 'sub': out = `${toText(node.a, 1)} - ${toText(node.b, 1.1)}`; break;
    case 'mul': {
      if (node.a.t === 'num' && node.a.v < 0) { out = `-${toText({ t: 'mul', a: num(-node.a.v), b: node.b }, 2)}`; break; }
      let left = toText(node.a, 3);
      if (node.a.t === 'num' && isFractionText(left)) left = `(${left})`;
      const right = toText(node.b, 3.1);
      const implicit = (node.a.t === 'num' && node.b.t !== 'num') || (/\)$/.test(left) && /^\(/.test(right));
      out = implicit ? `${left}${right}` : `${left}·${right}`;
      break;
    }
    case 'div': out = `${toText(node.a, 3)}/${toText(node.b, 3.1)}`; break;
    case 'pow': {
      const base = toText(node.a, 5.1);
      const simple = (node.b.t === 'num' && node.b.v >= 0 && Number.isInteger(node.b.v)) || node.b.t === 'var' || node.b.t === 'const';
      const exponent = simple ? toText(node.b) : `(${toText(node.b)})`;
      out = `${base}^${exponent}`;
      break;
    }
    case 'fn': out = node.n === 'abs' ? `|${toText(node.a)}|` : `${node.n}(${toText(node.a)})`; return out;
    default: out = '?';
  }
  return PREC[node.t] < parentPrec ? `(${out})` : out;
}

/** Polinomsa katsayılar [a0, a1, a2, ...]; değilse null. */
export function toPolynomial(node, variable = 'x') {
  const addP = (p, q) => Array.from({ length: Math.max(p.length, q.length) }, (_, i) => (p[i] ?? 0) + (q[i] ?? 0));
  const mulP = (p, q) => { const out = Array(p.length + q.length - 1).fill(0); p.forEach((a, i) => q.forEach((b, j) => { out[i + j] += a * b; })); return out; };
  function walk(n) {
    switch (n.t) {
      case 'num': return [n.v];
      case 'const': return [CONSTS[n.n]];
      case 'var': return n.n === variable ? [0, 1] : null;
      case 'neg': { const a = walk(n.a); return a && a.map((v) => -v); }
      case 'add': case 'sub': { const a = walk(n.a); const b = walk(n.b); return a && b && addP(a, n.t === 'add' ? b : b.map((v) => -v)); }
      case 'mul': { const a = walk(n.a); const b = walk(n.b); return a && b && mulP(a, b); }
      case 'div': { const a = walk(n.a); const b = walk(n.b); return a && b && b.length === 1 && b[0] !== 0 ? a.map((v) => v / b[0]) : null; }
      case 'pow': {
        const exponent = walk(n.b);
        if (!exponent || exponent.length !== 1 || !Number.isInteger(exponent[0]) || exponent[0] < 0 || exponent[0] > 12) return null;
        const base = walk(n.a);
        if (!base) return null;
        let out = [1];
        for (let k = 0; k < exponent[0]; k += 1) out = mulP(out, base);
        return out;
      }
      default: return null;
    }
  }
  const result = walk(node);
  if (!result) return null;
  while (result.length > 1 && Math.abs(result.at(-1)) < 1e-12) result.pop();
  return result.map((v) => (Math.abs(v) < 1e-12 ? 0 : Number(v.toFixed(10))));
}

/** Katsayılardan okunur polinom: [3, 0, -2] → "-2x^2 + 3". */
export function polynomialText(coefficients, variable = 'x') {
  const parts = [];
  for (let i = coefficients.length - 1; i >= 0; i -= 1) {
    const c = coefficients[i];
    if (Math.abs(c) < 1e-12) continue;
    const abs = Math.abs(c);
    const coef = i > 0 && Math.abs(abs - 1) < 1e-12 ? '' : numberText(abs);
    const body = i === 0 ? numberText(abs) : `${coef}${variable}${i > 1 ? `^${i}` : ''}`;
    parts.push({ sign: c < 0 ? '-' : '+', body });
  }
  if (!parts.length) return '0';
  return parts.map((p, i) => (i === 0 ? (p.sign === '-' ? `-${p.body}` : p.body) : ` ${p.sign} ${p.body}`)).join('');
}

/** Kesir biçimi: 0,333.. → 1/3 (payda ≤ 64), değilse ondalık. */
export function fractionText(value, maxDen = 64) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value - Math.round(value)) < 1e-9) return numberText(Math.round(value));
  for (let den = 2; den <= maxDen; den += 1) {
    const top = Math.round(value * den);
    if (Math.abs(top / den - value) < 1e-9) return `${top < 0 ? '−' : ''}${Math.abs(top)}/${den}`;
  }
  return numberText(Number(value.toFixed(4))).replace('-', '−');
}

/** İkinci derece kökleri tam biçimde: A x² + B x + C → "2 ± √3", "1 ve 3", "−1/2 (çift katlı)". */
export function quadraticRootsText(A, B, C) {
  const delta = B * B - 4 * A * C;
  const r = -B / (2 * A);
  if (delta < -1e-12) return 'gerçel kök yok';
  if (Math.abs(delta) <= 1e-12) return `${fractionText(r)} (çift katlı)`;
  const rad = delta / (4 * A * A);
  const root = Math.sqrt(rad);
  if (Math.abs(root - Math.round(root * 1e6) / 1e6) < 1e-9 && Math.abs(root * 12 - Math.round(root * 12)) < 1e-9) {
    return `${fractionText(r - root)} ve ${fractionText(r + root)}`;
  }
  // √rad = k√m sadeleştirmesi (rad tam sayıysa).
  let outside = 1; let inside = rad;
  if (Number.isInteger(Number(rad.toFixed(9)))) {
    inside = Math.round(rad);
    for (let k = Math.floor(Math.sqrt(inside)); k > 1; k -= 1) if (inside % (k * k) === 0) { outside = k; inside /= k * k; break; }
  }
  const radical = Number.isInteger(Number(rad.toFixed(9))) ? `${outside > 1 ? outside : ''}√${inside}` : `√(${fractionText(rad)})`;
  return `${Math.abs(r) < 1e-12 ? '' : `${fractionText(r)} `}± ${radical}`;
}

/** [a, b] aralığında kökler: işaret değişimi + teğet (çift katlı) kökler, ikiye bölme ile inceltilir. */
export function findRoots(f, a, b, samples = 1600) {
  const roots = [];
  const push = (r) => { if (Number.isFinite(r) && !roots.some((q) => Math.abs(q - r) < (b - a) / samples * 1.5)) roots.push(r); };
  const step = (b - a) / samples;
  let prevX = a; let prevY = f(a);
  for (let i = 1; i <= samples; i += 1) {
    const x = a + i * step; const y = f(x);
    if (Number.isFinite(prevY) && Number.isFinite(y)) {
      if (prevY === 0) push(prevX);
      else if (prevY * y < 0 && Math.abs(prevY - y) < 1e6) {
        let lo = prevX; let hi = x; let flo = prevY;
        for (let k = 0; k < 60; k += 1) { const mid = (lo + hi) / 2; const fm = f(mid); if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; } }
        push((lo + hi) / 2);
      }
    }
    prevX = x; prevY = y;
  }
  if (Number.isFinite(prevY) && prevY === 0) push(prevX);
  // Teğet kökler: |f| yerel minimumu sıfıra çok yakınsa.
  for (let i = 1; i < samples; i += 1) {
    const x0 = a + (i - 1) * step; const x1 = a + i * step; const x2 = a + (i + 1) * step;
    const y0 = Math.abs(f(x0)); const y1 = Math.abs(f(x1)); const y2 = Math.abs(f(x2));
    if (y1 <= y0 && y1 <= y2 && y1 < 1e-6 * Math.max(1, Math.abs(b - a))) {
      let lo = x0; let hi = x2;
      for (let k = 0; k < 80; k += 1) { const m1 = lo + (hi - lo) / 3; const m2 = hi - (hi - lo) / 3; if (Math.abs(f(m1)) < Math.abs(f(m2))) hi = m2; else lo = m1; }
      if (Math.abs(f((lo + hi) / 2)) < 1e-7) push((lo + hi) / 2);
    }
  }
  return roots.sort((p, q) => p - q).map((r) => (Math.abs(r - Math.round(r)) < 1e-7 ? Math.round(r) : r));
}

/** Simpson kuralı ile belirli integral; |f| için abs = true. */
export function integrate(f, a, b, { abs = false, n = 2000 } = {}) {
  if (a === b) return 0;
  const sign = a < b ? 1 : -1;
  const lo = Math.min(a, b); const hi = Math.max(a, b);
  const h = (hi - lo) / n;
  const g = (x) => { const v = f(x); return Number.isFinite(v) ? (abs ? Math.abs(v) : v) : 0; };
  let sum = g(lo) + g(hi);
  for (let i = 1; i < n; i += 1) sum += g(lo + i * h) * (i % 2 ? 4 : 2);
  return sign * (sum * h) / 3;
}

/** Sayısal türev (merkezî fark). */
export const numericDerivative = (f, x, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h);

/** Ağaçtaki değişkeni başka bir ağaçla değiştirir: f(x) → f(2(x − 1)). */
export function substitute(node, variable, replacement) {
  switch (node.t) {
    case 'var': return node.n === variable ? replacement : node;
    case 'num': case 'const': return node;
    case 'neg': case 'fn': return { ...node, a: substitute(node.a, variable, replacement) };
    default: return { ...node, a: substitute(node.a, variable, replacement), b: substitute(node.b, variable, replacement) };
  }
}

/** Polinomsa açılmış biçimi, değilse sadeleştirilmiş ağacın yazımını verir. */
export function prettyText(node, variable = 'x') {
  const poly = toPolynomial(node, variable);
  return poly ? polynomialText(poly, variable) : toText(simplify(node));
}
