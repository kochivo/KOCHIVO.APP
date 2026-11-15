import Link from 'next/link';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from './messages';
import { buttonClass } from '@/ui/button';

export function FileReminder({ playerId, title, body, locale }: { playerId: string; title: string; body: string; locale: Locale }) {
  const t = createT(messages, locale);
  return <div className="glass space-y-inline rounded-card border border-line-soft p-card">
    <p className="text-faint">{title}</p><p className="text-xs text-muted">{body}</p>
    <Link href={`/captain/players/${playerId}/checkins#voice-recorder-${playerId}`} prefetch={false}
      className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-page-x text-sm" })}>{t('remindPlayer')}</Link>
  </div>;
}
