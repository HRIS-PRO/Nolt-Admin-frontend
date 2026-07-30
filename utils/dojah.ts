import { DOJAH_IDENTITY_BASE_URL, DOJAH_WIDGET_ID } from '../constants/dojah';

export type DojahWidgetMessage = {
  raw: unknown;
  parsed: unknown;
  origin?: string;
  kind: 'success' | 'flow_complete' | 'unknown';
  referenceId?: string;
  selfieUrl?: string;
};

const DOJAH_ORIGINS = ['https://dojah.io', 'https://identity.dojah.io'];

function isDojahOrigin(origin?: string): boolean {
  if (!origin) return true;
  if (origin === 'null' || origin === '') return true;
  return DOJAH_ORIGINS.some((o) => origin === o || origin.endsWith('.dojah.io'));
}

function tryParseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractReferenceId(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const d = data as Record<string, unknown>;
  const nested = d.data && typeof d.data === 'object' ? (d.data as Record<string, unknown>) : null;
  const ref = d.reference_id ?? nested?.reference_id ?? d.referenceId ?? nested?.referenceId;
  return typeof ref === 'string' ? ref : undefined;
}

function extractSelfieUrl(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const d = data as Record<string, unknown>;
  const nested = d.data && typeof d.data === 'object' ? (d.data as Record<string, unknown>) : null;
  const url = d.selfie_url ?? nested?.selfie_url ?? d.selfieUrl ?? nested?.selfieUrl;
  return typeof url === 'string' ? url : undefined;
}

function classify(data: unknown): DojahWidgetMessage['kind'] {
  if (data === 'success') return 'success';
  if (!data || typeof data !== 'object') return 'unknown';
  const d = data as Record<string, unknown>;

  const isDefiniteSuccess =
    d.type === 'success' ||
    d.status === 'success' ||
    d.status === 'completed' ||
    d.status === 'verified' ||
    d.event === 'success' ||
    d.event === 'verification_success' ||
    d.verification_status === 'Completed';

  if (isDefiniteSuccess) return 'success';

  const isFlowComplete =
    d.type === 'close' ||
    d.type === 'submitted' ||
    d.status === 'submitted' ||
    d.status === 'close' ||
    d.event === 'close' ||
    d.event === 'submitted' ||
    d.action === 'close' ||
    d.action === 'submitted';

  if (isFlowComplete) return 'flow_complete';
  return 'unknown';
}

export function parseDojahWidgetPayload(raw: unknown, origin?: string): DojahWidgetMessage | null {
  if (raw == null || raw === '') return null;

  let parsed = tryParseJson(raw);
  if (typeof parsed === 'string') parsed = tryParseJson(parsed);

  const envelope =
    parsed && typeof parsed === 'object' && 'data' in (parsed as object) && 'source' in (parsed as object)
      ? (parsed as { source?: string; origin?: string; data?: unknown }).data
      : parsed;

  const effectiveOrigin =
    origin ??
    (parsed && typeof parsed === 'object' && 'origin' in (parsed as object)
      ? String((parsed as { origin?: string }).origin ?? '')
      : undefined);

  if (effectiveOrigin && !isDojahOrigin(effectiveOrigin)) return null;

  const kind = classify(envelope);
  return {
    raw,
    parsed: envelope,
    origin: effectiveOrigin,
    kind,
    referenceId: extractReferenceId(envelope),
    selfieUrl: extractSelfieUrl(envelope),
  };
}

export function buildDojahWidgetUrl(input: {
  referenceId: string;
  bvn: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  dob?: string;
  userId?: string | number;
}): string {
  const params = new URLSearchParams();
  params.set('widget_id', DOJAH_WIDGET_ID);
  params.set('gov_data[bvn]', input.bvn);
  params.set('reference_id', input.referenceId);

  if (input.firstName) params.set('user_data[first_name]', input.firstName);
  if (input.middleName) params.set('user_data[middle_name]', input.middleName);
  if (input.lastName) params.set('user_data[last_name]', input.lastName);
  if (input.email) params.set('user_data[email]', input.email);
  if (input.dob) params.set('user_data[dob]', input.dob);
  if (input.userId != null) params.set('metadata[user_id]', String(input.userId));

  return `${DOJAH_IDENTITY_BASE_URL}?${params.toString()}`;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll backend until Dojah webhook/API confirms completion. */
export async function pollDojahCompletion(
  referenceId: string,
  fetchStatus: (referenceId: string) => Promise<{ completed?: boolean; pending?: boolean }>,
  options?: { attempts?: number; delayMs?: number },
): Promise<boolean> {
  const attempts = options?.attempts ?? 8;
  const delayMs = options?.delayMs ?? 1500;

  for (let i = 0; i < attempts; i += 1) {
    const status = await fetchStatus(referenceId);
    if (status.completed) return true;
    if (i < attempts - 1) await sleep(delayMs);
  }
  return false;
}
