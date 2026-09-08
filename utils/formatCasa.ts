/** Normalize CASA for display (strip decimal artifacts from numeric DB columns). */
export function formatCasa(value: unknown): string {
    if (value == null || value === '') return '';
    const raw = String(value).trim();
    if (!raw) return '';
    return raw.split('.')[0];
}

export function formatCasaLabel(value: unknown, fallback = '—'): string {
    const formatted = formatCasa(value);
    return formatted || fallback;
}
