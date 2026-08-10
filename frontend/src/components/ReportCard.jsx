const VERDICT_COPY = {
  yes: { label: 'Would invest', tone: 'success' },
  no: { label: 'Would not invest', tone: 'danger' },
  maybe: { label: 'Undecided', tone: 'warning' },
};

function ScoreBar({ label, value }) {
  const pct = (value / 5) * 100;
  return (
    <div className="score-row">
      <span className="score-label">{label}</span>
      <div className="score-track">
        <div className="score-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="score-value mono">{value.toFixed(2)}</span>

      <style>{`
        .score-row {
          display: grid;
          grid-template-columns: 90px 1fr 44px;
          align-items: center;
          gap: 14px;
        }
        .score-label {
          font-size: 13px;
          color: var(--color-text-muted);
        }
        .score-track {
          height: 6px;
          background: var(--color-border);
          border-radius: 999px;
          overflow: hidden;
        }
        .score-fill {
          height: 100%;
          background: var(--color-accent);
          border-radius: 999px;
        }
        .score-value {
          font-size: 12.5px;
          color: var(--color-text-muted);
          text-align: right;
        }
      `}</style>
    </div>
  );
}

export default function ReportCard({ session }) {
  const report = session.report;
  const verdict = VERDICT_COPY[report?.would_invest] || { label: report?.would_invest, tone: 'warning' };

  return (
    <div className="report-card">
      <div className="report-header">
        <div>
          <p className="report-eyebrow">Panel verdict</p>
          <h2 className="report-startup">{session.startup_name}</h2>
        </div>
        <span className={`verdict-pill verdict-${verdict.tone}`}>{verdict.label}</span>
      </div>

      <p className="report-verdict-text">{report?.panel_verdict}</p>

      <div className="report-scores">
        <ScoreBar label="Specificity" value={report?.avg_specificity ?? 0} />
        <ScoreBar label="Evidence" value={report?.avg_evidence ?? 0} />
        <ScoreBar label="Clarity" value={report?.avg_clarity ?? 0} />
      </div>

      <div className="report-columns">
        <div>
          <h3 className="report-col-title">Strengths</h3>
          <ul className="report-list">
            {report?.strengths?.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="report-col-title">Concerns</h3>
          <ul className="report-list report-list-danger">
            {report?.concerns?.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      </div>

      {report?.fact_check_log?.length > 0 && (
        <div className="report-factchecks">
          <h3 className="report-col-title">Claims checked</h3>
          {report.fact_check_log.map((fc, i) => (
            <div key={i} className="factcheck-row">
              <span className={`factcheck-verdict factcheck-${fc.verdict}`}>{fc.verdict}</span>
              <div>
                <p className="factcheck-claim">"{fc.claim_text}"</p>
                <p className="factcheck-explanation">{fc.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .report-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 32px;
        }
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 18px;
          gap: 16px;
        }
        .report-eyebrow {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-text-faint);
          margin-bottom: 4px;
        }
        .report-startup {
          font-size: 24px;
        }
        .verdict-pill {
          font-size: 12.5px;
          font-weight: 600;
          padding: 7px 14px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .verdict-success {
          background: var(--color-success-soft);
          color: var(--color-success);
        }
        .verdict-danger {
          background: var(--color-danger-soft);
          color: var(--color-danger);
        }
        .verdict-warning {
          background: var(--color-accent-soft);
          color: var(--color-accent);
        }
        .report-verdict-text {
          font-size: 15px;
          line-height: 1.65;
          color: var(--color-text);
          margin-bottom: 26px;
        }
        .report-scores {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 20px;
          background: var(--color-bg-elevated);
          border-radius: var(--radius-md);
          margin-bottom: 28px;
        }
        .report-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
          margin-bottom: 28px;
        }
        .report-col-title {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--color-text-faint);
          margin-bottom: 12px;
        }
        .report-list {
          margin: 0;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 13.5px;
          line-height: 1.5;
          color: var(--color-text);
        }
        .report-list-danger li::marker {
          color: var(--color-danger);
        }
        .report-factchecks {
          border-top: 1px solid var(--color-border);
          padding-top: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .factcheck-row {
          display: grid;
          grid-template-columns: 92px 1fr;
          gap: 14px;
        }
        .factcheck-verdict {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          height: fit-content;
          text-align: center;
        }
        .factcheck-confirmed {
          background: var(--color-success-soft);
          color: var(--color-success);
        }
        .factcheck-refuted {
          background: var(--color-danger-soft);
          color: var(--color-danger);
        }
        .factcheck-unverifiable {
          background: var(--color-border);
          color: var(--color-text-muted);
        }
        .factcheck-claim {
          font-size: 13.5px;
          font-style: italic;
          color: var(--color-text);
          margin-bottom: 3px;
        }
        .factcheck-explanation {
          font-size: 12.5px;
          color: var(--color-text-muted);
          line-height: 1.5;
        }

        @media (max-width: 640px) {
          .report-columns {
            grid-template-columns: 1fr;
          }
          .factcheck-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
