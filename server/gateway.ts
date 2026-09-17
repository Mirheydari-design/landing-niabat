/**
 * Ziarat Home Dedicated Payment Gateway Module
 * Protocols per section 7:
 * - Gateway URL: https://ziarathome.ir/pay (or process.env.PAY_GATEWAY_URL)
 * - Method: Redirect with GET
 * - Currency: Toman (All numbers must be integer Toman)
 * - Success statuses: 'Paid' or 'Active' (case-insensitive)
 * - NO API keys or secrets
 */

export const PAID_STATUSES = ['Paid', 'Active'];

export interface GatewayUrlParams {
  name: string;
  phone: string;
  callbackUrl: string;
  entryId: string;
  merchantDomain: string;
  amountToman: number;
}

/**
 * Builds the official Ziarat Home payment redirect URL.
 * Uses encodeURIComponent (never URLSearchParams) so Persian text and & within ref are safely encoded.
 */
export function buildGatewayUrl({
  name,
  phone,
  callbackUrl,
  entryId,
  merchantDomain,
  amountToman
}: GatewayUrlParams): string {
  const base = process.env.PAY_GATEWAY_URL || 'https://ziarathome.ir/pay';
  const q = [
    ['nm', name],
    ['phone', phone],
    ['ref', callbackUrl],
    ['entryid', entryId],
    ['ma', merchantDomain], // From process.env.MERCHANT_DOMAIN
    ['donation', String(Math.round(amountToman))]
  ]
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v ?? ''))}`)
    .join('&');

  return `${base}?${q}`;
}

export interface CallbackOutcome {
  outcome: 'paid' | 'already_paid' | 'failed' | 'amount_mismatch';
  reason?: string;
  reportedAmount?: number;
  expectedAmount?: number;
  transactionId?: string | null;
  paidAt?: string | null;
}

/**
 * Interprets the GET return parameters sent by the gateway to the ref callback.
 * Idempotent: if the order is already settled as paid, returns outcome: 'already_paid'.
 * Checks case-insensitive status for 'Paid' or 'Active'.
 * Verifies reported amount matches the recorded order amount.
 */
export function interpretCallback(
  params: Record<string, any>,
  order: { entry_id: string; amount: number; status: string }
): CallbackOutcome {
  const reported = Number(params.amount);

  if (!params.entryid || params.entryid !== order.entry_id) {
    return { outcome: 'failed', reason: 'entryid_mismatch' };
  }

  if (order.status === 'paid') {
    return { outcome: 'already_paid' };
  }

  const status = String(params.status ?? '');
  const settled = PAID_STATUSES.some((s) => s.toLowerCase() === status.toLowerCase());

  if (!settled) {
    return { outcome: 'failed', reason: `status=${status || '(none)'}` };
  }

  if (!Number.isFinite(reported) || Math.round(reported) !== Math.round(order.amount)) {
    return {
      outcome: 'amount_mismatch',
      reportedAmount: reported,
      expectedAmount: order.amount
    };
  }

  return {
    outcome: 'paid',
    transactionId: params.transaction ? String(params.transaction) : null,
    paidAt: params.date ? String(params.date) : null
  };
}
