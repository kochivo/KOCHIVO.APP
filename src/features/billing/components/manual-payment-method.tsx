'use client';
import { methodKeys } from '../method-keys';
import type { PaymentMethod } from '../payment-methods';
import { PaymentMethodPicker } from './payment-method-picker';

export function ManualPaymentMethod({ value, onChange }: { value: PaymentMethod | null; onChange: (method: PaymentMethod | null) => void }) {
  return <PaymentMethodPicker optional methods={methodKeys.map((method, position) => ({ method, position, account_detail: null }))} value={value} onChange={onChange} />;
}
