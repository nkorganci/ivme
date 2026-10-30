import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks.js';
import { useLearn } from '../LearnContext.jsx';
import { getLesson } from '../content/lessons.js';
import { loadBank, loadBanks } from '../bank.js';
import { makeEvent } from '../api.js';
import { uuid } from '../engine/random.js';
import { addDays, formatDay } from '../engine/dates.js';
import { setResult } from '../engine/mastery.js';
import { ENGINE } from '../engine/config.js';
import { pickMastery, pickMixed, pickPast, pickPractice, pickReview, pickSibling, pickTest } from '../engine/selection.js';
import { BankQuestion, FlashcardItem, LessonQuestion } from '../items.jsx';
import { Block } from '../lesson/Blocks.jsx';
import { MathText, Markdown } from '../math.jsx';
import { BASE, ProgressBar } from '../ui.jsx';

const TITLES = {
  mastery: 'Ustalık testi', testout: 'Kısa ustalık testi (geçme)', review: 'Aralıklı tekrar', missed: 'Yanlışlarım geri geldi',
  flashcards: 'Kartlar', mixed: 'Haftalık karma set', practice: 'Alıştırma', reteach: 'Yeniden anlatım',
  test: 'Konu testi', cikmis: 'Çıkmış sorular',
};

/** Banka sorusundan sonra gösterilecek çözüm yaklaşımı: soru tipinin stratejisi, tip yoksa konunun genel önerisi. */
export function approachOf(index, conceptId, archetypeId) {
  const meta = index.byId[conceptId];
  if (!meta) return null;
  const archetype = meta.archetypes.find((a) => a.id === archetypeId);
  if (archetype) return { title: archetype.title, cue: archetype.cue, strategy: archetype.strategy };
  const tips = (meta.practice ?? []).slice(0, 2).join(' ');
  return tips ? { title: meta.title, cue: '', strategy: tips } : null;
}

const storageKey = (type, conceptId, track, today) => `ivme:konu-ogrenme:set:${type}:${conceptId ?? ''}:${track ?? ''}:${today}`;

function lessonCard(cardId) {
  const [conceptId, localId] = cardId.split(':');
  try {
    const lesson = getLesson(conceptId);
    const card = lesson?.flashcards.find((c) => c.id === localId);
    return card ? { ...card, id: cardId, conceptId, lessonTitle: lesson.title } : null;
  } catch {
    return null;
  }
}

const VISUAL_BLOCKS = new Set(['plot', 'visual', 'table', 'numberline']);

/**
 * Zayıf tip için öğretim parçaları: strateji, çekirdek bölümün L1 anlatımı, çözümlü örnek ve yanılgı kartları.
 * Çözümlü örnek çoğu zaman bölümündeki grafik ya da tabloya dayanır ("yukarıdaki grafiğe göre"); o görseller de gelir.
 */
export function reteachMaterial(lesson, archetypeId) {
  const archetype = lesson.archetypes.find((a) => a.id === archetypeId);
  if (!archetype) return null;
  const core = lesson.sections.find((s) => s.id === archetype.core) ?? lesson.sections[0];
  const blocks = lesson.sections.flatMap((s) => s.blocks);
  const strategy = blocks.filter((b) => b.type === 'strategy' && b.archetype === archetypeId);
  const leveled = core.blocks.filter((b) => b.type === 'leveled').map((b) => ({ ...b, levels: { L1: b.levels.L1, L2: b.levels.L2 } }));
  const worked = core.blocks.find((b) => b.type === 'worked') ?? blocks.find((b) => b.type === 'worked');
  const workedSection = worked ? lesson.sections.find((s) => s.blocks.includes(worked)) : null;
  const visuals = workedSection ? workedSection.blocks.slice(0, workedSection.blocks.indexOf(worked)).filter((b) => VISUAL_BLOCKS.has(b.type)) : [];
  const misconceptions = blocks.filter((b) => b.type === 'misconception' && (b.archetype === archetypeId || core.blocks.includes(b)));
  return { archetype, core, strategy, leveled, visuals, worked, misconceptions };
}

