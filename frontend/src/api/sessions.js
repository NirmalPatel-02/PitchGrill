import client from './client';

export function createSession(payload) {
  // { startup_name, sector, stage, funding_ask, equity_offered, pitch_text, max_rounds }
  return client.post('/sessions', payload).then((res) => res.data);
}

export function submitAnswer(sessionId, answer) {
  return client.post(`/sessions/${sessionId}/answer`, { answer }).then((res) => res.data);
}

export function getSession(sessionId) {
  return client.get(`/sessions/${sessionId}`).then((res) => res.data);
}

export function listSessions() {
  return client.get('/sessions').then((res) => res.data);
}
