/** Paystack publishable key from build-time env (Amplify/Vercel secrets — not committed). */
export function paystackPublicKey(): string {
  const key = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY?.trim();
  if (!key) {
    throw new Error('Paystack is not configured for this build.');
  }
  return key;
}
