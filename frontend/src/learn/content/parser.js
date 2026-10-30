// Ders kaynak biçimi (.ders) → ders nesnesi. Biçim docs/icerik/konuyu-ogrenelim.md içinde anlatılır.
// Saf işlev: tarayıcı (Vite ?raw) ve Node doğrulama testi aynı ayrıştırıcıyı kullanır.

const HEADER_KEYS = {
  baslik: 'title', kisa: 'short', sinav: 'exams', unite: 'unit', sinif: 'grade', sira: 'order', onkosul: 'prereq',
  karisan: 'confused', kategori: 'categories', hedef: 'goal', neden: 'why', kaynak: 'sources', tekrar: 'reviewMinutes',
  'ustalik-dk': 'masteryMinutes', anahtar: 'keywords', 'baslik-kurali': 'headingRules', haric: 'excludeRules',
  'hedef-sure': 'targetSeconds', 'banka-varsayilan': 'bankDefault',
};
const LIST_KEYS = new Set(['exams', 'prereq', 'confused', 'categories']);
const PIPE_KEYS = new Set(['sources', 'keywords', 'headingRules', 'excludeRules']);

export class LessonError extends Error {
  constructor(message, line) {
    super(line ? `${line}. satır: ${message}` : message);
    this.line = line;
  }
}

const splitPipe = (value) => value.split('|').map((part) => part.trim()).filter(Boolean);
// Konumlu alanlar (grafik, sayı doğrusu, kaydırıcı): boş alan korunur; "nokta: 1 2 | | green" etiketsiz yeşil noktadır.
const splitFields = (value) => value.split('|').map((part) => part.trim());
// Anahtar kelime ve başlık kuralları " | " ile ayrılır; boşluksuz | bir düzenli ifadenin parçasıdır.
const splitRules = (value) => value.split(/\s\|\s/).map((part) => part.trim()).filter(Boolean);
const splitWords = (value) => value.split(/[\s,]+/).map((part) => part.trim()).filter(Boolean);

function splitOnce(text, separator) {
  const at = text.indexOf(separator);
  return at < 0 ? [text, ''] : [text.slice(0, at), text.slice(at + separator.length)];
}

/** `tip id key=değer key="boşluklu değer"` başlığı. */
export function parseHead(head) {
  const match = head.match(/^(\S+)\s*(.*)$/);
  const type = match ? match[1] : head;
  const attrs = {};
  const positional = [];
  const pattern = /([\p{L}\w-]+)=("([^"]*)"|\S+)|("([^"]*)")|(\S+)/gu;
  let part;
  while ((part = pattern.exec(match ? match[2] : ''))) {
    if (part[1]) attrs[part[1]] = part[3] ?? part[2];
    else positional.push(part[5] ?? part[6]);
  }
  return { type, attrs, positional };
}

function keyValues(lines, lineOf) {
  const out = {};
  let last = null;
  lines.forEach((line, i) => {
    if (!line.trim() || line.trim().startsWith('%%')) return;
    const match = line.match(/^([\p{L}\w-]+):\s?(.*)$/u);
    if (match) {
      last = match[1];
      out[last] = match[2].trim();
    } else if (last) out[last] += ` ${line.trim()}`;
    else throw new LessonError(`"anahtar: değer" bekleniyordu: ${line.trim()}`, lineOf(i));
  });
  return out;
}

function bulletList(lines) {
  const items = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(/^\s*[-•]\s+(.*)$/);
    if (match) items.push(match[1].trim());
    else if (items.length) items[items.length - 1] += ` ${line.trim()}`;
    else items.push(line.trim());
  }
  return items;
}

function pairList(lines) {
  return bulletList(lines).map((item) => {
    const [left, right] = splitOnce(item, '::');
    return [left.trim(), right.trim()];
  });
}

const numberedStep = /^(\?)?(\d+)[.)]\s+(.*)$/;

