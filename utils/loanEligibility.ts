export const DEFAULT_REJECTION_COOLDOWN_DAYS = 30;
export const MAX_REJECTION_COOLDOWN_DAYS = 730;

export const REJECTION_COOLDOWN_PRESETS: { value: number; label: string }[] = [
    { value: 0, label: 'No block — can reapply immediately' },
    { value: 7, label: '7 days' },
    { value: 14, label: '14 days' },
    { value: 30, label: '30 days (default)' },
    { value: 60, label: '60 days' },
    { value: 90, label: '90 days' },
    { value: 180, label: '180 days' },
];

export function resolveRejectionCooldownDays(preset: string, customDays: string): number | null {
    if (preset === 'custom') {
        const trimmed = customDays.trim();
        if (!trimmed) return null;
        const parsed = Number(trimmed);
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_REJECTION_COOLDOWN_DAYS) {
            return null;
        }
        return parsed;
    }
    const parsed = Number(preset);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_REJECTION_COOLDOWN_DAYS) {
        return null;
    }
    return parsed;
}

export type LoanEligibility = {
    allowed: boolean;
    block_type?: 'blacklist' | 'rejection_cooldown' | null;
    blocked_until?: string | null;
    reason?: string | null;
    message?: string | null;
};

export function canManageBlacklist(role?: string | null): boolean {
    const normalized = (role ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    return ['super_admin', 'superadmin', 'customer_experience', 'sales_manager', 'admin'].includes(normalized);
}

export function formatEligibilityUntil(until?: string | null): string {
    if (!until) return 'the restriction end date';
    const date = new Date(until);
    if (Number.isNaN(date.getTime())) return 'the restriction end date';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function getEligibilityBanner(eligibility?: LoanEligibility | null): { tone: 'red' | 'amber'; title: string; message: string } | null {
    if (!eligibility || eligibility.allowed) return null;

    if (eligibility.block_type === 'blacklist') {
        return {
            tone: 'red',
            title: 'Customer Blacklisted',
            message: eligibility.message
                || `This customer is blacklisted until ${formatEligibilityUntil(eligibility.blocked_until)}.${eligibility.reason ? ` Reason: ${eligibility.reason}` : ''}`,
        };
    }

    return {
        tone: 'amber',
        title: 'Loan Application Cooldown Active',
        message: eligibility.message
            || `This customer cannot apply for a new loan until ${formatEligibilityUntil(eligibility.blocked_until)} because a recent application was rejected.`,
    };
}