async function buildItems({ type, conceptId, track, archetype, learn }) {
  const { state, index } = learn;
  const seed = `${type}:${conceptId ?? track}:${learn.today}:${state.eventCount}`;
  const meta = conceptId ? index.byId[conceptId] : null;
  const lesson = conceptId ? getLesson(conceptId) : null;
  const pool = (lesson?.pool ?? []).map((q) => ({ ...q, archetype: q.archetype }));
  switch (type) {
    case 'mastery':
    case 'testout': {
      const bank = await loadBank(conceptId);
      return pickMastery({ meta, bank, state, seed, practicePool: pool, testOut: type === 'testout' });
    }
    case 'review': {
      const bank = await loadBank(conceptId);
      return pickReview({ meta, bank, state, seed, practicePool: pool });
    }
    case 'test': {
      const bank = await loadBank(conceptId);
      return pickTest({ meta, bank, state, seed, practicePool: pool });
    }
    case 'cikmis': {
      const bank = await loadBank(conceptId);
      return pickPast({ bank });
    }
    case 'practice': {
      const bank = await loadBank(conceptId);
      const items = pickPractice({ bank, state, archetype, count: 6, seed });
      return items.length ? items : pool.filter((q) => !archetype || q.archetype === archetype).slice(0, 6).map((q) => ({ type: 'lesson_q', question: q, archetype: q.archetype }));
    }
    case 'reteach': {
      const concept = state.concepts[conceptId];
      const weak = concept?.reteach?.archetypes?.[0] ?? concept?.weakest ?? meta.archetypes[0].id;
      const bank = await loadBank(conceptId);
      const items = pickPractice({ bank, state, archetype: weak, count: 3, seed }).filter((item) => item.question.difficulty <= 2);
      const fallback = pool.filter((q) => q.archetype === weak).slice(0, 3 - items.length).map((q) => ({ type: 'lesson_q', question: q, archetype: weak }));
      return [...items, ...fallback];
    }
    case 'missed': {
      const due = state.dueQueue.filter((item) => state.scope.has(item.conceptId)).slice(0, 15);
      const banks = await loadBanks([...new Set(due.map((item) => item.conceptId))]);
      return due.map((item) => {
        const question = banks[item.conceptId]?.find((q) => q.code === item.itemId)
          ?? { conceptId: item.conceptId, code: item.itemId, id: item.questionId, archetype: item.archetypeId, difficulty: 2, exam: item.exam ?? 'TYT', choices: 5, source: '' };
        return { type: 'bank', question, archetype: item.archetypeId, priority: item.priority, kind: item.kind };
      });
    }
    case 'flashcards': {
      const fit = Math.floor((ENGINE.plan.flashcardMaxMinutes * 60) / ENGINE.plan.flashcardSeconds);
      const due = state.dueCards.filter((card) => state.scope.has(card.conceptId));
      const fresh = state.newCards.filter((card) => state.scope.has(card.conceptId)).slice(0, state.newCardsAllowance);
      return [...due, ...fresh].slice(0, fit).map((card) => ({ type: 'flashcard', cardId: card.id }));
    }
    case 'mixed': {
      const ids = index.concepts.filter((m) => m.exams.includes(track) && state.concepts[m.id]?.masteryValid).map((m) => m.id);
      const banks = await loadBanks(ids);
      const mastered = ids.length;
      const size = Math.min(ENGINE.plan.mixedSetMax, Math.max(ENGINE.plan.mixedSetMin, mastered * 3));
      return pickMixed({ index, banks, state, seed, track, size });
    }
    default:
      return [];
  }
}

const serialize = (items) => items.map((item) => (item.type === 'flashcard' ? item : { ...item, question: item.question }));

