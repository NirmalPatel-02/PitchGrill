import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ReportCard from '../components/ReportCard';
import { getSession } from '../api/sessions';
import { extractErrorMessage } from '../api/client';

export default function SessionResultPage() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    getSession(sessionId)
      .then(setSession)
      .catch((err) => setError(extractErrorMessage(err)));
  }, [sessionId]);

  return (
    <Layout>
      <div className="page-shell">
        <Link to="/history" className="back-link">
          ← Back to history
        </Link>

        {error && <div className="banner banner-error">{error}</div>}

        {!session && !error && <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}

        {session && session.status !== 'completed' && (
          <div className="banner banner-notice">
            This session is still in progress. <Link to="/grill">Resume it from the Grill page.</Link>
          </div>
        )}

        {session && session.status === 'completed' && (
          <>
            <ReportCard session={session} />

            <button
              className="btn btn-secondary"
              style={{ marginTop: 24 }}
              onClick={() => setShowTranscript((v) => !v)}
            >
              {showTranscript ? 'Hide full transcript' : 'Show full transcript'}
            </button>

            {showTranscript && (
              <div className="transcript">
                {session.turns.map((turn) => (
                  <div key={turn.turn_id} className="transcript-turn">
                    <p className="transcript-persona">{turn.persona}</p>
                    <p className="transcript-question">{turn.question_text}</p>
                    <p className="transcript-answer">{turn.human_answer}</p>
                    {turn.eval_scores && (
                      <p className="transcript-scores mono">
                        specificity {turn.eval_scores.specificity} · evidence {turn.eval_scores.evidence} · clarity{' '}
                        {turn.eval_scores.clarity}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .page-shell {
          max-width: 760px;
          margin: 0 auto;
          padding: 40px 32px 80px;
        }
        .back-link {
          display: inline-block;
          font-size: 13.5px;
          color: var(--color-text-muted);
          text-decoration: none;
          margin-bottom: 22px;
        }
        .back-link:hover {
          color: var(--color-text);
        }
        .transcript {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .transcript-turn {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 18px 20px;
        }
        .transcript-persona {
          font-size: 11.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-accent);
          margin-bottom: 8px;
        }
        .transcript-question {
          font-family: var(--font-display);
          font-size: 15px;
          margin-bottom: 10px;
          line-height: 1.5;
        }
        .transcript-answer {
          font-size: 14px;
          color: var(--color-text-muted);
          line-height: 1.6;
          margin-bottom: 10px;
        }
        .transcript-scores {
          font-size: 11.5px;
          color: var(--color-text-faint);
        }
      `}</style>
    </Layout>
  );
}
