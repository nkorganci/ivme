import { useState } from 'react';

/** Pencereli sayfa numaraları: 1 … 7 8 [9] 10 11 … 3875 (page 0'dan başlar, burada 1'den gösterilir). */
function windowed(page, total) {
  const wanted = new Set([0, total - 1, page - 2, page - 1, page, page + 1, page + 2]);
  const nums = [...wanted].filter((n) => n >= 0 && n < total).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push('…' + n);
    out.push(n);
  });
  return out;
}

/**
 * Sayfalama: Önceki / Sonraki, pencereli numaralar ve sayfa numarası girip gitme kutusu.
 * Binlerce sayfa için de çalışır; sayfa değişince sayfanın başına kaydırır.
 */
export default function Pager({ page, totalPages, onChange }) {
  const [typed, setTyped] = useState('');
  if (!totalPages || totalPages <= 1) return null;

  const go = (p) => {
    const next = Math.min(totalPages - 1, Math.max(0, p));
    if (next === page) return;
    onChange(next);
    window.scrollTo({ top: 0 });
  };

  const submit = (e) => {
    e.preventDefault();
    const n = parseInt(typed, 10);
    if (Number.isInteger(n)) go(n - 1);
    setTyped('');
  };

  return (
    <nav className="pager" aria-label="Sayfalama">
      <button type="button" className="btn btn-secondary" disabled={page <= 0} onClick={() => go(page - 1)}>
        ‹ Önceki
      </button>
      <span className="pager-nums hide-sm">
        {windowed(page, totalPages).map((n) =>
          typeof n === 'string' ? (
            <span key={n} className="pager-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              className={`btn ${n === page ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              aria-current={n === page ? 'page' : undefined}
              aria-label={`Sayfa ${n + 1}`}
              onClick={() => go(n)}
            >
              {n + 1}
            </button>
          ),
        )}
      </span>
      <span className="pager-info">
        Sayfa {page + 1} / {totalPages.toLocaleString('tr-TR')}
      </span>
      <button type="button" className="btn btn-secondary" disabled={page >= totalPages - 1} onClick={() => go(page + 1)}>
        Sonraki ›
      </button>
      <form className="pager-goto" onSubmit={submit}>
        <label className="sr-only" htmlFor="sayfa-git">
          Sayfa numarası
        </label>
        <input
          id="sayfa-git"
          type="number"
          inputMode="numeric"
          min="1"
          max={totalPages}
          placeholder="Sayfa no"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary btn-sm">
          Git
        </button>
      </form>
    </nav>
  );
}
