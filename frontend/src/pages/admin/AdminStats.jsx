import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync } from '../../hooks.js';
import { ErrorBox, Loading } from '../../components/States.jsx';
import { formatNumber } from '../../format.js';

const CARDS = [
  ['userCount', 'Kayıtlı öğrenci'],
  ['submittedExamCount', 'Tamamlanan deneme'],
];
const USAGE_CARDS = [
  ['activeUsers', 'Etkin öğrenci'], ['studySessions', 'Başlatılan pratik'],
  ['examsStarted', 'Başlatılan sınav'], ['answersSubmitted', 'Gönderilen cevap'],
];
const CONTENT_CARDS = [
  ['total', 'Etkin toplam'], ['cikmis', 'Çıkmış sorular'], ['ogm', 'OGM soru bankası'],
  ['tyt', 'TYT'], ['ayt', 'AYT'],
];
const PERIODS = [['DAY', 'Bugün'], ['WEEK', 'Bu hafta'], ['MONTH', 'Bu ay']];
const bucketLabel = (value) => value == null ? '5’ten az'
  : `${formatNumber(value)}–${formatNumber(value + 4)}`;

export default function AdminStats() {
  const [period, setPeriod] = useState('DAY');
  const { data, loading, error, retry } = useAsync(
    () => api.get(`/api/admin/stats?period=${period}`), [period]);
  const range = data?.usage && new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'long', timeZone: data.usage.zone,
  });
  return <>
    <p className="muted lead">Kişisel hesap ve cevap ayrıntıları bu panelde gösterilmez. Sayılar beşlik aralıklarla sunulur; küçük gruplar gizlenir.</p>
    <div className="rate-row" role="group" aria-label="Yönetici istatistik dönemi">
      {PERIODS.map(([value, label]) => <button key={value} type="button" className="btn btn-secondary"
        aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>)}
    </div>
    {loading && <Loading />}
    {error && <ErrorBox error={error} onRetry={retry} />}
    {data && <><h2>Tüm zamanlar</h2><div className="stats">
      {CARDS.map(([key, label]) => <div key={key} className="card stat">
        <p className="stat-value">{bucketLabel(data[key])}</p>
        <p className="stat-label">{label}</p>
      </div>)}
    </div>
    <h2>{PERIODS.find(([value]) => value === period)?.[1]} kullanım</h2>
    <p className="muted small">{range.format(new Date(data.usage.startsAt))} – {' '}
      {range.format(new Date(new Date(data.usage.endsAt).getTime() - 1))} · {data.usage.zone}</p>
    <div className="stats">
      {USAGE_CARDS.map(([key, label]) => <div key={key} className="card stat">
        <p className="stat-value">{bucketLabel(data.usage[key])}</p>
        <p className="stat-label">{label}</p>
      </div>)}
    </div>
    <h2>İçerik kapsamı</h2>
    <p className="muted small">Etkin soru kayıtlarıdır; görsel dosyaların açılabilirliği bu sayıya dahil değildir.</p>
    <div className="stats">
      {CONTENT_CARDS.map(([key, label]) => <div key={key} className="card stat">
        <p className="stat-value">{formatNumber(data.content[key])}</p>
        <p className="stat-label">{label}</p>
      </div>)}
    </div></>}
  </>;
}
