// Ders içeriği denetimi (Node testi kullanır; tarayıcı paketine girmez).
import { lessonQuestions } from './parser.js';
import { EXPLORATIONS } from './explorations.js';
import { MODEL_CONTROLS } from '../lesson/models.js';
import { WORKED_EXAMS } from './worked-exams.js';

const CHECK_TYPES = new Set(['quick_check', 'fill_blank', 'match_pairs', 'drag_order', 'categorize']);
const MATH = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

/** Metindeki $…$ ve $$…$$ parçaları. */
export function mathSegments(text) {
  const out = [];
  for (const match of String(text ?? '').matchAll(MATH)) out.push({ tex: match[1] ?? match[2], display: !!match[1] });
  return out;
}

function textsOf(lesson) {
  const texts = [lesson.goal, lesson.why, lesson.selfExplain, ...lesson.keyPoints, ...lesson.practice, ...lesson.archetypes.flatMap((a) => [a.title, a.cue, a.strategy])];
  const discovery = EXPLORATIONS[lesson.id];
  if (discovery) texts.push(discovery.title, discovery.story, discovery.experiment, discovery.example, discovery.tip, discovery.trap, discovery.expert, ...discovery.terms.flat(), ...discovery.steps.flat(), ...discovery.transfer);
  for (const card of lesson.flashcards) texts.push(card.front, card.back);
  for (const q of lessonQuestions(lesson)) texts.push(q.stem, q.explain, q.hint, ...q.choices.flatMap((c) => [c.text, c.feedback]));
  for (const section of lesson.sections) {
    texts.push(section.title);
    for (const block of section.blocks) {
      switch (block.type) {
        case 'markdown': case 'key_idea': case 'note': texts.push(block.text, block.title); break;
        case 'leveled': texts.push(...Object.values(block.levels)); break;
        case 'misconception': texts.push(block.wrong, block.why, block.right); break;
        case 'worked': case 'faded': case 'strategy': case 'reveal_steps':
          texts.push(block.title, block.problem, block.answer, block.cue, ...block.steps.flatMap((s) => [s.text, s.why])); break;
        case 'must_know': case 'summary': texts.push(block.title, ...block.items); break;
        case 'flip_cards': texts.push(...block.cards.flatMap((c) => [c.front, c.back])); break;
        case 'fill_blank': texts.push(block.prompt, block.explain); break;
        case 'match_pairs': texts.push(...block.pairs.flat()); break;
        case 'drag_order': texts.push(...block.items); break;
        case 'categorize': texts.push(...block.groups.flatMap((g) => [g.name, ...g.items])); break;
        case 'table': texts.push(...block.columns, ...block.rows.flat()); break;
        case 'visual': case 'plot': case 'numberline': texts.push(block.caption, block.alt); break;
        case 'slider_sim': texts.push(block.title, block.spec.prompt); break;
        default: break;
      }
    }
  }
  return texts.filter(Boolean);
}

function findCycle(lessons) {
  const byId = Object.fromEntries(lessons.map((l) => [l.id, l]));
  const state = {};
  const visit = (id, path) => {
    if (state[id] === 2) return null;
    if (state[id] === 1) return [...path, id];
    state[id] = 1;
    for (const next of byId[id]?.prereq ?? []) {
      const cycle = visit(next, [...path, id]);
      if (cycle) return cycle;
    }
    state[id] = 2;
    return null;
  };
  for (const lesson of lessons) {
    const cycle = visit(lesson.id, []);
    if (cycle) return cycle;
  }
  return null;
}

/**
 * lessons: parseLesson çıktıları. options.units: ünite listesi, options.categories: geçerli katalog kimlikleri (Set),
 * options.checkMath(tex) → hata metni | null, options.checkExpr(expr, vars) → hata metni | null.
 */
