import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { catalogById, lessonScope } from './catalog.js';
import { ENGINE } from './engine/config.js';
import { formatDay, relativeDay } from './engine/dates.js';

export const BASE = '/konuyu-ogrenelim';

export function SharedExamNote({ exams }) {
  if (!exams.includes('TYT') || !exams.includes('AYT')) return null;
  return <p className="small muted lr-shared-exam-note">TYT ve AYT ortak konusu. Ortak anlatımı bir kez çalışırsın; iki sınavdaki çalışmaların aynı konu üzerinden ilerler. Varsa yalnız AYT’ye özgü ek bölümler ayrıca etiketlenir.</p>;
}

/** Ortak PRATIK seti başlatma adresi (TAS-05): tur = test | cikmis | practice | lab. GET yalnız sayfayı açar; oturum POST ile kurulur. */
export function sharedSetPath({ type, conceptId, archetype = null, codes = null }) {
  const query = new URLSearchParams({ tur: type, konu: conceptId });
  if (archetype) query.set('tip', archetype);
  if (codes?.length) query.set('kod', codes.join(','));
  return `${BASE}/pratik?${query}`;
}

/** Seti yeni sekmede açar (ders sekmesi yerinde kalır); sekme açılamazsa aynı adrese normal bağlantı olarak gider. */
export function SharedSetLink({ type, conceptId, archetype = null, codes = null, className, children }) {
  return <Link className={className} to={sharedSetPath({ type, conceptId, archetype, codes })} target="_blank" rel="noopener noreferrer">
    {children}<span className="sr-only"> (yeni sekmede açılır)</span></Link>;
}

const CATALOG = '/api/learning-resources/metadata';

/** Ortak DB kataloğu (Dersler, Soru Çöz ve kaynaklarla aynı okuma önbelleği). */
export function useLearnCatalog() {
  const [state, setState] = useState({ byId: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    api.getReference(CATALOG)
      .then((data) => { if (active) setState({ byId: catalogById(data?.categories), error: null }); })
      .catch((error) => { if (active) setState({ byId: null, error }); });
    return () => { active = false; };
  }, [attempt]);
  const retry = () => { api.invalidateReferences(); setState({ byId: null, error: null }); setAttempt((n) => n + 1); };
  return { ...state, loading: !state.byId && !state.error, retry };
}

export function CatalogError({ catalog }) {
  return <p className="small muted lr-catalog-state">Müfredattaki ders, ünite ve konu adları yüklenemedi.{' '}
    <button type="button" className="btn btn-secondary btn-sm" onClick={catalog.retry}>Yeniden dene</button></p>;
}

/** Dersin müfredattaki yeri: Ders › Ünite › Konu ve her konunun kendi TYT/AYT kapsamı. */
export function CatalogTopics({ catalog, categories }) {
  if (catalog.error) return <CatalogError catalog={catalog} />;
  if (!catalog.byId) return <p className="small muted lr-catalog-state" role="status">Müfredat konusu yükleniyor…</p>;
  const scope = lessonScope(categories, catalog.byId);
  if (!scope.topics.length) return <p className="small muted lr-catalog-state">Bu dersin müfredat bağı katalogda bulunamadı.</p>;
  return <ul className="lr-catalog-topics small" aria-label="Müfredattaki yeri">
    {scope.units.map((u) => <li key={u.id}>
      <span className="muted">{u.subject} › {u.name} ›</span>
      {scope.topics.filter((t) => t.unitId === u.id).map((t) => <span key={t.key} className="lr-catalog-entry">
        <span className="lr-catalog-topic">{t.topic}</span> <ExamBadges exams={t.exams} /></span>)}
    </li>)}
  </ul>;
}

/** Breadcrumb için katalog ders ve ünite adı; katalog yoksa boş kalır (elle yazılmış ünite adı kullanılmaz). */
export function catalogCrumb(catalog, categories) {
  if (!catalog.byId) return '';
  const scope = lessonScope(categories, catalog.byId);
  return scope.units.length ? `${scope.subject} › ${scope.units.map((u) => u.name).join(' · ')}` : '';
}

export const STATUS = {
  locked: { label: 'Önkoşullu', tone: 'locked', hint: 'Önkoşulu bitince açılır; istersen yine de başlayabilirsin.' },
  available: { label: 'Başlanabilir', tone: 'available', hint: 'Önkoşulları tamam; derse başlayabilirsin.' },
  learning: { label: 'Öğreniliyor', tone: 'learning', hint: 'Ders açık; kaldığın yerden devam.' },
  practicing: { label: 'Ustalık testi bekliyor', tone: 'practicing', hint: 'Ders bitti; her soru tipinden gerçek sorularla test.' },
  mastered: { label: 'Ustalaşıldı', tone: 'mastered', hint: 'Aralıklı tekrarla taze tutuluyor.' },
  review_due: { label: 'Tekrar zamanı', tone: 'due', hint: 'Unutmadan önce kısa bir tekrar.' },
  at_risk: { label: 'Risk altında', tone: 'risk', hint: 'Son tekrar zorladı; zayıf tipi toparlayalım.' },
};

export function StatusBadge({ status }) {
  const meta = STATUS[status] ?? STATUS.locked;
  return <span className={`lr-status lr-status-${meta.tone}`} title={meta.hint}>{meta.label}</span>;
}

