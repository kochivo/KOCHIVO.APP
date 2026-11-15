'use client';
import { useResource } from '@/core/resource';
import { useT } from '@/core/i18n/client';
import { loadPaymentMethods, methodKeys } from '@/features/billing';
import { messages } from '../payment-methods/messages';
import { PaymentMethodRow } from './payment-method-row';
import { Button } from '@/ui/button';

export function PaymentMethodsCard() {
  const t = useT(messages);
  const resource = useResource('settings:payment-methods', loadPaymentMethods, { staleMs: 0 });
  const result = resource.data;
  return <section className="glass rounded-card border border-line-soft px-page-x py-page-y">
    <h2 className="mb-inline font-display text-title font-semibold">{t('title')}</h2>
    {resource.error || result?.error ? <div role="alert"><p>{t('error')}</p>
      <Button type="button" variant={'secondary'} block={false} className={"min-h-12 px-page-x"} onClick={() => void resource.retry()}>{t('retry')}</Button></div>
      : !result?.data ? <p role="status" className="text-sm text-muted">{t('loading')}</p>
        : <>{!result.data.length && <p className="text-xs text-faint">{t('empty')}</p>}
          {methodKeys.map((method, position) => {
            const initial = result.data.find(row => row.method === method);
            return <PaymentMethodRow key={`${method}:${initial?.account_detail ?? ''}:${Boolean(initial)}`} method={method} position={position} initial={initial}
              onSaved={(row, enabled) => { void resource.mutate(current => ({ error: false,
                data: [...(current?.data ?? []).filter(item => item.method !== row.method), ...(enabled ? [row] : [])],
              }), async () => {}); }} />;
          })}</>}
  </section>;
}
