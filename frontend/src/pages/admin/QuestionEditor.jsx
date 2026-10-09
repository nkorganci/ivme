import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync } from '../../hooks.js';
import Modal from '../../components/Modal.jsx';
import QuestionImage from '../../components/QuestionImage.jsx';
import { Field } from '../../components/Field.jsx';
import { Alert, ErrorBox, Loading } from '../../components/States.jsx';
import { LETTERS } from '../../format.js';

/** Soru düzenleme penceresi: soruyu yükler, formu gösterir. */
export default function QuestionEditor({ id, rows, onClose, onSaved }) {
  const { data, loading, error, retry } = useAsync(() => api.get(`/api/operator/questions/${id}`), [id]);
  return (
    <Modal title="Soruyu düzenle" onClose={onClose} wide>
      {loading && <Loading />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {data && <EditorForm q={data} rows={rows} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

const unique = (list) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));

function EditorForm({ q, rows, onClose, onSaved }) {
  const [f, setF] = useState({
    examType: q.examType || 'TYT',
    subject: q.subject || '',
    topic: q.topic || '',
    year: q.year ?? '',
    source: q.source || '',
    image: q.image || '',
    correctAnswer: q.correctAnswer || 'A',
    choiceCount: String(q.choiceCount || 5),
    solutionUrl: q.solutionUrl || '',
    active: !!q.active,
  });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ busy: false, error: '' });
  const set = (key) => (e) => setF((x) => ({ ...x, [key]: e.target.value }));

  const subjects = unique(rows.map((r) => r.subject));
  const topics = unique(rows.filter((r) => r.subject === f.subject).map((r) => r.topic));

  const save = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: '' });
    setErrors({});
    try {
      const saved = await api.put(`/api/operator/questions/${q.id}`, {
        examType: f.examType,
        subject: f.subject.trim(),
        topic: f.topic.trim() || null,
        year: f.year === '' ? null : Number(f.year),
        source: f.source.trim() || null,
        image: f.image.trim(),
        correctAnswer: f.correctAnswer,
        choiceCount: Number(f.choiceCount),
        solutionUrl: f.solutionUrl.trim() || null,
        active: f.active,
      });
      onSaved(saved);
    } catch (err) {
      setErrors(err.fields);
      setState({ busy: false, error: err.message });
    }
  };

  return (
    <form onSubmit={save} noValidate>
      <p className="muted">
        Kod: <strong>{q.code}</strong> (değişmez) · Açık bildirim: {q.openReportCount}
      </p>
      <div className="editor-preview">
        <QuestionImage id={q.id} version={q.updatedAt} alt={`${q.code} önizleme`} />
        <p className="muted small">Önizleme kayıtlı görseli gösterir.</p>
      </div>

      <div className="form-grid">
        <Field as="select" label="Sınav türü" value={f.examType} onChange={set('examType')} error={errors.examType}>
          <option value="TYT">TYT</option>
          <option value="AYT">AYT</option>
        </Field>
        <Field label="Ders" list="liste-dersler" value={f.subject} onChange={set('subject')} error={errors.subject} />
        <Field label="Konu" list="liste-konular" value={f.topic} onChange={set('topic')} error={errors.topic} />
        <Field label="Yıl" type="number" inputMode="numeric" value={f.year} onChange={set('year')} error={errors.year} />
        <Field label="Kaynak" value={f.source} onChange={set('source')} error={errors.source} />
        <Field label="Görsel yolu" value={f.image} onChange={set('image')} error={errors.image} hint="Görsel kök klasörüne göre göreli yol." />
        <Field label="Çözüm bağlantısı" type="url" value={f.solutionUrl} onChange={set('solutionUrl')} error={errors.solutionUrl} />
        <Field as="select" label="Doğru cevap" value={f.correctAnswer} onChange={set('correctAnswer')} error={errors.correctAnswer}>
          {LETTERS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Field>
        <Field as="select" label="Şık sayısı" value={f.choiceCount} onChange={set('choiceCount')} error={errors.choiceCount}>
          <option value="4">4</option>
          <option value="5">5</option>
        </Field>
      </div>
      <datalist id="liste-dersler">
        {subjects.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="liste-konular">
        {topics.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <label className="checkbox">
        <input type="checkbox" checked={f.active} onChange={(e) => setF((x) => ({ ...x, active: e.target.checked }))} /> Aktif (sorular listesinde ve sınavlarda görünür)
      </label>

      {f.correctAnswer !== q.correctAnswer && <Alert type="warn">Doğru cevabı değiştiriyorsun. Geçmiş sınav sonuçları etkilenmez.</Alert>}
      {state.error && <Alert type="error">{state.error}</Alert>}
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Vazgeç
        </button>
        <button type="submit" className="btn btn-primary" disabled={state.busy}>
          {state.busy ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
