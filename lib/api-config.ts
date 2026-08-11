/**
 * API base for browser requests.
 * Empty string → same-origin `/api` and `/auth` (Vite dev proxy → localhost:5000).
 */
export function apiBase(): string {
  if (import.meta.env.VITE_USE_LOCAL_PROXY === 'true') {
    return '';
  }
  return import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '';
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${apiBase()}${normalized}`;
}
