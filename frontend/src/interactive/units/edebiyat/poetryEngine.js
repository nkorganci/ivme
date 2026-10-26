// Şiir çözümleme (saf işlevler): heceleme, hece ölçüsü ve durak, redif–kafiye, uyak düzeni, aruz eşleştirme.
const VOWELS = 'aeıioöuüâîû';
const LONG = 'âîû';
const isVowel = (ch) => VOWELS.includes(ch);
const lower = (s) => s.toLocaleLowerCase('tr');

/** Sözcüğü hecelere ayırır (Türkçe kuralı: iki ünlü arasındaki tek ünsüz sonraki heceye geçer). */
export function syllabify(word) {
  const w = lower(word).replace(/[^a-zçğıöşüâîû]/g, '');
  if (!w) return [];
  const nuclei = [...w].map((ch, i) => (isVowel(ch) ? i : -1)).filter((i) => i >= 0);
  if (!nuclei.length) return [w];
  const cuts = [];
  for (let k = 0; k < nuclei.length - 1; k += 1) {
    const between = nuclei[k + 1] - nuclei[k] - 1;
    cuts.push(between <= 1 ? nuclei[k] + 1 : nuclei[k + 1] - 1);
  }
  const out = []; let start = 0;
  for (const cut of cuts) { out.push(w.slice(start, cut)); start = cut; }
  out.push(w.slice(start));
  return out;
}

/** Dizenin heceleri: { text, open } — açık hece ünlüyle biter (uzun ünlü kapalı sayılır). */
export function lineSyllables(line) {
  // Kesme işareti (şem'i) hece sınırıdır.
  return lower(line).split(/\s+/).filter(Boolean).flatMap((word, wi) => word.split(/['’]/).flatMap(syllabify).map((syl, si, all) => ({
    text: syl, word: wi, last: si === all.length - 1,
    open: isVowel(syl.at(-1)) && !LONG.includes(syl.at(-1)),
  })));
}

/** Hece sayısına göre olası duraklar (sözcük sınırına denk gelenler). */
export function durakOptions(syllables) {
  const n = syllables.length;
  const PATTERNS = { 6: [[3, 3]], 7: [[4, 3], [3, 4]], 8: [[4, 4], [5, 3]], 9: [[4, 5], [5, 4]], 10: [[5, 5], [6, 4]], 11: [[6, 5], [4, 4, 3]], 12: [[6, 6], [4, 4, 4]], 13: [[7, 6]], 14: [[7, 7], [4, 4, 3, 3]], 15: [[8, 7], [4, 4, 4, 3]], 16: [[8, 8]] };
  return (PATTERNS[n] ?? []).filter((pattern) => {
    let pos = 0;
    return pattern.slice(0, -1).every((len) => { pos += len; return syllables[pos - 1]?.last; });
  }).map((p) => p.join(' + '));
}

/** Ses uyumu normalleştirmesi: redif karşılaştırmasında ek varyantlarını eşitler. */
export const normalize = (s) => lower(s).replace(/[ae]/g, 'A').replace(/[ıiuü]/g, 'I').replace(/[dt]/g, 'D').replace(/[cç]/g, 'C').replace(/[kğg]/g, 'K');

const lastWord = (line) => lower(line).replace(/[^a-zçğıöşüâîû\s]/g, ' ').trim().split(/\s+/).at(-1) ?? '';
const tailWords = (line, n) => lower(line).replace(/[^a-zçğıöşüâîû\s]/g, ' ').trim().split(/\s+/).slice(-n).join(' ');

/** İki dizenin uyak çözümlemesi: redif (aynı görevde ek/sözcük) ve kafiye (önceki ortak sesler). */
export function rhymePair(lineA, lineB) {
  // Önce sondaki tam sözcük tekrarları (sözcük redifi).
  let wordRedif = '';
  for (let n = 1; n <= 3; n += 1) {
    const a = tailWords(lineA, n); const b = tailWords(lineB, n);
    if (a && a === b && a.split(' ').length === n && lineA.trim().split(/\s+/).length > n) wordRedif = a; else break;
  }
  const strip = (line) => (wordRedif ? lower(line).replace(/[^a-zçğıöşüâîû\s]/g, ' ').trim().split(/\s+/).slice(0, -wordRedif.split(' ').length).join(' ') : lower(line));
  const wa = lastWord(strip(lineA)); const wb = lastWord(strip(lineB));
  if (!wa || !wb) return { redif: wordRedif, kafiye: '', type: 'yok', words: [wa, wb] };
  if (wa === wb) return { redif: wordRedif ? `${wa} ${wordRedif}` : wa, kafiye: '', type: 'sözcük tekrarı (redif)', words: [wa, wb] };
  // Ek redifi: normalize sonun ortak kısmı, en az bir ünlü içerip sözcüğün tamamı olmayan.
  const na = normalize(wa); const nb = normalize(wb);
  let common = 0;
  while (common < Math.min(na.length, nb.length) && na[na.length - 1 - common] === nb[nb.length - 1 - common]) common += 1;
  // Ek redifi sözcüğün kök kısmına taşmasın: en uzun ortak sonun içindeki son ek kümesini (en çok 5 harf) al.
  const SUFFIXES = ['mADIm', 'mADIK', 'mADI', 'mIşIm', 'DIm', 'DIK', 'DIn', 'lArDAn', 'lArDA', 'lArI', 'lAr', 'DIr', 'mIş', 'DI', 'sIn', 'yAlIm', 'AlIm', 'IyOr', 'yOr', 'AcAK', 'DAn', 'DA', 'Im', 'In', 'IKIm', 'mAK', 'mAz', 'sA', 'lI', 'sIz', 'CA', 'lA', 'yA', 'A', 'I'].map((x) => x.replace(/O/g, 'o'));
  const sharedTail = na.slice(na.length - common);
  let redifLen = 0;
  for (const suffix of SUFFIXES) if (sharedTail.endsWith(suffix) && suffix.length > redifLen && suffix.length < Math.min(wa.length, wb.length)) redifLen = suffix.length;
  const redifA = wa.slice(wa.length - redifLen); const redifB = wb.slice(wb.length - redifLen);
  const baseA = wa.slice(0, wa.length - redifLen); const baseB = wb.slice(0, wb.length - redifLen);
  let k = 0;
  while (k < Math.min(baseA.length, baseB.length) && baseA[baseA.length - 1 - k] === baseB[baseB.length - 1 - k]) k += 1;
  const kafiye = baseA.slice(baseA.length - k);
  const type = k === 0 ? 'kafiye yok' : k === 1 ? 'yarım kafiye' : k === 2 ? 'tam kafiye' : 'zengin kafiye';
  const redifText = [redifLen ? (redifA === redifB ? redifA : `${redifA} / ${redifB}`) : '', wordRedif].filter(Boolean).join(' + ');
  return { redif: redifText, kafiye, type, words: [wa, wb] };
}

