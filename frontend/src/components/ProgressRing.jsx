import { formatPercent } from '../format.js';

/** Yüzdeyi gösteren büyük SVG halka. */
export default function ProgressRing({ percent, size = 120 }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, Number(percent) || 0));
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} role="img" aria-label={`Başarı yüzdesi ${formatPercent(percent)}`}>
      <circle cx="80" cy="80" r={r} fill="none" stroke="var(--line)" strokeWidth="14" />
      <circle
        cx="80"
        cy="80"
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${(c * p) / 100} ${c}`}
        transform="rotate(-90 80 80)"
      />
      <text x="80" y="80" textAnchor="middle" dominantBaseline="central" className="ring-value">
        {formatPercent(percent)}
      </text>
    </svg>
  );
}
