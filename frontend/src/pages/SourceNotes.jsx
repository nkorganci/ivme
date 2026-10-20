import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../hooks.js';
import ResourceContext from '../components/ResourceContext.jsx';
import { api } from '../api.js';

const lower = (text) => text.toLocaleLowerCase('tr-TR');

function StudyOverview({ data }) {
  const [exam, setExam] = useState('TYT');
  return <div className="source-notes-page">
    <div className="page-head"><h1>Analiz ve çalışma planı</h1></div>
    <p className="source-notes-intro">Dersini seç; hazır konu rehberinden başla, kaynak incelemesi süren başlıkları ayırt et.</p>
    <p>{data.lessonCount} konu rehberi · {data.patternCount} soru kalıbı · kaynaklı çözüm adımları ve düşünme provaları</p>
    <div className="source-overview-exams" role="group" aria-label="Sınav seçimi">
      {['TYT', 'AYT'].map((value) => <button type="button" key={value} className="btn btn-secondary"
        aria-pressed={exam === value} onClick={() => setExam(value)}>{value}</button>)}
    </div>
    <ul className="source-overview-list">{data.subjectOverview.filter((item) => item.exam === exam).map((item) =>
      <li className="card" key={`${item.exam}:${item.subject}`}>
        <h2>{item.exam} · {item.displaySubject || item.subject}</h2>
        <p>{item.readyTopics ? `${item.readyTopics} konuda rehber hazır` : 'Konu rehberleri için kaynak incelemesi sürüyor'}</p>
        {item.guideId && <Link className="btn btn-primary" to={`/kaynakli-ders-notlari/${item.guideId}`}>Konu seç ve çalış</Link>}
        <details><summary>Dersin kaynakları ve kapsamı</summary>
          <p className="muted small">{item.records.toLocaleString('tr-TR')} etkin yerel soru kaydı.{item.needsVisualReview > 0 && ` ${item.needsVisualReview.toLocaleString('tr-TR')} kayıtta görsel inceleme gerekiyor.`} Sayılar konu önem sırası veya sınavda çıkma olasılığı değildir.</p>
          <ul>{item.sources.map((source) => <li key={source.catalogId}>
            <a href={`/api/topic-pdfs/${source.catalogId}/file`} target="_blank" rel="noreferrer">{source.title}</a>
          </li>)}</ul>
        </details>
      </li>)}</ul>
    <details className="card source-notes-status"><summary>Analiz nasıl yapılıyor?</summary>
      <ol><li>Çıkmış soru ve OGM kaydı kaynak kimliğiyle eşleştirilir.</li>
        <li>Konu etiketi ile sorunun istediği zihinsel işlem ayrı incelenir.</li>
        <li>Konu PDF'siyle kavram, yöntem ve örnekler karşılaştırılır.</li>
        <li>Konunun soru kalıpları, çeldiricileri ve yeni alıştırması hazırlanır.</li></ol>
      <p className="muted small">{data.analysisSummary.records.toLocaleString('tr-TR')} kaydın kaynak envanteri ve {data.analysisSummary.primaryPdfs} temel OGM PDF'si incelendi. Otomatik soru kökü adayları tamamlanmış pedagojik analiz değildir; bütün arşivin tek tek çözümü ve öğretmen onayı tamamlanmış sayılmaz.</p>
    </details>
  </div>;
}

function TopicIndex({ group, selected, onSelect }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 801px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 801px)');
    const update = () => setOpen(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const units = group.units.map((unit) => ({ ...unit, topics: unit.topics.filter((topic) =>
    lower(`${unit.name} ${topic}`).includes(lower(search.trim()))) })).filter((unit) => unit.topics.length);
  return <aside className="card source-notes-index" aria-label={`${group.exam} ${group.subject} konu dizini`}>
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Konu seç · {group.readyTopicCount} rehber hazır</summary>
      <label className="source-topic-search">Konu veya alt kategori ara
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Örn. paragraf, dil bilgisi" />
      </label>
      {!units.length && <p role="status">Bu aramada konu bulunamadı.</p>}
      {units.map((unit) => <section key={unit.name}>
        <h3>{unit.name}</h3>
        <ul>{unit.topics.map((topic) => {
          const lesson = group.lessons.find((item) => item.topics.includes(topic));
          const active = lesson ? selected === lesson.id : selected === topic;
          return <li key={topic}><button type="button" aria-pressed={active}
            className={`source-topic-choice${active ? ' selected' : ''}`}
            onClick={() => {
              onSelect(lesson ? { konu: lesson.id } : { baslik: topic });
              if (window.matchMedia('(max-width: 800px)').matches) setOpen(false);
            }}>
            <span>{topic}</span><small>{lesson ? `${lesson.patterns.length} soru kalıbı` : 'Kaynak incelemesi sürüyor'}</small>
          </button></li>;
        })}</ul>
      </section>)}
    </details>
  </aside>;
}

