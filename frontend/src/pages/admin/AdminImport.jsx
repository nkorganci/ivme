import { useState } from 'react';
import { api } from '../../api.js';
import { Field } from '../../components/Field.jsx';
import { Alert } from '../../components/States.jsx';

function IssueTable({ title, items, tone }) {
  if (!items?.length) return null;
  return (
    <div className="card table-card">
      <h3 className={`issue-title issue-${tone}`}>
        {tone === 'bad' ? '✗' : '⚠'} {title}
      </h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Satır</th>
              <th>Kod</th>
              <th>Alan</th>
              <th>Mesaj</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i, n) => (
              <tr key={n}>
                <td>{i.row}</td>
                <td>{i.code || '—'}</td>
                <td>{i.field || '—'}</td>
                <td>{i.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminImport() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('INSERT_ONLY');
  const [dryRun, setDryRun] = useState(true);
  const [report, setReport] = useState(null);
  const [state, setState] = useState({ busy: false, error: '' });

  const send = async (asDryRun) => {
    if (!file) {
      setState({ busy: false, error: 'Önce bir CSV veya JSON dosyası seç.' });
      return;
    }
    setState({ busy: true, error: '' });
    const body = new FormData();
    body.append('file', file);
    body.append('mode', mode);
    body.append('dryRun', String(asDryRun));
    try {
      const r = await api.upload('/api/operator/import', body);
      const errors = r.errors || [];
      const warnings = r.warnings || [];
      setReport({ ...r, errors, warnings, errorCount: r.errorCount ?? errors.length, warningCount: r.warningCount ?? warnings.length });
      setState({ busy: false, error: '' });
    } catch (e) {
      setReport(null);
      setState({ busy: false, error: e.message });
    }
  };

  const canApply = report && report.dryRun && report.errorCount === 0;

  return (
    <>
      <form
        className="card form-card"
        onSubmit={(e) => {
          e.preventDefault();
          send(dryRun);
        }}
      >
        <h2>Soruları içe aktar</h2>
        <Field
          label="Dosya (CSV veya JSON)"
          type="file"
          accept=".csv,.json,.txt,text/csv,application/json"
          onChange={(e) => {
            setFile(e.target.files[0] || null);
            setReport(null);
          }}
        />
        <Field as="select" label="Mod" value={mode} onChange={(e) => { setMode(e.target.value); setReport(null); }}>
          <option value="INSERT_ONLY">Yalnız yeni ekle</option>
          <option value="UPSERT">Var olanı güncelle</option>
        </Field>
        <label className="checkbox">
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} /> Önce denemeli çalıştır (dryRun) — hiçbir şey kaydedilmez
        </label>
        {state.error && <Alert type="error">{state.error}</Alert>}
        <button type="submit" className="btn btn-primary" disabled={state.busy}>
          {state.busy ? 'Gönderiliyor…' : dryRun ? 'Denemeli çalıştır' : 'İçe aktar'}
        </button>

        <details className="help">
          <summary>Dosya biçimi nasıl olmalı?</summary>
          <p>
            <strong>Zorunlu sütunlar:</strong> <code>code</code> (tekil), <code>exam_type</code> (TYT/AYT), <code>subject</code>, <code>image</code> (kök klasöre göre göreli yol),{' '}
            <code>correct_answer</code> (A–E).
          </p>
          <p>
            <strong>İsteğe bağlı:</strong> <code>topic</code>, <code>year</code>, <code>source</code>, <code>choice_count</code> (4–5, varsayılan 5),{' '}
            <code>solution_url</code>, <code>active</code> (varsayılan true).
          </p>
          <p>CSV: UTF-8; ayraç <code>,</code> <code>;</code> veya sekme (başlıktan otomatik anlaşılır). JSON: nesne dizisi.</p>
        </details>
      </form>

      {report && (
        <section className="import-report" aria-live="polite">
          <h2 className="section-title">Rapor</h2>
          {report.applied ? (
            <Alert type="success">✓ Değişiklikler uygulandı.</Alert>
          ) : report.errorCount > 0 ? (
            <Alert type="error">Dosyada hata var; hiçbir şey kaydedilmedi. Hataları düzeltip yeniden dene.</Alert>
          ) : (
            <Alert type="info">Deneme çalıştırması tamamlandı; hiçbir şey kaydedilmedi ({report.mode === 'UPSERT' ? 'güncelle' : 'yalnız ekle'} modu).</Alert>
          )}
          <div className="stats stats-4">
            {[
              ['Toplam satır', report.totalRows],
              ['Eklenen', report.inserted],
              ['Güncellenen', report.updated],
              ['Atlanan', report.skipped],
            ].map(([label, value]) => (
              <div key={label} className="card stat">
                <p className="stat-value">{value}</p>
                <p className="stat-label">{label}</p>
              </div>
            ))}
          </div>
          <p className="muted">
            Uygulandı: <strong>{report.applied ? 'Evet ✓' : 'Hayır'}</strong> · Deneme: {report.dryRun ? 'Evet' : 'Hayır'}
          </p>
          <IssueTable title={`Hatalar (${report.errorCount ?? report.errors.length})`} items={report.errors} tone="bad" />
          <IssueTable title={`Uyarılar (${report.warningCount ?? report.warnings.length})`} items={report.warnings} tone="warn" />
          {(report.errorCount > report.errors.length || report.warningCount > report.warnings.length) && (
            <p className="muted">Listelerde en fazla ilk 1000 kayıt gösterilir; toplam sayılar başlıklardadır.</p>
          )}
          {canApply && (
            <button type="button" className="btn btn-primary" disabled={state.busy} onClick={() => send(false)}>
              Gerçekten içe aktar
            </button>
          )}
        </section>
      )}
    </>
  );
}
