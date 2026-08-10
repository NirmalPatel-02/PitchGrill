import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { register } from '../api/auth';
import { extractErrorMessage } from '../api/client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    age: '',
    company_name: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate() {
    const next = {};
    if (!form.full_name.trim()) next.full_name = 'Full name is required.';

    if (!form.email.trim()) next.email = 'Email is required.';
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address.';

    const ageNum = Number(form.age);
    if (!form.age) next.age = 'Age is required.';
    else if (!Number.isInteger(ageNum) || ageNum < 13 || ageNum > 120)
      next.age = 'Age must be between 13 and 120.';

    if (!form.password) next.password = 'Password is required.';
    else if (form.password.length < 8) next.password = 'Password must be at least 8 characters.';

    if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match.';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        age: Number(form.age),
        company_name: form.company_name.trim() || null,
        password: form.password,
      });
      navigate('/verify-otp', { state: { email: form.email.trim() } });
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Practice your pitch against an AI investor panel that fact-checks your claims live."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      {apiError && <div className="banner banner-error">{apiError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        {/* Responsive Grid Layout */}
        <div className="register-grid">
          <FormField label="Full name" required htmlFor="full_name" error={errors.full_name}>
            <input
              id="full_name"
              className={`input ${errors.full_name ? 'has-error' : ''}`}
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              autoComplete="name"
            />
          </FormField>

          <FormField label="Email" required htmlFor="email" error={errors.email}>
            <input
              id="email"
              type="email"
              className={`input ${errors.email ? 'has-error' : ''}`}
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              autoComplete="email"
            />
          </FormField>

          <FormField label="Age" required htmlFor="age" error={errors.age}>
            <input
              id="age"
              type="number"
              min="13"
              max="120"
              className={`input ${errors.age ? 'has-error' : ''}`}
              value={form.age}
              onChange={(e) => update('age', e.target.value)}
            />
          </FormField>

          <FormField label="Company name" htmlFor="company_name" hint="Optional">
            <input
              id="company_name"
              className="input"
              value={form.company_name}
              onChange={(e) => update('company_name', e.target.value)}
              autoComplete="organization"
            />
          </FormField>

          <FormField
            label="Password"
            required
            htmlFor="password"
            error={errors.password}
            hint={!errors.password ? 'At least 8 characters.' : undefined}
          >
            <input
              id="password"
              type="password"
              className={`input ${errors.password ? 'has-error' : ''}`}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              autoComplete="new-password"
            />
          </FormField>

          <FormField label="Confirm password" required htmlFor="confirmPassword" error={errors.confirmPassword}>
            <input
              id="confirmPassword"
              type="password"
              className={`input ${errors.confirmPassword ? 'has-error' : ''}`}
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              autoComplete="new-password"
            />
          </FormField>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting} style={{ marginTop: 12 }}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}