function steps(lines) {
  const result = { problem: '', steps: [], answer: '', cue: '' };
  let target = null;
  for (const line of lines) {
    if (!line.trim()) {
      if (target === 'problem') result.problem += '\n';
      continue;
    }
    const key = line.match(/^(soru|cevap|ipucu):\s?(.*)$/);
    if (key) {
      target = { soru: 'problem', cevap: 'answer', ipucu: 'cue' }[key[1]];
      result[target] = key[2].trim();
      continue;
    }
    const step = line.match(numberedStep);
    if (step) {
      const [text, why] = splitOnce(step[3], ' || ');
      result.steps.push({ text: text.trim(), why: why.trim(), hidden: !!step[1] });
      target = 'step';
      continue;
    }
    if (target === 'step') {
      const last = result.steps[result.steps.length - 1];
      last.text += `\n${line.trim()}`;
    } else if (target) result[target] += (result[target] ? '\n' : '') + line.trim();
    else {
      target = 'problem';
      result.problem = line.trim();
    }
  }
  result.problem = result.problem.trim();
  return result;
}

function parseQuestion(lessonId, attrs, positional, lines, line) {
  const localId = positional[0];
  if (!localId) throw new LessonError('Soru kimliği eksik (::soru k1 ...).', line);
  const stem = [];
  const choices = [];
  const explain = [];
  let hint = '';
  let misconception = null;
  let check = null;
  let mode = 'stem';
  for (const raw of lines) {
    const choice = raw.match(/^(\+)?([A-E])\)\s?(.*)$/);
    if (choice) {
      const [text, feedback] = splitOnce(choice[3], ' || ');
      choices.push({ key: choice[2], text: text.trim(), feedback: feedback.trim(), correct: !!choice[1] });
      mode = 'choices';
      continue;
    }
    const key = raw.match(/^(cozum|ipucu|yanilgi|kontrol):\s?(.*)$/);
    if (key) {
      mode = key[1];
      if (mode === 'cozum') explain.push(key[2]);
      else if (mode === 'ipucu') hint = key[2].trim();
      else if (mode === 'kontrol') check = key[2].trim() || null;
      else misconception = key[2].trim() || null;
      continue;
    }
    if (mode === 'stem') stem.push(raw);
    else if (mode === 'cozum') explain.push(raw);
    else if (mode === 'ipucu' && raw.trim()) hint += ` ${raw.trim()}`;
    else if (mode === 'choices' && raw.trim() && choices.length) {
      const last = choices[choices.length - 1];
      last.feedback = `${last.feedback} ${raw.trim()}`.trim();
    }
  }
  const correct = choices.filter((c) => c.correct);
  return {
    id: `${lessonId}:${localId}`, localId, stem: stem.join('\n').trim(), choices,
    answer: correct.length === 1 ? correct[0].key : null, explain: explain.join('\n').trim(), hint,
    archetype: attrs.tip ?? null, difficulty: Number(attrs.zorluk ?? 1), misconception, check, line,
  };
}

function leveled(lines) {
  const levels = {};
  let current = null;
  for (const line of lines) {
    const match = line.match(/^(L[123]):\s?(.*)$/);
    if (match) {
      current = match[1];
      levels[current] = match[2];
    } else if (current) levels[current] += `\n${line}`;
    else if (line.trim()) {
      current = 'L2';
      levels.L2 = line;
    }
  }
  for (const key of Object.keys(levels)) levels[key] = levels[key].trim();
  return levels;
}

const INQUIRY_FIELDS = { durum: 'situation', soru: 'prompt', neden: 'why', sinav: 'exam', dusun: 'reflect', yanit: 'reflectAnswer' };

/** Günlük hayattan sorgula: durum → soru → seçenekler (A–E, `+` doğru, `||` geri bildirim) → neden → sınavdaki karşılığı. */
function inquiry(lines, line) {
  const out = { situation: '', prompt: '', choices: [], why: '', exam: '', reflect: '', reflectAnswer: '' };
  let target = null;
  for (const raw of lines) {
    if (!raw.trim() || raw.startsWith('%%')) continue;
    const choice = raw.match(/^(\+)?([A-E])\)\s?(.*)$/);
    if (choice) {
      const [text, feedback] = splitOnce(choice[3], ' || ');
      out.choices.push({ key: choice[2], text: text.trim(), feedback: feedback.trim(), correct: !!choice[1] });
      target = 'choice';
      continue;
    }
    const key = raw.match(/^([\p{L}\w-]+):\s?(.*)$/u);
    if (key && INQUIRY_FIELDS[key[1]]) {
      target = INQUIRY_FIELDS[key[1]];
      out[target] = key[2].trim();
      continue;
    }
    if (target === 'choice') {
      const last = out.choices[out.choices.length - 1];
      last.feedback = `${last.feedback} ${raw.trim()}`.trim();
    } else if (target) out[target] += ` ${raw.trim()}`;
    else throw new LessonError(`::sorgula "durum:" ile başlamalı: ${raw.trim()}`, line);
  }
  return out;
}

