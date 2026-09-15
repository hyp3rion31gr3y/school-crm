const BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';

export function getToken() {
  return localStorage.getItem('school_crm_token') || '';
}

export function setToken(token) {
  if (token) localStorage.setItem('school_crm_token', token);
  else localStorage.removeItem('school_crm_token');
}

export async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}