export const LEVELS = [
  { id: 'L1', label: 'Temelden', hint: 'İlk kez öğreniyorum; somut örneklerle anlat' },
  { id: 'L2', label: 'Bağlantıları kur', hint: 'Temeli biliyorum; matematik diline geçelim' },
  { id: 'L3', label: 'Derinleş', hint: 'Gerekçeler, özel durumlar ve sınavda kısa yollar' },
];

export const CONFIDENCE = [
  { value: 3, label: 'Eminim' },
  { value: 2, label: 'Emin değilim' },
  { value: 1, label: 'Tahmin' },
];

/** Cevap akışı: şık → güven → geri bildirim. Güven düğmesi cevabı gönderir. */
export function ConfidencePicker({ onPick, disabled }) {
  return <div className="lr-confidence" role="group" aria-label="Ne kadar eminsin?">
    <span className="lr-confidence-label">Ne kadar eminsin?</span>
    {CONFIDENCE.map((option) => <button key={option.value} type="button" className={`btn btn-secondary lr-conf-${option.value}`} disabled={disabled}
      onClick={() => onPick(option.value)}>{option.label}</button>)}
  </div>;
}

export function MasteryRing({ value, size = 64, label = 'Ustalık' }) {
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const tone = pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'low';
  return <div className={`lr-ring lr-ring-${tone}`} style={{ width: size, height: size }} role="img" aria-label={`${label} %${pct}`}>
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} className="lr-ring-track" />
      <circle cx={size / 2} cy={size / 2} r={radius} className="lr-ring-value" strokeDasharray={`${(circumference * pct) / 100} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
    <span className="lr-ring-text">%{pct}</span>
  </div>;
}

/** Soru tipi çubukları: "4/5 soru tipini çözebiliyorsun" + tip başına yıldız. */
export function ArchetypeBars({ meta, concept, compact = false }) {
  const per = Object.fromEntries((concept?.perArchetype ?? []).map((a) => [a.id, a]));
  const solved = concept?.solvedTypes ?? 0;
  return <div className="lr-archetypes">
    {!compact && <p className="lr-archetypes-head"><strong>{solved}/{meta.archetypes.length}</strong> soru tipini çözebiliyorsun</p>}
    <ul>
      {meta.archetypes.map((archetype) => {
        const stat = per[archetype.id];
        const acc = Math.round(100 * (stat?.acc ?? 0));
        const seen = concept?.archetypes?.[archetype.id]?.seen ?? 0;
        const stars = stat?.recent ? (acc >= 85 ? 3 : acc >= ENGINE.mastery.solvedAcc * 100 ? 2 : acc > 0 ? 1 : 0) : 0;
        return <li key={archetype.id}>
          <span className="lr-arch-title">{archetype.title}</span>
          <span className="lr-arch-bar" aria-hidden="true"><span style={{ width: `${acc}%` }} className={acc >= 60 ? 'good' : acc >= 30 ? 'mid' : 'low'} /></span>
          <span className="lr-arch-stars" aria-label={`${stars} yıldız, %${acc} başarı, ${seen} deneme`}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
          {!compact && <span className="lr-arch-share small muted">sınavda %{Math.round(archetype.share * 100)}</span>}
        </li>;
      })}
    </ul>
  </div>;
}

export function DueText({ day, today }) {
  if (!day) return null;
  return <span title={formatDay(day, { withDay: true })}>{relativeDay(day, today)}</span>;
}

export function ConceptLink({ meta, children }) {
  return <Link to={`${BASE}/konu/${meta.id}`}>{children ?? meta.title}</Link>;
}

export function ExamBadges({ exams }) {
  return <span className="lr-exams">{exams.map((exam) => <span key={exam} className={`badge ${exam === 'TYT' ? 'badge-primary' : 'badge-muted'}`}>{exam}</span>)}</span>;
}

export function ProgressBar({ value, max, label }) {
  const pct = max ? Math.round((100 * value) / max) : 0;
  return <div className="lr-progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
    <span style={{ width: `${pct}%` }} />
  </div>;
}

export const minutesText = (minutes) => {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} sa ${m} dk` : `${h} sa`;
  }
  return `${minutes} dk`;
};

export const PLAN_KIND = {
  review: { icon: '↻', label: 'Tekrar' },
  missed: { icon: '✗', label: 'Yanlışlarım' },
  flashcards: { icon: '▣', label: 'Kartlar' },
  reteach: { icon: '✚', label: 'Yeniden anlatım' },
  learn: { icon: '▶', label: 'Ders' },
  mastery: { icon: '★', label: 'Ustalık testi' },
  mixed: { icon: '⧉', label: 'Karma set' },
  placement: { icon: '◎', label: 'Seviye testi' },
};

/** Plan maddesinin açılacağı adres. */
export function planHref(item) {
  switch (item.kind) {
    case 'learn': return `${BASE}/ders/${item.conceptId}`;
    case 'review': return `${BASE}/calis?tur=review&konu=${item.conceptId}`;
    case 'mastery': return `${BASE}/calis?tur=mastery&konu=${item.conceptId}`;
    case 'reteach': return `${BASE}/calis?tur=reteach&konu=${item.conceptId}`;
    case 'missed': return `${BASE}/calis?tur=missed`;
    case 'flashcards': return `${BASE}/calis?tur=flashcards`;
    case 'mixed': return `${BASE}/calis?tur=mixed&sinav=${item.track}`;
    case 'placement': return `${BASE}/seviye/${item.track}`;
    default: return BASE;
  }
}
