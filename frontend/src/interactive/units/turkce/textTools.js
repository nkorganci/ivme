// Türkçe metin araçları (saf işlevler): cümle bölme, bağlayıcı/gönderim sözcükleri, sözcük örtüşmesi.

/** Paragrafı cümlelere böler (., !, ?, … sonrası boşluk + büyük harf). */
export function splitSentences(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim()
    .split(/(?<=[.!?…])\s+(?=["'“‘(]?[A-ZÇĞİÖŞÜ0-9])/u).map((s) => s.trim()).filter(Boolean);
}

// Başında bulunduğunda cümleyi önceki cümleye bağlayan sözler (giriş cümlesi olamaz).
export const CONNECTORS = [
  { words: ['sonuç olarak', 'kısacası', 'özetle', 'demek ki', 'bu yüzden', 'bu nedenle', 'bundan dolayı', 'dolayısıyla', 'böylece', 'işte bu yüzden', 'bu sebeple'], kind: 'sonuç', text: 'sonuç bildirir; çoğu zaman paragrafın sonundadır' },
  { words: ['ancak', 'fakat', 'ama', 'oysa', 'oysaki', 'ne var ki', 'buna karşın', 'buna rağmen', 'öte yandan', 'bununla birlikte', 'yine de'], kind: 'karşıtlık', text: 'önceki düşünceye karşıtlık getirir' },
  { words: ['örneğin', 'mesela', 'söz gelimi', 'sözgelimi', 'nitekim'], kind: 'örnek', text: 'önceki düşünceye örnek verir' },
  { words: ['ayrıca', 'üstelik', 'dahası', 'hatta', 'bunun yanında', 'bunun yanı sıra', 'bir de', 'yine'], kind: 'ekleme', text: 'önceki düşünceye ekleme yapar' },
  { words: ['çünkü', 'zira'], kind: 'neden', text: 'önceki yargının nedenini verir' },
  { words: ['bu', 'bunu', 'buna', 'bunun', 'bunlar', 'bunları', 'bunların', 'böyle', 'böylesi', 'şu', 'onun', 'onlar', 'onları', 'o'], kind: 'gönderim', text: 'önceki cümledeki bir öğeye gönderme yapar' },
  { words: ['ise'], kind: 'karşılaştırma', text: '"… ise" karşılaştırma/geçiş bildirir' },
];

const lower = (s) => s.toLocaleLowerCase('tr');

/** Cümlenin başındaki ve içindeki bağlayıcıları bulur. */
export function connectorsIn(sentence) {
  const text = lower(sentence).replace(/[“”"'‘’(),;:.!?…]/g, ' ').replace(/\s+/g, ' ').trim();
  const found = [];
  for (const group of CONNECTORS) {
    for (const word of group.words) {
      const re = new RegExp(`(^|\\s)${word}(\\s|$)`, 'u');
      const match = re.exec(text);
      if (match) found.push({ word, kind: group.kind, text: group.text, initial: match.index === 0 && (group.kind !== 'karşılaştırma') });
    }
  }
  // Uzun ifade bulunduysa ondaki kısa sözü (ör. "bu nedenle" içindeki "bu") tekrar sayma.
  return found.filter((f) => !found.some((g) => g !== f && g.word.length > f.word.length && g.word.includes(f.word)));
}

/** Giriş cümlesi olabilir mi? (Başta bağlayıcı/gönderim yoksa.) */
export function canBeIntro(sentence) {
  return !connectorsIn(sentence).some((c) => c.initial);
}

/** Basit kök: küçük harf, noktalama yok, 5 harfe kadar kırpma. */
export function stems(text) {
  return lower(text).replace(/[^a-zçğıöşü\s]/gu, ' ').split(/\s+/).filter((w) => w.length >= 4).map((w) => w.slice(0, 5));
}
const STOP = new Set(['için', 'olan', 'olar', 'gibi', 'daha', 'kada', 'kendi', 'bütü', 'herk', 'hiçb', 'değil', 'deği', 'bile', 'ancak', 'anca', 'sonr', 'önce', 'çünk', 'bunu', 'buna', 'bunl', 'böyl', 'olma', 'ola', 'yapa']);

/** Seçenek ile cümle arasındaki ortak kökler (kanıt adayı). */
export function overlap(option, sentence) {
  const a = new Set(stems(option).filter((s) => !STOP.has(s)));
  return [...new Set(stems(sentence).filter((s) => a.has(s)))];
}

/** Cümlede ortak köklere uyan sözcükleri işaretlemek için parçalar. */
export function highlightParts(sentence, keys) {
  if (!keys.length) return [{ text: sentence, hit: false }];
  return sentence.split(/(\s+)/).map((part) => {
    const stem = lower(part).replace(/[^a-zçğıöşü]/gu, '').slice(0, 5);
    return { text: part, hit: stem.length >= 4 && keys.includes(stem) };
  });
}
