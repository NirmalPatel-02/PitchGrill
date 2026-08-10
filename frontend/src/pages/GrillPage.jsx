import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import VoiceOrb from '../components/VoiceOrb';
import { useSpeech } from '../hooks/useSpeech';
import { createSession, submitAnswer, getSession, listSessions } from '../api/sessions';
import { extractErrorMessage } from '../api/client';
import { SECTORS, STAGES, ROUND_OPTIONS, PITCH_MIN_LENGTH, PITCH_MAX_LENGTH, ANSWER_MIN_LENGTH, ANSWER_MAX_LENGTH } from '../api/constants';

const MicIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0014 0M12 19v3" />
  </svg>
);
const StopIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function GrillPage() {
  const navigate = useNavigate();
  const speech = useSpeech();

  const [stage, setStage] = useState('checking');
  const [activeSession, setActiveSession] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [permissionChecking, setPermissionChecking] = useState(false);

  const [currentSession, setCurrentSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionPending, setQuestionPending] = useState(false);
  const [orbState, setOrbState] = useState('idle');
  const [answerText, setAnswerText] = useState('');
  const [answerError, setAnswerError] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  const [form, setForm] = useState({
    startup_name: '',
    sector: SECTORS[0],
    stage: STAGES[0],
    funding_ask: '',
    equity_offered: '',
    pitch_text: '',
    max_rounds: ROUND_OPTIONS[0],
  });
  const [formErrors, setFormErrors] = useState({});
  const [formApiError, setFormApiError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (speech.isListening) setAnswerText(speech.transcript);
  }, [speech.transcript, speech.isListening]);

  async function loadSessions() {
    setStage('checking');
    setLoadError('');
    try {
      const list = await listSessions();
      setSessionCount(list.length);
      setActiveSession(list.find((s) => s.status === 'active') || null);
      setStage('ready');
    } catch (err) {
      setLoadError(extractErrorMessage(err));
      setStage('ready');
    }
  }

  function askQuestion(text) {
    setCurrentQuestion(text);
    setAnswerText('');
    setAnswerError('');
    setQuestionPending(true);
    setOrbState('speaking');
    speech.speak(text, {
      onEnd: () => {
        setQuestionPending(false);
        setOrbState('idle');
      },
    });
  }

  const displayedQuestion =
    questionPending && speech.isSpeaking ? currentQuestion.slice(0, speech.spokenCharIndex) : currentQuestion;
  const canAnswer = !questionPending && !submittingAnswer;

  async function handleResume() {
    setLoadError('');
    try {
      const data = await getSession(activeSession.session_id);
      setCurrentSession(data);
      setStage('session');
      const lastTurn = data.turns[data.turns.length - 1];
      askQuestion(lastTurn.question_text);
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }

  async function requestMic() {
    setPermissionChecking(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
     
    } finally {
      setPermissionChecking(false);
      setStage('form');
    }
  }

  // ---------- Form ----------
  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validateForm() {
    const next = {};
    if (!form.startup_name.trim()) next.startup_name = 'Startup name is required.';

    const ask = Number(form.funding_ask);
    if (!form.funding_ask) next.funding_ask = 'Funding ask is required.';
    else if (!(ask > 0)) next.funding_ask = 'Enter an amount greater than 0.';

    if (form.equity_offered !== '') {
      const eq = Number(form.equity_offered);
      if (eq < 0 || eq > 100) next.equity_offered = 'Equity must be between 0 and 100.';
    }

    const pitchLen = form.pitch_text.trim().length;
    if (pitchLen === 0) next.pitch_text = 'Describe your pitch. the panel needs something to grill.';
    else if (pitchLen < PITCH_MIN_LENGTH)
      next.pitch_text = `Give a bit more detail. at least ${PITCH_MIN_LENGTH} characters.`;

    setFormErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleCreateSession(e) {
    e.preventDefault();
    setFormApiError('');
    if (!validateForm()) return;

    setFormSubmitting(true);
    try {
      const created = await createSession({
        startup_name: form.startup_name.trim(),
        sector: form.sector,
        stage: form.stage,
        funding_ask: Number(form.funding_ask),
        equity_offered: form.equity_offered !== '' ? Number(form.equity_offered) : null,
        pitch_text: form.pitch_text.trim(),
        max_rounds: Number(form.max_rounds),
      });
      setCurrentSession(created);
      setStage('session');
      const lastTurn = created.turns[created.turns.length - 1];
      askQuestion(lastTurn.question_text);
    } catch (err) {
      setFormApiError(extractErrorMessage(err));
    } finally {
      setFormSubmitting(false);
    }
  }

  // ---------- Answering ----------
  function toggleMic() {
    if (!speech.sttSupported) return;
    if (speech.isListening) {
      speech.stopListening();
      setOrbState('idle');
    } else {
      speech.startListening();
      setOrbState('listening');
    }
  }

  async function handleSubmitAnswer() {
    if (!canAnswer || submittingAnswer) return;
    const trimmed = answerText.trim();
    if (trimmed.length < ANSWER_MIN_LENGTH) {
      setAnswerError(`Give a fuller answer. at least ${ANSWER_MIN_LENGTH} characters.`);
      return;
    }
    if (speech.isListening) speech.stopListening();

    setAnswerError('');
    setSubmittingAnswer(true);
    setOrbState('thinking');
    try {
      const updated = await submitAnswer(currentSession.session_id, trimmed);
      setCurrentSession(updated);
      if (updated.status === 'completed') {
        navigate(`/session/${updated.session_id}`, { replace: true });
        return;
      }
      const lastTurn = updated.turns[updated.turns.length - 1];
      askQuestion(lastTurn.question_text);
    } catch (err) {
      setAnswerError(extractErrorMessage(err));
      setOrbState('idle');
    } finally {
      setSubmittingAnswer(false);
    }
  }

  function handleTextareaKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  }

  if (stage === 'session' && currentSession) {
    const roundLabel = `Round ${currentSession.current_round + 1} of ${currentSession.max_rounds}`;
    const progressPct = (currentSession.current_round / currentSession.max_rounds) * 100;

    return (
      <div className="grill-stage">
        <div className="stage-progress-track">
          <div className="stage-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="stage-top">
          <button className="btn btn-ghost" onClick={() => navigate('/history')}>
            ← Leave (resumes later)
          </button>
          <span className="stage-round mono">{roundLabel}</span>
        </div>

        <div className="stage-center">
          <VoiceOrb state={orbState} micLevel={speech.micLevel} />
          <p className="stage-persona">{currentSession.turns[currentSession.turns.length - 1]?.persona}</p>
          <h2 className="stage-question">
            {displayedQuestion}
            {questionPending && <span className="stage-cursor">▍</span>}
          </h2>
        </div>

        <div className="stage-input-dock">
          {answerError && <div className="banner banner-error" style={{ marginBottom: 12 }}>{answerError}</div>}
          {speech.sttError && (
            <div className="banner banner-notice" style={{ marginBottom: 12 }}>
              Voice input isn't working in this browser (common in Brave, sometimes Edge) try Chrome, or just type your answer below.
            </div>
          )}
          <div className="dock-row">
            <textarea
              className="textarea dock-textarea"
              placeholder={canAnswer ? 'Type your answer, or use the microphone…' : 'Listen to the question…'}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              maxLength={ANSWER_MAX_LENGTH}
              disabled={!canAnswer}
            />
            <button
              className={`dock-mic ${speech.isListening ? 'dock-mic-active' : ''}`}
              onClick={toggleMic}
              disabled={!canAnswer || !speech.sttSupported}
              title={speech.sttSupported ? 'Speak your answer' : 'Voice input not supported in this browser'}
              type="button"
            >
              {speech.isListening ? <StopIcon /> : <MicIcon />}
            </button>
            <button
              className="dock-send"
              onClick={handleSubmitAnswer}
              disabled={!canAnswer || submittingAnswer || answerText.trim().length === 0}
              title="Send answer"
              type="button"
            >
              <SendIcon />
            </button>
          </div>
          <div className="dock-footer">
            <span>Press Enter to send, Shift+Enter for a new line.</span>
            <span className={`mono ${answerText.length > ANSWER_MAX_LENGTH * 0.9 ? 'char-count warn' : 'char-count'}`}>
              {answerText.length}/{ANSWER_MAX_LENGTH}
            </span>
          </div>
        </div>

        <style>{`
          .grill-stage {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background: var(--color-bg);
          }
          .stage-progress-track {
            height: 3px;
            background: var(--color-border);
          }
          .stage-progress-fill {
            height: 100%;
            background: var(--color-accent);
            transition: width 0.4s ease;
          }
          .stage-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 18px 28px;
          }
          .stage-round {
            font-size: 13px;
            color: var(--color-text-faint);
          }
          .stage-center {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px 24px;
            gap: 22px;
            text-align: center;
          }
          .stage-persona {
            font-family: var(--font-mono);
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--color-accent);
          }
          .stage-question {
            font-size: 28px;
            line-height: 1.45;
            max-width: 640px;
            font-weight: 500;
            min-height: 76px;
          }
          .stage-cursor {
            color: var(--color-accent);
            animation: blink 0.9s steps(1) infinite;
          }
          @keyframes blink {
            50% { opacity: 0; }
          }
          .stage-input-dock {
            padding: 20px 28px 32px;
            max-width: 720px;
            width: 100%;
            margin: 0 auto;
          }
          .dock-row {
            display: flex;
            gap: 10px;
            align-items: flex-end;
          }
          .dock-textarea {
            flex: 1;
            min-height: 52px;
            max-height: 140px;
          }
          .dock-mic,
          .dock-send {
            flex-shrink: 0;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: 1px solid var(--color-border-strong);
            background: var(--color-surface);
            color: var(--color-text);
            display: grid;
            place-items: center;
            cursor: pointer;
            transition: background-color 0.15s ease, transform 0.1s ease;
          }
          .dock-mic:hover:not(:disabled),
          .dock-send:hover:not(:disabled) {
            background: var(--color-surface-hover);
          }
          .dock-mic:disabled,
          .dock-send:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
          .dock-mic-active {
            background: var(--color-danger);
            border-color: var(--color-danger);
            color: #fff;
            animation: mic-pulse 1.4s ease-in-out infinite;
          }
          @keyframes mic-pulse {
            0%, 100% { box-shadow: 0 0 0 0 var(--color-danger-soft); }
            50% { box-shadow: 0 0 0 8px transparent; }
          }
          .dock-send {
            background: var(--color-accent);
            border-color: var(--color-accent);
            color: var(--color-accent-contrast);
          }
          .dock-send:hover:not(:disabled) {
            background: var(--color-accent-strong);
          }
          .dock-footer {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            font-size: 11.5px;
            color: var(--color-text-faint);
          }
        `}</style>
      </div>
    );
  }

  return (
    <Layout>
      <div className="page-shell">
        {loadError && <div className="banner banner-error">{loadError}</div>}

        {stage === 'checking' && <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}

        {stage === 'ready' && (
          <>
            <h1 className="page-title">Grill</h1>
            <p className="page-subtitle">Pitch your idea to an AI investor panel that asks real follow-ups and checks your claims live.</p>

            {activeSession && (
              <div className="ready-card">
                <p className="ready-card-eyebrow">In progress</p>
                <h2 className="ready-card-title">{activeSession.startup_name}</h2>
                <p className="ready-card-meta mono">
                  Round {activeSession.current_round + 1} of {activeSession.max_rounds}
                </p>
                <button className="btn btn-primary" onClick={handleResume} style={{ marginTop: 16 }}>
                  Resume session
                </button>
              </div>
            )}

            {!activeSession && sessionCount >= 2 && (
              <div className="ready-card">
                <p className="ready-card-eyebrow">Limit reached</p>
                <h2 className="ready-card-title">You've used both sessions on this account</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13.5, marginTop: 6 }}>
                  This is a demo build, so each account is capped at 2 sessions.
                </p>
                <a href="/history" className="btn btn-secondary" style={{ marginTop: 16, display: 'inline-flex' }}>
                  View your past results
                </a>
              </div>
            )}

            {!activeSession && sessionCount < 2 && (
              <div className="ready-card">
                <p className="ready-card-eyebrow">Ready when you are</p>
                <h2 className="ready-card-title">Start a new grill</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13.5, marginTop: 6 }}>
                  {2 - sessionCount === 1 ? 'This is your last session on this account.' : 'You have 2 sessions available.'}
                </p>
                <button className="btn btn-primary" onClick={() => setStage('notice')} style={{ marginTop: 16 }}>
                  Start a new grill
                </button>
              </div>
            )}
          </>
        )}

        {stage === 'notice' && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h2 className="modal-title">Before you start</h2>
              <p className="modal-text">
                This is a demo project, not a real fundraising tool. You get 2 pitch sessions per account, so make
                them count. Answer as clearly and specifically as you would in a real pitch. the panel grades and
                fact-checks what you actually say. You can leave and come back anytime; your session picks up right
                where you left off.
              </p>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setStage('ready')}>
                  Not now
                </button>
                <button className="btn btn-primary" onClick={() => setStage('permission')}>
                  I understand.. let's start
                </button>
              </div>
            </div>
          </div>
        )}

        {stage === 'permission' && (
          <div className="ready-card">
            <p className="ready-card-eyebrow">Optional</p>
            <h2 className="ready-card-title">Enable your microphone</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13.5, marginTop: 6, lineHeight: 1.6 }}>
              Answer out loud, just like a real pitch meeting. You can always type instead. this is entirely
              optional.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={requestMic} disabled={permissionChecking}>
                {permissionChecking ? 'Requesting…' : 'Enable microphone'}
              </button>
              <button className="btn btn-secondary" onClick={() => setStage('form')}>
                I'll type my answers
              </button>
            </div>
          </div>
        )}

        {stage === 'form' && (
          <>
            <h1 className="page-title">Pitch your idea</h1>
            <p className="page-subtitle">Give the panel the basics. they'll dig into the rest live.</p>

            {formApiError && <div className="banner banner-error">{formApiError}</div>}

            <form onSubmit={handleCreateSession} className="pitch-form" noValidate>
              <div className="form-grid">
                <div className="field">
                  <label className="field-label" htmlFor="startup_name">
                    Startup name<span style={{ color: 'var(--color-danger)', marginLeft: 3 }}>*</span>
                  </label>
                  <input
                    id="startup_name"
                    className={`input ${formErrors.startup_name ? 'has-error' : ''}`}
                    value={form.startup_name}
                    onChange={(e) => updateForm('startup_name', e.target.value)}
                  />
                  {formErrors.startup_name && <p className="field-error">{formErrors.startup_name}</p>}
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="sector">
                    Sector<span style={{ color: 'var(--color-danger)', marginLeft: 3 }}>*</span>
                  </label>
                  <select id="sector" className="select" value={form.sector} onChange={(e) => updateForm('sector', e.target.value)}>
                    {SECTORS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="stage_select">
                    Stage<span style={{ color: 'var(--color-danger)', marginLeft: 3 }}>*</span>
                  </label>
                  <select
                    id="stage_select"
                    className="select"
                    value={form.stage}
                    onChange={(e) => updateForm('stage', e.target.value)}
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="funding_ask">
                    Funding ask ($)<span style={{ color: 'var(--color-danger)', marginLeft: 3 }}>*</span>
                  </label>
                  <input
                    id="funding_ask"
                    type="number"
                    min="1"
                    className={`input ${formErrors.funding_ask ? 'has-error' : ''}`}
                    value={form.funding_ask}
                    onChange={(e) => updateForm('funding_ask', e.target.value)}
                  />
                  {formErrors.funding_ask && <p className="field-error">{formErrors.funding_ask}</p>}
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="equity_offered">
                    Equity offered (%)
                  </label>
                  <input
                    id="equity_offered"
                    type="number"
                    min="0"
                    max="100"
                    className={`input ${formErrors.equity_offered ? 'has-error' : ''}`}
                    value={form.equity_offered}
                    onChange={(e) => updateForm('equity_offered', e.target.value)}
                    placeholder="Optional"
                  />
                  {formErrors.equity_offered && <p className="field-error">{formErrors.equity_offered}</p>}
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="max_rounds">
                    Session length<span style={{ color: 'var(--color-danger)', marginLeft: 3 }}>*</span>
                  </label>
                  <select
                    id="max_rounds"
                    className="select"
                    value={form.max_rounds}
                    onChange={(e) => updateForm('max_rounds', e.target.value)}
                  >
                    {ROUND_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n} questions
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="pitch_text">
                  Your pitch<span style={{ color: 'var(--color-danger)', marginLeft: 3 }}>*</span>
                </label>
                <textarea
                  id="pitch_text"
                  className={`textarea ${formErrors.pitch_text ? 'has-error' : ''}`}
                  style={{ minHeight: 140 }}
                  placeholder="What does it do, who's it for, what traction do you have so far…"
                  value={form.pitch_text}
                  maxLength={PITCH_MAX_LENGTH}
                  onChange={(e) => updateForm('pitch_text', e.target.value)}
                />
                <div className="dock-footer">
                  <span>{formErrors.pitch_text || `At least ${PITCH_MIN_LENGTH} characters.`}</span>
                  <span className={form.pitch_text.length > PITCH_MAX_LENGTH * 0.9 ? 'char-count warn' : 'char-count'}>
                    {form.pitch_text.length}/{PITCH_MAX_LENGTH}
                  </span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={formSubmitting} style={{ marginTop: 8 }}>
                {formSubmitting ? 'Starting…' : 'Start the grill'}
              </button>
            </form>
          </>
        )}
      </div>

      <style>{`
        .page-shell {
          max-width: 720px;
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
          line-height: 1.5;
        }
        .ready-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 32px;
        }
        .ready-card-eyebrow {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-accent);
          margin-bottom: 8px;
        }
        .ready-card-title {
          font-size: 21px;
        }
        .ready-card-meta {
          font-size: 12.5px;
          color: var(--color-text-faint);
          margin-top: 6px;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: grid;
          place-items: center;
          z-index: 50;
          padding: 24px;
        }
        .modal-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 32px;
          max-width: 460px;
          box-shadow: var(--shadow-panel);
        }
        .modal-title {
          font-size: 20px;
          margin-bottom: 14px;
        }
        .modal-text {
          font-size: 13.5px;
          line-height: 1.65;
          color: var(--color-text-muted);
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 24px;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 18px;
        }
        .form-grid .field {
          margin-bottom: 18px;
        }
        @media (max-width: 560px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Layout>
  );
}