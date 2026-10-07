import { SITE } from '@/lib/constants';

/**
 * Payments run on the website's backend (SITE.url): it holds the Snippe keys and receives the
 * signed webhook that marks an order paid. The app never sees a secret and never marks anything paid.
 */
export type PayKind = 'mobile' | 'card';
export type PayStatus = 'pending' | 'paid' | 'failed';

export async function startPayment(input: { orderNumber: string; email: string; kind: PayKind; phone: string; attemptId: string }):
  Promise<{ ok: true; paymentUrl: string | null } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${SITE.url}/api/payments/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const json = await res.json().catch(() => null);
    if (json?.ok) return { ok: true, paymentUrl: json.data?.paymentUrl ?? null };
    return { ok: false, error: json?.error ?? 'Could not start the payment' };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

export async function getPaymentStatus(orderNumber: string, email: string): Promise<PayStatus> {
  try {
    const q = `order=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`;
    const res = await fetch(`${SITE.url}/api/payments/status?${q}`, { cache: 'no-store' });
    const json = await res.json().catch(() => null);
    return json?.status === 'paid' || json?.status === 'failed' ? json.status : 'pending';
  } catch {
    return 'pending';
  }
}