export default function PracticePage() {
  const [params] = useSearchParams();
  const type = params.get('tur') ?? 'practice';
  const conceptId = params.get('konu');
  const track = params.get('sinav');
  const archetype = params.get('tip');
  const learn = useLearn();
  const { state, index, record, answerBank, today } = learn;
  const meta = conceptId ? index.byId[conceptId] : null;
  usePageTitle(`${TITLES[type] ?? 'Çalış'}${meta ? ` · ${meta.title}` : ''} · Konuyu Öğrenelim`);
  const key = storageKey(type, conceptId, track, today);
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(key) ?? 'null'); } catch { return null; }
  });
  const [error, setError] = useState('');
  const [stage, setStage] = useState(type === 'reteach' ? 'teach' : 'run');
  const [finished, setFinished] = useState(null);
  const [answer, setAnswer] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (session || started.current || (conceptId && !meta)) return;
    started.current = true;
    buildItems({ type, conceptId, track, archetype, learn })
      .then((items) => setSession({ setId: uuid(), items: serialize(items), position: 0, results: [] }))
      .catch((problem) => setError(problem.message));
  }, [session, type, conceptId, track, archetype, meta]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    try {
      if (session && !finished) sessionStorage.setItem(key, JSON.stringify(session));
      else sessionStorage.removeItem(key);
    } catch { /* depolama kapalı olabilir */ }
  }, [session, finished, key]);

  if (conceptId && !meta) return <Navigate to={`${BASE}/harita`} replace />;
  const lesson = conceptId ? getLesson(conceptId) : null;
  const title = TITLES[type] ?? 'Çalış';
  const head = <header className="card lr-practice-head">
    <nav className="lr-crumbs small" aria-label="Konum"><Link to={BASE}>Konuyu Öğrenelim</Link>{meta && <> › <Link to={`${BASE}/konu/${meta.id}`}>{meta.title}</Link></>}</nav>
    <h1>{title}{meta ? `: ${meta.title}` : track ? ` (${track})` : ''}</h1>
    {session && session.items.length > 0 && !finished && stage === 'run' && <div className="lr-lesson-meter">
      <ProgressBar value={session.position} max={session.items.length} label="Set ilerlemesi" />
      <span className="small">{Math.min(session.position + 1, session.items.length)}/{session.items.length}</span>
    </div>}
  </header>;

  if (error) return <div className="lr-page">{head}<p className="field-error" role="alert">{error}</p></div>;
  if (!session) return <div className="lr-page">{head}<p className="muted">Sorular hazırlanıyor…</p></div>;

  if (stage === 'teach' && lesson) {
    const weak = state.concepts[conceptId]?.reteach?.archetypes ?? [state.concepts[conceptId]?.weakest ?? lesson.archetypes[0].id];
    return <div className="lr-page">{head}
      <section className="card lr-reteach">
        <p className="lead">Bu kez daha basit ve tek bir soru tipine odaklı: önce yöntemi gör, sonra 2–3 kolay soruyla dene. Ardından ustalık testi planına gelir.</p>
        {weak.map((id) => {
          const material = reteachMaterial(lesson, id);
          if (!material) return null;
          return <article key={id} className="lr-reteach-part">
            <h2>{material.archetype.title}</h2>
            <p className="lr-cue"><strong>Bunu görünce:</strong> <MathText text={material.archetype.cue} /></p>
            <aside className="lr-key"><span className="lr-key-label">Yöntem</span><Markdown text={material.archetype.strategy} /></aside>
            {material.strategy.map((block, i) => <Block key={`s${i}`} block={block} ctx={{ archetypeTitle: () => material.archetype.title }} />)}
            {material.leveled.map((block, i) => <Block key={`l${i}`} block={block} ctx={{ level: 'L1', setLevel: () => {} }} />)}
            {material.visuals.map((block, i) => <Block key={`v${i}`} block={block} ctx={{}} />)}
            {material.worked && <Block block={material.worked} ctx={{}} />}
            {material.misconceptions.map((block, i) => <Block key={`m${i}`} block={block} ctx={{}} />)}
          </article>;
        })}
        <div className="lr-actions"><button type="button" className="btn btn-primary btn-lg" onClick={() => setStage('run')}>Şimdi kısa kontrol</button></div>
      </section>
    </div>;
  }

  const items = session.items;
  const finish = () => {
    const cards = type === 'testout' && lesson ? lesson.flashcards.map((c) => c.id) : undefined;
    record(makeEvent('set', { action: 'done', setId: session.setId, setType: type, conceptId: conceptId ?? null, track: track ?? null, ...(cards ? { cards } : {}) }));
    setFinished({ result: setResult(session.results.filter((r) => r.graded)), results: session.results });
  };

  if (!items.length && !finished) {
    return <div className="lr-page">{head}
      <section className="card">
        <p>{type === 'missed' ? 'Bugün geri gelen yanlış soru yok. Harika!' : type === 'flashcards' ? 'Şu an vakti gelen kart yok.' : 'Bu set için uygun soru bulunamadı. Banka soruları bu kavram için henüz eşlenmemiş olabilir.'}</p>
        {type === 'reteach' && <button type="button" className="btn btn-primary" onClick={finish}>Yeniden anlatımı tamamla</button>}
        <Link className="btn btn-secondary" to={BASE}>Bugüne dön</Link>
      </section>
    </div>;
  }

  if (finished) return <div className="lr-page">{head}<Result type={type} meta={meta} finished={finished} learn={learn} conceptId={conceptId} /></div>;

  const item = items[session.position];
  const advance = () => {
    setAnswer(null);
    if (session.position + 1 >= items.length) finish();
    else setSession((s) => ({ ...s, position: s.position + 1 }));
  };
  const remember = (entry) => setSession((s) => ({ ...s, results: [...s.results, entry] }));

  const onBank = async (value) => {
    setAnswer(value);
    remember({ code: item.question.code, archetypeId: item.archetype ?? item.question.archetype, correct: value.correct, graded: true, conceptId: item.question.conceptId });
    if (!value.correct) {
      try {
        const bank = await loadBank(item.question.conceptId);
        const sibling = pickSibling({ bank, archetype: item.archetype ?? item.question.archetype, state, seed: `${item.question.code}:${today}`, exclude: items.map((i) => i.question?.code).filter(Boolean) });
        if (sibling) record(makeEvent('queue', { action: 'sibling', itemId: sibling.code, questionId: sibling.id, conceptId: sibling.conceptId, archetypeId: sibling.archetype, exam: sibling.exam, dueDay: addDays(today, 1), sourceItemId: item.question.code }));
      } catch { /* kardeş soru bulunamazsa kuyruk yine çalışır */ }
    }
  };
  const onLesson = (value) => {
    setAnswer(value);
    const q = item.question;
    record(makeEvent('attempt', { itemType: 'lesson_q', itemId: q.id, conceptId: conceptId ?? q.id.split(':')[0], archetypeId: q.archetype, difficulty: q.difficulty, context: type,
      chosen: value.chosen, correct: value.correct, confidence: value.confidence, timeMs: value.timeMs, hintUsed: value.hintUsed, setId: session.setId }));
    remember({ code: q.id, archetypeId: q.archetype, correct: value.correct, graded: true });
  };
  const onCard = (value) => {
    setAnswer(value);
    const card = lessonCard(item.cardId);
    record(makeEvent('attempt', { itemType: 'flashcard', itemId: item.cardId, conceptId: card?.conceptId ?? item.cardId.split(':')[0], context: type === 'review' ? 'review' : 'flashcards',
      correct: value.correct, confidence: value.confidence, timeMs: value.timeMs, hintUsed: false, setId: session.setId }));
    remember({ code: item.cardId, correct: value.correct, graded: false });
  };

  let before = null;
  if (item.type === 'bank' && item.priority && type === 'missed') {
    const owner = getLesson(item.question.conceptId);
    const material = owner && reteachMaterial(owner, item.archetype);
    before = <aside className="lr-misconception">
      <span className="lr-mis-label">Bu soruda “Eminim” demiştin</span>
      <p>Emin olduğun bir yanlış, düzeltilince en kalıcı öğrenmedir. Önce yöntemi hatırla: <strong>{material?.archetype.title}</strong></p>
      {material?.misconceptions[0] ? <><p className="lr-mis-wrong">✗ <MathText text={material.misconceptions[0].wrong} /></p><p className="lr-mis-right">✓ <MathText text={material.misconceptions[0].right} /></p></>
        : material && <Markdown text={material.archetype.strategy} />}
    </aside>;
  }

  return <div className="lr-page">{head}
    <section className="card lr-runner">
      {item.type === 'bank' && <>
        {item.kind === 'sibling' && <p className="small muted">Kardeş soru: dün yanlış yaptığın sorunun tipinden, görmediğin bir soru.</p>}
        <BankQuestion question={item.question} conceptId={item.question.conceptId ?? conceptId} context={type} setId={session.setId} archetypeId={item.archetype} answerBank={answerBank} onAnswered={onBank} before={before}
          approach={type === 'placement' ? null : approachOf(index, item.question.conceptId ?? conceptId, item.archetype ?? item.question.archetype)} />
      </>}
      {item.type === 'lesson_q' && <LessonQuestion question={item.question} onAnswered={onLesson} />}
      {item.type === 'flashcard' && (() => {
        const card = lessonCard(item.cardId);
        return card ? <><p className="small muted">{card.lessonTitle}</p><FlashcardItem card={card} onAnswered={onCard} /></> : <p className="muted">Kart bulunamadı.</p>;
      })()}
      <div className="lr-section-nav">
        <button type="button" className="btn btn-primary" disabled={!answer && item.type !== 'flashcard'} onClick={advance}
          hidden={!answer}>{session.position + 1 >= items.length ? 'Seti bitir' : 'Sonraki'}</button>
      </div>
    </section>
  </div>;
}

