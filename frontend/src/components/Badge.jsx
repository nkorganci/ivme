import { statusLabel } from '../format.js';

/** Sınav sonucundaki soru durumu rozeti: ✓ Doğru / ✗ Yanlış / — Boş */
export function StatusBadge({ status }) {
  const map = { CORRECT: ['ok', '✓'], WRONG: ['bad', '✗'], BLANK: ['warn', '—'] };
  const [cls, icon] = map[status] || ['muted', ''];
  return (
    <span className={`badge badge-${cls}`}>
      <span aria-hidden="true">{icon}</span> {statusLabel(status)}
    </span>
  );
}
