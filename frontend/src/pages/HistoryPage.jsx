import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { listSessions } from '../api/sessions';
import { extractErrorMessage } from '../api/client';

const STATUS_COPY = {
  active: { label: 'In progress', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
};

export default function HistoryPage() {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listSessions()
      .then(setSessions)
      .catch((err) => setError(extractErrorMessage(err)));
  }, []);

  return (
    <Layout>
      <div className="page-shell">
        <h1 className="page-title">History</h1>
        <p className="page-subtitle">Every pitch you've run, and the panel's verdict on each.</p>

        {error && <div className="banner banner-error">{error}</div>}

        {sessions && sessions.length === 0 && (
          <div className="empty-state">
            <p>No sessions yet.</p>
            <Link to="/grill" className="btn btn-primary" style={{ marginTop: 14, display: 'inline-flex' }}>
              Start your first grill
            </Link>
          </div>
        )}

        {sessions && sessions.length > 0 && (
          <div className="session-list">
            {sessions.map((s) => {
              const status = STATUS_COPY[s.status] || { label: s.status, tone: 'warning' };
              const linkTo = s.status === 'completed' ? `/session/${s.session_id}` : '/grill';
              return (
                <Link to={linkTo} key={s.session_id} className="session-row">
                  <div>
                    <p className="session-name">{s.startup_name}</p>
                    <p className="session-meta mono">
                      {s.sector} · {new Date(s.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className={`status-pill status-${status.tone}`}>{status.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .page-shell {
          max-width: 760px;
          margin: 0 auto;
          padding: 40px 32px 80px;
        }
        .page-title {
          font-size: 27px;
          margin-bottom: 6px;
        }
        .page-subtitle {
          font-size: 14px;
          color: var(--color-text-muted);
          margin-bottom: 32px;
        }
        .empty-state {
          background: var(--color-surface);
          border: 1px dashed var(--color-border-strong);
          border-radius: var(--radius-lg);
          padding: 48px;
          text-align: center;
          color: var(--color-text-muted);
        }
        .session-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .session-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 16px 20px;
          text-decoration: none;
          color: var(--color-text);
          transition: border-color 0.15s ease, transform 0.1s ease;
        }
        .session-row:hover {
          border-color: var(--color-border-strong);
          transform: translateX(2px);
        }
        .session-name {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .session-meta {
          font-size: 12px;
          color: var(--color-text-faint);
        }
        .status-pill {
          font-size: 12px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .status-success {
          background: var(--color-success-soft);
          color: var(--color-success);
        }
        .status-warning {
          background: var(--color-accent-soft);
          color: var(--color-accent);
        }
      `}</style>
    </Layout>
  );
}
