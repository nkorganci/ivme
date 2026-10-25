import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAsync, usePageTitle } from '../hooks.js';
import DataGrid from '../components/DataGrid.jsx';
import QuestionImage from '../components/QuestionImage.jsx';
import { Alert, ErrorBox, Loading } from '../components/States.jsx';
import RichText from '../tutor/RichText.jsx';
import { AhaBlock, InsightBlock } from '../tutor/Insight.jsx';
import VisualPlayer from '../tutor/VisualPlayer.jsx';
import { BAND, BRANCH_ORDER, CONTENT_STATUS, DIFFICULTY, HINT_KIND, TEMPLATE, subjectName } from '../tutor/tutorLabels.js';
import './Tutor.css';

const RUBRIC = [
  ['accuracy', 'Matematiksel/bilgi doğruluğu', 1],
  ['hints', 'İpuçlarının kademesi', 1],
  ['terminology', 'TYT/AYT terminolojisi', 1],
  ['teaching', 'Öğreticilik (neden açıklanıyor mu?)', 1],
  ['visual', 'Görselin katkısı (0 = görsel yok)', 0],
];

function Checks({ verification }) {
  const checks = verification?.checks ?? [];
  const issues = verification?.issues ?? [];
  return <div className="tutor-review-checks">
    <p><strong>Bağımsız denetimler:</strong> {checks.filter((c) => c.passed).length}/{checks.length} geçti
      {verification?.computable === false && <span className="badge badge-warn">Sözel içerik: hesapla doğrulanamaz, öğretmen kararı esastır</span>}</p>
    <ul>{checks.map((check, i) => <li key={i} className={check.passed ? 'tutor-ok' : 'tutor-bad'}>
      {check.passed ? '✓' : '✗'} <code>{check.path}</code> — {check.detail}</li>)}</ul>
    {issues.length > 0 && <><p><strong>Bulgular</strong></p><ul>{issues.map((issue, i) => <li key={i} className={issue.severity === 'HARD' ? 'tutor-bad' : 'muted'}>
      {issue.severity === 'HARD' ? 'Sert' : 'Uyarı'} · {issue.code} · {issue.message}</li>)}</ul></>}
  </div>;
}

