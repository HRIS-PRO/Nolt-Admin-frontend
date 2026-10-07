import type { UserState } from '../types';

/** Customer LMS: selfie + CASA must exist before dashboard (matches ProtectedRoute). */
export function isCustomerProfileComplete(
  profile?: { selfie_url?: string | null; casa?: string | null } | null,
): boolean {
  const selfie = profile?.selfie_url?.trim();
  const casa = profile?.casa?.trim();
  return Boolean(selfie && casa);
}

/** First route after login / onboarding for a customer session. */
export function customerPostAuthPath(user: Pick<UserState, 'role' | 'new_comer' | 'profile'>): string {
  if (user.role && user.role !== 'customer') return '/staff-dashboard';
  if (user.new_comer) return '/onboarding';
  if (!isCustomerProfileComplete(user.profile)) return '/profile';
  return '/dashboard';
}
