/** Yıldız seçici (1–5). Seçili yıldıza tekrar tıklamak değeri temizler. */
export function StarInput({ value, onChange, label = 'Puan' }) {
  return (
    <div className="stars" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star${value >= n ? ' on' : ''}`}
          aria-pressed={value === n}
          aria-label={`${n} yıldız`}
          onClick={() => onChange(value === n ? null : n)}
        >
          ★
        </button>
      ))}
      <span className="stars-text">{value ? `${value} / 5` : 'Puan verilmedi'}</span>
    </div>
  );
}

/** Salt okunur ortalama: ★ 3,8 */
export function StarValue({ value }) {
  return (
    <span className="star-value">
      <span className="star on" aria-hidden="true">
        ★
      </span>{' '}
      {value == null ? '—' : Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}
    </span>
  );
}
