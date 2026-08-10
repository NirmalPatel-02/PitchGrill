import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { verifyOtp, resendOtp, getMe } from '../api/auth';
import { extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const RESEND_COOLDOWN = 30;

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const emailFromState = location.state?.email || '';
  const [email, setEmail] = useState(emailFromState);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function handleDigitChange(index, value) {
    const clean = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.split('');
    while (next.length < 6) next.push('');
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    const code = digits.join('');

    if (!email.trim()) {
      setError('Enter the email you registered with.');
      return;
    }
    if (code.length !== 6) {
      setError('Enter the full 6-digit code.');
      return;
    }

    setSubmitting(true);
    try {
      const { access_token } = await verifyOtp(email.trim(), code);
      localStorage.setItem('pitchgrill_token', access_token);
      const me = await getMe();
      loginWithToken(access_token, me);
      navigate('/grill');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter your email first.');
      return;
    }
    try {
      await resendOtp(email.trim());
      setNotice('A new code has been sent.');
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={`Enter the 6-digit code we sent${email ? ` to ${email}` : ''}.`}
      footer={
        <>
          Wrong email? <Link to="/register">Start over</Link>
        </>
      }
    >
      {error && <div className="banner banner-error">{error}</div>}
      {notice && <div className="banner banner-success">{notice}</div>}

      <form onSubmit={handleSubmit} noValidate>
        {!emailFromState && (
          <div className="field" style={{ marginBottom: 18 }}>
            <label className="field-label" htmlFor="otp-email">
              Email<span style={{ color: 'var(--color-danger)', marginLeft: 3 }}>*</span>
            </label>
            <input
              id="otp-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ marginTop: 6 }}
            />
          </div>
        )}

        <div className="otp-row">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              className="otp-digit"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              autoFocus={i === 0}
            />
          ))}
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting} style={{ marginTop: 22 }}>
          {submitting ? 'Verifying…' : 'Verify & continue'}
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={handleResend}
          disabled={cooldown > 0}
          style={{ marginTop: 10 }}
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
      </form>

      <style>{`
        .otp-row {
          display: flex;
          gap: 10px;
          justify-content: space-between;
        }
        .otp-digit {
          width: 46px;
          height: 54px;
          text-align: center;
          font-family: var(--font-mono);
          font-size: 22px;
          font-weight: 600;
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text);
        }
        .otp-digit:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px var(--color-accent-soft);
        }
      `}</style>
    </AuthLayout>
  );
}