function plotSpec(lines) {
  const spec = { fns: [], points: [], areas: [], vlines: [], hlines: [], segments: [], texts: [], x: [-6, 6], y: [-6, 6], pi: false, equal: false };
  for (const line of lines) {
    const match = line.match(/^([\p{L}\w-]+):\s?(.*)$/u);
    if (!match) continue;
    const [key, value] = [match[1], match[2].trim()];
    const parts = splitFields(value);
    const nums = (text) => splitWords(text).map(Number);
    switch (key) {
      case 'x': spec.x = nums(value); break;
      case 'y': spec.y = nums(value); break;
      case 'f': spec.fns.push({ expr: parts[0], color: parts[1] || 'navy', label: parts[2] || '', domain: parts[3] ? nums(parts[3]) : null, dashed: parts.includes('kesik') }); break;
      case 'nokta': { const [px, py] = nums(parts[0]); spec.points.push({ x: px, y: py, label: parts[1] || '', color: parts[2] || 'red', hollow: parts.includes('bos') }); break; }
      case 'alan': spec.areas.push({ expr: parts[0], from: nums(parts[1])[0], to: nums(parts[1])[1], color: parts[2] || 'blue', base: parts[3] || null }); break;
      case 'dikey': spec.vlines.push({ x: Number(parts[0]), label: parts[1] || '' }); break;
      case 'yatay': spec.hlines.push({ y: Number(parts[0]), label: parts[1] || '' }); break;
      case 'parca': { const [x1, y1, x2, y2] = nums(parts[0]); spec.segments.push({ from: [x1, y1], to: [x2, y2], color: parts[1] || 'black', dashed: parts.includes('kesik') }); break; }
      case 'yazi': { const [tx, ty] = nums(parts[0]); spec.texts.push({ x: tx, y: ty, text: parts[1] || '', color: parts[2] || 'ink' }); break; }
      case 'pi': spec.pi = /^(evet|1|true)$/i.test(value); break;
      case 'esit': spec.equal = /^(evet|1|true)$/i.test(value); break;
      case 'xetiket': spec.xLabel = value; break;
      case 'yetiket': spec.yLabel = value; break;
      default: break;
    }
  }
  return spec;
}

function numberLineSpec(lines) {
  const spec = { range: [-5, 5], intervals: [], points: [], ticks: null };
  for (const line of lines) {
    const match = line.match(/^([\p{L}\w-]+):\s?(.*)$/u);
    if (!match) continue;
    const parts = splitFields(match[2]);
    if (match[1] === 'x') spec.range = splitWords(match[2]).map(Number);
    if (match[1] === 'isaret') spec.ticks = splitWords(match[2]).map(Number);
    if (match[1] === 'aralik') {
      // aralik: -2 3 | ac kapali | etiket   (sonsuz için -inf / inf)
      const [from, to] = splitWords(parts[0]).map((v) => (v === '-inf' ? -Infinity : v === 'inf' ? Infinity : Number(v)));
      const ends = splitWords(parts[1] || 'kapali kapali');
      spec.intervals.push({ from, to, openFrom: ends[0] === 'ac', openTo: (ends[1] ?? ends[0]) === 'ac', label: parts[2] || '', color: parts[3] || 'blue' });
    }
    if (match[1] === 'nokta') spec.points.push({ x: Number(parts[0]), open: parts[1] === 'ac', label: parts[2] || '' });
  }
  return spec;
}

function tableSpec(lines) {
  const rows = lines.filter((line) => line.trim().startsWith('|') && !/^\|\s*:?-{2,}/.test(line.trim()))
    .map((line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()));
  return { columns: rows[0] ?? [], rows: rows.slice(1) };
}