function ContentView({ content }) {
  const c = content;
  return <div className="tutor-review-content">
    <section><h3>Okuma (transkripsiyon)</h3>
      <p><RichText text={c.reading.text} /></p>
      <p className="muted">Şıklar: {Object.entries(c.reading.choices).map(([k, v]) => `${k}) ${v}`).join('   ')}</p>
      {c.reading.figure && <p className="muted">Şekil: {c.reading.figure} {c.reading.figureCritical && <strong>(çözüm için kritik)</strong>}</p>}
      <p className="muted">Okuma: {c.reading.status} · güven {c.reading.confidence}{c.reading.uncertain.length ? ` · belirsiz: ${c.reading.uncertain.join('; ')}` : ''}</p></section>
    <section><h3>Sınıflandırma</h3>
      <p>{DIFFICULTY[c.classification.difficulty]} — {c.classification.difficultyReason}</p>
      <p className="muted">Beceriler: {c.classification.skills.join(', ')} · Ön koşul: {c.classification.prerequisites.join(', ') || 'yok'}</p>
      {!c.classification.catalogAgreement && <Alert type="warn">Katalog etiketiyle uyuşmazlık: {c.classification.catalogNote}</Alert>}</section>
    <section><h3>Kalıp kartı: {c.pattern.name}</h3>
      <p><strong>Büyük fikir:</strong> <RichText text={c.pattern.bigIdea} /></p>
      <p><strong>Ne zaman:</strong> <RichText text={c.pattern.trigger} /></p>
      <ol>{c.pattern.method.map((m, i) => <li key={i}><RichText text={m} /></li>)}</ol>
      <p><strong>Ne zaman değil:</strong> <RichText text={c.pattern.whenNot} /></p>
      <p><strong>Sınav ipucu:</strong> <RichText text={c.pattern.examTip} /></p></section>
    <section><h3>Kavrayış katmanı</h3>
      {c.insight ? <><InsightBlock insight={c.insight} />
        <p className="muted">Çözümden sonra açılır:</p><AhaBlock aha={c.insight.aha} sanityCheck={c.insight.sanityCheck} /></>
        : <Alert type="warn">Benzetme, aha cümlesi, radar ve sağlama yazılmamış.</Alert>}</section>
    <section><h3>İlk hamle seçimi</h3><p><RichText text={c.strategyChoice.prompt} /></p>
      <ul>{c.strategyChoice.options.map((o) => <li key={o.id} className={o.correct ? 'tutor-ok' : ''}>{o.correct ? '✓' : '·'} <RichText text={o.text} /> — <span className="muted"><RichText text={o.feedback} /></span></li>)}</ul></section>
    <section><h3>İpuçları</h3><ol>{c.hints.map((h) => <li key={h.level}><strong>{HINT_KIND[h.kind]}:</strong> <RichText text={h.text} /></li>)}</ol>
      {c.guidingQuestions.length > 0 && <><p><strong>Yönlendirici sorular</strong></p>
        <ul>{c.guidingQuestions.map((g, i) => <li key={i}><RichText text={g.text} /> <span className="muted">→ <RichText text={g.answer} /></span></li>)}</ul></>}</section>
    <section><h3>Çözüm</h3><ol>{c.solution.steps.map((s) => <li key={s.id}><RichText text={s.text} /><br /><span className="muted">Çünkü: <RichText text={s.why} /></span>
      {s.selfExplain && <div className="muted">Neden sorusu: <RichText text={s.selfExplain.prompt} /> ({s.selfExplain.options.map((o) => `${o.correct ? '✓ ' : ''}${o.text}`).join(' | ')})</div>}</li>)}</ol>
      <p><strong>Cevap:</strong> {c.solution.finalAnswer.choice} ({c.solution.finalAnswer.value})</p>
      <p><strong>Sezgi:</strong> <RichText text={c.solution.levels.sezgi} /></p>
      {c.solution.levels.kisayol && <p><strong>Kısayol:</strong> <RichText text={c.solution.levels.kisayol} /></p>}
      {c.alternative && <p><strong>Alternatif ({c.alternative.title}):</strong> <RichText text={c.alternative.text} /></p>}</section>
    <section><h3>Yanılgılar</h3><ul>{c.misconceptions.map((m) => <li key={m.id}><strong>{m.choice ? `${m.choice} şıkkı` : 'Şıksız'}:</strong> <RichText text={m.mistake} />
      <br /><span className="muted">Neden: <RichText text={m.cause} /> · Düzeltme: <RichText text={m.fix} /> · Soru: <RichText text={m.guidingQuestion} /></span></li>)}</ul></section>
    <section><h3>Görsel</h3>
      {c.visual.recommended ? <VisualPlayer visual={c.visual} preview /> : <p className="muted">Görsel önerilmedi: {c.visual.reason}</p>}</section>
    <section><h3>İkiz soru</h3><p><RichText text={c.twin.text} /></p>
      <p className="muted">{Object.entries(c.twin.choices).map(([k, v]) => `${k}) ${v}`).join('   ')} · Cevap: {c.twin.answer}</p>
      <p><RichText text={c.twin.solution} /></p></section>
    <section><h3>Kaynak ve üretim</h3>
      <ul>{c.sources.map((s, i) => <li key={i}>{s.type} · {s.reference}{s.page ? ` s. ${s.page}` : ''} — {s.note}</li>)}</ul>
      <p className="muted">{c.generation.generator} · {c.generation.tier} · {c.generation.promptVersion}</p></section>
  </div>;
}

function ReviewForm({ version, onDone }) {
  const [rubric, setRubric] = useState({ accuracy: 4, hints: 4, terminology: 4, teaching: 4, visual: version.content.visual.recommended ? 4 : 0, noLeak: true });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const send = async (decision) => {
    setBusy(true); setMessage(null);
    try {
      const detail = await api.post(`/api/operator/tutor/versions/${version.id}/review`, { decision, rubric, note });
      setMessage({ type: 'success', text: 'Karar kaydedildi.' });
      onDone(detail);
    } catch (e) { setMessage({ type: 'error', text: e.message }); }
    finally { setBusy(false); }
  };
  return <form className="tutor-review-form" onSubmit={(e) => e.preventDefault()}>
    <h3>Öğretmen kararı (sürüm {version.versionNo})</h3>
    <div className="tutor-rubric">{RUBRIC.map(([key, label, min]) => <label key={key}>{label}
      <select value={rubric[key]} onChange={(e) => setRubric((r) => ({ ...r, [key]: Number(e.target.value) }))}>
        {Array.from({ length: 6 - min }, (_, i) => i + min).map((n) => <option key={n} value={n}>{n}</option>)}</select></label>)}
      <label className="tutor-check"><input type="checkbox" checked={rubric.noLeak} onChange={(e) => setRubric((r) => ({ ...r, noLeak: e.target.checked }))} />
        İpuçları ve ön metinler cevabı ele vermiyor</label></div>
    <label>Not (ret ve yeniden üretimde zorunlu)
      <textarea rows="3" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ör. 2. ipucu çok açık; 3. adımın gerekçesi eksik." /></label>
    <div className="tutor-row">
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => send('APPROVE')}>Onayla</button>
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => send('REQUEST_REGENERATION')}>Yeniden üretim iste</button>
      <button type="button" className="btn btn-danger" disabled={busy} onClick={() => send('REJECT')}>Reddet</button>
    </div>
    {message && <Alert type={message.type}>{message.text}</Alert>}
  </form>;
}