function Result({ type, meta, finished, learn, conceptId }) {
  const { state, today } = learn;
  const { result } = finished;
  const concept = conceptId ? state.concepts[conceptId] : null;
  const archetypeTitle = (id) => meta?.archetypes.find((a) => a.id === id)?.title ?? 'Tip belirlenmedi';
  let headline = `${result.correct}/${result.total} doğru (%${result.pct})`;
  let detail = '';
  if (type === 'mastery' || type === 'testout') {
    headline = result.passed ? `Ustalaştın! %${result.pct}` : `Henüz değil: %${result.pct}`;
    detail = result.passed
      ? `İlk aralıklı tekrar ${concept?.nextDue ? formatDay(concept.nextDue) : 'yarın'}. Sonra 3, 7, 14, 30 ve 60 gün.`
      : `Geçmek için %${ENGINE.mastery.passPct} ve her soru tipinden en az bir doğru gerekiyor. ${result.weak.map(archetypeTitle).join(', ') || 'Bazı tipler'} zorladı; planına kısa bir yeniden anlatım eklendi.`;
  } else if (type === 'review') {
    detail = result.pct >= ENGINE.review.goodPct ? `Harika — bir basamak yukarı. Sonraki tekrar ${concept?.nextDue ? formatDay(concept.nextDue) : ''}.`
      : result.pct >= ENGINE.review.okPct ? `Fena değil; aynı aralıkla bir kez daha (${concept?.nextDue ? formatDay(concept.nextDue) : ''}).`
        : 'Bu konu biraz unutulmuş. En zayıf soru tipi için kısa ve basit bir anlatım planına eklendi; sonra yeniden kontrol.';
  } else if (type === 'missed') {
    detail = `Doğru çözdüklerin 3 ve 7 gün sonra son kez gelir; art arda iki doğru listeden çıkarır. Yanlışlar yarın yeniden gelir.`;
  } else if (type === 'flashcards') {
    headline = `${finished.results.length} kart tekrarlandı`;
    detail = 'FSRS her kartı, unutmak üzere olduğun güne planladı.';
  } else if (type === 'reteach') {
    detail = 'Yeniden anlatım tamam. Ustalık testi planına geldi (bir sonraki oturumda).';
  } else if (type === 'test' || type === 'cikmis') {
    detail = result.pct >= 80 ? 'Bu konuda sınav düzeyindesin. Aralıklı tekrarlarla koru; haftalık karma sette karışık sorulara geç.'
      : result.pct >= 50 ? `Temel oturmuş; zayıf tiplerde aşağıdaki yaklaşımla 5'er soruluk alıştırma yap.`
        : `Önce dersin ilgili bölümünü (düzeyi "Basit" seçerek) yeniden oku, sonra zayıf tiplerden alıştırma yap.`;
  }
  const archetypes = Object.entries(result.byArchetype).filter(([id]) => id !== '_genel');
  return <section className="card lr-result">
    <h2>{headline}</h2>
    {detail && <p>{detail}</p>}
    {archetypes.length > 0 && <ul className="lr-result-types">
      {archetypes.map(([id, value]) => <li key={id} className={value.correct === value.total ? 'good' : value.correct === 0 ? 'bad' : ''}>
        <span>{archetypeTitle(id)}</span><strong>{value.correct}/{value.total}</strong></li>)}
    </ul>}
    {(type === 'test' || type === 'cikmis') && meta && <section className="lr-recommend">
      <h3>Çalışma önerin</h3>
      {result.weak.length > 0 && <ul>
        {result.weak.map((id) => {
          const archetype = meta.archetypes.find((a) => a.id === id);
          return archetype && <li key={id}><strong>{archetype.title}:</strong> <MathText text={archetype.strategy} />{' '}
            <Link to={`${BASE}/calis?tur=practice&konu=${meta.id}&tip=${id}`}>Bu tipten 5 soru</Link></li>;
        })}
      </ul>}
      {(meta.practice ?? []).length > 0 && <ul className="lr-practice-tips">{meta.practice.map((tip, i) => <li key={i}><MathText text={tip} /></li>)}</ul>}
    </section>}
    <div className="lr-actions">
      <Link className="btn btn-primary" to={BASE}>Bugünün planına dön</Link>
      {meta && <Link className="btn btn-secondary" to={`${BASE}/konu/${meta.id}`}>Konu sayfası</Link>}
      {type === 'missed' && <Link className="btn btn-secondary" to={`${BASE}/hatalarim`}>Hatalarım</Link>}
    </div>
    <p className="small muted">Bugün: {Math.round((state.days[today]?.ms ?? 0) / 60000)} dk çalıştın, {state.days[today]?.questions ?? 0} soru.</p>
  </section>;
}