function sliderSpec(lines) {
  const spec = { expr: '', params: [], x: [-6, 6], y: [-6, 6], prompt: '', fns: [] };
  for (const line of lines) {
    const match = line.match(/^([\p{L}\w-]+):\s?(.*)$/u);
    if (!match) continue;
    const [key, value] = [match[1], match[2].trim()];
    if (key === 'f') {
      const parts = splitFields(value);
      spec.fns.push({ expr: parts[0], color: parts[1] || 'navy', label: parts[2] || '' });
      if (!spec.expr) spec.expr = parts[0];
    } else if (key === 'x') spec.x = splitWords(value).map(Number);
    else if (key === 'y') spec.y = splitWords(value).map(Number);
    else if (key === 'soru') spec.prompt = value;
    else if (/^[a-wz]$/.test(key)) {
      const [min, max, initial, step] = splitWords(value).map(Number);
      spec.params.push({ name: key, min, max, value: initial ?? min, step: step ?? 1 });
    }
  }
  return spec;
}

function parseBlock(lessonId, head, lines, line) {
  const { type, attrs, positional } = parseHead(head);
  const text = lines.join('\n').trim();
  const title = attrs.baslik ?? '';
  switch (type) {
    case 'metin': return { type: 'markdown', text };
    case 'kesfet': return { type: 'exploration', conceptId: positional[0] || lessonId };
    case 'fikir': return { type: 'key_idea', text, title };
    case 'not': return { type: 'note', text, tone: attrs.ton ?? 'info', title };
    case 'duzey': return { type: 'leveled', levels: leveled(lines), title };
    case 'gorsel': return { type: 'visual', svg: text, alt: attrs.alt ?? '', caption: attrs.aciklama ?? '' };
    case 'grafik': return { type: 'plot', spec: plotSpec(lines), alt: attrs.alt ?? '', caption: attrs.aciklama ?? '' };
    case 'sayidogrusu': return { type: 'numberline', spec: numberLineSpec(lines), alt: attrs.alt ?? '', caption: attrs.aciklama ?? '' };
    case 'tablo': return { type: 'table', ...tableSpec(lines), caption: title };
    case 'soru': return { type: 'quick_check', question: parseQuestion(lessonId, attrs, positional, lines, line) };
    case 'yanilgi': {
      const values = keyValues(lines, () => line);
      return { type: 'misconception', id: positional[0] ?? null, archetype: attrs.tip ?? null, wrong: values.yanlis ?? '', why: values.neden ?? '', right: values.dogru ?? '' };
    }
    case 'ornek': return { type: 'worked', title, ...steps(lines) };
    case 'tamamla': return { type: 'faded', title, ...steps(lines) };
    case 'strateji': return { type: 'strategy', archetype: attrs.tip ?? null, title, ...steps(lines) };
    case 'bilmelisin': return { type: 'must_know', title, items: bulletList(lines) };
    case 'ozet': return { type: 'summary', title, items: bulletList(lines) };
    case 'adimlar': return { type: 'reveal_steps', title, ...steps(lines) };
    case 'cevir': return { type: 'flip_cards', title, cards: pairList(lines).map(([front, back]) => ({ front, back })) };
    case 'bosluk': {
      const [prompt, explain] = splitOnce(text, '\ncozum:');
      return {
        type: 'fill_blank', id: `${lessonId}:${positional[0]}`, localId: positional[0], prompt: prompt.trim(), explain: explain.trim(),
        answers: splitPipe(attrs.cevap ?? ''), tolerance: Number(attrs.tolerans ?? 1e-9), archetype: attrs.tip ?? null,
        difficulty: Number(attrs.zorluk ?? 1), unit: attrs.birim ?? '', line,
      };
    }
    case 'eslestir': return { type: 'match_pairs', id: `${lessonId}:${positional[0]}`, localId: positional[0], title, pairs: pairList(lines), line };
    case 'sirala': return { type: 'drag_order', id: `${lessonId}:${positional[0]}`, localId: positional[0], title, items: steps(lines).steps.map((s) => s.text), line };
    case 'sinifla': {
      const groups = lines.filter((l) => l.includes(':')).map((l) => {
        const [name, items] = splitOnce(l, ':');
        return { name: name.trim(), items: items.split(';').map((item) => item.trim()).filter(Boolean) };
      });
      return { type: 'categorize', id: `${lessonId}:${positional[0]}`, localId: positional[0], title, groups, line };
    }
    case 'kaydirici': return { type: 'slider_sim', title, spec: sliderSpec(lines) };
    case 'sorgula': return { type: 'inquiry', id: positional[0] ?? null, title, ...inquiry(lines, line) };
    case 'cikmis': return { type: 'past_question', code: positional[0], note: attrs.not ?? '', archetype: attrs.tip ?? null };
    default: throw new LessonError(`Bilinmeyen blok türü: ::${type}`, line);
  }
}

