// Yükleniyor / hata / boş durum bileşenleri.

export function Loading({ text = 'Yükleniyor…' }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <p>
        <strong>✗ Bir sorun oluştu.</strong> {error?.message || 'Beklenmeyen bir hata.'}
      </p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Tekrar dene
        </button>
      )}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="state">
      <p className="state-title">{title}</p>
      {children && <div className="state-body">{children}</div>}
    </div>
  );
}

/** Basit uyarı kutusu: type = info | error | success | warn */
export function Alert({ type = 'info', children }) {
  const icon = { info: 'ℹ', error: '✗', success: '✓', warn: '⚠' }[type];
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span aria-hidden="true">{icon}</span>
      <div>{children}</div>
    </div>
  );
}
