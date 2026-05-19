// src/utils/api.js
// API client pour le backend PFE ENSEM

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// ── Auth token (JWT admin) ─────────────────────────────────────────────────
// sessionStorage → token détruit automatiquement à la fermeture du navigateur
// Login obligatoire à chaque nouvelle session

export function getAdminToken() {
  return sessionStorage.getItem('pfe_admin_token');
}

export function setAdminToken(token) {
  sessionStorage.setItem('pfe_admin_token', token);
}

export function clearAdminToken() {
  sessionStorage.removeItem('pfe_admin_token');
}

function authHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Chat ───────────────────────────────────────────────────────────────────
export async function sendMessage(question, sessionId, lang = 'fr') {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, sessionId, lang }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

// ── Q/R publiques (questions populaires) ─────────────────────────────────
export async function getQA() {
  const res = await fetch(`${BASE_URL}/qa`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur');
  return data;
}

// ── Admin Auth ─────────────────────────────────────────────────────────────
export async function adminLogin(email, password) {
  const res = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Identifiants incorrects');
  return data;
}

// ── Admin CRUD Q/R ─────────────────────────────────────────────────────────
export async function adminGetQA() {
  const res = await fetch(`${BASE_URL}/admin/qa`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur');
  return data;
}

export async function adminAddQA(qa) {
  const res = await fetch(`${BASE_URL}/admin/qa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(qa),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur');
  return data;
}

export async function adminUpdateQA(id, qa) {
  const res = await fetch(`${BASE_URL}/admin/qa/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(qa),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur');
  return data;
}

export async function adminDeleteQA(id) {
  const res = await fetch(`${BASE_URL}/admin/qa/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur');
  return data;
}

export async function adminToggleFeatured(id, featured) {
  return adminUpdateQA(id, { featured });
}