function parseBlocks(lessonId, body, startLine) {
  const blocks = [];
  let current = null;
  let text = [];
  let textLine = startLine;
  const flushText = () => {
    const value = text.join('\n').trim();
    if (value) blocks.push({ type: 'markdown', text: value });
    text = [];
  };
  const finish = () => {
    if (current) blocks.push(parseBlock(lessonId, current.head, current.lines, current.line));
    current = null;
  };
  body.forEach((raw, i) => {
    const line = startLine + i + 1;
    if (raw.startsWith('%%')) return;
    if (raw.startsWith('::')) {
      const head = raw.slice(2).trim();
      flushText();
      finish();
      if (head) current = { head, lines: [], line };
      else textLine = line;
      return;
    }
    if (current) current.lines.push(raw);
    else {
      if (!text.length) textLine = line;
      text.push(raw);
    }
  });
  flushText();
  finish();
  void textLine;
  return blocks;
}

/** Bir .ders dosyasını çözümler; biçim hatasında LessonError fırlatır. */
export function parseLesson(source, fallbackId = '') {
  const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
  const directives = [];
  let current = null;
  lines.forEach((raw, i) => {
    if (raw.startsWith('@')) {
      current = { head: raw.slice(1).trim(), body: [], line: i + 1 };
      directives.push(current);
    } else if (current) current.body.push(raw);
    else if (raw.trim() && !raw.startsWith('%%')) throw new LessonError('Dosya @ders satırıyla başlamalı.', i + 1);
  });
  const first = directives[0];
  if (!first || parseHead(first.head).type !== 'ders') throw new LessonError('İlk yönerge @ders olmalı.', 1);
  const id = parseHead(first.head).positional[0] || fallbackId;
  const header = keyValues(first.body, (i) => first.line + i + 1);
  const lesson = {
    id, subject: 'matematik', title: '', short: '', exams: [], unit: '', grade: null, order: 0, prereq: [], confused: [], categories: [],
    goal: '', why: '', sources: [], keywords: [], headingRules: [], excludeRules: [],
    review: { minutes: 12 }, mastery: { minutes: 15, mix: [], passPct: 80, minCorrect: 1 },
    archetypes: [], sessions: [], pretest: [], sections: [], flashcards: [], keyPoints: [], selfExplain: '', pool: [], practiceIds: [],
    practice: [], targetSeconds: null, bankDefault: false,
  };
  for (const [key, value] of Object.entries(header)) {
    const field = HEADER_KEYS[key];
    if (!field) throw new LessonError(`Bilinmeyen başlık alanı: ${key}`, first.line);
    if (LIST_KEYS.has(field)) lesson[field] = splitWords(value);
    else if (field === 'sources') lesson[field] = splitPipe(value);
    else if (PIPE_KEYS.has(field)) lesson[field] = splitRules(value);
    else if (field === 'grade' || field === 'order' || field === 'targetSeconds') lesson[field] = Number(value);
    else if (field === 'reviewMinutes') lesson.review.minutes = Number(value);
    else if (field === 'masteryMinutes') lesson.mastery.minutes = Number(value);
    else if (field === 'bankDefault') lesson.bankDefault = /^(evet|1|true)$/i.test(value);
    else lesson[field] = value;
  }
  lesson.short ||= lesson.title;
  for (const directive of directives.slice(1)) {
    const { type, positional } = parseHead(directive.head);
    const rest = directive.head.slice(type.length).trim();
    const lineOf = (i) => directive.line + i + 1;
    switch (type) {
      case 'tip': {
        const values = keyValues(directive.body, lineOf);
        lesson.archetypes.push({
          id: positional[0], share: Number(positional[1] ?? 0), core: positional[2] ?? null, title: values.ad ?? positional[0],
          cue: values.ipucu ?? '', strategy: values.strateji ?? '', keywords: splitRules(values.anahtar ?? ''), exclude: splitRules(values.haric ?? ''),
          line: directive.line,
        });
        break;
      }
      case 'ustalik':
        for (const line of directive.body) {
          if (!line.trim() || line.startsWith('%%')) continue;
          const match = line.trim().match(/^(\S+)\s+(\d+)\s+(\d)-(\d)$/);
          if (!match) throw new LessonError(`Ustalık satırı "tip sayı 1-3" olmalı: ${line.trim()}`, directive.line);
          lesson.mastery.mix.push({ archetype: match[1], count: Number(match[2]), lo: Number(match[3]), hi: Number(match[4]) });
        }
        break;
      case 'oturum': {
        const [title, ids] = splitOnce(rest, '|');
        lesson.sessions.push({ title: title.trim(), sections: splitWords(ids), minutes: 0 });
        break;
      }
      case 'ontest':
        lesson.pretest.push(...parseBlocks(id, directive.body, directive.line).filter((b) => b.type === 'quick_check').map((b) => b.question));
        break;
      case 'havuz':
        lesson.pool.push(...parseBlocks(id, directive.body, directive.line).filter((b) => b.type === 'quick_check').map((b) => b.question));
        break;
      case 'bolum': {
        const [left, title] = splitOnce(rest, '|');
        const [sectionId, minutes] = splitWords(left);
        lesson.sections.push({ id: sectionId, title: title.trim(), minutes: Number(minutes) || 8, blocks: parseBlocks(id, directive.body, directive.line), line: directive.line });
        break;
      }
      case 'kartlar':
        lesson.flashcards = pairList(directive.body).map(([front, back], i) => ({ id: `k${i + 1}`, front, back }));
        break;
      case 'ozet':
        lesson.keyPoints = bulletList(directive.body);
        break;
      case 'pratik':
        lesson.practice = bulletList(directive.body);
        break;
      case 'aciklama':
        lesson.selfExplain = directive.body.join('\n').trim();
        break;
      default:
        throw new LessonError(`Bilinmeyen yönerge: @${type}`, directive.line);
    }
  }
  const shareTotal = lesson.archetypes.reduce((sum, a) => sum + a.share, 0) || 1;
  lesson.archetypes.forEach((a) => { a.share = a.share / shareTotal; });
  const sectionMinutes = Object.fromEntries(lesson.sections.map((s) => [s.id, s.minutes]));
  if (!lesson.sessions.length) lesson.sessions = [{ title: lesson.title, sections: lesson.sections.map((s) => s.id), minutes: 0 }];
  lesson.sessions.forEach((s) => { s.minutes = s.sections.reduce((sum, sid) => sum + (sectionMinutes[sid] ?? 0), 0); });
  lesson.minutes = lesson.sections.reduce((sum, s) => sum + s.minutes, 0);
  lesson.practiceIds = lesson.sections.flatMap((s) => s.blocks.filter((b) => b.type === 'past_question').map((b) => b.code));
  return lesson;
}

