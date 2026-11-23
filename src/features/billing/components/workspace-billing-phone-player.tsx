import { useLocale, useT } from '@/core/i18n/client';
import { daysBetween, formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { Button, buttonClass, clickableClass } from '@/ui/button';
import { messages, workspaceMessages } from '../messages';
import { messages as financeMessages } from '../workspace/messages';
import { messages as methodMessages } from '../methods/messages';
import { messages as paymentMessages } from '../payments/messages';
import { messages as phoneMessages } from '../phone/messages';
import { reminderText, waLink } from '../renew';
import type { PaymentRow } from './workspace-billing-summary';

export function WorkspaceBillingPhonePlayer({ row, today, onOpen }: {
  row: PaymentRow; today: string; onOpen: () => void;
}) {
  const locale = useLocale(), t = useT(phoneMessages), workspace = useT(workspaceMessages);
  const finance = useT(financeMessages), methodT = useT(methodMessages);
  const payment = useT(paymentMessages);
  const { player, method, paid, action, hasPackage, fullyPaid, ending, trial } = row;
  const days = daysBetween(today, player.accessUntil);
  const number = (value: number) => formatNumber(value, locale);
  const paidUp = fullyPaid && player.due === 0;
  const canRemind = ending && action === 'history' && !player.awaitingPlansAt && player.sessionsLeft !== 0;
  const reminder = canRemind && waLink(player.phone, reminderText(player.fullName, player.accessUntil, locale));
  const legacy = useT(messages);
  const usedUp = player.sessionsLeft === 0;
  const expiry = days < 0 && !usedUp && !player.frozenAt && !player.pending && !player.awaitingPlansAt
    && (hasPackage || player.due > 0)
    ? player.due > 0 && player.sessionsLeft == null ? payment('late', { n: -days, count: number(-days) }) : legacy('expired')
    : null;
  const paymentDetail = player.frozenAt ? finance('frozen')
    : player.pending ? finance('pending')
      : player.due > 0 ? workspace('balance', { amount: number(player.due) })
        : player.awaitingPlansAt ? finance('waitingForPlans')
          : usedUp ? payment('sessionsEnded')
            : !hasPackage ? workspace('noPackage')
              : trial ? workspace('trialEnds', { date: formatDateAr(player.accessUntil, { day: 'numeric', month: 'long' }, locale) })
              : ending ? t(days === 0 ? 'endingToday' : 'endingIn', { n: days, count: number(days) })
                : paidUp || paid > 0 ? [t('paidAmount', { amount: number(paid) }), method === 'unset' ? null : methodT(method)].filter(Boolean).join(' · ')
                  : workspace('unpaid');
  const usage = usedUp && player.due > 0 && !player.pending && !player.frozenAt ? payment('sessionsEnded') : null;
  const detail = [paymentDetail, usage, expiry].filter(Boolean).join(' · ');
  const showPaid = paidUp && !trial && action === 'history' && !canRemind && !player.frozenAt
    && !player.awaitingPlansAt && player.sessionsLeft !== 0;
  const actionLabel = action === 'activate' || (action === 'renew' && !hasPackage) ? workspace('setPackage')
    : action !== 'history' ? t('record') : workspace('payments');

  return <li className="flex min-h-16 items-center gap-stack border-t border-line-soft px-card py-inline first:border-t-0">
    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-raised font-bold">{player.fullName.slice(0, 1)}</span>
    {reminder ? <button type="button" onClick={onOpen} className={`${clickableClass} min-h-12 min-w-0 flex-1 text-start`}>
      <b className="block wrap-break-word text-sm">{player.fullName}</b>
      <span className="block text-xs text-muted">{detail}</span>
      <span className="sr-only">{workspace('payments')}</span>
    </button> : <div className="min-w-0 flex-1">
      <b className="block wrap-break-word text-sm">{player.fullName}</b>
      <p className="text-xs text-muted">{detail}</p>
    </div>}
    {reminder ? <a href={reminder} target="_blank" rel="noopener noreferrer"
      className={buttonClass({ variant: 'secondary', block: false, className: 'min-w-12 shrink-0 px-stack text-row' })}>{t('remind')}</a>
      : showPaid ? <Button variant="ghost" block={false} className="min-w-12 shrink-0 px-0" onClick={onOpen}>
        <span className="tone-lime shrink-0 whitespace-nowrap rounded-md px-inline text-micro font-semibold">{t('paidTag')}</span>
      </Button>
      : <Button variant="secondary" block={false} className="min-w-12 shrink-0 px-stack text-row"
        onClick={onOpen}>{actionLabel}</Button>}
  </li>;
}