function PatternGuide({ lesson }) {
  const [params] = useSearchParams();
  const requestedPattern=params.get('kalip');
  const [index, setIndex] = useState(() => Math.max(0,lesson.patterns.findIndex(p=>p.id===requestedPattern)));
  const [showThinking, setShowThinking] = useState(false);
  useEffect(() => {
    setIndex(Math.max(0,lesson.patterns.findIndex(p=>p.id===requestedPattern)));
    setShowThinking(false);
  }, [requestedPattern,lesson]);
  const pattern = lesson.patterns[index];
  const selectPattern = (value) => { setIndex(value); setShowThinking(false); };
  const onKey = (event) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % lesson.patterns.length;
    else if (event.key === 'ArrowLeft') next = (index + lesson.patterns.length - 1) % lesson.patterns.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = lesson.patterns.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectPattern(next);
    document.getElementById(`pattern-${lesson.id}-${next}`)?.focus();
  };
  return <section id="soru-kaliplari" className="source-pattern-guide">
    <div className="source-section-heading"><span className="source-step-number">2</span><div>
      <h3>Bu konu nasıl sorulur?</h3><p className="muted small">Kalıbı seç; aynı konuya neden farklı yoldan yaklaşıldığını gör.</p>
    </div></div>
    <div className="source-pattern-tabs" role="tablist" aria-label="Soru kalıpları">
      {lesson.patterns.map((item, position) => <button type="button" role="tab"
        key={item.id} id={`pattern-${lesson.id}-${position}`} aria-selected={index === position}
        aria-controls={`pattern-panel-${lesson.id}`} tabIndex={index === position ? 0 : -1}
        onKeyDown={onKey} onClick={() => selectPattern(position)}>{item.title}</button>)}
    </div>
    <div className="source-pattern-panel" role="tabpanel" tabIndex={0}
      id={`pattern-panel-${lesson.id}`} aria-labelledby={`pattern-${lesson.id}-${index}`}>
      <h4>{pattern.title}</h4>
      <p><strong>Kökü nasıl tanırsın?</strong> {pattern.recognize}</p>
      <p><strong>Nasıl düşünmelisin?</strong> {pattern.logic}</p>
      <div className="source-pattern-hints">
        <div><strong>Püf noktası</strong><p>{pattern.tip}</p></div>
        <div><strong>Çeldiriciye dikkat</strong><p>{pattern.trap}</p></div>
      </div>
      <div className="source-thinking-example">
        <h4>Düşünme provası</h4>
        <p>{pattern.mini.question}</p>
        <button className="btn btn-secondary" type="button" aria-expanded={showThinking}
          aria-controls={`thinking-${lesson.id}`} onClick={() => setShowThinking((value) => !value)}>
          {showThinking ? 'Düşünme yolunu gizle' : 'Düşünme yolunu gör'}
        </button>
        {showThinking && <p id={`thinking-${lesson.id}`} className="source-thinking-answer">{pattern.mini.answer}</p>}
        <p className="muted small">Öğretim için özgün mini örnek; gerçek sınav sorusu değildir.</p>
      </div>
    </div>
  </section>;
}

