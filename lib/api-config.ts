/** Production admin API gateway (AWS EB behind APIM). */
export const APIM_ADMIN_URL = 'https://apim.noltfinance.com/api/admin';

/**
 * API base for browser requests.
 * Local dev with VITE_USE_LOCAL_PROXY=true → same-origin /api and /auth (Vite proxy).
 * Production on Amplify → APIM directly (hosting rewrites do not proxy /auth reliably).
 */
export function apiBase(): string {
  const configured = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '').trim();

  if (import.meta.env.VITE_USE_LOCAL_PROXY === 'true') {
    return '';
  }

  if (configured.includes('railway.app')) {
    return APIM_ADMIN_URL;
  }

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (import.meta.env.PROD) {
    return APIM_ADMIN_URL;
  }

  return '';
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${apiBase()}${normalized}`;
}
