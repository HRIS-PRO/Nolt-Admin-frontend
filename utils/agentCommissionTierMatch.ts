export type AgentCommissionTier = {
    id: number;
    tier_name: string;
    min_investment: number;
    max_investment: number | null;
    tenure_days: number;
    commission_percent: number;
    status: 'active' | 'inactive';
    description: string | null;
};

export function parseTierFromApi(row: Record<string, unknown>): AgentCommissionTier {
    const num = (v: unknown) => (typeof v === 'number' ? v : Number(v));
    return {
        id: num(row.id),
        tier_name: String(row.tier_name ?? ''),
        min_investment: num(row.min_investment),
        max_investment: row.max_investment == null ? null : num(row.max_investment),
        tenure_days: num(row.tenure_days),
        commission_percent: num(row.commission_percent),
        status: row.status === 'inactive' ? 'inactive' : 'active',
        description: row.description == null ? null : String(row.description),
    };
}

function amountInRange(amount: number, min: number, max: number | null): boolean {
    if (amount < min) return false;
    if (max == null) return true;
    return amount <= max;
}

export function matchAgentCommissionTier(
    tiers: AgentCommissionTier[],
    investmentAmount: number,
    tenureDays: number,
): AgentCommissionTier | null {
    if (!Number.isFinite(investmentAmount) || investmentAmount <= 0) return null;
    if (!Number.isInteger(tenureDays) || tenureDays <= 0) return null;

    const candidates = tiers.filter(
        (t) =>
            t.status === 'active' &&
            t.tenure_days === tenureDays &&
            amountInRange(investmentAmount, t.min_investment, t.max_investment),
    );

    candidates.sort((a, b) => {
        const spanA = (a.max_investment ?? Number.POSITIVE_INFINITY) - a.min_investment;
        const spanB = (b.max_investment ?? Number.POSITIVE_INFINITY) - b.min_investment;
        if (spanA !== spanB) return spanA - spanB;
        if (a.min_investment !== b.min_investment) return b.min_investment - a.min_investment;
        return a.id - b.id;
    });

    return candidates[0] ?? null;
}

export function formatTenureLabel(days: number): string {
    if (days === 30) return '30 Days (1 Month)';
    if (days === 60) return '60 Days (2 Months)';
    if (days === 90) return '90 Days (3 Months)';
    if (days === 180) return '180 Days (6 Months)';
    return `${days} Days`;
}

export function formatNaira(amount: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
}

export function simulateCommission(
    tiers: AgentCommissionTier[],
    investmentAmount: number,
    tenureDays: number,
): {
    matched: boolean;
    tier: AgentCommissionTier | null;
    commission_rate: number;
    commission_payout: number;
    message: string;
} {
    const tier = matchAgentCommissionTier(tiers, investmentAmount, tenureDays);
    if (!tier) {
        return {
            matched: false,
            tier: null,
            commission_rate: 0,
            commission_payout: 0,
            message: `No active tier matches ${formatNaira(investmentAmount)} for ${tenureDays} days.`,
        };
    }

    const commission_rate = tier.commission_percent;
    const commission_payout = Math.round((investmentAmount * commission_rate) / 100 * 100) / 100;
    const tenureLabel = formatTenureLabel(tenureDays);

    return {
        matched: true,
        tier,
        commission_rate,
        commission_payout,
        message: `Mapped to '${tier.tier_name}': ${commission_rate}% of ${formatNaira(investmentAmount)} for ${tenureDays} days tenor. Matched Tier: ${tier.tier_name} (${tenureLabel})`,
    };
}