function Practice({ lesson, groupId }) {
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState('');
  const practice = lesson.practice;
  const itemKey = `note:${groupId}:${lesson.id}`;
  useEffect(() => {
    let active = true;
    api.get(`/api/self-checks/latest?kind=SOURCE_PRACTICE&itemKey=${encodeURIComponent(itemKey)}`)
      .then((attempt) => {
        if (!active || !attempt) return;
        setSelected(attempt.answers[0]); setChecked(true); setShowAnswer(true);
      })
      .catch((error) => { if (active) setSaveError(`Önceki alıştırma okunamadı: ${error.message}`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [itemKey]);
  const check = async () => {
    if (selected === null || busy || loading) return;
    setBusy(true); setSaveError('');
    try {
      await api.post('/api/self-checks', {
        kind: 'SOURCE_PRACTICE', itemKey, answers: [selected],
      });
      setChecked(true); setShowAnswer(true);
    } catch (error) { setSaveError(`Alıştırma kaydedilemedi: ${error.message}`); }
    finally { setBusy(false); }
  };
  const jumpTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return <section id="kendini-dene" className="source-notes-practice">
    <div className="source-section-heading"><span className="source-step-number">4</span><div>
      <h3>Yeni soruda mantığı uygula</h3><p className="muted small">Özgün alıştırma · Önce kendi gerekçeni kur, sonra kontrol et.</p>
    </div></div>
    <fieldset disabled={checked || busy || loading}>
      <legend>{practice.question}</legend>
      {practice.choices.map((choice, index) => <label className="source-practice-choice" key={choice}>
        <input type="radio" name={`practice-${lesson.id}`} value={index} checked={selected === index}
          onChange={() => setSelected(index)} />
        <span><strong>{String.fromCharCode(65 + index)}</strong> {choice}</span>
      </label>)}
    </fieldset>
    <div className="source-practice-actions">
      <button type="button" className="btn btn-primary" disabled={selected === null || checked || busy || loading}
        onClick={check}>{loading ? 'Önceki yanıt yükleniyor…' : busy ? 'Kaydediliyor…' : 'Cevabımı kaydet ve kontrol et'}</button>
      <button type="button" className="btn btn-secondary" aria-expanded={showAnswer}
        aria-controls={`answer-${lesson.id}`} onClick={() => setShowAnswer((value) => !value)}>
        {showAnswer ? 'Çözümü gizle' : 'Çözümü göster'}
      </button>
    </div>
    {saveError && <p role="alert" className="field-error">{saveError}</p>}
    {checked && <p role="status" className={selected === practice.answer ? 'source-practice-correct' : 'source-practice-retry'}>
      {selected === practice.answer ? 'Doğru. Şimdi doğru seçeneğin gerekçesini kendi cümlenle açıklamayı dene.'
        : 'Bu seçim doğru değil. Aşağıdaki gerekçeyi incele; sonra hangi adımı kaçırdığını belirle.'}
    </p>}
    {showAnswer && <p id={`answer-${lesson.id}`} className="source-notes-answer">{practice.explanation}</p>}
    {checked && <div className="source-study-next">
      <h4>Şimdi nasıl çalışmalısın?</h4>
      <p className="muted small">Kendine en yakın durumu seç. Tek soru, konuyu tamamen öğrendiğini göstermez.</p>
      <button type="button" onClick={() => jumpTo('konunun-mantigi')}>Kavramları karıştırdım → Temele dön</button>
      <button type="button" onClick={() => jumpTo('soru-kaliplari')}>Kökü yanlış yorumladım → Kalıbı karşılaştır</button>
      <button type="button" onClick={() => jumpTo('cozum-yolu')}>Yöntemi uygulayamadım → Adımları izle</button>
      <button type="button" onClick={() => { setSelected(null); setChecked(false); setShowAnswer(false); }}>Alıştırmayı yeniden dene</button>
    </div>}
  </section>;
}

function SourceEvidence({ lesson, sources }) {
  return <details className="source-notes-evidence">
    <summary>Kaynaklar ve incelenen örnek sorular</summary>
    <p className="muted small">Rehber konuya aittir. Aşağıdaki sorular yöntemin kontrol örnekleridir; bütün soruların tek tek çözüm analizi tamamlanmış sayılmaz.</p>
    {lesson.comparisonNote && <p className="source-comparison-note"><strong>Karşılaştırma kapsamı:</strong> {lesson.comparisonNote}</p>}
    <ul className="source-notes-citation">{lesson.sources.map((ref) => {
      const source = sources[ref.catalogId];
      return <li key={`${ref.catalogId}:${ref.page}`}>
        <a href={`${source.fileUrl}#page=${ref.page}`} target="_blank" rel="noreferrer">{source.title} · PDF s. {ref.page}</a>
        {' · '}<a href={`${source.url}#page=${ref.page}`} target="_blank" rel="noreferrer">OGM aslı</a>
      </li>;
    })}</ul>
    <p className="muted small">Sayfalar PDF sayacına göredir. Tanımlar kaynak özeti; yöntemler ve mini örnekler kaynak karşılaştırmasından hazırlanmış öğretim önerileridir. Branş öğretmeni incelemesi sürüyor.</p>
    {lesson.examples.map((example) => <div className="source-notes-example" key={`${example.bank}:${example.code}`}>
      <Link to={`/soru/${encodeURIComponent(example.code)}?bank=${example.bank}`}>{example.bank === 'CIKMIS' ? `${example.year} çıkmış soru` : 'OGM sorusu'} · {example.code}</Link>
      <details><summary>Örneğin gerekçesini incele</summary>
        <p><strong>Kaynak anahtarı: {example.answer}.</strong> {example.explanation}</p>
      </details>
    </div>)}
  </details>;
}

function Lesson({ lesson, sources, headingRef,groupId }) {
  return <article id={lesson.id} className="card source-notes-lesson">
    <p className="source-notes-kicker">Konu rehberi · {lesson.patterns.length} soru kalıbı</p>
    <h2 ref={headingRef} tabIndex={-1}>{lesson.title}</h2>
    <ResourceContext itemKey={`note:${groupId}:${lesson.id}`}/>
    <nav className="source-lesson-jumps" aria-label="Konu çalışma adımları">
      <a href="#konunun-mantigi">1. Mantığı öğren</a><a href="#soru-kaliplari">2. Kalıbı tanı</a>
      <a href="#cozum-yolu">3. Yöntemi uygula</a><a href="#kendini-dene">4. Kendini dene</a>
    </nav>
    <section id="konunun-mantigi">
      <div className="source-section-heading"><span className="source-step-number">1</span><h3>Konunun mantığı</h3></div>
      {lesson.learn.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </section>
    <PatternGuide lesson={lesson} />
    <section id="cozum-yolu">
      <div className="source-section-heading"><span className="source-step-number">3</span><h3>Çözümü adım adım kur</h3></div>
      <ol>{lesson.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      <p className="source-lesson-pitfall"><strong>Son kontrol:</strong> {lesson.pitfall}</p>
    </section>
    <Practice lesson={lesson} groupId={groupId} />
    <SourceEvidence lesson={lesson} sources={sources} />
  </article>;
}

function PendingTopic({ topic, group, headingRef }) {
  return <article className="card source-notes-lesson source-notes-pending">
    <p className="source-notes-kicker">Kaynak incelemesi sürüyor</p>
    <h2 ref={headingRef} tabIndex={-1}>{topic}</h2>
    <p>Bu başlık için soru kalıpları ve çözüm rehberi henüz doğrulanmadı. Hazır bir konu seçebilir veya dersin temel OGM kaynaklarını inceleyebilirsin.</p>
    <ul>{group.readingSources.map((source) => <li key={source.catalogId}>
      <a href={`/api/topic-pdfs/${source.catalogId}/file`} target="_blank" rel="noreferrer">{source.title}</a>
      {' · '}<a href={source.url} target="_blank" rel="noreferrer">OGM aslı</a>
    </li>)}</ul>
    <Link to={`/kaynakli-ders-notlari/etiketler?ders=${group.labelGroups[0]}`}>Bu dersin soru kaynaklarını incele</Link>
  </article>;
}

export default function SourceNotes() {
  const { subjectId = 'tyt-turkce' } = useParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const headingRef = useRef(null);
  const moveFocus = useRef(false);
  const group = data?.groups.find((item) => item.id === subjectId);
  const requested = params.get('konu');
  const pending = params.get('baslik');
  const knownTopic = group?.units.some((unit) => unit.topics.includes(pending));
  const linkedLesson = knownTopic && group.lessons.find((item) => item.topics.includes(pending));
  const knownPending = knownTopic && !linkedLesson;
  const lesson = group && !knownPending && (linkedLesson || (requested ? group.lessons.find((item) => item.id === requested) : group.lessons[0]));
  const topicCount = group?.units.reduce((sum, unit) => sum + unit.topics.length, 0);
  usePageTitle(lesson ? `${lesson.title} · ${group.exam} ${group.subject}` : 'Kaynaklı Ders Notları');

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch('/kaynakli-notlar.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Ders notları yüklenemedi.');
        return response.json();
      }).then(setData)
      .catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (moveFocus.current && headingRef.current) {
      headingRef.current.focus({ preventScroll: true });
      headingRef.current.scrollIntoView({ block: 'start' });
      moveFocus.current = false;
    }
  }, [requested, pending]);

  useEffect(() => {
    if (!lesson || !hash) return;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (target?.closest('.source-notes-lesson')) target.scrollIntoView({ block: 'start' });
  }, [lesson, hash]);

  if (data && subjectId === 'analiz') return <StudyOverview data={data} />;

  return <div className="source-notes-page">
    <div className="page-head"><h1>Kaynaklı Ders Notları{group && <span className="source-notes-subtitle">{group.exam} · {group.displaySubject || group.subject}</span>}</h1></div>
    <p className="source-notes-intro">Soruyu ezberleme; konuyu, soru kalıbını ve çözüm yolunu birlikte öğren.</p>
    {error && <div className="alert alert-error" role="alert">{error}{' '}<button type="button" className="btn btn-secondary" onClick={() => setAttempt((value) => value + 1)}>Tekrar dene</button></div>}
    {!data && !error && <p role="status">Kaynaklı ders notları yükleniyor…</p>}
    {data && <label className="source-notes-subject">Ders notu seç
      <select value={group?.id ?? ''} onChange={(event) => navigate(`/kaynakli-ders-notlari/${event.target.value}`)}>
        {!group && <option value="" disabled>Ders seç</option>}
        {data.groups.map((item) => <option key={item.id} value={item.id}>{item.exam} · {item.displaySubject || item.subject}</option>)}
      </select>
    </label>}
    {data && !group && <p role="alert">Bu ders için not bulunamadı. Yukarıdan bir ders seçebilirsin.</p>}
    {group && <>
      <p className="source-notes-coverage">{group.readyTopicCount} / {topicCount} konuda rehber hazır · {group.lessons.reduce((sum, item) => sum + item.patterns.length, 0)} soru kalıbı</p>
      <div className="source-notes-layout">
        <TopicIndex key={group.id} group={group} selected={lesson?.id || pending} onSelect={(value) => { moveFocus.current = true; setParams(value); }} />
        {knownPending ? <PendingTopic topic={pending} group={group} headingRef={headingRef} />
          : lesson ? <Lesson key={`${group.id}:${lesson.id}`} groupId={group.id} lesson={lesson} sources={data.sources} headingRef={headingRef} />
            : <div className="card" role="alert">Bu konu için rehber bulunamadı. Konu dizininden bir başlık seçebilirsin.</div>}
      </div>
      <details className="card source-notes-status">
        <summary>Kaynak kapsamı ve inceleme durumu</summary>
        <p>{group.inventory.CIKMIS.toLocaleString('tr-TR')} çıkmış soru · {group.inventory.OGM.toLocaleString('tr-TR')} OGM kaydı · {group.analysis.sourceTopicCount} kaynak etiketi. Etiket sayısı soru kalıbı sayısı değildir.</p>
        {group.analysis.missingText + group.analysis.shortOrVisualText > 0 && <p>{(group.analysis.missingText + group.analysis.shortOrVisualText).toLocaleString('tr-TR')} kayıtta metin yok veya görsel inceleme gerekiyor. Bunlar metinden çözümlenmiş sayılmaz.</p>}
        {group.id === 'tyt-turkce' && <p>Yerel 2018–2026 Türkçe arşivi yılda 34 kayıttır; 40 soruluk testin tam arşivi değildir.</p>}
        <p className="muted small">Kaynakları karşılaştırılmış öğretim taslakları; branş öğretmeni incelemesi sürüyor. Tüm müfredatın veya bütün soruların pedagojik analizi tamamlanmış değildir. Eşleme puanı başarı veya doğruluk oranı değildir.</p>
        <p>{group.labelGroups.map((id, index) => <span key={id}>{index > 0 && ' · '}<Link to={`/kaynakli-ders-notlari/etiketler?ders=${id}`}>{id.startsWith('tyt') ? 'TYT' : 'AYT'}{id.endsWith('-1') ? '-1' : id.endsWith('-2') ? '-2' : id.endsWith('-grubu') ? ' Felsefe Grubu' : ''} etiketleri</Link></span>)}</p>
        <p><Link to="/kaynakli-ders-notlari/etiketler">TYT/AYT soru etiketlerini ve kaynak kanıtlarını incele →</Link></p>
      </details>
    </>}
  </div>;
}
