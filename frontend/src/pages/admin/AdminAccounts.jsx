import { useEffect, useMemo, useState } from 'react';
import { api, qs } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { useAsync } from '../../hooks.js';
import { formatDate, formatDateOnly, formatDuration, formatNumber } from '../../format.js';
import DataGrid from '../../components/DataGrid.jsx';
import Pager from '../../components/Pager.jsx';
import Modal from '../../components/Modal.jsx';
import { Field } from '../../components/Field.jsx';
import { Alert, Empty, ErrorBox, Loading } from '../../components/States.jsx';

const ROLES = [
  ['USER', 'Öğrenci', 'öğrenci'], ['TEACHER', 'Öğretmen', 'öğretmen'],
  ['PARENT', 'Veli', 'veli'], ['ADMIN', 'Yönetici', 'yönetici'],
  ['OPERATOR', 'İçerik operatörü', 'içerik operatörü'],
];
const roleName = role => ROLES.find(([value]) => value === role)?.[1] || role;
const countryNames = new Intl.DisplayNames(['tr-TR'], { type: 'region' });
const countryName = code => !code ? 'Bilinmiyor' : code === 'XX' ? 'Bilinmiyor' : code === 'T1' ? 'Tor ağı' : `${countryNames.of(code)} (${code})`;
const activeTime = seconds => {
  if (!seconds) return 'Ölçüm bekleniyor';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours} sa ${minutes} dk` : formatDuration(seconds);
};

export default function AdminAccounts() {
  const { user } = useAuth();
  const [role, setRole] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [action, setAction] = useState(null);
  const [notice, setNotice] = useState('');
  const url = '/api/admin/accounts' + qs({ role, approved: pendingOnly ? false : '', query, page, size: 100 });
  const { data, loading, error, retry } = useAsync(() => api.get(url), [url, revision]);
  const summary = useAsync(() => api.get('/api/admin/accounts/summary'), [revision]);
  useEffect(() => { if (data && page > 0 && !data.content.length) setPage(Math.max(0, data.totalPages - 1)); }, [data, page]);
  const selectRole = value => { setRole(value); setPage(0); setNotice(''); };
  const search = event => { event.preventDefault(); setQuery(draft.trim()); setPage(0); };
  const clear = () => { setDraft(''); setQuery(''); setPage(0); };
  const finished = message => { setAction(null); setNotice(message); setRevision(value => value + 1); };
  const columns = useMemo(() => [
    { colId: 'number', headerName: 'No', width: 42, minWidth: 42, maxWidth: 48, sortable: false, filter: false,
      valueGetter: ({ node }) => page * 100 + node.rowIndex + 1 },
    { field: 'username', headerName: 'Kullanıcı adı', minWidth: 105, maxWidth: 175, tooltipField: 'email' },
    { field: 'email', headerName: 'E-posta', minWidth: 120, maxWidth: 190 },
    { field: 'role', headerName: 'Rol', minWidth: 82, maxWidth: 125, valueFormatter: ({ value }) => roleName(value) },
    { colId: 'status', headerName: 'Durum', minWidth: 86, maxWidth: 135,
      valueGetter: ({ data: account }) => !account.approved ? 'Onay bekliyor' : account.enabled ? 'Etkin' : 'Engelli' },
    { field: 'createdAt', headerName: 'Kayıt tarihi', minWidth: 92, maxWidth: 112, valueFormatter: ({ value }) => formatDateOnly(value) },
    { field: 'lastLoginAt', headerName: 'Son giriş', minWidth: 128, maxWidth: 160, valueFormatter: ({ value }) => formatDate(value) },
    { field: 'activeSeconds', headerName: 'Aktif süre', headerTooltip: 'Ön planda ve etkileşim varken bu sürümden itibaren ölçülür.', minWidth: 100, maxWidth: 145, valueFormatter: ({ value }) => activeTime(value) },
    { field: 'countryCode', headerName: 'Ülke', headerTooltip: 'Cloudflare ülke başlığı yoksa ülke belirlenemez.', minWidth: 88, maxWidth: 135, valueFormatter: ({ value }) => countryName(value) },
    { colId: 'actions', headerName: 'İşlemler', minWidth: 220, maxWidth: 275, sortable: false, filter: false,
      cellRenderer: ({ data: account }) => account.id === user.id ? <span className="muted">Geçerli hesabın</span> :
        <div className="rate-row">
          {!account.approved && <button className="btn btn-primary btn-sm" type="button"
            onClick={() => setAction({ account, kind: 'approve' })}>Onayla</button>}
          <button className="btn btn-secondary btn-sm" type="button"
            onClick={() => setAction({ account, kind: account.enabled ? 'block' : 'unblock' })}>
            {account.enabled ? 'Engelle' : 'Engeli kaldır'}
          </button>
          <button className="btn btn-danger btn-sm" type="button" onClick={() => setAction({ account, kind: 'delete' })}>Sil</button>
        </div> },
  ], [page, user.id]);
  const selectedLabel = ROLES.find(([value]) => value === role)?.[2] || 'kullanıcı';
  return <section aria-label="Kullanıcı yönetimi">
    <h2>Kullanıcılar</h2>
    {summary.error && <ErrorBox error={summary.error} onRetry={summary.retry} />}
    <div className="rate-row" role="group" aria-label="Kullanıcı rolleri">
      <button type="button" className={`btn ${role === '' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={role === ''} onClick={() => selectRole('')}>
        Tümü{summary.data ? ` (${formatNumber(summary.data.total)})` : ''}
      </button>
      {ROLES.map(([value, label]) => <button key={value} type="button" className={`btn ${role === value ? 'btn-primary' : 'btn-secondary'}`}
        aria-pressed={role === value} onClick={() => selectRole(value)}>
        {label}{summary.data ? ` (${formatNumber(summary.data.counts[value] || 0)})` : ''}
      </button>)}
    </div>
    <button type="button" className={`btn ${pendingOnly ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={pendingOnly}
      onClick={() => { setPendingOnly(value => !value); setPage(0); }}>
      Yalnız onay bekleyenler{summary.data ? ` (${formatNumber(summary.data.pending)})` : ''}
    </button>
    <form className="filter-row" onSubmit={search}>
      <Field label="Kullanıcı ara" type="search" value={draft} maxLength={100}
        onChange={event => setDraft(event.target.value)} placeholder="Kullanıcı adı veya e-posta" />
      <button type="submit" className={`btn ${query ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={Boolean(query)}>Ara</button>
      {query && <button type="button" className="btn btn-secondary" onClick={clear}>Aramayı temizle</button>}
      <button type="button" className="btn btn-secondary" onClick={() => setRevision(value => value + 1)}>Yenile</button>
    </form>
    {notice && <Alert type="success">{notice}</Alert>}
    {loading && <Loading />}
    {error && <ErrorBox error={error} onRetry={retry} />}
    {data && <>
      <p className="muted">{formatNumber(data.totalElements)} kullanıcı{query ? ' bulundu' : ' kayıtlı'}.</p>
      {data.content.length ? <div className="card table-card">
        <DataGrid rowData={data.content} columnDefs={columns} showSearch={false} fitContent gridOptions={{ pagination: false }} />
      </div> : <Empty title={query ? 'Aramaya uyan kullanıcı yok.' : `Henüz kayıtlı ${selectedLabel} yok.`} />}
      <Pager page={data.page} totalPages={data.totalPages} onChange={setPage} />
    </>}
    {action && <AccountAction key={`${action.kind}-${action.account.id}`} action={action}
      onClose={() => setAction(null)} onDone={finished} />}
  </section>;
}

function AccountAction({ action: { account, kind }, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const deleting = kind === 'delete';
  const approving = kind === 'approve';
  const title = deleting ? 'Kullanıcıyı sil' : approving ? 'Kaydı onayla' : kind === 'block' ? 'Kullanıcıyı engelle' : 'Engeli kaldır';
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (deleting) await api.delete(`/api/admin/accounts/${account.id}`, { confirmation, reason });
      else if (approving) await api.patch(`/api/admin/accounts/${account.id}/approval`, {});
      else await api.patch(`/api/admin/accounts/${account.id}/status`, { enabled: kind === 'unblock', reason });
      onDone(deleting ? 'Hesap listeden kaldırıldı; geçmiş kayıtlar korundu.' : approving ? 'Kayıt onaylandı. Kullanıcı artık giriş yapabilir.' : kind === 'block' ? 'Kullanıcı engellendi.' : 'Kullanıcının engeli kaldırıldı.');
    } catch (failure) { setError(failure.message); setBusy(false); }
  };
  return <Modal title={title} onClose={() => { if (!busy) onClose(); }}>
    <form onSubmit={submit}>
      <p><strong>{account.username}</strong> · {roleName(account.role)}</p>
      <p>{approving ? account.enabled ? 'Kayıt onaylandığında kullanıcı kendi şifresiyle sisteme giriş yapabilir.' : 'Kayıt onaylanır; giriş yapabilmesi için hesabın engeli ayrıca kaldırılmalıdır.'
        : deleting ? 'Hesap listeden kaldırılır ve giriş erişimi kapatılır. Çalışma geçmişi ve içerik inceleme kayıtları korunur.'
        : kind === 'block' ? 'Kullanıcının girişi engellenir. Açık oturumları sonraki istekte kapatılır.'
          : 'Kullanıcı hesabına yeniden giriş yapabilir.'}</p>
      {!approving && <Field as="textarea" label="Gerekçe (isteğe bağlı)" value={reason} maxLength={500}
        onChange={event => setReason(event.target.value)} disabled={busy} />}
      {deleting && <Field label="Onay için kullanıcı adını yaz" value={confirmation} autoComplete="off"
        onChange={event => setConfirmation(event.target.value)} disabled={busy} />}
      {error && <Alert type="error">{error}</Alert>}
      <div className="rate-row">
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>Vazgeç</button>
        <button type="submit" className={deleting ? 'btn btn-danger' : 'btn btn-primary'}
          disabled={busy || (deleting && confirmation !== account.username)}>{busy ? 'İşleniyor…' : title}</button>
      </div>
    </form>
  </Modal>;
}
