import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api, qs } from '../../api.js';
import { usePageTitle } from '../../hooks.js';
import { useLearn } from '../LearnContext.jsx';
import { loadBank } from '../bank.js';
import { uuid } from '../engine/random.js';
import { SET_KINDS, SET_TITLES, SHARED_TYPES, pickSharedSet, requestItems } from '../engine/sharedSet.js';
import { BASE } from '../ui.jsx';

/**
 * TAS-05: konu testi / çıkmış sorular / tip alıştırması bağlantısının hedefi. Sayfa yalnız açılır (GET);
 * oturum, sabit bir istek kimliğiyle POST edilir. Aynı adres yenilenirse aynı set döner, bağlantı önizlemesi set yaratmaz.
 * Başarıda ortak çözüm ekranına (/soru/{kod}?sessionId=…) geçilir; hata bu sayfada görünür kalır.
 */
export default function SharedPracticeStart() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const learn = useLearn();
  const type = params.get('tur');
  const conceptId = params.get('konu');
  const archetype = params.get('tip');
  const codes = (params.get('kod') ?? '').split(',').filter(Boolean);
  // Lab gerçek soruları başka konunun bankasında olabilir (kategori bu konunun kataloğunda; sunucu yeniden denetler).
  const sources = (params.get('kaynak') ?? '').split(',').filter((id) => id && id !== conceptId && learn.index.byId[id]);
  const meta = conceptId ? learn.index.byId[conceptId] : null;
  const valid = SHARED_TYPES.includes(type) && !!meta && (type !== 'practice' || !!archetype) && (type !== 'lab' || (!!archetype && codes.length > 0));
  const requestId = useRef(params.get('istek') ?? uuid());
  const learnRef = useRef(learn);
  learnRef.current = learn;
  const [attempt, setAttempt] = useState(0);
  const [problem, setProblem] = useState('');
  usePageTitle(`${SET_TITLES[type] ?? 'Çalış'}${meta ? ` · ${meta.title}` : ''} · Konuyu Öğrenelim`);

  useEffect(() => {
    if (!valid) return undefined;
    let active = true;
    setProblem('');
    if (params.get('istek') !== requestId.current) {
      const next = new URLSearchParams(params);
      next.set('istek', requestId.current);
      setParams(next, { replace: true });
    }
    (async () => {
      const { state, today } = learnRef.current;
      const bank = type === 'lab' && sources.length
        ? [...await loadBank(conceptId), ...(await Promise.all(sources.map(loadBank))).flat()] : await loadBank(conceptId);
      const items = pickSharedSet({ type, meta, bank, state, seed: `${type}:${conceptId}:${archetype ?? ''}:${today}:${state.eventCount}`, archetype, codes });
      if (!active) return;
      if (!items.length) {
        // Banka bu tipi karşılamıyorsa ders içi alıştırma havuzuna düşülür; diğer setlerde gerçek durum söylenir.
        if (type === 'practice') navigate(`${BASE}/calis?tur=practice&konu=${conceptId}&tip=${archetype}&yerel=1`, { replace: true });
        else setProblem(type === 'cikmis' ? 'Bu konuya eşlenmiş çıkmış soru yok.' : type === 'lab' ? 'Bu laboratuvar sorularının hepsini “Tekrar gösterme” ile gizlemişsin ya da sorular bankada yok.' : 'Bu konuya eşlenmiş banka sorusu yok.');
        return;
      }
      const title = `${SET_TITLES[type]} · ${meta.title}${type === 'practice' ? ` · ${meta.archetypes.find((a) => a.id === archetype)?.title ?? archetype}` : ''}`;
      const scoped = type === 'practice' || type === 'lab';
      const result = await api.post('/api/konu-ogrenme/practice-sets', {
        clientRequestId: requestId.current, conceptId, kind: SET_KINDS[type], archetypeId: scoped ? archetype : null,
        title, resume: true, items: requestItems(items), expectedUserId: learnRef.current.userId,
      });
      if (!active) return;
      const { session, resumed } = result;
      const target = session.questions.find((q) => q.status !== 'COMPLETED') ?? session.questions[0];
      navigate(`/soru/${encodeURIComponent(target.code)}${qs({ sessionId: session.id, bank: target.bank, devam: resumed ? 1 : '' })}`, { replace: true });
    })().catch((error) => { if (active) setProblem(error.message || 'Set kurulamadı.'); });
    return () => { active = false; };
  }, [valid, type, conceptId, archetype, codes.join(','), sources.join(','), attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!valid) return <Navigate to={conceptId && meta ? `${BASE}/konu/${conceptId}` : `${BASE}/harita`} replace />;
  return <div className="lr-page">
    <header className="card lr-practice-head">
      <nav className="lr-crumbs small" aria-label="Konum"><Link to={BASE}>Konuyu Öğrenelim</Link> › <Link to={`${BASE}/konu/${meta.id}`}>{meta.title}</Link></nav>
      <h1>{SET_TITLES[type]}: {meta.title}</h1>
    </header>
    {problem
      ? <section className="card" role="alert">
        <p className="field-error">{problem}</p>
        <p className="small muted">Cevapların ve önceki setlerin korunuyor; bu hata yeni bir set kurulmasını engelledi.</p>
        <div className="lr-actions">
          <button type="button" className="btn btn-primary" onClick={() => setAttempt((n) => n + 1)}>Tekrar dene</button>
          <Link className="btn btn-secondary" to={`${BASE}/konu/${meta.id}`}>Konu sayfası</Link>
        </div>
      </section>
      : <p className="muted" role="status">Sorular hazırlanıyor…</p>}
  </div>;
}