/** Uyak düzeni: son sözcük sonları benzeyen dizelere aynı harf. */
export function rhymeScheme(lines) {
  const keys = []; const letters = [];
  lines.forEach((line) => {
    const whole = lower(line).trim();
    const end = normalize(lastWord(line)).slice(-3);
    let idx = keys.findIndex((k) => k.whole === whole || (k.end.length >= 2 && end.length >= 2 && (k.end.slice(-2) === end.slice(-2))));
    if (idx < 0) { keys.push({ whole, end }); idx = keys.length - 1; }
    letters.push(String.fromCharCode(97 + idx));
  });
  return letters.join('');
}

/** Nazım biçimi önerileri (hece sayısı + dize sayısı + uyak düzeni). */
export function formSuggestions(lines, counts, scheme) {
  const n = lines.length; const common = counts.length && counts.every((c) => c === counts[0]) ? counts[0] : null;
  const out = [];
  if (n === 4 && common === 7 && /^aa.a$/.test(scheme)) out.push('Mani (7\'li hece, aaxa)');
  if (n % 4 === 0 && common === 11) out.push('Koşma / destan (11\'li hece; koşmada 6 + 5 durak)');
  if (n % 4 === 0 && common === 8) out.push('Semai (8\'li hece)');
  if (n === 4 && /^aaba$/.test(scheme)) out.push('Rubai / tuyuğ düzeni (aaxa) — aruzla yazılmışsa rubai ya da tuyuğ');
  if (n === 4 && /^aaab$/.test(scheme)) out.push('Dörtlük; dördüncü dize nakarat (tekrar) olabilir');
  if (!out.length) out.push(common ? `${common}'li hece ölçüsüyle ${n} dize` : 'Dizelerin hece sayıları farklı: serbest ölçü olabilir');
  return out;
}

export const ARUZ = [
  { name: 'Fâilâtün Fâilâtün Fâilâtün Fâilün', marks: '–.–– –.–– –.–– –.–' },
  { name: 'Mefâîlün Mefâîlün Mefâîlün Mefâîlün', marks: '.––– .––– .––– .–––' },
  { name: 'Mef\'ûlü Mefâîlü Mefâîlü Feûlün', marks: '––. .––. .––. .––' },
  { name: 'Feilâtün Feilâtün Feilâtün Feilün', marks: '..–– ..–– ..–– ..–' },
  { name: 'Müstef\'ilün Müstef\'ilün Müstef\'ilün Müstef\'ilün', marks: '––.– ––.– ––.– ––.–' },
  { name: 'Mef\'ûlü Fâilâtü Mefâîlü Fâilün', marks: '––. –.–. .––. –.–' },
  { name: 'Fâilâtün Fâilâtün Fâilün', marks: '–.–– –.–– –.–' },
];

/** Hece işaretlerini (. açık, – kapalı) kalıplarla karşılaştırır; son hece serbesttir. */
export function aruzMatch(marks) {
  return ARUZ.map((pattern) => {
    const target = pattern.marks.replace(/\s/g, '');
    if (target.length !== marks.length) return { ...pattern, score: 0, mismatches: [], lengthOk: false };
    const mismatches = [];
    for (let i = 0; i < target.length - 1; i += 1) if (target[i] !== marks[i]) mismatches.push(i);
    return { ...pattern, score: 1 - mismatches.length / target.length, mismatches, lengthOk: true };
  }).sort((p, q) => q.score - p.score);
}

/** Elle düzeltilmiş redif uzunluğuyla (son sözcükten kaç harf) kafiye çözümlemesi. */
export function rhymeWithRedif(lineA, lineB, redifLen) {
  const wa = lastWord(lineA); const wb = lastWord(lineB);
  const n = Math.max(0, Math.min(redifLen, wa.length - 1, wb.length - 1));
  const baseA = wa.slice(0, wa.length - n); const baseB = wb.slice(0, wb.length - n);
  let k = 0;
  while (k < Math.min(baseA.length, baseB.length) && baseA[baseA.length - 1 - k] === baseB[baseB.length - 1 - k]) k += 1;
  return { redif: n ? `${wa.slice(-n)}${wa.slice(-n) !== wb.slice(-n) ? ` / ${wb.slice(-n)}` : ''}` : '', kafiye: baseA.slice(baseA.length - k),
    type: k === 0 ? 'kafiye yok' : k === 1 ? 'yarım kafiye' : k === 2 ? 'tam kafiye' : 'zengin kafiye', words: [wa, wb], redifLen: n };
}
