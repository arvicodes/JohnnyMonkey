// Zentrale API-Utility für alle API-Aufrufe mit Login-Code Header

// API Base URL - Hardcodiert für Production
const API_BASE_URL = 'https://johnnymonkey.onrender.com';

export const apiCall = async (url: string, options: RequestInit = {}) => {
  const loginCode = localStorage.getItem('loginCode');
  if (!loginCode) {
    throw new Error('Kein Login-Code gefunden. Bitte melden Sie sich erneut an.');
  }

  // Vollständige URL erstellen
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const headers = {
    'Content-Type': 'application/json',
    'x-login-code': loginCode,
    ...options.headers,
  };

  return fetch(fullUrl, {
    ...options,
    headers,
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
