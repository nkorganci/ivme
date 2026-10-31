import { useState } from 'react';
import { api } from '../api.js';
import { Field } from './Field.jsx';
import { formatNumber } from '../format.js';

/**
 * Soru Çöz & Pratik: kişisel işaret süzgeçleri ve toplu sıfırlama (TAS-06). Öğretmen zorluk etiketi ayrı süzgeçtir.
 * Varsayılan havuzdan "Tekrar gösterme" dediklerin hariç tutulur; Gizlediklerim süzgeciyle geri alabilirsin.
 */
export default function PersonalMarks({ value, onChange, summary, onSummary, disabled }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const reset = async (scope, message) => {
    if (!window.confirm(`${message} Cevap geçmişin ve istatistiklerin silinmez. Devam edilsin mi?`)) return;
    setBusy(true); setError(''); setDone('');
    try {
      onSummary(await api.post('/api/question-preferences/reset', { scope }));
      setDone('İşaretlerin sıfırlandı.');
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };
  const marked = summary ? summary.again + summary.hidden + summary.easy + summary.medium + summary.hard : 0;
  return <fieldset className="personal-marks" disabled={disabled}>
    <legend>Kişisel işaretlerim</legend>
    <div className="filters">
      <Field as="select" label="Öğrenci zorluk etiketi" value={value.myDifficulty || ''} onChange={(event) => onChange({ ...value, myDifficulty: event.target.value })}>
        <option value="">Bütün etiketler</option>
        <option value="KOLAY">Kolay dediklerim</option>
        <option value="ORTA">Orta dediklerim</option>
        <option value="ZOR">Zor dediklerim</option>
        <option value="NONE">Etiketlemediklerim</option>
      </Field>
      <Field as="select" label="Kişisel işaret" value={value.mark || ''} onChange={(event) => onChange({ ...value, mark: event.target.value })}>
        <option value="">Hepsi (gizlediklerim hariç)</option>
        <option value="AGAIN">Tekrar istediklerim</option>
        <option value="HIDE">Gizlediklerim</option>
        <option value="UNMARKED">İşaretlemediklerim</option>
      </Field>
    </div>
    {summary && <p className="muted small">
      {formatNumber(summary.again)} soru için tekrar istedin, {formatNumber(summary.hidden)} soruyu gizledin; zorluk etiketlerin: {formatNumber(summary.easy)} kolay, {formatNumber(summary.medium)} orta, {formatNumber(summary.hard)} zor.
      {value.mark !== 'HIDE' && summary.hidden > 0 && ' Gizlediklerin bu havuza dahil değil.'}
    </p>}
    {marked > 0 && <div className="rate-row">
      <button type="button" className="btn btn-secondary btn-sm" disabled={busy || summary.hidden + summary.again === 0} onClick={() => reset('REPEAT', 'Bütün “tekrar göster / gösterme” tercihlerin sıfırlanacak.')}>Tekrar tercihlerimi sıfırla</button>
      <button type="button" className="btn btn-secondary btn-sm" disabled={busy || summary.easy + summary.medium + summary.hard === 0} onClick={() => reset('DIFFICULTY', 'Bütün zorluk etiketlerin kaldırılacak.')}>Zorluk etiketlerimi sıfırla</button>
    </div>}
    {error && <p className="field-error" role="alert">{error}</p>}
    {done && <p className="small" role="status">{done}</p>}
  </fieldset>;
}
