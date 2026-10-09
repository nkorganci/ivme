import { api } from '../../api.js';
import { useAsync } from '../../hooks.js';
import { ErrorBox, Loading } from '../../components/States.jsx';
import { formatNumber } from '../../format.js';

const CARDS = [
  ['userCount', 'Kayıtlı öğrenci'],
  ['submittedExamCount', 'Tamamlanan deneme'],
];

export default function AdminStats() {
  const { data, loading, error, retry } = useAsync(() => api.get('/api/admin/stats'), []);
  return <>
    <p className="muted lead">Kişisel hesap ve cevap ayrıntıları bu panelde gösterilmez.</p>
    {loading && <Loading />}
    {error && <ErrorBox error={error} onRetry={retry} />}
    {data && <div className="stats">
      {CARDS.map(([key, label]) => <div key={key} className="card stat">
        <p className="stat-value">{formatNumber(data[key])}</p>
        <p className="stat-label">{label}</p>
      </div>)}
    </div>}
  </>;
}
