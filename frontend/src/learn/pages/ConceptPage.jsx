import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks.js';
import { useLearn } from '../LearnContext.jsx';
import { makeEvent } from '../api.js';
import { getLesson } from '../content/lessons.js';
import { scopeToTracks } from '../content/parser.js';
import { dayKey, formatDay } from '../engine/dates.js';
import { lessonProgress } from '../engine/plan.js';
import { MathText, Markdown } from '../math.jsx';
import { ArchetypeBars, BASE, CatalogTopics, DueText, ExamBadges, MasteryRing, SharedSetLink, StatusBadge, catalogCrumb, minutesText, useLearnCatalog } from '../ui.jsx';
import { bankCount, loadBank, pastCount } from '../bank.js';
import { plannedSize, sizeNote } from '../engine/sharedSet.js';

const HISTORY = { mastery: 'Ustalık testi', testout: 'Kısa ustalık testi', review: 'Tekrar', reteach: 'Yeniden anlatım' };
const OUTCOME = { up: 'bir basamak yukarı', same: 'aynı basamak', lapse: 'risk — yeniden anlatım' };

/** Kavram sayfası: soru tipi çubukları, unutma sayısı, süre, tekrar geçmişi ve duruma göre sıradaki adım. */
export default function ConceptPage() {
  const { conceptId } = useParams();
  const navigate = useNavigate();
  const { index, state, today, record, settings, practiceSets } = useLearn();
  const catalog = useLearnCatalog();
  const meta = index.byId[conceptId];
  // Set boyutları gerçek (ikizleri ayıklanmış) bankadan gelir; bankaya inmeden sayı uydurulmaz.
  const [bank, setBank] = useState(null);
  useEffect(() => {
    let active = true;
    setBank(null);
    loadBank(conceptId).then((loaded) => { if (active) setBank(loaded); }).catch(() => {});
    return () => { active = false; };
  }, [conceptId]);
  usePageTitle(meta ? `${meta.title} · Konuyu Öğrenelim` : 'Konuyu Öğrenelim');
  if (!meta) return <Navigate to={`${BASE}/harita`} replace />;
  const lesson = getLesson(conceptId);
  const concept = state.concepts[conceptId];
  const progress = lessonProgress(meta, concept, settings.tracks);
  const required = scopeToTracks(meta, settings.tracks);
  const prereqs = meta.prereq.map((id) => index.byId[id]).filter((p) => p && !state.concepts[p.id].firstMasteredAt);
  const crumb = catalogCrumb(catalog, meta.categories);

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
  const openSet = (kind, archetype = null) => practiceSets.find((s) => s.status === 'IN_PROGRESS' && s.conceptId === conceptId && s.kind === kind && (s.archetypeId ?? null) === archetype);
  const setLabel = (title, size, open) => (open ? `${title}: devam (${open.answered}/${open.total})` : size == null ? title : `${title} (${size} soru)`);
  const testSize = bank ? plannedSize('test', bank, null, state) : null;
  const pastSize = bank ? plannedSize('cikmis', bank, null, state) : null;
  const hiddenCount = bank ? bank.filter((q) => state.hidden?.has(q.id)).length : 0;
  if ((concept.lessonOpenedAt || concept.firstMasteredAt || concept.testOut) && testSize !== 0) {
    actions.push(<SharedSetLink key="test" className="btn btn-secondary" type="test" conceptId={conceptId}>{setLabel('Konu testi', testSize, openSet('TOPIC_TEST'))}</SharedSetLink>);
  }
  if (pastSize == null ? pastCount(conceptId) > 0 : pastSize > 0) actions.push(<SharedSetLink key="past" className="btn btn-secondary" type="cikmis" conceptId={conceptId}>{setLabel('Çıkmış sorular', pastSize, openSet('PAST_EXAM'))}</SharedSetLink>);

  return <div className="lr-page lr-concept-page">
    <nav className="lr-crumbs small" aria-label="Konum"><Link to={BASE}>Konuyu Öğrenelim</Link> › <Link to={`${BASE}/harita`}>Konu haritası</Link>{crumb && ` › ${crumb}`}</nav>
    <header className="card lr-concept-head">
      <div>
        <div className="lr-lesson-title"><h1>{meta.title}</h1><ExamBadges exams={meta.exams} /></div>
        <CatalogTopics catalog={catalog} categories={meta.categories} />
        <StatusBadge status={concept.status} />
        <p className="lr-goal"><MathText text={meta.goal} /></p>
        <div className="lr-actions">{actions}</div>
        {prereqs.length > 0 && <aside className="lr-callout">Önce şuna bakmanı öneririm: {prereqs.map((p, i) => <span key={p.id}>{i ? ', ' : ''}<Link to={`${BASE}/konu/${p.id}`}>{p.title}</Link></span>)}.</aside>}
      </div>
      <MasteryRing value={concept.mastery} size={96} />
    </header>

    {bank && (concept.lessonOpenedAt || concept.firstMasteredAt || concept.testOut) && (sizeNote('test', bank, null, state) || hiddenCount > 0) && <p className="small muted lr-set-note">
      {hiddenCount > 0 ? `“Tekrar gösterme” dediğin ${hiddenCount} soru setlerden çıkarıldı (Soru Çöz & Pratik'te Gizlediklerim bölümünden geri alabilirsin). ` : ''}{sizeNote('test', bank, null, state)}</p>}

    <div className="lr-concept-grid">
      <section className="card">
        <h2>Soru tipleri</h2>
        <ArchetypeBars meta={meta} concept={concept} />
        <ul className="lr-arch-actions">
          {meta.archetypes.map((a) => <li key={a.id}>
            <details><summary>{a.title}</summary>
              <p className="small"><strong>Bunu görünce:</strong> <MathText text={a.cue} /></p>
              <p className="small"><strong>Yöntem:</strong> <MathText text={a.strategy} /></p>
              {(concept.lessonOpenedAt || concept.firstMasteredAt) && <SharedSetLink className="btn btn-secondary btn-sm" type="practice" conceptId={conceptId} archetype={a.id}>
                {openSet('ARCHETYPE', a.id) ? `Bu tipten alıştırma: devam (${openSet('ARCHETYPE', a.id).answered}/${openSet('ARCHETYPE', a.id).total})` : 'Bu tipten alıştırma'}</SharedSetLink>}
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
          <dt>Ders</dt><dd>{concept.lessonCompletedAt ? 'Tamamlandı' : concept.lessonOpenedAt ? `${required.sections.filter((x) => concept.sectionsDone.includes(x.id)).length}/${required.sections.length} bölüm` : `${required.sections.length} bölüm · ${minutesText(required.minutes)}`}</dd>
          <dt>Banka</dt><dd>{bank ? `${bank.length} tekil soru` : `${bankCount(conceptId)} kayıt`}{pastSize ? ` · ${pastSize} ÖSYM çıkmış` : pastSize == null && pastCount(conceptId) ? ` · ${pastCount(conceptId)} ÖSYM çıkmış` : ''}
            {bank && bankCount(conceptId) > bank.length && <span className="small muted"> ({bankCount(conceptId)} kayıttan {bankCount(conceptId) - bank.length}'i aynı görselin kitapçık kopyası)</span>}</dd>
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
