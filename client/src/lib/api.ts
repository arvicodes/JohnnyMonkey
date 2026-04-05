// Zentrale API-Utility für alle API-Aufrufe mit Login-Code Header

/**
 * Leer = relative URLs (gleiche Origin wie die SPA: lokaler Build, Docker, Render, …).
 * Nur setzen, wenn die API auf einem anderen Host liegt: REACT_APP_API_BASE_URL=https://…
 * (Eine fest eingetragene Production-URL brach alle anderen Installationen.)
 */
function getApiBaseUrl(): string {
  const raw = typeof process !== 'undefined' ? process.env.REACT_APP_API_BASE_URL : undefined;
  if (raw != null && String(raw).trim() !== '') return String(raw).replace(/\/$/, '');
  return '';
}

export const apiCall = async (url: string, options: RequestInit = {}) => {
  const loginCode = localStorage.getItem('loginCode');
  if (!loginCode) {
    throw new Error('Kein Login-Code gefunden. Bitte melden Sie sich erneut an.');
  }

  const base = getApiBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${base}${url}`;

  const headers = {
    'Content-Type': 'application/json',
    'x-login-code': loginCode,
    ...options.headers,
  };

  return fetch(fullUrl, {
    ...options,
    headers,
    /** Sonst kann der Browser GET /api/… zwischenspeichern — Polling sieht nie neue Daten (z. B. Entry Ticket). */
    cache: options.cache ?? 'no-store',
  });
};

// Spezielle API-Funktionen für häufige Aufrufe
export const apiGet = (url: string) => apiCall(url, { method: 'GET' });
export const apiPost = (url: string, data?: any) => apiCall(url, { 
  method: 'POST', 
  body: data ? JSON.stringify(data) : undefined 
});
export const apiPut = (url: string, data?: any) => apiCall(url, { 
  method: 'PUT', 
  body: data ? JSON.stringify(data) : undefined 
});
export const apiDelete = (url: string) => apiCall(url, { method: 'DELETE' });

/** GET ohne Exception bei fehlendem Login (Polling, Hintergrund). */
export async function apiGetSafe(url: string): Promise<Response | null> {
  const loginCode = localStorage.getItem('loginCode')?.trim();
  if (!loginCode) return null;
  const base = getApiBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${base}${url}`;
  return fetch(fullUrl, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'x-login-code': loginCode },
    cache: 'no-store',
  });
}

/** POST Fire-and-forget, ohne throw (z. B. Entry-Ticket-Signal für Lehrkräfte). */
export function apiPostSafe(url: string, data?: unknown): void {
  const loginCode = localStorage.getItem('loginCode')?.trim();
  if (!loginCode) return;
  const base = getApiBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${base}${url}`;
  void fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-login-code': loginCode },
    body: data !== undefined ? JSON.stringify(data) : undefined,
    cache: 'no-store',
  }).catch(() => {});
}

// Hilfsfunktion zum Überprüfen des Login-Status
export const isLoggedIn = () => {
  return !!localStorage.getItem('loginCode');
};

// Hilfsfunktion zum Abrufen der Benutzerrolle
export const getUserRole = () => {
  if (localStorage.getItem('teacherId')) return 'TEACHER';
  if (localStorage.getItem('studentId')) return 'STUDENT';
  return null;
};
