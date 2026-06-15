import { io } from 'socket.io-client';

export const API = process.env.REACT_APP_API_URL || 'https://beanhunt-backend-production.up.railway.app';

// Token-based auth fallback for browsers that block third-party cookies
const TOKEN_KEY = 'beanhunt_auth_token';
export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch(e) {}
}
export function getAuthToken() {
  try { return localStorage.getItem(TOKEN_KEY) || null; } catch(e) { return null; }
}

export const socket = io(API, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

export async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getAuthToken();
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}
