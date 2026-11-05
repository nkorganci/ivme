import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks.js';
import { useLearnCatalog } from '../ui.jsx';
import { Markdown } from '../math.jsx';
import FigureZoom from '../lesson/FigureZoom.jsx';
import PhysicsExperiment from './experiments.jsx';
import { CHECKS, TRANSFER } from './questions.js';
import lesson from './hareket-kuvvet.generated.json';
import './physics.css';
import '../lesson/learning-experience.css';

function Check({ question, independent = false }) {
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const answered = selected !== null;
  return <section className="ph-check" aria-label={independent ? 'Bağımsız aktarım sorusu' : 'Önce tahmin et'}>
    <h3>{independent ? 'Kendi başına dene' : 'Önce tahmin et'}</h3><p>{question.prompt}</p>
    <div className="ph-choices">{question.options.map((option, i) => <button key={option} type="button" className="btn btn-secondary" aria-pressed={selected === i} onClick={() => setSelected(i)}>{option}</button>)}</div>
    {answered && <div className={'ph-feedback ' + (selected === question.correct ? 'ph-correct' : 'ph-retry')} role="status"><strong>{selected === question.correct ? 'Gerekçenle kontrol et. ' : 'Bir noktayı yeniden düşün. '}</strong>{question.feedback?.[selected] ?? question.explanation}</div>}
    {answered && <label className="ph-reason">Bunu bir arkadaşına nasıl açıklarsın?<textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Çünkü…" /></label>}
  </section>;
}

export default function PhysicsLessonPage() {
  usePageTitle('Hareket ve Kuvvet · Fizik');
  const [params, setParams] = useSearchParams();
  const catalog = useLearnCatalog();
  const category = catalog.byId?.get(lesson.categoryId);
  const selected = lesson.sections.find(s => s.id === params.get('bolum')) ?? lesson.sections[0];
  const sectionIndex = lesson.sections.indexOf(selected);
  const level = ['intuition', 'connection', 'deeper'].includes(params.get('duzey')) ? params.get('duzey') : 'intuition';
  const [showTransfer, setShowTransfer] = useState(false);
  const pathRef = useRef(null);
  const titleRef = useRef(null);
  const previousSection = useRef(selected.id);
  useEffect(() => {
    const nav = pathRef.current;
    const active = nav?.querySelector('[aria-current]');
    if (nav && active && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = active.offsetLeft - nav.offsetLeft;
    if (previousSection.current !== selected.id) {
      titleRef.current?.focus({ preventScroll: true });
      titleRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
      previousSection.current = selected.id;
    }
  }, [selected.id]);
  const navigate = (id, newLevel = level) => { setParams({ bolum: id, duzey: newLevel }); setShowTransfer(false); };
  const sources = lesson.sources.filter(source => selected.sourceNotes.includes(source.note));
  return <article className="ph-lesson">
    <Link className="ph-back" to="/konuyu-ogrenelim/harita?ders=fizik">← Fizik konu haritası</Link>
    <header className="ph-hero">
      <div><p className="ph-eyebrow">{category?.subject ?? 'Fizik'} · TYT · 9. SINIF</p><h1>{category?.topic ?? lesson.title}</h1>
        <p className="ph-lead">Bir hareketi izlemek başka, neden öyle olduğunu anlamak başka. Önce tahmin et; sonra deneyi değiştir, fikrini sınayıp açıklamayı kur.</p>
        <p className="ph-pilot-label">Deneme dersi · Öğretmen incelemesi bekliyor</p></div>
      <svg viewBox="0 0 300 165" role="img" aria-label="Yol, hız ve kuvvet arasındaki bağlantıyı anlatan ders simgesi"><path d="M20 130H280" /><path d="M25 105Q100 30 170 85T275 65" className="ph-hero-trail" /><rect x="122" y="85" width="56" height="34" rx="8" /><circle cx="134" cy="125" r="8" /><circle cx="166" cy="125" r="8" /><path d="M185 100H248L238 90M248 100L238 110" /><text x="150" y="30" textAnchor="middle">Gözlem → model → gerekçe</text></svg>
    </header>
    <div className="ph-layout">
      <aside className="ph-path card"><h2>Bu dersteki yolun</h2><p className="small muted">8 durak · İstediğin bölüme dönebilirsin.</p><nav ref={pathRef} aria-label="Fizik ders bölümleri">{lesson.sections.map((section, index) => <button type="button" key={section.id} onClick={() => navigate(section.id)} aria-current={selected.id === section.id ? 'step' : undefined}><span>{index + 1}</span>{section.title}</button>)}</nav>
        <button type="button" className="btn btn-secondary" onClick={() => setShowTransfer(true)}>Bağımsız denemeyi aç</button>
      </aside>
      <div className="ph-main">
      {showTransfer ? <section className="card ph-content" key="transfer"><p className="ph-eyebrow">YARDIMI AZALT · YENİ DURUMA AKTAR</p><h2>Model kapalıyken açıklayabiliyor musun?</h2><p>Bu altı özgün alıştırmada önce kendin düşün. Şıkkını seçince gerekçeyi karşılaştır. Alıştırmalar puanlanmaz.</p>{TRANSFER.map(question => <Check key={question.id} question={question} independent />)}<button className="btn btn-primary" type="button" onClick={() => setShowTransfer(false)}>Derse dön</button></section>
      : <section className="card ph-content" key={selected.id}>
        <p className="ph-eyebrow">DURAK {sectionIndex + 1} / 8</p><h2 ref={titleRef} tabIndex={-1}>{selected.title}</h2><div className="ph-story"><Markdown text={selected.story} /></div>
        <Check question={CHECKS[selected.id]} />
        <PhysicsExperiment sectionId={selected.id} />
        <section className="ph-explain"><h3>Şimdi mantığını kuralım</h3><div className="ph-levels" role="group" aria-label="Anlatım düzeyi">{[['intuition', 'Temelden'], ['connection', 'Bağlantıları kur'], ['deeper', 'Derinleş']].map(([id, label]) => <button type="button" key={id} className="btn btn-secondary" aria-pressed={level === id} onClick={() => navigate(selected.id, id)}>{label}</button>)}</div><Markdown text={selected[level]} /></section>
        <section className="ph-worked"><h3>Birlikte çöz: her adımın nedenini söyle</h3>{[1, 2].map(n => <details key={n}><summary><Markdown text={selected[n === 1 ? 'workedQuestion' : 'workedQuestion2']} /></summary><Markdown text={selected[n === 1 ? 'workedSolution' : 'workedSolution2']} /></details>)}</section>
        <div className="ph-insights"><section><h3>Pratik yol ve geçerli olduğu koşul</h3><Markdown text={selected.shortcut} /></section><section><h3>Burada sık düşülen tuzak</h3><Markdown text={selected.trap} /></section></div>
        <details className="ph-inquiry"><summary>Günlük hayattan sorgula</summary><Markdown text={selected.inquiry} /><details><summary>Bir gerekçeyle karşılaştır</summary><Markdown text={selected.inquiryAnswer} /></details></details>
        <section className="ph-sources"><h3>Kaynağı gözünle incele</h3><p className="small muted">OGM 9. sınıf konu notlarının özgün sayfaları. Deneyler ve çözümlü sayısal örnekler bu pilot için hazırlanmıştır.</p>
          {sources.map(source => <details key={source.note}><summary>{source.filename} · s. 1</summary>{source.pages.map(page => <figure key={page.page}><a href={page.image} target="_blank" rel="noreferrer">Sayfayı ayrı sekmede aç ↗</a><FigureZoom label={`${source.note} numaralı kaynak sayfasını büyüt`}><img src={page.image} alt={`${source.filename}, sayfa ${page.page}`} /></FigureZoom><img loading="lazy" src={page.image} alt={`${source.filename}, sayfa ${page.page}`} /><figcaption>OGM Materyal · {source.filename} · PDF s. {page.page}</figcaption></figure>)}</details>)}
          {selected.id === 'surtunme' && <p className="small">Okurken dikkat: kayma sürtünmesi temas yüzeyleri arasındaki bağıl kaymaya karşıdır. Yürüyüşte ayak üzerindeki statik sürtünme ileri yönlü olabilir. Normal kuvvet ile ağırlık, aynı cisimde oldukları için etki–tepki çifti değildir.</p>}
        </section>
        <footer className="ph-section-actions"><button type="button" className="btn btn-secondary" disabled={sectionIndex === 0} onClick={() => navigate(lesson.sections[sectionIndex - 1].id)}>← Önceki bölüm</button><button type="button" className="btn btn-primary" onClick={() => sectionIndex < 7 ? navigate(lesson.sections[sectionIndex + 1].id) : setShowTransfer(true)}>{sectionIndex < 7 ? 'Sonraki bölüm →' : 'Yeni sorularla kendini dene →'}</button></footer>
      </section>}
      </div>
    </div>
  </article>;
}
