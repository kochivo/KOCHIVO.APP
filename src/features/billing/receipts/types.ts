export const receiptMethods = ['instapay', 'vodafone_cash', 'cash', 'bank_transfer'] as const;
export type ReceiptMethod = typeof receiptMethods[number];
export type PaymentReceipt = {
  id: string; player_id: string; captain_id: string; renewal_request_id: string | null;
  amount_egp: number; method: ReceiptMethod | null; photo_path: string;
  status: 'pending' | 'accepted' | 'declined'; decline_reason: string | null; revision: number;
  created_at: string; decided_at: string | null;
};
export type ReceiptReview = PaymentReceipt & { name: string; url: string; packageName: string | null; frozenAt: string | null; debt?: number };
export type UploadedReceipt = { id: string; amount: number; method: ReceiptMethod | null; photo: string };
