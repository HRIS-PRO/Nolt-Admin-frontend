/** Normalize staff role strings from API/session (handles casing and spacing). */
export function normalizeStaffRole(role?: string | null): string {
  return (role ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function isSuperAdminRole(role?: string | null): boolean {
  const normalized = normalizeStaffRole(role);
  return normalized === 'super_admin' || normalized === 'superadmin';
}
