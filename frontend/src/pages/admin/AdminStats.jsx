import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAsync } from '../../hooks.js';
import { Empty, ErrorBox, Loading } from '../../components/States.jsx';
import { formatDate, formatNumber } from '../../format.js';

const CARDS = [
  ['userCount', 'Kullanıcı'],
  ['questionCount', 'Soru'],
  ['activeQuestionCount', 'Aktif soru'],
  ['submittedExamCount', 'Gönderilen sınav'],
  ['openFeedbackCount', 'Açık geri bildirim'],
  ['reportedQuestionCount', 'Bildirilen soru'],
];

export default function AdminStats() {
  const stats = useAsync(() => api.get('/api/admin/stats'), []);
  const reported = useAsync(() => api.get('/api/admin/reported-questions'), []);

  return (
    <>
      {stats.loading && <Loading />}
      {stats.error && <ErrorBox error={stats.error} onRetry={stats.retry} />}
      {stats.data && (
        <div className="stats stats-6">
          {CARDS.map(([key, label]) => (
            <div key={key} className="card stat">
              <p className="stat-value">{formatNumber(stats.data[key])}</p>
              <p className="stat-label">{label}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">Bildirilen sorular</h2>
      {reported.loading && <Loading />}
      {reported.error && <ErrorBox error={reported.error} onRetry={reported.retry} />}
      {reported.data && reported.data.length === 0 && <Empty title="Çözülmemiş soru bildirimi yok. ✓" />}
      {reported.data && reported.data.length > 0 && (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Ders / Konu</th>
                  <th>Bildirim</th>
                  <th>Son bildirim</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {reported.data.map((r) => (
                  <tr key={r.questionId}>
                    <td>{r.code}</td>
                    <td>
                      {r.subject}
                      {r.topic ? ` · ${r.topic}` : ''}
                    </td>
                    <td>{r.reportCount}</td>
                    <td>{formatDate(r.lastReportAt)}</td>
                    <td>
                      <Link className="btn btn-secondary btn-sm" to={`/yonetim?sekme=sorular&duzenle=${r.questionId}`}>
                        Düzenle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
