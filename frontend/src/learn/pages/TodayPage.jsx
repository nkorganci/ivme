import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks.js';
import { useLearn } from '../LearnContext.jsx';
import { derive } from '../engine/derive.js';
import { addDays, formatDay, fromDayKey } from '../engine/dates.js';
import { buildPlan } from '../engine/plan.js';
import { todayWins } from '../engine/stats.js';
import { examDaysLeft } from '../engine/ladder.js';
import { BASE, MasteryRing, PLAN_KIND, minutesText, planHref } from '../ui.jsx';
import { downloadReminder } from '../reminders.js';

function PlanRow({ item, index }) {
  const kind = PLAN_KIND[item.kind];
  const title = item.conceptId ? index.byId[item.conceptId]?.title : kind.label;
  return <li className={`lr-plan-item${item.done ? ' done' : ''}${item.overdueDays ? ' late' : ''}`}>
    <span className={`lr-plan-icon lr-plan-${item.kind}`} aria-hidden="true">{item.done ? '✓' : kind.icon}</span>
    <div className="lr-plan-body">
      <p className="lr-plan-title"><strong>{kind.label}</strong>{item.conceptId && <> · {title}</>}{item.count ? ` · ${item.count} öğe` : ''}
        {item.track && <span className="badge badge-muted">{item.track}</span>}{item.optional && <span className="badge badge-muted">isteğe bağlı</span>}</p>
      <p className="lr-plan-reason small">{item.reason}</p>
    </div>
    <span className="lr-plan-minutes">{minutesText(item.minutes)}{item.partial ? '+' : ''}</span>
    {item.done ? <span className="lr-plan-done small">Tamam</span> : <Link className="btn btn-primary btn-sm" to={planHref(item)}>{item.kind === 'learn' && item.continuing ? 'Devam' : 'Başla'}</Link>}
  </li>;
}