function Detail({ code, onChanged }) {
  const detail = useAsync(() => api.get(`/api/operator/tutor/contents/${encodeURIComponent(code)}`), [code]);
  const [index, setIndex] = useState(0);
  if (detail.loading) return <Loading text="İçerik yükleniyor…" />;
  if (detail.error) return <ErrorBox error={detail.error} />;
  const data = detail.data;
  const version = data.versions[Math.min(index, data.versions.length - 1)];
  return <section className="card tutor-review-detail" aria-label={`${code} ayrıntısı`}>
    <div className="page-head"><h2>{code} · {data.question.unitName}</h2>
      <span>Anahtar: <strong>{data.question.answerKey}</strong> · {subjectName(data.question.subjectId)}</span></div>
    <div className="tutor-row">{data.versions.map((v, i) => <button key={v.id} type="button" className={`btn btn-sm ${i === index ? 'btn-primary' : 'btn-secondary'}`}
      onClick={() => setIndex(i)}>Sürüm {v.versionNo} · {CONTENT_STATUS[v.status]}</button>)}</div>
    <p>Güven: <strong>{Math.round(version.confidence * 100)}</strong> ({BAND[version.band]}) · {version.reviewFlag ? 'İnceleme işareti var' : 'İşaret yok'}
      {version.reasons?.length > 0 && <span className="muted"> · {version.reasons.join(', ')}</span>}</p>
    <div className="tutor-review-grid">
      <div><QuestionImage id={data.question.questionId} alt={`Soru ${code}`} /><Checks verification={version.verification} />
        {version.reviews.length > 0 && <><h3>Önceki kararlar</h3><ul>{version.reviews.map((r) => <li key={r.id}>
          {r.decision} · {r.reviewer} · doğruluk {r.rubric?.accuracy} · {r.note}</li>)}</ul></>}
        <p className="muted">Kullanım: {data.usage.sessions} oturum · yardımsız {data.usage.independent} · yardımla {data.usage.assisted} · adımlarla {data.usage.worked} · çözüm görüldü {data.usage.solution_viewed} · ikiz {data.usage.twin_correct}/{data.usage.twin_total}</p>
        <ReviewForm key={version.id} version={version} onDone={() => { detail.reload(); onChanged(); }} />
      </div>
      <ContentView content={version.content} />
    </div>
  </section>;
}

