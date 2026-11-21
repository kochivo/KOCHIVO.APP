import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { formatDateAr, formatTimestampAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { ProgressBar } from '@/ui/progress-bar';
import { messages, workspaceMessages } from '../messages';
import { messages as financeMessages } from '../workspace/messages';
import { messages as methodMessages } from '../methods/messages';
import { messages as paymentMessages } from '../payments/messages';
import { messages as catalogMessages } from '../tiers/messages';
import { durationLabel } from '../package-choice';
import type { PaymentRow } from './workspace-billing-summary';

export function WorkspaceBillingPaymentRow({ row, onOpen }: { row: PaymentRow; onOpen: () => void }) {
  const t = useT(workspaceMessages), legacy = useT(messages), finance = useT(financeMessages), methods = useT(methodMessages);
  const paymentT = useT(paymentMessages), locale = useLocale(), timezone = useTimezone();
  const catalog = useT(catalogMessages);
  const { player, chosen, total, paid, method, hasPackage, fullyPaid, action, ending, trial } = row;
  const payment = player.lastPayment;
  const number = (value: number) => formatNumber(value, locale);
  const dateOptions = { day: 'numeric', month: 'long' } as const;
  const date = (value: string) => formatDateAr(value, dateOptions, locale);
  const duration = payment && payment.days > 0 && chosen?.kind !== 'sessions' ? durationLabel(payment.days, catalog, locale) : null;
  const packageLabel = hasPackage ? [chosen?.name, duration].filter(Boolean).join(' · ') || t('dash') : t('noPackage');
  const hasCollection = (payment?.collected_egp ?? 0) > 0;
  const lastDate = payment && !hasCollection && formatTimestampAr(payment.created_at, dateOptions, locale, timezone);
  const lastPayment = lastDate ? method === 'unset' ? lastDate : t('paymentOn', { method: methods(method), date: lastDate })
    : payment ? method === 'unset' ? t('dash') : methods(method) : legacy('noPayments');
  const [status, tone] = player.frozenAt ? [finance('frozen'), 'tone-neutral']
    : player.pending ? [finance('pending'), 'tone-neutral']
      : player.due > 0 ? [t('balance', { amount: number(player.due) }), 'tone-warn']
        : !hasPackage && player.sessionsLeft !== 0 ? [t('noPackage'), 'tone-neutral']
          : player.awaitingPlansAt ? [finance('waitingForPlans'), 'tone-info']
            : player.sessionsLeft === 0 ? [paymentT('sessionsEnded'), 'tone-warn']
              : trial ? [t('trial'), 'tone-info']
                : ending ? [t('soon'), 'tone-warn']
                : fullyPaid ? [t('fullyPaid'), 'tone-lime']
                  : total === null ? [t('confirmed'), 'tone-neutral']
                    : [t(paid > 0 ? 'partial' : 'unpaid'), 'tone-warn'];
  const actionLabel = action === 'history' ? t('payments')
    : action === 'activate' || (action === 'renew' && !hasPackage) ? t('setPackage') : paymentT('record');
  const cell = 'min-w-0 min-[1024px]:px-card min-[1024px]:py-stack';
  return <tr className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-stack border-t border-line-soft px-card py-stack min-[1024px]:table-row">
    <td className={cell}>
      <div className="flex items-center gap-stack">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-raised font-bold">{player.fullName.slice(0, 1)}</span>
        <div className="min-w-0"><b className="block wrap-break-word">{player.fullName}</b>
          <small className="block wrap-break-word text-xs text-faint">{packageLabel}</small></div>
      </div>
    </td>
    <td className={cell}>
      {trial ? <span className="text-faint">{t('trial')}</span> : total === null ? <span className="text-faint">{t('dash')}</span> : <>
        <p className="font-display font-bold tabular-nums">{number(paid)} <span className="text-xs text-faint">{t('paidOf', { total: number(total) })}</span></p>
        <ProgressBar thin value={total === 0 ? 1 : paid} max={total || 1}
          aria-label={t('paidProgress', { paid: number(paid), total: number(total) })}
          className={fullyPaid ? 'mt-inline' : 'mt-inline [&>div]:bg-warn [&>div]:bg-none'} />
      </>}
    </td>
    <td className={cell}><span className={`inline-flex rounded-md px-inline text-micro font-semibold ${tone}`}>{status}</span>
      {player.sessionsLeft === 0 && player.due > 0 && !player.frozenAt && !player.pending &&
        <small className="block text-xs text-faint">{paymentT('sessionsEnded')}</small>}</td>
    <td className={`${cell} text-xs text-faint`}>{hasPackage
      ? <time dateTime={player.accessUntil}>{t('endsOn', { date: date(player.accessUntil) })}</time>
      : <time dateTime={player.startedOn}>{t('startedOn', { date: date(player.startedOn) })}</time>}</td>
    <td className={`${cell} text-xs text-faint`}>{payment && lastDate ? <time dateTime={payment.created_at}>{lastPayment}</time> : lastPayment}</td>
    <td className={`${cell} text-end`}><Button variant="secondary" block={false} onClick={onOpen}>{actionLabel}</Button></td>
  </tr>;
}
