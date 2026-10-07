import { useRef, useState } from 'react';
import { qrUrl } from '../api.js';

/** Sorunun QR kodu ve doğrudan bağlantısı (yan panelde katlanır bölüm içinde). */
export default function QrCard({ question }) {
  const link = `${window.location.origin}/soru/${question.code}`;
  const input = useRef(null);
  const [msg, setMsg] = useState('');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setMsg('✓ Bağlantı kopyalandı');
    } catch {
      input.current?.select();
      setMsg('Bağlantı seçildi; Ctrl+C ile kopyalayabilirsin.');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="qr-card">
      <img src={qrUrl(question.id, 200)} width="170" height="170" loading="lazy" alt={`${question.code} kodlu sorunun QR kodu`} />
      <p className="field-label">Bu soruya doğrudan bağlantı</p>
      <div className="copy-row">
        <input ref={input} readOnly value={link} aria-label="Soruya doğrudan bağlantı" onFocus={(e) => e.target.select()} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>
          Kopyala
        </button>
      </div>
      <p className="muted small" role="status">
        {msg}
      </p>
    </div>
  );
}
