// Öğretim metinlerindeki küçük matematik işaretlemesi: x^2, x^{n+1}, a_{1}, a_n.
// Metin çoğunlukla Unicode (², √, ≤) yazılır; bu ayrıştırıcı yalnız üs ve alt simgeyi biçimler.

export function parseRich(text) {
  const source = String(text ?? '');
  const parts = [];
  let buffer = '';
  const flush = () => { if (buffer) { parts.push({ type: 'text', value: buffer }); buffer = ''; } };
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const prev = source[i - 1];
    if ((ch === '^' || ch === '_') && prev && /[\p{L}\p{N})\]]/u.test(prev)) {
      const type = ch === '^' ? 'sup' : 'sub';
      if (source[i + 1] === '{') {
        const end = source.indexOf('}', i + 2);
        if (end > i + 1) {
          flush();
          parts.push({ type, value: source.slice(i + 2, end) });
          i = end;
          continue;
        }
      }
      const token = /^[-−]?[\p{L}\p{N}]+/u.exec(source.slice(i + 1));
      if (token) {
        flush();
        parts.push({ type, value: token[0] });
        i += token[0].length;
        continue;
      }
    }
    buffer += ch;
  }
  flush();
  return parts;
}

/** Kıvrık parantezler dengeli mi? İçerik denetimi için. */
export function balanced(text) {
  let depth = 0;
  for (const ch of String(text ?? '')) {
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}
