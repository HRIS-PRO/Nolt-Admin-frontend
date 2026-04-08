
export type InvestmentPlan = 'RISE' | 'SURGE' | 'VAULT';
export type PayoutFrequency = 'monthly' | 'quarterly' | 'maturity' | 'upfront';
export type Currency = 'NGN' | 'USD';

interface RateParams {
  amount: number;
  tenureDays: number;
  plan: InvestmentPlan;
  currency: Currency;
  payoutFrequency?: PayoutFrequency;
  promoBoost?: number;
}

export const calculateInvestmentRate = ({
  amount,
  tenureDays,
  plan,
  currency,
  payoutFrequency = 'maturity',
  promoBoost = 0
}: RateParams): number => {
  const days = tenureDays;

  if (currency === 'USD') {
    if (plan === 'VAULT') {
      if (amount < 50000) {
        if (days <= 90) return 3.5;
        if (days <= 180) return 4.0;
        return 5.0;
      } else {
        if (days <= 90) return 4.0;
        if (days <= 180) return 4.5;
        return 6.0;
      }
    }
    return 3.5;
  }

  // NGN Rates
  if (plan === 'SURGE') {
    if (amount <= 100000) return 15.0 + promoBoost;
    if (amount <= 5000000) return 18.0 + promoBoost;
    return 20.0 + promoBoost;
  }

  if (plan === 'RISE') {
    if (amount <= 100000) {
      if (days <= 90) return 18.0 + promoBoost;
      if (days <= 180) return 19.0 + promoBoost;
      return 20.0 + promoBoost;
    }
    if (amount <= 5000000) {
      if (days <= 90) return 19.0 + promoBoost;
      if (days <= 180) return 20.0 + promoBoost;
      return 21.0 + promoBoost;
    }
    if (amount <= 10000000) {
      if (days <= 90) return 21.0 + promoBoost;
      if (days <= 180) return 22.0 + promoBoost;
      return 23.0 + promoBoost;
    }
    if (days <= 90) return 22.0 + promoBoost;
    if (days <= 180) return 23.0 + promoBoost;
    return 24.0 + promoBoost;
  }

  if (plan === 'VAULT') {
    if (payoutFrequency === 'monthly') {
      if (amount <= 5000000) {
        if (days <= 90) return 19.0 + promoBoost;
        if (days <= 180) return 20.0 + promoBoost;
        return 22.0 + promoBoost;
      }
      if (amount <= 10000000) {
        if (days <= 90) return 19.5 + promoBoost;
        if (days <= 180) return 20.5 + promoBoost;
        return 22.5 + promoBoost;
      }
      if (amount <= 50000000) {
        if (days <= 90) return 20.0 + promoBoost;
        if (days <= 180) return 21.0 + promoBoost;
        return 23.0 + promoBoost;
      }
      if (days <= 90) return 20.5 + promoBoost;
      if (days <= 180) return 21.5 + promoBoost;
      return 24.5 + promoBoost;
    }
    if (payoutFrequency === 'quarterly') {
      if (amount <= 5000000) {
        if (days <= 180) return 20.0 + promoBoost;
        return 22.5 + promoBoost;
      }
      if (amount <= 10000000) {
        if (days <= 180) return 20.5 + promoBoost;
        return 23.0 + promoBoost;
      }
      if (amount <= 50000000) {
        if (days <= 180) return 21.0 + promoBoost;
        return 23.5 + promoBoost;
      }
      if (days <= 180) return 21.5 + promoBoost;
      return 25.0 + promoBoost;
    }
    // At Maturity / Base
    if (amount <= 1000000) return 18.0 + promoBoost;
    if (amount <= 5000000) return 20.0 + promoBoost;
    if (amount <= 10000000) return 22.0 + promoBoost;
    if (amount <= 50000000) return 24.0 + promoBoost;
    return 26.0 + promoBoost;
  }

  return 12.0; // Default fallback
};
