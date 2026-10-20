const FUNCTIONS = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'log', 'ln', 'abs', 'exp']);

export function calculate(expression, degrees = true) {
  if (typeof expression !== 'string' || expression.length > 160) throw Error('İfade çok uzun.');
  const tokens = [];
  const source = expression.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('π', 'pi');
  for (let i = 0; i < source.length;) {
    if (/\s/.test(source[i])) { i++; continue; }
    const match = /^(?:\d+(?:\.\d*)?|\.\d+|[a-z]+|[()+\-*/^!])/.exec(source.slice(i));
    if (!match) throw Error('İfadede tanınmayan karakter var.');
    tokens.push(match[0]);
    i += match[0].length;
  }
  let position = 0;
  const take = (token) => tokens[position] === token && !!++position;
  const primary = () => {
    const token = tokens[position++];
    if (token === '(') {
      const value = sum();
      if (!take(')')) throw Error('Parantez kapanmadı.');
      return value;
    }
    if (token === 'pi') return Math.PI;
    if (token === 'e') return Math.E;
    if (FUNCTIONS.has(token)) {
      if (!take('(')) throw Error('Fonksiyon için parantez aç.');
      const value = sum();
      if (!take(')')) throw Error('Fonksiyon parantezi kapanmadı.');
      const angle = degrees ? value * Math.PI / 180 : value;
      switch (token) {
        case 'sin': return Math.sin(angle);
        case 'cos': return Math.cos(angle);
        case 'tan': if (Math.abs(Math.cos(angle)) < 1e-12) throw Error('Tanjant bu açıda tanımsız.'); return Math.tan(angle);
        case 'asin': return Math.asin(value) * (degrees ? 180 / Math.PI : 1);
        case 'acos': return Math.acos(value) * (degrees ? 180 / Math.PI : 1);
        case 'atan': return Math.atan(value) * (degrees ? 180 / Math.PI : 1);
        case 'sqrt': return Math.sqrt(value);
        case 'log': return Math.log10(value);
        case 'ln': return Math.log(value);
        case 'abs': return Math.abs(value);
        case 'exp': return Math.exp(value);
        default: throw Error('Fonksiyon tanınmadı.');
      }
    }
    if (token && /^(?:\d|\.)/.test(token)) return Number(token);
    throw Error('Sayı veya fonksiyon bekleniyor.');
  };
  const factorial = () => {
    let value = primary();
    while (take('!')) {
      if (!Number.isInteger(value) || value < 0 || value > 170) throw Error('Faktöriyel için 0–170 arası tam sayı kullan.');
      let result = 1;
      for (let n = 2; n <= value; n++) result *= n;
      value = result;
    }
    return value;
  };
  const power = () => {
    const base = factorial();
    return take('^') ? Math.pow(base, unary()) : base;
  };
  const unary = () => take('+') ? unary() : take('-') ? -unary() : power();
  const product = () => {
    let value = unary();
    while (tokens[position] === '*' || tokens[position] === '/') {
      const operation = tokens[position++];
      value = operation === '*' ? value * unary() : value / unary();
    }
    return value;
  };
  const sum = () => {
    let value = product();
    while (tokens[position] === '+' || tokens[position] === '-') {
      const operation = tokens[position++];
      value = operation === '+' ? value + product() : value - product();
    }
    return value;
  };
  const result = sum();
  if (position !== tokens.length) throw Error('İfade tamamlanamadı.');
  if (!Number.isFinite(result)) throw Error('Sonuç tanımsız.');
  return Number(result.toPrecision(12));
}
