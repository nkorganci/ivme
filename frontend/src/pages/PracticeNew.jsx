import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useFilterRows, usePageTitle } from '../hooks.js';
import FilterSelects from '../components/FilterSelects.jsx';
import { Field } from '../components/Field.jsx';
import { Alert, ErrorBox, Loading } from '../components/States.jsx';
import { BANKS, formatNumber } from '../format.js';

const MODE_LABELS = { MIXED: 'Karışık', NEW: 'Yalnız yeni', REPEAT: 'Daha önce çözdüğüm', WRONG: 'En az bir kez yanlış yaptığım' };

export default function PracticeNew() {
  usePageTitle('Pratik Başlat');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topicPdfId = searchParams.get('topicPdfId');
  const scoped = topicPdfId !== null;
  const requestId = useRef(crypto.randomUUID());
  const [bank, setBank] = useState('');
  const [filter, setFilter] = useState({ examType: '', subject: '', topic: '' });
  const [count, setCount] = useState('10');
  const [timed, setTimed] = useState(false);
  const [minutes, setMinutes] = useState('20');
  const [selectionMode, setSelectionMode] = useState('MIXED');
  const [availability, setAvailability] = useState(null);
  const [availabilityError, setAvailabilityError] = useState('');
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [activeError, setActiveError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const rows = useFilterRows(bank);

  useEffect(() => {
    let current = true;
    api.get('/api/study-sessions/active')
      .then((data) => { if (current) setActive(data); })
      .catch((e) => { if (current) setActiveError(e.message); });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setAvailability(null);
    setAvailabilityError('');
    api.get('/api/questions/availability' + qs(scoped ? { topicPdfId } : { bank, ...filter }))
      .then((data) => { if (current) setAvailability(data); })
      .catch((e) => { if (current) setAvailabilityError(e.message); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [bank, filter.examType, filter.subject, filter.topic, topicPdfId]);

  const n = Number(count);
  const validCount = Number.isInteger(n) && n >= 1 && n <= 120;
  const duration = Number(minutes);
  const validDuration = !timed || (Number.isInteger(duration) && duration >= 1 && duration <= 240);
  const available = availability ? ({ MIXED: availability.total, NEW: availability.remaining,
    REPEAT: availability.solved, WRONG: availability.everWrong })[selectionMode] : 0;
  const enough = availability && available >= n;
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validCount || !validDuration || !enough || busy) return;
    setBusy(true);
    try {
      const session = await api.post('/api/study-sessions', {
        bank: bank || undefined,
        examType: filter.examType || undefined,
        subject: filter.subject || undefined,
        topic: filter.topic || undefined,
        selectionMode,
        questionCount: n,
        durationMinutes: timed ? duration : undefined,
        clientRequestId: requestId.current,
        topicPdfId: scoped ? Number(topicPdfId) : undefined,
      });
      navigate(`/pratik/${session.id}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <>
      <h1>Pratik başlat</h1>
      <p className="muted lead">Soruları ve çalışma süreni seç. Açık oturumuna daha sonra devam edebilirsin.</p>
      {active && <section className="card resume">
        <div><h2>Devam eden pratiğin var</h2><p className="muted">{active.questionCount} soru · {MODE_LABELS[active.selectionMode] || 'Karışık'} · {active.timeLimitSeconds ? `${active.timeLimitSeconds / 60} dakika` : 'Süresiz'}</p></div>
        <Link to={`/pratik/${active.id}`} className="btn btn-secondary">Pratiğe devam et</Link>
      </section>}
      {activeError && <Alert type="warn">Devam eden oturum alınamadı: {activeError}</Alert>}
      <form className="card form-card" onSubmit={submit} noValidate>
        <h2>Yeni pratik oluştur</h2>
        {scoped && <p className="muted">Konu PDF'sinden doğrulanmış sorular seçiliyor. Kaynak, sınav ve konu kapsamı sabittir. <Link to="/pratik/yeni">Tüm sorulardan seç</Link></p>}
        {scoped && <Alert type="info">Henüz doğrulanmış zorluk etiketi yok. Soru geçmişi ve sayıya göre seçim yapabilirsin.</Alert>}
        {!scoped && <>
        <Field as="select" label="Kaynak" value={bank} onChange={(e) => { setBank(e.target.value); setFilter({ examType: '', subject: '', topic: '' }); }}>
          <option value="">Hepsi</option>
          {Object.entries(BANKS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
        </Field>
        <FilterSelects rows={rows} value={filter} onChange={setFilter} />
        </>}
        {availability && <Field as="select" label="Soru geçmişi" value={selectionMode} onChange={(e) => setSelectionMode(e.target.value)}>
          <option value="MIXED">Karışık · {formatNumber(availability.total)} soru</option>
          <option value="NEW">Yalnız yeni · {formatNumber(availability.remaining)} soru</option>
          <option value="REPEAT">Daha önce çözdüğüm · {formatNumber(availability.solved)} soru</option>
          <option value="WRONG">En az bir kez yanlış yaptığım · {formatNumber(availability.everWrong)} soru</option>
        </Field>}
        {loading ? <Loading text="Soru sayısı yükleniyor…" /> : availabilityError ? <ErrorBox error={{ message: availabilityError }} /> :
          <p className="muted">Bu seçimde <strong>{formatNumber(available)}</strong> uygun soru var.</p>}
        {!loading && availability && available === 0 && <Alert type="warn">Bu seçimde soru yok. Filtreyi veya soru geçmişini değiştir.</Alert>}
        <Field label="Soru sayısı (1–120)" type="number" inputMode="numeric" min="1" max="120"
          value={count} onChange={(e) => setCount(e.target.value)}
          error={!validCount ? 'Soru sayısı 1 ile 120 arasında tam sayı olmalı.' : undefined} />
        <Field as="select" label="Süre" value={timed ? 'timed' : 'untimed'} onChange={(e) => setTimed(e.target.value === 'timed')}>
          <option value="untimed">Süresiz</option><option value="timed">Süreli</option>
        </Field>
        {timed && <Field label="Süre (dakika, 1–240)" type="number" inputMode="numeric" min="1" max="240"
          value={minutes} onChange={(e) => setMinutes(e.target.value)}
          error={!validDuration ? 'Süre 1 ile 240 arasında tam sayı olmalı.' : undefined} />}
        {timed && <p className="muted">Süre dolunca oturum kapanır; yanıtlanmayan sorular boş sayılır.</p>}
        {validCount && availability && !enough && <Alert type="warn">
          Bu seçimde yalnızca {formatNumber(available)} soru var. Sayıyı azalt veya seçimi değiştir.
        </Alert>}
        {error && <Alert type="error">{error}</Alert>}
        <button type="submit" className="btn btn-primary" disabled={busy || loading || !validCount || !validDuration || !enough}>
          {busy ? 'Oturum hazırlanıyor…' : 'Pratiği başlat'}
        </button>
      </form>
    </>
  );
}
