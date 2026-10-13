import { isTurnstileConfigured } from '../components/security/TurnstileWidget';

export function canSubmitWithTurnstile(token: string | null): boolean {
    if (!isTurnstileConfigured()) return true;
    return Boolean(token);
}

export function withTurnstile<T extends Record<string, unknown>>(payload: T, token: string | null): T & { turnstileToken?: string } {
    if (!token) return payload;
    return { ...payload, turnstileToken: token };
}
