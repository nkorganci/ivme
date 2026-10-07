import { useId } from 'react';

/** Segmentli seçim (gerçek radyo düğmeleri; klavye ve ekran okuyucu desteği doğal). */
export default function Segmented({ label, options, value, onChange, disabled = false }) {
  const name = useId();
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={String(o.value)} className="seg">
          <input type="radio" name={name} checked={value === o.value} disabled={disabled} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}
