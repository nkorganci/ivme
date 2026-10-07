import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../../api.js';
import { PAGE_SIZE } from '../../config.js';
import { useAsync } from '../../hooks.js';
import Pager from '../../components/Pager.jsx';
import { Field } from '../../components/Field.jsx';
import { Alert, Empty, ErrorBox, Loading } from '../../components/States.jsx';
import { categoryLabel, difficultyLabel, formatDate } from '../../format.js';

export default function AdminFeedback() {
  const [category, setCategory] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  const url = '/api/admin/feedback' + qs({ category, resolved: onlyOpen ? 'false' : '', page, size: PAGE_SIZE });
  const { data, loading, error, retry, reload } = useAsync(() => api.get(url), [url]);

  const setResolved = async (item, resolved) => {
    setBusyId(item.id);
    setActionError('');
    try {
      await api.patch(`/api/admin/feedback/${item.id}`, { resolved });
      reload();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <section className="card">
        <div className="filters">
          <Field
            as="select"
            label="Kategori"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Hepsi</option>
            <option value="QUESTION_ISSUE">{categoryLabel('QUESTION_ISSUE')}</option>
            <option value="RATING">{categoryLabel('RATING')}</option>
            <option value="GENERAL">{categoryLabel('GENERAL')}</option>
          </Field>
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={onlyOpen}
            onChange={(e) => {
              setOnlyOpen(e.target.checked);
              setPage(0);
            }}
          />{' '}
          Yalnız çözülmemişler
        </label>
      </section>

      {actionError && <Alert type="error">{actionError}</Alert>}
      {loading && <Loading />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {data && data.content.length === 0 && <Empty title="Bu filtrede geri bildirim yok." />}
      {data && data.content.length > 0 && (
        <ul className="feedback-list">
          {data.content.map((f) => (
            <li key={f.id} className={`card feedback-item${f.resolved ? ' resolved' : ''}`}>
              <div className="feedback-head">
                <span className="badge badge-primary">{categoryLabel(f.category)}</span>
                <strong>{f.username}</strong>
                <span className="muted small">{formatDate(f.createdAt)}</span>
                {f.resolved && <span className="badge badge-ok">✓ Çözüldü</span>}
              </div>
              {f.message && <p className="feedback-msg">{f.message}</p>}
              <p className="muted small">
                {f.questionId && (
                  <>
                    Soru: <Link to={`/yonetim?sekme=sorular&duzenle=${f.questionId}`}>{f.questionCode || f.questionId}</Link> ·{' '}
                  </>
                )}
                {f.difficultyVote && <>Zorluk oyu: {difficultyLabel(f.difficultyVote)} · </>}
                {f.rating != null && <>Puan: ★ {f.rating}</>}
              </p>
              <button type="button" className="btn btn-secondary btn-sm" disabled={busyId === f.id} onClick={() => setResolved(f, !f.resolved)}>
                {f.resolved ? 'Geri aç' : 'Çözüldü olarak işaretle'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </>
  );
}