export function validateLessons(lessons, options = {}) {
  const errors = [];
  const warnings = [];
  const unitIds = new Set((options.units ?? []).map((u) => u.id));
  const ids = new Set(lessons.map((l) => l.id));
  const orders = new Map();
  for (const lesson of lessons) {
    const err = (message) => errors.push(`${lesson.id}: ${message}`);
    const warn = (message) => warnings.push(`${lesson.id}: ${message}`);
    if (options.fileIds && options.fileIds[lesson.id] !== undefined && options.fileIds[lesson.id] !== lesson.id) err('dosya adı ile @ders kimliği farklı');
    if (!/^[a-z0-9-]{3,60}$/.test(lesson.id)) err('kimlik küçük harf, rakam ve tire olmalı');
    for (const field of ['title', 'goal', 'why', 'selfExplain']) if (!String(lesson[field] ?? '').trim()) err(`${field} boş`);
    if (!lesson.exams.length || lesson.exams.some((e) => !['TYT', 'AYT'].includes(e))) err('sinav TYT ve/veya AYT olmalı');
    if (unitIds.size && !unitIds.has(lesson.unit)) err(`bilinmeyen ünite: ${lesson.unit}`);
    if (!(lesson.grade >= 9 && lesson.grade <= 12)) err('sinif 9–12 olmalı');
    if (!(lesson.order > 0)) err('sira pozitif olmalı');
    if (orders.has(lesson.order)) err(`sira ${lesson.order} ${orders.get(lesson.order)} ile aynı`);
    orders.set(lesson.order, lesson.id);
    if (lesson.bankDefault) {
      const other = lessons.find((l) => l !== lesson && l.bankDefault && l.categories.some((c) => lesson.categories.includes(c)));
      if (other) err(`banka-varsayilan: ${other.id} ile aynı kategoride ikinci varsayılan ders`);
    }
    if (!lesson.sources.length) err('kaynak yok');
    if (!lesson.categories.length) err('katalog kategorisi yok');
    if (options.categories) for (const category of lesson.categories) if (!options.categories.has(category)) err(`katalogda olmayan kategori: ${category}`);
    for (const id of lesson.prereq) if (!ids.has(id)) err(`bilinmeyen önkoşul: ${id}`);
    for (const id of lesson.confused) if (!ids.has(id)) err(`bilinmeyen karışan kavram: ${id}`);
    if (!(lesson.review.minutes >= 5 && lesson.review.minutes <= 30)) err('tekrar dakikası 5–30 olmalı');
    if (!(lesson.mastery.minutes >= 5 && lesson.mastery.minutes <= 30)) err('ustalık dakikası 5–30 olmalı');

    const sectionIds = new Set();
    for (const section of lesson.sections) {
      if (sectionIds.has(section.id)) err(`bölüm kimliği tekrar: ${section.id}`);
      sectionIds.add(section.id);
      if (!section.title) err(`${section.id}: bölüm başlığı yok`);
      if (!(section.minutes >= 3 && section.minutes <= 25)) err(`${section.id}: bölüm dakikası 3–25 olmalı`);
      if (!section.blocks.length) err(`${section.id}: bölüm boş`);
    }
    if (lesson.sections.length < 3) err('en az 3 bölüm olmalı');
    const unchecked = lesson.sections.filter((s) => !s.blocks.some((b) => CHECK_TYPES.has(b.type)));
    if (unchecked.length > 1) err(`kontrol sorusu olmayan bölümler: ${unchecked.map((s) => s.id).join(', ')}`);

    const archetypeIds = new Set();
    if (lesson.archetypes.length < 2 || lesson.archetypes.length > 7) err('2–7 soru tipi olmalı');
    for (const a of lesson.archetypes) {
      if (archetypeIds.has(a.id)) err(`tip tekrar: ${a.id}`);
      archetypeIds.add(a.id);
      if (!(a.share > 0)) err(`${a.id}: pay sıfır`);
      if (!sectionIds.has(a.core)) err(`${a.id}: çekirdek bölüm yok (${a.core})`);
      if (!a.strategy) err(`${a.id}: strateji yok`);
      if (!a.cue) err(`${a.id}: ipucu (ne görünce) yok`);
      if (!a.title) err(`${a.id}: ad yok`);
    }
    const mixTotal = lesson.mastery.mix.reduce((sum, m) => sum + m.count, 0);
    if (mixTotal < 4 || mixTotal > 8) err(`ustalık testi 4–8 soru olmalı (${mixTotal})`);
    for (const entry of lesson.mastery.mix) {
      if (!archetypeIds.has(entry.archetype)) err(`ustalık: bilinmeyen tip ${entry.archetype}`);
      if (!(entry.lo >= 1 && entry.hi <= 3 && entry.lo <= entry.hi)) err(`ustalık: zorluk aralığı ${entry.lo}-${entry.hi}`);
    }
    for (const a of lesson.archetypes) if (a.share >= 0.15 && !lesson.mastery.mix.some((m) => m.archetype === a.id)) err(`ustalık karışımında %15+ paylı tip eksik: ${a.id}`);

    const inSessions = lesson.sessions.flatMap((s) => s.sections);
    if (lesson.sessions.length > 4) err('en çok 4 oturum');
    if (inSessions.length !== lesson.sections.length || new Set(inSessions).size !== inSessions.length
      || inSessions.some((id) => !sectionIds.has(id))) err('oturumlar her bölümü bir kez içermeli');
    if (inSessions.join() !== lesson.sections.map((s) => s.id).join()) err('oturum sırası bölüm sırasıyla aynı olmalı');

    const questionIds = new Set();
    for (const q of lessonQuestions(lesson)) {
      const where = `${q.sectionId}/${q.localId}`;
      if (questionIds.has(q.localId)) err(`soru kimliği tekrar: ${q.localId}`);
      questionIds.add(q.localId);
      if (!q.stem) err(`${where}: soru kökü boş`);
      if (q.choices.length < 3) err(`${where}: en az 3 şık`);
      if (!q.answer) err(`${where}: tam bir doğru şık (+) olmalı`);
      if (q.choices.map((c) => c.key).join('') !== 'ABCDE'.slice(0, q.choices.length)) err(`${where}: şıklar A'dan sırayla`);
      if (q.archetype && !archetypeIds.has(q.archetype)) err(`${where}: bilinmeyen tip ${q.archetype}`);
      if (!q.archetype) err(`${where}: tip= yok`);
      if (!(q.difficulty >= 1 && q.difficulty <= 3)) err(`${where}: zorluk 1–3`);
      if (!q.explain) err(`${where}: cozum yok`);
      if (q.sectionId !== '@havuz' && q.choices.some((c) => !c.correct && !c.feedback)) err(`${where}: yanlış şıklar için geri bildirim (||) yok`);
      if (new Set(q.choices.map((c) => c.text)).size !== q.choices.length) err(`${where}: aynı metinli şıklar`);
    }
    if (lesson.pretest.length < 2 || lesson.pretest.length > 4) err('ön test 2–4 soru olmalı');
    for (const a of lesson.archetypes) if (!lesson.pool.some((q) => q.archetype === a.id)) warn(`havuzda ${a.id} tipi soru yok`);

    const blocks = lesson.sections.flatMap((s) => s.blocks);
    if (lesson.sections[0]?.blocks[0]?.type !== 'exploration') err('ilk bölüm gündelik bağlam ve görsel keşifle (::kesfet) başlamalı');
    if (!EXPLORATIONS[lesson.id] || !MODEL_CONTROLS[lesson.id]) err('konuya özgü keşif anlatımı veya etkileşimli model eksik');
    if (blocks.filter((b) => b.type === 'misconception').length < 2) err('en az 2 yanılgı kartı');
    if (!blocks.some((b) => b.type === 'worked')) err('çözümlü örnek yok');
    if (!blocks.some((b) => b.type === 'faded')) err('adım adım tamamlamalı örnek yok');
    if (!blocks.some((b) => b.type === 'key_idea')) err('ana fikir bloğu yok');
    if (!blocks.some((b) => b.type === 'leveled')) err('düzeyli anlatım yok');
    for (const block of blocks) {
      if (block.type === 'exploration' && block.conceptId !== lesson.id) err('keşif başka dersin kimliğine bağlanmış');
      if (block.type === 'misconception' && !(block.wrong && block.why && block.right)) err('yanılgı kartında yanlis/neden/dogru eksik');
      if ((block.type === 'worked' || block.type === 'faded') && block.steps.length < 2) err(`"${block.title}" en az 2 adım`);
      if (block.type === 'worked' && !block.problem) err(`"${block.title}" soru yok`);
      if (block.type === 'faded' && !block.steps.some((s) => s.hidden)) err(`"${block.title}" gizli adım (?) yok`);
      if (block.type === 'leveled' && !(block.levels.L1 && block.levels.L2)) err('düzeyli anlatımda L1 ve L2 zorunlu');
      if (block.type === 'fill_blank' && (!block.answers.length || !block.prompt)) err(`boşluk ${block.localId}: cevap/soru eksik`);
      if (block.type === 'match_pairs' && block.pairs.length < 3) err(`eşleştirme ${block.localId}: en az 3 çift`);
      if (block.type === 'drag_order' && block.items.length < 3) err(`sıralama ${block.localId}: en az 3 öğe`);
      if (block.type === 'categorize' && block.groups.length < 2) err(`sınıflama ${block.localId}: en az 2 grup`);
      if (block.type === 'strategy' && block.archetype && !archetypeIds.has(block.archetype)) err(`strateji: bilinmeyen tip ${block.archetype}`);
      if (block.type === 'visual') {
        if (!block.alt) err('görselde alt metin yok');
        if (/<script|\son\w+=|foreignObject|javascript:/i.test(block.svg)) err('görselde izin verilmeyen içerik');
        if (/#[0-9a-f]{3,8}\b|rgb\(/i.test(block.svg)) err('görselde sabit renk; currentColor ve accent/muted/good/bad sınıflarını kullan');
        if (!/^<svg[\s\S]*<\/svg>$/.test(block.svg.trim())) err('görsel tek bir <svg> öğesi olmalı');
      }
      if ((block.type === 'plot' || block.type === 'numberline') && !block.alt) err(`${block.type}: alt metin yok`);
      if (options.checkExpr && block.type === 'plot') {
        for (const fn of [...block.spec.fns, ...block.spec.areas]) {
          const problem = options.checkExpr(fn.expr, ['x']);
          if (problem) err(`grafik ifadesi "${fn.expr}": ${problem}`);
        }
      }
      if (options.checkExpr && block.type === 'slider_sim') {
        for (const fn of block.spec.fns) {
          const problem = options.checkExpr(fn.expr, ['x', ...block.spec.params.map((p) => p.name)]);
          if (problem) err(`kaydırıcı ifadesi "${fn.expr}": ${problem}`);
        }
      }
      if (block.type === 'past_question') {
        if (options.bankCodes && !options.bankCodes.has(block.code)) err(`çıkmış soru kodu bankada yok: ${block.code}`);
        const guide = WORKED_EXAMS[block.code];
        if (guide && (guide.conceptId !== lesson.id || !archetypeIds.has(guide.archetype))) err(`${block.code}: görseli incelenmiş örnek yanlış ders veya soru tipinde`);
      }
    }
    if (lesson.flashcards.length < 5) err('en az 5 kart');
    if (lesson.flashcards.some((c) => !c.front || !c.back)) err('kartta ön/arka eksik');
    if (lesson.keyPoints.length < 3) err('@ozet en az 3 madde');
    if (lesson.practice.length < 3) err('@pratik en az 3 madde (çalışma önerisi ve sınav yaklaşımı)');
    if (!(lesson.targetSeconds >= 20 && lesson.targetSeconds <= 240)) err('hedef-sure 20–240 saniye olmalı');
    if (options.checkMath) {
      for (const text of textsOf(lesson)) {
        for (const segment of mathSegments(text)) {
          const problem = options.checkMath(segment.tex, segment.display);
          if (problem) err(`formül hatası "${segment.tex.slice(0, 60)}": ${problem}`);
        }
        const stripped = String(text).replace(MATH, '');
        if (stripped.includes('$')) err(`kapanmamış $: "${String(text).slice(0, 70)}"`);
      }
    }
  }
  const cycle = findCycle(lessons);
  if (cycle) errors.push(`önkoşul döngüsü: ${cycle.join(' → ')}`);
  return { errors, warnings };
}
