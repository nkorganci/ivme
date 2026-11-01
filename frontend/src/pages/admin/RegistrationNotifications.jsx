import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAsync } from '../../hooks.js';
import { formatDate, formatNumber } from '../../format.js';
import DataGrid from '../../components/DataGrid.jsx';
import { Alert, ErrorBox } from '../../components/States.jsx';

const labels = {
  PENDING: 'Gönderim bekliyor', PROCESSING: 'Gönderiliyor', RETRY: 'Tekrar denenecek',
  FAILED: 'Başarısız', ACCEPTED: 'Sağlayıcı kabul etti',
};

export default function RegistrationNotifications({ revision }) {
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState(null);
  const { data, error, retry } = useAsync(() => api.get('/api/admin/accounts/registration-notifications'), [revision, tick]);
  useEffect(() => {
    const timer = setInterval(() => setTick(value => value + 1), 30000);
    return () => clearInterval(timer);
  }, []);
  const retrySend = async id => {
    setBusy(id); setActionError(null);
    try {
      await api.post(`/api/admin/accounts/registration-notifications/${id}/retry`, {});
      setTick(value => value + 1);
    } catch (failure) { setActionError(failure); }
    finally { setBusy(null); }
  };
  const columns = [
    { field: 'userId', headerName: 'Hesap no', minWidth: 90 },
    { field: 'status', headerName: 'Bildirim durumu', minWidth: 180, valueFormatter: ({ value }) => labels[value] || value },
    { field: 'attempts', headerName: 'Deneme', minWidth: 85 },
    { field: 'createdAt', headerName: 'Kayıt zamanı', minWidth: 160, valueFormatter: ({ value }) => formatDate(value) },
    { field: 'nextAttemptAt', headerName: 'Sonraki deneme', minWidth: 160,
      valueFormatter: ({ value, data: row }) => ['RETRY', 'PENDING'].includes(row.status) ? formatDate(value) : '—' },
    { field: 'errorCode', headerName: 'Hata kodu', minWidth: 160 },
    { field: 'providerMessageId', headerName: 'Sağlayıcı kimliği', minWidth: 220, tooltipField: 'providerMessageId' },
    { colId: 'retry', headerName: 'İşlem', minWidth: 170, sortable: false, filter: false,
      cellRenderer: ({ data: row }) => row.status === 'FAILED' ? <button type="button" className="btn btn-secondary btn-sm"
        disabled={busy !== null} onClick={() => retrySend(row.id)}>{busy === row.id ? 'İşleniyor…' : 'Yeniden dene'}</button> : '—' },
  ];
  return <section aria-label="Yeni kayıt bildirimleri">
    <h3>Yeni kayıt bildirimleri</h3>
    {error && <ErrorBox error={error} onRetry={retry} />}
    {actionError && <ErrorBox error={actionError} />}
    {data && <>
      {!data.configured && <Alert type="warn">E-posta kurulumu bekleniyor veya gönderim kapalı. Yeni kayıt bildirimleri korunuyor; onay bekleyen hesapları aşağıdan inceleyebilirsiniz.</Alert>}
      <p role="status">{formatNumber(data.waiting)} gönderim bekliyor · {formatNumber(data.failed)} başarısız · {formatNumber(data.accepted)} sağlayıcı kabul etti</p>
      <details>
        <summary>Bildirim ayrıntıları</summary>
        <p className="muted">Son 30 bildirim gösterilir. Sağlayıcının kabul etmesi gelen kutusuna teslim veya okunma onayı değildir.</p>
        <DataGrid rowData={data.recent} columnDefs={columns} showSearch={false} fitContent />
      </details>
    </>}
  </section>;
}
