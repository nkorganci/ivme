/** Sayfalama: page 0'dan başlar. */
export default function Pager({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <nav className="pager" aria-label="Sayfalama">
      <button type="button" className="btn btn-secondary" disabled={page <= 0} onClick={() => onChange(page - 1)}>
        ← Önceki
      </button>
      <span>
        Sayfa {page + 1} / {totalPages}
      </span>
      <button type="button" className="btn btn-secondary" disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>
        Sonraki →
      </button>
    </nav>
  );
}
