import client from './client';

export function register(payload) {
  // { email, password, age, full_name, company_name }
  return client.post('/auth/register', payload).then((res) => res.data);
}

export function verifyOtp(email, code) {
  return client.post('/auth/verify-otp', { email, code }).then((res) => res.data);
}

export function resendOtp(email) {
  return client.post('/auth/resend-otp', { email }).then((res) => res.data);
}

export function login(email, password) {
  return client.post('/auth/login', { email, password }).then((res) => res.data);
}

export function getMe() {
  return client.get('/auth/me').then((res) => res.data);
}
