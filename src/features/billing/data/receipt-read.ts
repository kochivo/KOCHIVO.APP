import 'server-only';
import { captainClient } from './client';
import { receiptClient } from './receipt-client';

export async function fetchPendingPaymentReceipts() {
  const { client, captainId } = await captainClient();
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const result = await receiptClient(client).from('payment_receipts').select('*')
      .eq('captain_id', captainId).eq('status', 'pending').order('created_at').order('id').range(offset, offset + 499);
    if (result.error) throw result.error;
    rows.push(...result.data);
    if (result.data.length < 500) return rows;
  }
}
