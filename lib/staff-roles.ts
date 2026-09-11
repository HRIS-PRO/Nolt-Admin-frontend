/** Normalize staff role strings from API/session (handles casing and spacing). */
export function normalizeStaffRole(role?: string | null): string {
  return (role ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function isSuperAdminRole(role?: string | null): boolean {
  const normalized = normalizeStaffRole(role);
  return normalized === 'super_admin' || normalized === 'superadmin';
}

export const INVESTMENT_ATTRIBUTION_ROLES = [
  'sales_officer',
  'sales_public_sector',
  'sales_private_sector',
  'agent',
] as const;

export function hasInvestmentAttributionScope(role?: string | null): boolean {
  const normalized = normalizeStaffRole(role);
  return (INVESTMENT_ATTRIBUTION_ROLES as readonly string[]).includes(normalized);
}

export function isAgentRole(role?: string | null): boolean {
  return hasInvestmentAttributionScope(role);
}

export function canViewAgentCommission(
  viewerRole?: string | null,
  viewerId?: number | string | null,
  salesOfficerId?: number | string | null,
): boolean {
  if (isSuperAdminRole(viewerRole)) return true;
  if (hasInvestmentAttributionScope(viewerRole)) {
    if (salesOfficerId == null || salesOfficerId === '') return false;
    return Number(viewerId) === Number(salesOfficerId);
  }
  return false;
}
