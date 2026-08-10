export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-screen">
      <div className="auth-glow" />
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark">PG</span>
          <span>PitchGrill</span>
        </div>
        <h1 className="auth-title">{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        <div className="auth-body">{children}</div>
        {footer && <div className="auth-footer">{footer}</div>}
      </div>

      <style>{`
        .auth-screen {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: var(--color-bg);
          position: relative;
          overflow: hidden;
          padding: 24px;
        }
        .auth-glow {
          position: absolute;
          top: 12%;
          left: 50%;
          transform: translateX(-50%);
          width: 640px;
          height: 640px;
          background: radial-gradient(circle, var(--color-accent-soft), transparent 65%);
          pointer-events: none;
        }
        .auth-card {
          position: relative;
          width: 100%;
          max-width: 420px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 36px 34px 30px;
          box-shadow: var(--shadow-panel);
        }
        .auth-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 15px;
          margin-bottom: 26px;
        }
        .auth-brand-mark {
          font-family: var(--font-mono);
          font-weight: 600;
          font-size: 12px;
          background: var(--color-accent);
          color: var(--color-accent-contrast);
          width: 26px;
          height: 26px;
          border-radius: 7px;
          display: grid;
          place-items: center;
        }
        .auth-title {
          font-size: 23px;
          margin-bottom: 6px;
        }
        .auth-subtitle {
          font-size: 13.5px;
          color: var(--color-text-muted);
          margin-bottom: 26px;
          line-height: 1.5;
        }
        .auth-footer {
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px solid var(--color-border);
          font-size: 13.5px;
          color: var(--color-text-muted);
          text-align: center;
        }
        .auth-footer a {
          color: var(--color-accent);
          font-weight: 600;
          text-decoration: none;
        }
        .auth-footer a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
