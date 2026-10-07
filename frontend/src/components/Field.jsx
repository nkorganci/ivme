import { useId } from 'react';

/**
 * Etiketli form alanı. as = input | select | textarea.
 * error verilirse alanın altında gösterilir.
 */
export function Field({ label, error, hint, as: Tag = 'input', children, ...props }) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <Tag id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} {...props}>
        {children}
      </Tag>
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-err`} role="alert">
          ✗ {error}
        </p>
      )}
    </div>
  );
}
