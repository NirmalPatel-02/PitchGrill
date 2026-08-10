import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { login, getMe } from '../api/auth';
import { extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate() {
    const next = {};
    if (!form.email.trim()) next.email = 'Email is required.';
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!form.password) next.password = 'Password is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { access_token } = await login(form.email.trim(), form.password);
      localStorage.setItem('pitchgrill_token', access_token);
      const me = await getMe();
      loginWithToken(access_token, me);
      navigate('/grill');
    } catch (err) {
      const message = extractErrorMessage(err);
      if (message.toLowerCase().includes('verify')) {
        navigate('/verify-otp', { state: { email: form.email.trim() } });
        return;
      }
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to pick up where you left off."
      footer={
        <>
          Don't have an account? <Link to="/register">Create one</Link>
        </>
      }
    >
      {apiError && <div className="banner banner-error">{apiError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <FormField label="Email" required htmlFor="email" error={errors.email}>
          <input
            id="email"
            type="email"
            className={`input ${errors.email ? 'has-error' : ''}`}
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            autoComplete="email"
            autoFocus
          />
        </FormField>

        <FormField label="Password" required htmlFor="password" error={errors.password}>
          <input
            id="password"
            type="password"
            className={`input ${errors.password ? 'has-error' : ''}`}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            autoComplete="current-password"
          />
        </FormField>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting} style={{ marginTop: 6 }}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  );
}
