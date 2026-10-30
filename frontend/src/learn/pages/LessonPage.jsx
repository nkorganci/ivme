import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks.js';
import { useLearn } from '../LearnContext.jsx';
import { getLesson } from '../content/lessons.js';
import { makeEvent } from '../api.js';
import { Block, CHECK_BLOCKS, checkId } from '../lesson/Blocks.jsx';
import { LessonQuestion } from '../items.jsx';
import { MathText, Markdown } from '../math.jsx';
import { BASE, ExamBadges, LEVELS, ProgressBar, minutesText } from '../ui.jsx';
import { ENGINE } from '../engine/config.js';
import { loadBank } from '../bank.js';
import { EXPLORATIONS } from '../content/explorations.js';

function previousAnswers(state, conceptId, contexts) {
  const out = {};
  for (const attempt of state.attempts) {
    if (attempt.conceptId === conceptId && attempt.itemType === 'lesson_q' && contexts.includes(attempt.context)) {
      out[attempt.itemId] = { chosen: attempt.chosen, correct: attempt.correct, confidence: attempt.confidence };
    }
  }
  return out;
}

/** Ders oynatıcı (spec §10): ön test → bölümler (her ekranda bir bölüm) → son test → kendini açıklama → özet ve kartlar. */
export default function LessonPage() {
  const { conceptId } = useParams();
  const navigate = useNavigate();
  const learn = useLearn();
  const { state, index, record, answerBank } = learn;
  const lesson = useMemo(() => { try { return getLesson(conceptId); } catch { return null; } }, [conceptId]);
  const meta = index.byId[conceptId];
  const concept = state.concepts[conceptId];
  usePageTitle(lesson ? `${lesson.title} · Konuyu Öğrenelim` : 'Konuyu Öğrenelim');

  const completed = !!concept?.lessonCompletedAt;
  const pretestDone = (concept?.pretest?.length ?? 0) > 0;
  const startIndex = useMemo(() => {
    if (!lesson || !concept?.resume) return 0;
    return Math.max(0, lesson.sections.findIndex((s) => s.id === concept.resume.sectionId));
  }, [lesson, concept?.resume]);
  const [stage, setStage] = useState(() => (completed ? 'section' : concept?.lessonOpenedAt ? 'section' : 'intro'));
  const [sectionIndex, setSectionIndex] = useState(startIndex);
  const [level, setLevelState] = useState(state.levelPref ?? ENGINE.lesson.defaultLevel);
  const [answers, setAnswers] = useState(() => previousAnswers(state, conceptId, ['quick_check']));
  const [pre, setPre] = useState(() => previousAnswers(state, conceptId, ['pretest']));
  const [post, setPost] = useState({});
  const [explain, setExplain] = useState(concept?.selfExplain ?? '');
  const [ratings, setRatings] = useState({});
  const [offer, setOffer] = useState(null);
  const [bank, setBank] = useState([]);
  const sectionStarted = useRef(performance.now());
  const top = useRef(null);

  useEffect(() => { loadBank(conceptId).then(setBank).catch(() => setBank([])); }, [conceptId]);
  useEffect(() => {
    sectionStarted.current = performance.now();
    top.current?.scrollIntoView({ block: 'start' });
    setOffer(null);
  }, [sectionIndex, stage]);

  if (!lesson || !meta) return <Navigate to={`${BASE}/harita`} replace />;

  const section = lesson.sections[sectionIndex];
  const discovery = EXPLORATIONS[conceptId];
  const done = new Set(concept?.sectionsDone ?? []);
  const minutesLeft = lesson.sections.filter((s) => !done.has(s.id)).reduce((sum, s) => sum + s.minutes, 0);
  const sessionIndex = Math.max(0, lesson.sessions.findIndex((s) => s.sections.includes(section?.id)));
  const archetypeTitle = (id) => meta.archetypes.find((a) => a.id === id)?.title ?? '';

  const setLevel = (next) => {
    setLevelState(next);
    if (next !== state.levelPref) record(makeEvent('lesson', { conceptId, action: 'level', level: next }));
  };

  const openLesson = () => {
    if (!concept?.lessonOpenedAt) record(makeEvent('lesson', { conceptId, action: 'open' }));
    setStage('section');
  };

  const attemptEvent = (item, value, context) => makeEvent('attempt', {
    itemType: 'lesson_q', itemId: item.type === 'quick_check' ? item.question.id : item.id ?? item.question?.id, conceptId,
    archetypeId: (item.question ?? item).archetype ?? null, difficulty: (item.question ?? item).difficulty ?? 1, context,
    chosen: value.chosen ?? null, correct: !!value.correct, confidence: value.confidence ?? null, timeMs: value.timeMs ?? 0, hintUsed: !!value.hintUsed,
  });

  const onCheck = (item, value) => {
    const block = item.choices ? { type: 'quick_check', question: item } : item;
    const id = checkId(block);
    record(attemptEvent(block, value, 'quick_check'));
    const next = { ...answers, [id]: value };
    setAnswers(next);
    const checks = section.blocks.filter((b) => CHECK_BLOCKS.has(b.type)).map(checkId);
    const results = checks.map((cid) => next[cid]).filter(Boolean);
    const wrong = results.filter((r) => !r.correct).length;
    if (wrong >= ENGINE.lesson.wrongChecksForL1 && level !== 'L1') setOffer('L1');
    else if (results.length === checks.length && checks.length > 0 && results.every((r) => r.correct && r.confidence === 3) && level === 'L2') setOffer('L3');
  };

  const checksInSection = section ? section.blocks.filter((b) => CHECK_BLOCKS.has(b.type)) : [];
  const allAnswered = checksInSection.every((b) => answers[checkId(b)]);

  const finishSection = () => {
    const nextSection = lesson.sections[sectionIndex + 1];
    if (!completed) {
      record(makeEvent('lesson', { conceptId, action: 'section', sectionId: section.id, nextSectionId: nextSection?.id ?? null, ms: Math.round(performance.now() - sectionStarted.current) }));
    }
    if (!nextSection) {
      setStage(completed ? 'done' : lesson.pretest.length && pretestDone ? 'posttest' : 'explain');
      return;
    }
    const session = lesson.sessions[sessionIndex];
    if (!completed && session && session.sections[session.sections.length - 1] === section.id && sessionIndex < lesson.sessions.length - 1) {
      setStage('break');
      setSectionIndex(sectionIndex + 1);
      return;
    }
    setSectionIndex(sectionIndex + 1);
  };

  const complete = () => {
    record([
      makeEvent('lesson', { conceptId, action: 'explain', text: explain.slice(0, 1000) }),
      makeEvent('lesson', { conceptId, action: 'rate', ratings }),
      makeEvent('lesson', { conceptId, action: 'complete', cards: lesson.flashcards.map((c) => c.id) }),
    ]);
    setStage('done');
  };

  const ctx = {
    level, setLevel, onCheck, answers, seed: conceptId, archetypeTitle, answerBank, conceptId,
    pastQuestion: (code) => bank.find((q) => q.code === code) ?? null,
  };

  const header = <header className="lr-lesson-head card" ref={top}>
    <nav className="lr-crumbs small" aria-label="Konum"><Link to={BASE}>Konuyu Öğrenelim</Link> › <Link to={`${BASE}/harita`}>Konu haritası</Link> › <Link to={`${BASE}/konu/${conceptId}`}>{lesson.title}</Link></nav>
    <div className="lr-lesson-title"><h1>{lesson.title}</h1><ExamBadges exams={lesson.exams} /></div>
    <p className="lr-goal"><strong>Hedef:</strong> <MathText text={lesson.goal} /></p>
    <div className="lr-lesson-meter">
      <ProgressBar value={done.size} max={lesson.sections.length} label="Bölüm ilerlemesi" />
      <span className="small">{done.size}/{lesson.sections.length} bölüm · {completed ? 'tamamlandı' : `${minutesText(minutesLeft)} kaldı`} · Oturum {sessionIndex + 1}/{lesson.sessions.length}</span>
    </div>
  </header>;

  if (stage === 'intro') {
    const prereqs = lesson.prereq.map((id) => index.byId[id]).filter((p) => p && !state.concepts[p.id]?.firstMasteredAt);
    return <div className="lr-page lr-lesson">{header}
      <section className="card lr-intro">
        <p className="lm-eyebrow">Ezberden önce anlamak</p>
        <h2>{discovery?.title || 'Bu konuyu birlikte öğrenelim'}</h2>
        <Markdown text={discovery?.story || lesson.why} />
        <ol className="lr-learning-path"><li><strong>Gör ve keşfet</strong><span>Günlük bir durumdan başlayıp değerleri kendin değiştir.</span></li><li><strong>Birlikte çöz</strong><span>İşlemleri, nedenleri ve sonucu kontrol etmeyi öğren.</span></li><li><strong>Soruya uygula</strong><span>Örnekten kısa yolu çıkar, sonra gerçek sorularda dene.</span></li></ol>
        <h3>Adım adım ders yolun</h3>
        <ol className="lr-session-list">{lesson.sessions.map((s, i) => <li key={i}><strong>Oturum {i + 1}:</strong> {s.title} <span className="muted">· {minutesText(s.minutes)}</span></li>)}</ol>
        {prereqs.length > 0 && <aside className="lr-callout">Önce şuna bakmanı öneririm: {prereqs.map((p, i) => <span key={p.id}>{i ? ', ' : ''}<Link to={`${BASE}/konu/${p.id}`}>{p.title}</Link></span>)}. İstersen yine de başlayabilirsin.</aside>}
        <div className="lr-actions">
          {lesson.pretest.length > 0 && !pretestDone
            ? <><button type="button" className="btn btn-primary btn-lg" onClick={() => setStage('pretest')}>Önce kendimi deneyeyim</button><button type="button" className="btn btn-secondary" onClick={openLesson}>İlk kez öğreniyorum, anlatımla başla</button></>
            : <button type="button" className="btn btn-primary btn-lg" onClick={openLesson}>Derse başla</button>}
        </div>
      </section>
    </div>;
  }

  if (stage === 'pretest' || stage === 'posttest') {
    const target = stage === 'pretest' ? pre : post;
    const setTarget = stage === 'pretest' ? setPre : setPost;
    const next = lesson.pretest.find((q) => !target[q.id]);
    const allDone = !next;
    return <div className="lr-page lr-lesson">{header}
      <section className="card">
        <h2>{stage === 'pretest' ? 'Ön test — puanlanmaz' : 'Başta sorduğumuz sorular'}</h2>
        <p className="muted">{stage === 'pretest' ? 'Bilmiyor olman normal: beynin, cevabını aradığı soruyu derste daha iyi yakalar. Dersin sonunda bu sorulara döneceğiz.' : 'Aynı sorular, şimdi cevaplarıyla. Kendi ilerlemeni gör.'}</p>
        {lesson.pretest.map((q, i) => (target[q.id] || q === next) && <div key={q.id} className="lr-pretest-item">
          <p className="small muted">Soru {i + 1}/{lesson.pretest.length}</p>
          <LessonQuestion question={q} silent={stage === 'pretest'} initial={target[q.id] ?? null}
            onAnswered={(value) => { record(attemptEvent({ type: 'quick_check', question: q }, value, stage)); setTarget((t) => ({ ...t, [q.id]: value })); }} />
        </div>)}
        {allDone && stage === 'pretest' && <div className="lr-actions"><button type="button" className="btn btn-primary btn-lg" onClick={openLesson}>Derse geç</button></div>}
        {allDone && stage === 'posttest' && <div className="lr-compare">
          <p><strong>Ön test:</strong> {Object.values(pre).filter((v) => v.correct).length}/{lesson.pretest.length} doğru → <strong>Şimdi:</strong> {Object.values(post).filter((v) => v.correct).length}/{lesson.pretest.length} doğru</p>
          <button type="button" className="btn btn-primary" onClick={() => setStage('explain')}>Devam</button>
        </div>}
      </section>
    </div>;
  }

  if (stage === 'break') {
    const nextSession = lesson.sessions[sessionIndex];
    return <div className="lr-page lr-lesson">{header}
      <section className="card lr-break">
        <h2>Oturum {sessionIndex} tamam!</h2>
        <p>Kısa bir ara (5–10 dakika) öğrendiklerini yerleştirir. Sıradaki oturum: <strong>{nextSession?.title}</strong> ({minutesText(nextSession?.minutes ?? 0)}).</p>
        <div className="lr-actions">
          <button type="button" className="btn btn-primary" onClick={() => setStage('section')}>Sonraki oturuma geç</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(BASE)}>Bugünlük bu kadar</button>
        </div>
      </section>
    </div>;
  }

  if (stage === 'explain') {
    return <div className="lr-page lr-lesson">{header}
      <section className="card">
        <h2>Kendi cümlelerinle</h2>
        <Markdown text={lesson.selfExplain} />
        <textarea className="lr-explain-box" rows={5} maxLength={1000} value={explain} onChange={(e) => setExplain(e.target.value)} placeholder="Birkaç cümle yeter…" aria-label="Kendi açıklaman" />
        <div className="lr-actions"><button type="button" className="btn btn-primary" onClick={() => setStage('keypoints')}>Ana noktalarla karşılaştır</button></div>
      </section>
    </div>;
  }

  if (stage === 'keypoints') {
    return <div className="lr-page lr-lesson">{header}
      <section className="card">
        <h2>Ana noktalar</h2>
        <p className="muted">Açıklamanda bunlar var mıydı? Dürüstçe işaretle; eksikler sana kart olarak dönecek.</p>
        <ul className="lr-keypoints">
          {lesson.keyPoints.map((point, i) => <li key={i}>
            <MathText text={point} />
            <span className="lr-kp-rate" role="group" aria-label="Açıklamanda var mıydı?">
              <button type="button" className={ratings[i] === true ? 'selected good' : ''} aria-pressed={ratings[i] === true} onClick={() => setRatings((r) => ({ ...r, [i]: true }))}>Vardı</button>
              <button type="button" className={ratings[i] === false ? 'selected bad' : ''} aria-pressed={ratings[i] === false} onClick={() => setRatings((r) => ({ ...r, [i]: false }))}>Eksikti</button>
            </span>
          </li>)}
        </ul>
        <div className="lr-actions"><button type="button" className="btn btn-primary btn-lg" onClick={complete}>Dersi tamamla</button></div>
      </section>
    </div>;
  }

  if (stage === 'done') {
    return <div className="lr-page lr-lesson">{header}
      <section className="card lr-done">
        <h2>{completed ? 'Ders gözden geçirildi' : 'Ders tamam!'}</h2>
        <ul>
          <li><strong>{lesson.flashcards.length} tekrar kartı</strong> destene eklendi. Cevaplarına göre uygun aralıklarla yeniden karşına çıkacak.</li>
          <li><strong>Ustalık testi</strong> bir sonraki oturumunda planında: her soru tipinden gerçek sınav soruları ({meta.mastery.mix.reduce((s, m) => s + m.count, 0)} soru, ≈{meta.mastery.minutes} dk). Araya zaman girmesi kalıcılığı ölçer.</li>
          <li>Geçince konu <strong>1 · 3 · 7 · 14 · 30 · 60 gün</strong> aralıklarla kısa tekrarlarla taze tutulur.</li>
        </ul>
        {lesson.practice.length > 0 && <>
          <h3>Bu konuyu nasıl çalışmalısın?</h3>
          <ul className="lr-practice-tips">{lesson.practice.map((tip, i) => <li key={i}><MathText text={tip} /></li>)}</ul>
        </>}
        <div className="lr-actions">
          <Link className="btn btn-primary" to={BASE}>Bugünün planına dön</Link>
          <Link className="btn btn-secondary" to={`${BASE}/konu/${conceptId}`}>Konu sayfası</Link>
          <Link className="btn btn-secondary" to={`${BASE}/calis?tur=test&konu=${conceptId}`}>Konu testi çöz</Link>
        </div>
      </section>
    </div>;
  }

  const levelLabel = LEVELS.find((l) => l.id === level)?.label;
  const frontier = Math.max(startIndex, ...lesson.sections.map((s, i) => done.has(s.id) ? i + 1 : 0));
  const remainingChecks = checksInSection.filter((b) => !answers[checkId(b)]).length;
  return <div className="lr-page lr-lesson">{header}
    <div className="lr-reader">
    <aside className="lr-lesson-outline" aria-label="Ders yolun">
      <p className="lm-eyebrow">Ders yolun</p>
      <ol>{lesson.sections.map((s, i) => <li key={s.id}><button type="button" aria-current={i === sectionIndex ? 'step' : undefined}
        disabled={!completed && i > frontier} onClick={() => setSectionIndex(i)}>
        <span className="lr-outline-number" aria-label={done.has(s.id) ? 'Tamamlandı' : undefined}>{done.has(s.id) ? '✓' : String(i + 1).padStart(2, '0')}</span>
        <span><MathText text={s.title} /><small>{done.has(s.id) ? 'Tamamlandı' : `Yaklaşık ${s.minutes} dk`}</small></span>
      </button></li>)}</ol>
      <div className="lr-outline-help"><strong>Acele etmen gerekmiyor.</strong><p>Önce nedenini kendi cümlenle söyle. Sonra örneği kapatıp yeniden çöz.</p></div>
    </aside>
    <section className="card lr-section" aria-label="Ders anlatımı">
      <div className="lr-section-head">
        <h2><span className="muted">{sectionIndex + 1}.</span> <MathText text={section.title} /></h2>
        <span className="small muted">≈{section.minutes} dk · Anlatım: {levelLabel}</span>
      </div>
      <div className="lr-reader-tools"><span>Anlatımı seç:</span><div className="lr-level-switch" role="group" aria-label="Ders anlatım düzeyi">{LEVELS.map((l) => <button key={l.id} type="button" className={level === l.id ? 'active' : ''} aria-pressed={level === l.id} title={l.hint} onClick={() => setLevel(l.id)}>{l.label}</button>)}</div></div>
      <div className="lr-blocks">{section.blocks.map((block, i) => <div key={`${section.id}-${i}`} className={`lr-block lr-block-${block.type}`}><Block block={block} ctx={ctx} /></div>)}</div>
      {offer === 'L1' && <aside className="lr-offer" role="status">İki kontrol sorusu zorladı. <strong>Daha basit anlatayım mı?</strong>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setLevel('L1'); setOffer(null); document.querySelector('.lr-leveled')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }}>Evet, basit anlat</button>
        <button type="button" className="lr-link" onClick={() => setOffer(null)}>Böyle kalsın</button></aside>}
      {offer === 'L3' && <aside className="lr-offer" role="status">Hepsi doğru ve eminsin. <strong>Biraz daha derine inelim mi?</strong>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setLevel('L3'); setOffer(null); document.querySelector('.lr-leveled')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }}>Evet, derin anlat</button>
        <button type="button" className="lr-link" onClick={() => setOffer(null)}>Gerek yok</button></aside>}
      <div className="lr-section-nav">
        {sectionIndex > 0 && <button type="button" className="btn btn-secondary" onClick={() => setSectionIndex(sectionIndex - 1)}>← Önceki bölüm</button>}
        <button type="button" className="btn btn-primary" disabled={!allAnswered && !completed} onClick={finishSection}>
          {sectionIndex === lesson.sections.length - 1 ? 'Dersi bitir' : 'Devam'}
        </button>
        {!allAnswered && !completed && <span className="small muted">{remainingChecks} kontrol kaldı. Yanlış yapabilirsin; açıklamalar öğrenmenin bir parçası.</span>}
      </div>
    </section>
    </div>
  </div>;
}