/** Ders içindeki bütün soru benzeri öğeler (doğrulama ve sayım için). */
export function lessonQuestions(lesson) {
  const fromSections = lesson.sections.flatMap((s) => s.blocks.filter((b) => b.type === 'quick_check').map((b) => ({ ...b.question, sectionId: s.id })));
  return [...lesson.pretest.map((q) => ({ ...q, sectionId: '@ontest' })), ...fromSections, ...lesson.pool.map((q) => ({ ...q, sectionId: '@havuz' }))];
}

/** Ders listesi → kavram dizini (ağır içerik olmadan) ve ünite ağacı. */
export function buildIndex(lessons, units) {
  const concepts = lessons.map((lesson) => ({
    id: lesson.id, title: lesson.title, short: lesson.short, exams: lesson.exams, unit: lesson.unit, grade: lesson.grade, order: lesson.order,
    prereq: lesson.prereq, confused: lesson.confused, categories: lesson.categories, goal: lesson.goal, why: lesson.why,
    archetypes: lesson.archetypes.map(({ id, share, core, title, cue, strategy }) => ({ id, share, core, title, cue, strategy })),
    mastery: lesson.mastery, review: lesson.review, sessions: lesson.sessions,
    sections: lesson.sections.map(({ id, title, minutes }) => ({ id, title, minutes })), minutes: lesson.minutes,
    practiceIds: lesson.practiceIds, flashcards: lesson.flashcards.length, practice: lesson.practice, targetSeconds: lesson.targetSeconds,
  })).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const byId = Object.fromEntries(concepts.map((c) => [c.id, c]));
  const unitList = units.map((unit) => ({ ...unit, concepts: concepts.filter((c) => c.unit === unit.id).map((c) => c.id) }))
    .filter((unit) => unit.concepts.length);
  return { concepts, byId, units: unitList };
}
