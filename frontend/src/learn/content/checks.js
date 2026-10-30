// Node denetimleri için formül ve ifade kontrolü (tarayıcı paketine girmez; yalnız testler içe aktarır).
import katex from 'katex';
import { compile, makeFunction, parse } from '../../interactive/kit/mathExpr.js';

export function checkMath(tex, display) {
  try {
    katex.renderToString(tex, { displayMode: display, throwOnError: true, strict: 'ignore' });
    return null;
  } catch (error) {
    return String(error.message).replace(/^KaTeX parse error: /, '').slice(0, 160);
  }
}

export function checkExpr(expr, variables) {
  const [first, ...rest] = variables;
  const result = makeFunction(expr, first, rest);
  if (result.error) return result.error;
  const env = Object.fromEntries(rest.map((name) => [name, 1]));
  const samples = [-2.3, -0.7, 0.4, 1.9, 3.1].map((x) => result.f(x, env));
  return samples.some(Number.isFinite) ? null : 'örnek noktalarda tanımsız';
}

/** Sayısal ifade (kontrol: alanı) → sayı; hata varsa null. */
export function evaluate(expr) {
  try {
    const value = compile(parse(String(expr).replace(/\\cdot|×/g, '*'), ['x']))({ x: 0 });
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** Basit sayısal şık metni ($-3$, $2{,}5$, $\frac{3}{4}$, $2\sqrt{3}$, 12) → sayı; değilse null. */
export function numericChoice(text) {
  let t = String(text ?? '').trim();
  const math = t.match(/^\$([^$]+)\$$/);
  if (math) t = math[1];
  else if (!/^[-−]?[\d\s.,]+$/.test(t)) return null;
  // "1, 0, 1" gibi virgül + boşlukla ayrılmış değerler bir listedir, ondalık sayı değil.
  if (/,\s/.test(t)) return null;
  t = t.replace(/\{,\}/g, '.')
    .replace(/\\,|\\!|\s+/g, '')
    .replace(/−/g, '-')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\\[dt]?frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))')
    .replace(/\\sqrt\[(\d+)\]\{([^{}]+)\}/g, '(($2)^(1/$1))')
    .replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)')
    .replace(/\\pi/g, 'pi')
    .replace(/\\cdot/g, '*')
    .replace(/\\left|\\right/g, '');
  if (/[a-zA-Z\\]/.test(t.replace(/sqrt|pi/g, ''))) return null;
  return evaluate(t);
}
