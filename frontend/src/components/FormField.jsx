export default function FormField({ label, required, error, hint, children, htmlFor }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor} className="field-label">
        {label}
        {required && <span className="field-required">*</span>}
      </label>
      {children}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <style>{`
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 18px;
        }
        .field-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-muted);
          letter-spacing: 0.01em;
        }
        .field-required {
          color: var(--color-danger);
          margin-left: 3px;
        }
        .field-hint {
          font-size: 12.5px;
          color: var(--color-text-faint);
        }
        .field-error {
          font-size: 12.5px;
          color: var(--color-danger);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
