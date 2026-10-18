// Görsellerdeki fonksiyon ve önerme ifadeleri için güvenli, eval kullanmayan ayrıştırıcı.
// Sayısal dil: + - * / ^, tekli eksi, parantez, sayı, x/kaydırıcı adları, pi, e ve izinli fonksiyonlar.
// Mantık dili: değişkenler, ¬ ~ !, ∧ &, ∨ |, → =>, ↔ <=>, ⊻ ve parantez.

const FUNCTIONS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp, floor: Math.floor, ceil: Math.ceil,
};
const CONSTANTS = { pi: Math.PI, e: Math.E };

function tokenize(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) { i += 1; continue; }
    const number = /^(\d+(\.\d+)?|\.\d+)/.exec(text.slice(i));
    if (number) { tokens.push({ type: 'num', value: Number(number[0]) }); i += number[0].length; continue; }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(i));
    if (name) { tokens.push({ type: 'name', value: name[0] }); i += name[0].length; continue; }
    if ('+-*/^(),'.includes(ch)) { tokens.push({ type: 'op', value: ch }); i += 1; continue; }
    if (ch === '−') { tokens.push({ type: 'op', value: '-' }); i += 1; continue; }
    if (ch === '·' || ch === '×') { tokens.push({ type: 'op', value: '*' }); i += 1; continue; }
    throw new Error(`Beklenmeyen karakter: ${ch}`);
  }
  return tokens;
}

/** Sayısal ifadeyi derler; dönen fonksiyon (ortam) => sayı. Bilinmeyen ad derleme hatasıdır. */
export function compileExpr(text, variables = ['x']) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('İfade boş.');
  const tokens = tokenize(text);
  let pos = 0;
  const peek = () => tokens[pos];
  const take = (value) => {
    const token = tokens[pos];
    if (!token || (value !== undefined && token.value !== value)) throw new Error(`Beklenen: ${value ?? 'ifade'}`);
    pos += 1;
    return token;
  };
  const allowed = new Set(variables);
  function primary() {
    const token = peek();
    if (!token) throw new Error('İfade eksik.');
    if (token.type === 'num') { pos += 1; return () => token.value; }
    if (token.type === 'name') {
      pos += 1;
      if (Object.hasOwn(FUNCTIONS, token.value) && peek()?.value === '(') {
        take('(');
        const arg = additive();
        take(')');
        const fn = FUNCTIONS[token.value];
        return (env) => fn(arg(env));
      }
      if (token.value === 'min' || token.value === 'max') {
        take('(');
        const left = additive();
        take(',');
        const right = additive();
        take(')');
        const fn = token.value === 'min' ? Math.min : Math.max;
        return (env) => fn(left(env), right(env));
      }
      if (Object.hasOwn(CONSTANTS, token.value) && !allowed.has(token.value)) return () => CONSTANTS[token.value];
      if (allowed.has(token.value)) return (env) => env[token.value];
      throw new Error(`Bilinmeyen ad: ${token.value}`);
    }
    if (token.value === '(') {
      take('(');
      const inner = additive();
      take(')');
      return inner;
    }
    throw new Error(`Beklenmeyen simge: ${token.value}`);
  }
  function unary() {
    if (peek()?.value === '-') { take('-'); const inner = unary(); return (env) => -inner(env); }
    if (peek()?.value === '+') { take('+'); return unary(); }
    return power();
  }
  function power() {
    const base = primary();
    if (peek()?.value === '^') {
      take('^');
      const exponent = unary();
      return (env) => base(env) ** exponent(env);
    }
    return base;
  }
  function multiplicative() {
    let left = unary();
    while (peek()?.value === '*' || peek()?.value === '/') {
      const op = take().value;
      const right = unary();
      const l = left;
      left = op === '*' ? (env) => l(env) * right(env) : (env) => l(env) / right(env);
    }
    return left;
  }
  function additive() {
    let left = multiplicative();
    while (peek()?.value === '+' || peek()?.value === '-') {
      const op = take().value;
      const right = multiplicative();
      const l = left;
      left = op === '+' ? (env) => l(env) + right(env) : (env) => l(env) - right(env);
    }
    return left;
  }
  const result = additive();
  if (pos !== tokens.length) throw new Error(`Fazla simge: ${tokens[pos].value}`);
  return result;
}

const LOGIC_OPS = [
  ['<=>', 'iff'], ['↔', 'iff'], ['=>', 'imp'], ['→', 'imp'], ['⊻', 'xor'],
  ['∧', 'and'], ['&', 'and'], ['∨', 'or'], ['|', 'or'], ['¬', 'not'], ['~', 'not'], ['!', 'not'], ['(', '('], [')', ')'],
];

/** Önerme ifadesini derler; dönen fonksiyon (atamalar) => boolean. */
export function compileLogic(text, variables) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) { i += 1; continue; }
    const op = LOGIC_OPS.find(([symbol]) => text.startsWith(symbol, i));
    if (op) { tokens.push(op[1]); i += op[0].length; continue; }
    const name = /^[a-z]/.exec(text.slice(i));
    if (name && variables.includes(name[0])) { tokens.push({ name: name[0] }); i += 1; continue; }
    throw new Error(`Beklenmeyen önerme simgesi: ${text[i]}`);
  }
  let pos = 0;
  const peek = () => tokens[pos];
  const expect = (value) => { if (tokens[pos] !== value) throw new Error(`Beklenen: ${value}`); pos += 1; };
  function atom() {
    const token = peek();
    if (token === 'not') { pos += 1; const inner = atom(); return (env) => !inner(env); }
    if (token === '(') { pos += 1; const inner = iff(); expect(')'); return inner; }
    if (token && token.name) { pos += 1; return (env) => Boolean(env[token.name]); }
    throw new Error('Önerme eksik.');
  }
  const binary = (next, op, combine) => () => {
    let left = next();
    while (peek() === op) { pos += 1; const right = next(); const l = left; left = (env) => combine(l(env), right(env)); }
    return left;
  };
  const and = binary(atom, 'and', (a, b) => a && b);
  const or = binary(and, 'or', (a, b) => a || b);
  const xor = binary(or, 'xor', (a, b) => a !== b);
  function imp() {
    const left = xor();
    if (peek() === 'imp') { pos += 1; const right = imp(); return (env) => !left(env) || right(env); }
    return left;
  }
  const iff = binary(imp, 'iff', (a, b) => a === b);
  const result = iff();
  if (pos !== tokens.length) throw new Error('Önerme fazla simge içeriyor.');
  return result;
}

/** Değişkenlerin bütün doğruluk değeri atamaları (ilk satır hepsi D). */
export function truthAssignments(variables) {
  const rows = [];
  const total = 2 ** variables.length;
  for (let index = 0; index < total; index += 1) {
    const row = {};
    variables.forEach((name, position) => {
      row[name] = ((index >> (variables.length - position - 1)) & 1) === 0;
    });
    rows.push(row);
  }
  return rows;
}
