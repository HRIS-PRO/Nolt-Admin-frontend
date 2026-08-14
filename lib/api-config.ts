/** Production admin API gateway (AWS EB behind APIM). */
export const APIM_ADMIN_URL = 'https://apim.noltfinance.com/api/admin';

/**
 * API base for browser requests.
 * VITE_USE_LOCAL_PROXY=true → same-origin /api and /auth (Vite dev proxy or Amplify rewrites).
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

  return '';
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${apiBase()}${normalized}`;
}
