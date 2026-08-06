/** Pull selfie URL from Dojah SDK success / webhook payload shapes. */
export function extractDojahSelfieUrl(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;

  const payload = data as Record<string, unknown>;

  const top = payload.selfie_url;
  if (typeof top === 'string' && top.startsWith('http')) return top;

  const nested = payload.data as Record<string, unknown> | undefined;
  const selfie = nested?.selfie as { data?: { selfie_url?: string } } | undefined;
  const fromNested = selfie?.data?.selfie_url;
  if (typeof fromNested === 'string' && fromNested.startsWith('http')) return fromNested;

  return undefined;
}
