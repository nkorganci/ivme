import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAsync, useFilterRows, usePageTitle } from '../hooks.js';
import { Alert, ErrorBox, Loading } from '../components/States.jsx';

export default function Recommendations() {
  usePageTitle('Çalışma önerileri');
  const rows = useFilterRows();
  const subjects = [...new Set(rows.map((row) => row.subject).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'tr'));
  const [subject, setSubject] = useState('');
  const [reportId, setReportId] = useState(null);
  const [reportText, setReportText] = useState('');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const result = useAsync(() => subject
    ? api.get('/api/recommendations' + qs({ subject })) : Promise.resolve(null), [subject]);
  const data = result.data?.subject === subject ? result.data : null;

  const report = async (event, suggestion) => {
    event.preventDefault();
    setNotice(null);
    setBusy(true);
    try {
      await api.post('/api/feedback', {
        category: 'QUESTION_ISSUE', questionId: suggestion.exampleQuestionId,
        message: `Önerideki soru tipi etiketi (${suggestion.questionTypeCode}) için inceleme: ${reportText.trim()}`,
      });
      setReportId(null);
      setReportText('');
      setNotice({ type: 'success', text: 'Etiket bildirimin alındı.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  return <>
    <h1>Çalışma önerileri</h1>
    <p className="muted">Öneriler, onaylı soru tipi etiketli ilk cevaplarından çıkar. Bunlar kesin bir değerlendirme değildir.</p>
    <label className="field recommendation-subject"><span className="field-label">Ders</span>
      <select value={subject} onChange={(event) => {
        setSubject(event.target.value); setReportId(null); setNotice(null);
      }}>
        <option value="">Ders seç</option>
        {subjects.map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
    </label>
    {subjects.length === 0 && <p role="status">Şu anda çalışılabilir ders bulunamadı.</p>}
    {!subject && subjects.length > 0 && <p role="status">Önerileri görmek için bir ders seç.</p>}
    {subject && result.loading && <Loading text="Öneriler yükleniyor…" />}
    {subject && result.error && <ErrorBox error={result.error} onRetry={result.retry} />}
    {subject && data?.status === 'INSUFFICIENT_DATA' && <Alert type="info">
      Güvenilir bir öneri için henüz yeterli onaylı ve çeşitli ilk deneme yok.
      Şu an {data.labeledQuestions} etiketli soru, {data.distinctTypes} soru tipi var.
    </Alert>}
    {subject && data?.status === 'NO_CLEAR_WEAKNESS' && <Alert type="success">
      Bu derste yeterli veri var; belirgin bir zorlanma alanı görünmüyor.
    </Alert>}
    {notice && <Alert type={notice.type}>{notice.text}</Alert>}
    {data?.suggestions?.map((suggestion) => <article className="card recommendation-card"
      key={suggestion.questionTypeCode}>
      <h2>{suggestion.questionType}</h2>
      <p>{suggestion.subtopic} · {suggestion.skill}</p>
      <p>{suggestion.questions} ilk denemede {suggestion.correct} doğru, {suggestion.wrong} yanlış.</p>
      <details><summary>Neden öneriyoruz?</summary>
        <p>Son 90 gündeki onaylı soru tipi etiketleri kullanıldı. Son 30 gündeki cevaplar iki kat ağırlıklı.
          Ağırlıklı ilk deneme başarısı %{suggestion.recentWeightedSuccess}.</p>
        {suggestion.averageActiveSeconds != null && <p>Ölçülen ortalama aktif süre: yaklaşık {suggestion.averageActiveSeconds} saniye.
          {suggestion.slowerThanSubject ? ' Bu, ders ortalamasından belirgin uzun.' : ''}</p>}
        {suggestion.prerequisite && <p>Önce göz atılabilecek alt konu: {suggestion.prerequisite}.</p>}
      </details>
      <div className="goal-actions">
        <Link className="btn btn-primary" to={`/soru/${encodeURIComponent(suggestion.exampleQuestionCode)}`}>
          Şimdi çalış
        </Link>
        <button type="button" className="btn btn-secondary" onClick={() => {
          setReportId(suggestion.exampleQuestionId); setReportText(''); setNotice(null);
        }}>Etiket hatası bildir</button>
      </div>
      <p className="muted small">Çalış bağlantısı bu önerideki örnek bir soruyu açar.</p>
      {reportId === suggestion.exampleQuestionId && <form onSubmit={(event) => report(event, suggestion)}>
        <label className="field"><span className="field-label">Etiketteki sorunu anlat</span>
          <textarea minLength="5" maxLength="1500" required value={reportText}
            onChange={(event) => setReportText(event.target.value)} /></label>
        <div className="goal-actions">
          <button className="btn btn-primary" disabled={busy}>Bildir</button>
          <button type="button" className="btn btn-secondary" onClick={() => setReportId(null)}>Vazgeç</button>
        </div>
      </form>}
    </article>)}
  </>;
}
