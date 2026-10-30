import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks.js';
import { useLearn } from '../LearnContext.jsx';
import { makeEvent } from '../api.js';
import { getLesson } from '../content/lessons.js';
import { dayKey, formatDay } from '../engine/dates.js';
import { lessonProgress } from '../engine/plan.js';
import { MathText, Markdown } from '../math.jsx';
import { ArchetypeBars, BASE, DueText, ExamBadges, MasteryRing, StatusBadge, minutesText } from '../ui.jsx';
import { bankCount, pastCount } from '../bank.js';

const HISTORY = { mastery: 'Ustalık testi', testout: 'Kısa ustalık testi', review: 'Tekrar', reteach: 'Yeniden anlatım' };
const OUTCOME = { up: 'bir basamak yukarı', same: 'aynı basamak', lapse: 'risk — yeniden anlatım' };

/** Kavram sayfası: soru tipi çubukları, unutma sayısı, süre, tekrar geçmişi ve duruma göre sıradaki adım. */
export default function ConceptPage() {
  const { conceptId } = useParams();
  const navigate = useNavigate();
  const { index, state, today, record } = useLearn();
  const meta = index.byId[conceptId];
  usePageTitle(meta ? `${meta.title} · Konuyu Öğrenelim` : 'Konuyu Öğrenelim');
  if (!meta) return <Navigate to={`${BASE}/harita`} replace />;
  const lesson = getLesson(conceptId);
  const concept = state.concepts[conceptId];
  const progress = lessonProgress(meta, concept);
  const prereqs = meta.prereq.map((id) => index.byId[id]).filter((p) => p && !state.concepts[p.id].firstMasteredAt);
  const unit = index.units.find((u) => u.id === meta.unit);

  const startAnyway = () => {
    record(makeEvent('concept', { conceptId, action: 'start_anyway' }));
    navigate(`${BASE}/ders/${conceptId}`);
  };

  const actions = [];
  switch (concept.status) {
    case 'locked':
      actions.push(<button key="any" type="button" className="btn btn-primary" onClick={startAnyway}>Yine de başla</button>);
      break;
    case 'available':
      actions.push(<Link key="start" className="btn btn-primary" to={`${BASE}/ders/${conceptId}`}>Derse başla ({minutesText(meta.minutes)})</Link>);
      if (concept.testOut) actions.push(<Link key="testout" className="btn btn-secondary" to={`${BASE}/calis?tur=testout&konu=${conceptId}`}>Kısa ustalık testiyle geç</Link>);
      break;
    case 'learning':
      if (concept.reteach) actions.push(<Link key="rt" className="btn btn-primary" to={`${BASE}/calis?tur=reteach&konu=${conceptId}`}>Zayıf tipi toparla</Link>);
      else actions.push(<Link key="go" className="btn btn-primary" to={`${BASE}/ders/${conceptId}`}>Derse devam (oturum {progress.session}/{progress.sessions})</Link>);
      break;
    case 'practicing':
      actions.push(<Link key="m" className="btn btn-primary" to={`${BASE}/calis?tur=mastery&konu=${conceptId}`}>Ustalık testi ({meta.mastery.mix.reduce((s, m) => s + m.count, 0)} soru)</Link>);
      break;
    case 'review_due':
      actions.push(<Link key="r" className="btn btn-primary" to={`${BASE}/calis?tur=review&konu=${conceptId}`}>Tekrar et ({meta.review.minutes} dk)</Link>);
      break;
    case 'at_risk':
      actions.push(<Link key="rt" className="btn btn-primary" to={`${BASE}/calis?tur=reteach&konu=${conceptId}`}>Yeniden anlatım</Link>);
      break;
    default:
      break;
  }
  if (concept.lessonCompletedAt || concept.firstMasteredAt) actions.push(<Link key="lesson" className="btn btn-secondary" to={`${BASE}/ders/${conceptId}`}>Dersi gözden geçir</Link>);
  if (concept.lessonOpenedAt || concept.firstMasteredAt || concept.testOut) actions.push(<Link key="test" className="btn btn-secondary" to={`${BASE}/calis?tur=test&konu=${conceptId}`}>Konu testi (12 soru)</Link>);
  if (pastCount(conceptId) > 0) actions.push(<Link key="past" className="btn btn-secondary" to={`${BASE}/calis?tur=cikmis&konu=${conceptId}`}>Çıkmış sorular ({pastCount(conceptId)})</Link>);

  return <div className="lr-page lr-concept-page">
    <nav className="lr-crumbs small" aria-label="Konum"><Link to={BASE}>Konuyu Öğrenelim</Link> › <Link to={`${BASE}/harita`}>Konu haritası</Link> › {unit?.title}</nav>
    <header className="card lr-concept-head">
      <div>
        <div className="lr-lesson-title"><h1>{meta.title}</h1><ExamBadges exams={meta.exams} /></div>
        <StatusBadge status={concept.status} />
        <p className="lr-goal"><MathText text={meta.goal} /></p>
        <div className="lr-actions">{actions}</div>
        {prereqs.length > 0 && <aside className="lr-callout">Önce şuna bakmanı öneririm: {prereqs.map((p, i) => <span key={p.id}>{i ? ', ' : ''}<Link to={`${BASE}/konu/${p.id}`}>{p.title}</Link></span>)}.</aside>}
      </div>
      <MasteryRing value={concept.mastery} size={96} />
    </header>

    <div className="lr-concept-grid">
      <section className="card">
        <h2>Soru tipleri</h2>
        <ArchetypeBars meta={meta} concept={concept} />
        <ul className="lr-arch-actions">
          {meta.archetypes.map((a) => <li key={a.id}>
            <details><summary>{a.title}</summary>
              <p className="small"><strong>Bunu görünce:</strong> <MathText text={a.cue} /></p>
              <p className="small"><strong>Yöntem:</strong> <MathText text={a.strategy} /></p>
              {(concept.lessonOpenedAt || concept.firstMasteredAt) && <Link className="btn btn-secondary btn-sm" to={`${BASE}/calis?tur=practice&konu=${conceptId}&tip=${a.id}`}>Bu tipten alıştırma</Link>}
            </details>
          </li>)}
        </ul>
      </section>
      <section className="card">
        <h2>Durum</h2>
        <dl className="lr-facts">
          <dt>Sonraki tekrar</dt><dd>{concept.nextDue ? <><DueText day={concept.nextDue} today={today} /> ({formatDay(concept.nextDue)})</> : '—'}</dd>
          <dt>Merdiven basamağı</dt><dd>{concept.firstMasteredAt ? `${concept.ladderStep + 1}/6` : '—'}</dd>
          <dt>Kalıcılık</dt><dd>{concept.retained ? 'İlk aralıklı tekrarı geçti' : concept.firstMasteredAt ? 'İlk tekrar bekleniyor' : '—'}</dd>
          <dt>Unutma (lapse)</dt><dd>{concept.lapses}</dd>
          <dt>Çalışma süresi</dt><dd>{minutesText(concept.minutesSpent)}</dd>
          <dt>Ders</dt><dd>{concept.lessonCompletedAt ? 'Tamamlandı' : concept.lessonOpenedAt ? `${concept.sectionsDone.length}/${meta.sections.length} bölüm` : `${meta.sections.length} bölüm · ${minutesText(meta.minutes)}`}</dd>
          <dt>Banka</dt><dd>{bankCount(conceptId)} soru{pastCount(conceptId) ? ` · ${pastCount(conceptId)} ÖSYM çıkmış` : ''}</dd>
        </dl>
        {concept.history.length > 0 && <>
          <h3>Geçmiş</h3>
          <ul className="lr-history">{[...concept.history].reverse().map((h) => <li key={h.setId ?? h.at}>
            <span>{formatDay(dayKey(new Date(h.at)))}</span> · {HISTORY[h.type] ?? h.type}{h.pct != null ? ` %${h.pct}` : ''}
            {h.passed != null && (h.passed ? ' · geçti' : ' · geçmedi')}{h.outcome ? ` · ${OUTCOME[h.outcome]}` : ''}
          </li>)}</ul>
        </>}
      </section>
    </div>

    {(meta.practice ?? []).length > 0 && <section className="card lr-howto">
      <h2>Nasıl çalışmalı? Sınavda nasıl yaklaşmalı?</h2>
      <ul className="lr-practice-tips">{meta.practice.map((tip, i) => <li key={i}><MathText text={tip} /></li>)}</ul>
      {meta.targetSeconds && <p className="small muted">Hedef süre: soru başı {meta.targetSeconds} saniye. Konu testi ve çıkmış sorular setinde süreni bu hedefle karşılaştır.</p>}
    </section>}

    <section className="card">
      <h2>Neden önemli?</h2>
      <Markdown text={meta.why} />
      {meta.confused.length > 0 && <p className="small"><strong>Karıştırılan kavram:</strong> {meta.confused.map((id, i) => <span key={id}>{i ? ', ' : ''}<Link to={`${BASE}/konu/${id}`}>{index.byId[id]?.title}</Link></span>)} — karma setlerde yan yana sorulur.</p>}
      {lesson && concept.lessonCompletedAt && <>
        <h3>Ana noktalar</h3>
        <ul>{lesson.keyPoints.map((point, i) => <li key={i}><MathText text={point} /></li>)}</ul>
      </>}
      {lesson && <p className="small muted">Kaynaklar: {lesson.sources.join(' · ')}</p>}
    </section>
  </div>;
}