export default function TutorReview() {
  usePageTitle('Akıllı Öğretmen İncelemesi');
  const [subject, setSubject] = useState('all');
  const list = useAsync(() => api.get(`/api/operator/tutor/contents?subjectId=${subject}`), [subject]);
  const calibration = useAsync(() => api.get('/api/operator/tutor/calibration'), []);
  const queue = useAsync(() => api.get('/api/operator/tutor/queue'), []);
  const usage = useAsync(() => api.get('/api/operator/tutor/usage'), []);
  const [selected, setSelected] = useState(null);
  const columns = useMemo(() => [
    { field: 'branch', headerName: 'Branş', minWidth: 110 },
    { field: 'code', headerName: 'Soru', minWidth: 150 },
    { field: 'unitName', headerName: 'Ünite', minWidth: 200, flex: 2 },
    { field: 'difficultyLabel', headerName: 'Zorluk', minWidth: 95 },
    { field: 'statusLabel', headerName: 'Durum', minWidth: 170 },
    { field: 'confidencePercent', headerName: 'Güven', minWidth: 90, cellDataType: 'number' },
    { field: 'checks', headerName: 'Denetim', minWidth: 100 },
    { field: 'visualLabel', headerName: 'Görsel', minWidth: 130 },
    { field: 'studentLabel', headerName: 'Öğrencide', minWidth: 110 },
  ], []);
  const rows = useMemo(() => (list.data ?? []).map((row) => ({
    ...row, key: row.code, branch: subjectName(row.subjectId), difficultyLabel: DIFFICULTY[row.difficulty] ?? row.difficulty,
    statusLabel: `${CONTENT_STATUS[row.status] ?? row.status}${row.reviewFlag ? ' ⚑' : ''}`, confidencePercent: Math.round(row.confidence * 100),
    checks: `${row.checksPassed}/${row.checksTotal}`, visualLabel: row.visual ? TEMPLATE[row.visual] ?? row.visual : '—',
    studentLabel: row.visibleToStudents ? 'Açık' : 'Kapalı',
  })), [list.data]);
  const bandRows = (calibration.data?.bands ?? []).map((b) => ({ key: b.band, band: BAND[b.band], contents: b.contents, reviewed: b.reviewed,
    approved: b.approved, rate: b.reviewed ? `%${Math.round((b.approved / b.reviewed) * 100)}` : '—' }));
  const queueRows = (queue.data?.explanations ?? []).map((item) => ({ key: item.id, ...item }));
  const resolve = async (id, label) => {
    await api.post(`/api/operator/tutor/queue/${id}`, { label, note: '' });
    queue.reload();
  };
  return <div className="tutor-page">
    <div className="page-head"><h1>Akıllı Öğretmen İncelemesi</h1>
      <span className="muted">Pilot içerikler · kalibrasyon · öğrenci açıklamaları</span></div>
    <Alert type="info">80 bin soruya geçiş koşulu: pilot içeriklerin öğretmen onay oranı her güven bandında kabul düzeyinde olmalı ve YÜKSEK bantta
      ret olmamalı. Sözel branşlarda güven en çok ORTA'dır; onay bu içerikler için zorunlu kanıttır.</Alert>
    <div className="tutor-review-top">
      <section className="card"><h2>Kalibrasyon</h2>
        {calibration.loading ? <Loading /> : <DataGrid rowData={bandRows} mode="compact" dense showSearch={false} columnDefs={[
          { field: 'band', headerName: 'Bant' }, { field: 'contents', headerName: 'İçerik' }, { field: 'reviewed', headerName: 'İncelenen' },
          { field: 'approved', headerName: 'Onaylanan' }, { field: 'rate', headerName: 'Onay oranı' }]} />}
        <p className="muted">{calibration.data?.note}</p></section>
      <section className="card"><h2>Model kullanımı (30 gün)</h2>
        {usage.loading ? <Loading /> : <DataGrid rowData={(usage.data?.calls ?? []).map((c, i) => ({ key: i, ...c, cache_hit: c.cache_hit ? 'önbellek' : 'çağrı' }))}
          mode="compact" dense showSearch={false} columnDefs={[{ field: 'tier', headerName: 'Kademe' }, { field: 'status', headerName: 'Durum' },
            { field: 'cache_hit', headerName: 'Kaynak' }, { field: 'calls', headerName: 'Adet' }, { field: 'mean_latency_ms', headerName: 'Ort. ms' }]} />}
        <p className="muted">Önbellek: {usage.data?.cache?.entries ?? 0} kayıt, {usage.data?.cache?.hits ?? 0} tekrar kullanım.</p></section>
    </div>
    <section className="card">
      <div className="page-head"><h2>İçerikler</h2>
        <label>Branş <select value={subject} onChange={(e) => { setSubject(e.target.value); setSelected(null); }}>
          <option value="all">Bütün branşlar</option>
          {BRANCH_ORDER.map((id) => <option key={id} value={id}>{subjectName(id)}</option>)}</select></label></div>
      {list.loading ? <Loading /> : list.error ? <ErrorBox error={list.error} /> :
        <DataGrid className="tutor-content-grid" rowData={rows} columnDefs={columns} gridOptions={{ onRowClicked: ({ data }) => setSelected(data.code) }} />}
    </section>
    {selected && <Detail key={selected} code={selected} onChanged={() => list.reload()} />}
    <section className="card"><h2>Öğretmene iletilen öğrenci açıklamaları</h2>
      <p className="muted">Model emin olamadığında ya da yanıt kurallara uymadığında açıklama buraya düşer. Etiketin, sonraki kalibrasyon için kayıt olur.</p>
      {queue.loading ? <Loading /> : queueRows.length === 0 ? <p>Bekleyen açıklama yok.</p> : <ul className="tutor-queue">{queueRows.map((item) => <li key={item.key}>
        <p><strong>{item.question_code}</strong> · {subjectName(item.subject_id)} · Adım: <RichText text={item.stepText} /></p>
        <p>“{item.student_text}”</p>
        <div className="tutor-row">{['CORRECT', 'PARTIAL', 'OFF_TOPIC'].map((label) => <button key={label} type="button" className="btn btn-secondary btn-sm"
          onClick={() => resolve(item.id, label)}>{{ CORRECT: 'Doğru', PARTIAL: 'Kısmen', OFF_TOPIC: 'İlgisiz' }[label]}</button>)}</div>
      </li>)}</ul>}
      {(queue.data?.regeneration ?? []).length > 0 && <><h3>Yeniden üretim istekleri</h3>
        <ul>{queue.data.regeneration.map((r) => <li key={r.id}><strong>{r.code}</strong> · {r.status} · {r.reason}</li>)}</ul>
        <p className="muted">İstekler <code>python scripts/ogretim-icerigi.py yeniden-uretim</code> ile iş dosyasına alınır; yeni sürüm aynı doğrulayıcıdan geçip aktarılır.</p></>}
    </section>
  </div>;
}
