/**
 * API base for browser requests.
 * Empty string → same-origin `/api` and `/auth` (hosting rewrites → APIM).
 */
export function apiBase(): string {
  const configured = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '').trim();

  if (import.meta.env.VITE_USE_LOCAL_PROXY === 'true') {
    return '';
  }

  // Retired Railway URL left in Amplify/Vercel env — ignore and use hosting proxy.
  if (configured.includes('railway.app')) {
    return '';
  }

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  // Production builds with no explicit backend use same-origin rewrites (Amplify/Vercel).
  if (import.meta.env.PROD) {
    return '';
  }

  return '';
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${apiBase()}${normalized}`;
}
