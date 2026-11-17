import type { Payment } from './types';

export function currentPayment(payment: Payment | null) {
  const paid = (payment?.amount_egp ?? 0) + (payment?.collected_egp ?? 0);
  const price = payment?.price_egp;
  const status = !payment ? 'noPayment' : paid <= 0 ? 'unpaid'
    : price != null && paid < price ? 'partial' : price != null ? 'fullyPaid' : 'confirmed';
  const method = paid <= 0 ? 'unset' : (payment?.collected_egp ?? 0) > 0
    ? payment?.collection_method ?? 'unset' : payment?.method ?? 'unset';
  return { paid, status, method } as const;
}