/** Bugün (spec §7, §8, §11, §13): sonlu, dakikalı plan; geç kalanlar üstte; nazik gecikme bandı. */
export default function TodayPage() {
  usePageTitle('Bugün · Konuyu Öğrenelim');
  const learn = useLearn();
  const navigate = useNavigate();
  const { plan, state, index, settings, today, nextUp, events, summary } = learn;
  const items = [...plan.items].sort((a, b) => Number(a.done) - Number(b.done));
  const total = plan.items.reduce((sum, item) => sum + item.minutes, 0);
  const doneMinutes = Math.round((state.days[today]?.ms ?? 0) / 60000);
  const allDone = plan.items.length > 0 && plan.items.every((item) => item.done);
  const late = plan.items.filter((item) => item.kind === 'review' && item.overdueDays > 0 && !item.done)
    .sort((a, b) => b.overdueDays - a.overdueDays)[0];
  const wins = todayWins(state, plan.startState);
  const left = examDaysLeft(settings.examDate, today);
  const first = state.eventCount === 0;

  const tomorrow = useMemo(() => {
    const morning = fromDayKey(addDays(today, 1));
    morning.setHours(7, 0, 0, 0);
    const next = buildPlan({ state: derive({ events, index, settings, now: morning }), index, summary });
    const reviews = next.items.filter((item) => item.kind === 'review');
    const learning = next.items.filter((item) => item.kind === 'learn');
    const parts = [];
    if (reviews.length) parts.push(`${reviews.length} tekrar (${reviews.reduce((s, i) => s + i.minutes, 0)} dk)`);
    for (const item of learning.slice(0, 2)) parts.push(`${item.continuing ? 'derse devam' : 'yeni konu'}: ${index.byId[item.conceptId]?.title} (${item.minutes} dk)`);
    const other = next.items.filter((item) => !['review', 'learn'].includes(item.kind));
    if (other.length) parts.push(other.map((item) => PLAN_KIND[item.kind].label.toLocaleLowerCase('tr')).join(', '));
    return parts.length ? `Yarın: ${parts.join(' + ')}.` : 'Yarın için vadeli iş yok; yeni bir konuya başlayabilirsin.';
  }, [events, index, settings, summary, today]);

  const tracks = settings.tracks.map((track) => {
    const concepts = index.concepts.filter((m) => m.exams.includes(track));
    const mastered = concepts.filter((m) => state.concepts[m.id].firstMasteredAt).length;
    const avg = concepts.length ? Math.round(concepts.reduce((s, m) => s + state.concepts[m.id].mastery, 0) / concepts.length) : 0;
    const nextItem = plan.items.find((item) => !item.done && (item.track === track || item.track == null))
      ?? nextUp.find((item) => item.track === track);
    return { track, concepts, mastered, avg, nextItem };
  });

  const start = (track) => {
    const target = tracks.find((t) => t.track === track)?.nextItem;
    if (target) navigate(planHref(target));
    else navigate(`${BASE}/harita?sinav=${track}`);
  };

  return <div className="lr-page lr-today">
    <div className="page-head"><h1>Bugün</h1><span className="muted">{formatDay(today, { withDay: true })}{left != null && left >= 0 ? ` · sınava ${left} gün` : ''}</span></div>

    {first && <section className="card lr-welcome">
      <h2>Konuyu Öğrenelim'e hoş geldin</h2>
      <p>Burada ne çalışacağını, neyi tekrar edeceğini ve hangi soru tiplerinde zorlandığını sen hatırlamak zorunda değilsin. Her gün sana sonlu, dakikalı bir plan hazırlanır.</p>
      <ol className="lr-loop">
        <li><strong>Öğren:</strong> kısa ön test, adım adım bölümler, her bölümde kontrol sorusu.</li>
        <li><strong>Ustalaş:</strong> bir sonraki oturumda her soru tipinden gerçek ÖSYM/OGM sorularıyla test (%80).</li>
        <li><strong>Tekrarla:</strong> 1 · 3 · 7 · 14 · 30 · 60 gün aralıklarla kısa tekrarlar; unutulursa yeniden anlatım.</li>
        <li><strong>Hatalarından öğren:</strong> yanlış yaptığın soru 1 gün sonra geri gelir, yanında aynı tipten görmediğin bir kardeşiyle.</li>
      </ol>
      <div className="lr-actions">
        <Link className="btn btn-primary" to={`${BASE}/ayarlar`}>Sınav tarihini ve günlük süreni ayarla</Link>
        <Link className="btn btn-secondary" to={`${BASE}/harita`}>Konu haritasına bak</Link>
      </div>
    </section>}

    <section className="lr-today-top">
      <div className="card lr-goal-card">
        <MasteryRing value={total ? Math.min(100, Math.round((100 * doneMinutes) / total)) : 0} size={76} label="Günlük hedef" />
        <div>
          <p className="lr-big">{doneMinutes} / {minutesText(total || settings.dailyMinutes)}</p>
          <p className="small muted">Bugünkü plan · bütçe {minutesText(settings.dailyMinutes)}</p>
        </div>
      </div>
      <div className="card lr-streak-card">
        <p className="lr-big" aria-label={`${state.streak.count} günlük seri`}>🔥 {state.streak.count} gün</p>
        <p className="small muted">Dondurma hakkı: {'❄'.repeat(state.streak.freezes) || 'yok'} {state.streak.freezes ? `(${state.streak.freezes})` : ''} · en uzun {state.streak.best}</p>
        <p className="small muted">Haftada 4 gün çalışınca 1 hak kazanırsın; kaçırdığın bir gün seriyi silmez.</p>
      </div>
      <div className="card lr-wins-card">
        <p className="lr-big">{wins.points} puan</p>
        <p className="small muted">{wins.unlockedTypes ? `Bugün ${wins.unlockedTypes} yeni soru tipi açtın. ` : ''}{wins.fixed ? `${wins.fixed} hatayı düzelttin. ` : ''}{wins.reviews ? `${wins.reviews} tekrar tamam.` : 'Puan tamamlanan tekrar ve düzeltilen hatadan gelir, hızdan değil.'}</p>
      </div>
    </section>

    {plan.message && <aside className={`lr-banner lr-banner-${plan.mode}`} role="status">{plan.message}</aside>}
    {late && <aside className="lr-banner lr-banner-late" role="status">
      {index.byId[late.conceptId]?.title} tekrarın {late.overdueDays} gün gecikti — {late.minutes} dakikalık tekrarla başlayalım.
      <Link className="btn btn-primary btn-sm" to={planHref(late)}>Başla</Link>
    </aside>}

    <section className="card">
      <div className="lr-section-head"><h2>Bugünün planı</h2><span className="small muted">{plan.items.filter((i) => i.done).length}/{plan.items.length} tamam · {minutesText(total)}</span></div>
      {allDone && <div className="lr-celebrate" role="status"><strong>Bugünkü hedef tamam!</strong> Yarın için plan hazır. İstersen aşağıdan ek bir şey seçebilirsin.</div>}
      {items.length ? <ul className="lr-plan">{items.map((item) => <PlanRow key={item.key} item={item} index={index} />)}</ul>
        : <p className="muted">Bugün için vadeli iş yok. Konu haritasından istediğin konuya başlayabilirsin.</p>}
      {plan.deferred.length > 0 && <p className="small muted">Bütçeye sığmayan {plan.deferred.length} iş vadeli kaldı; yarın önceliği artmış olarak gelecek.</p>}
      {plan.extras?.map((item) => <ul key={item.key} className="lr-plan"><PlanRow item={{ ...item, done: false }} index={index} /></ul>)}
    </section>

    {nextUp.length > 0 && <section className="card">
      <h2>Sırada</h2>
      <ul className="lr-plan">{nextUp.map((item) => <PlanRow key={item.key} item={{ ...item, done: false }} index={index} />)}</ul>
    </section>}

    <section className="lr-tracks">
      {tracks.map((t) => <article key={t.track} className="card lr-track">
        <header><h2>{t.track} Matematik</h2><MasteryRing value={t.avg} size={56} /></header>
        <p className="small">{t.mastered}/{t.concepts.length} kavram ustalaşıldı</p>
        <div className="lr-actions">
          <button type="button" className="btn btn-primary" onClick={() => start(t.track)}>Çalışmaya başla</button>
          <Link className="btn btn-secondary" to={`${BASE}/harita?sinav=${t.track}`}>Konu haritası</Link>
          {!state.placement[t.track] && !settings.placementSkipped.includes(t.track) && <Link className="btn btn-secondary" to={`${BASE}/seviye/${t.track}`}>Seviye testi</Link>}
        </div>
      </article>)}
    </section>

    <section className="card lr-tomorrow">
      <h2>Yarın</h2>
      <p>{tomorrow}</p>
      <p className="small muted">Hatırlatma saatin {settings.reminderTime}. Günde en çok bir nazik hatırlatma.
        {' '}<button type="button" className="lr-link" onClick={() => downloadReminder(settings)}>Takvimine ekle (.ics)</button> · <Link to={`${BASE}/ayarlar`}>Ayarlar</Link></p>
    </section>
  </div>;
}
