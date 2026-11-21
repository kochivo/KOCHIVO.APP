import { Hourglass } from 'lucide-react';
import { getLocale, getT } from '@/core/i18n/server';
import { localeDir } from '@/core/i18n/locale';
import { PushToggleCard } from '@/features/notifications';
import { publicConfig } from '@/lib/public-config';
import { whatsappUrl } from '@/lib/whatsapp';
import { SignOutButton } from '@/features/auth';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { RowLink } from '@/ui/row-link';
import { messages } from '../messages';
import { ApprovalWatcher } from './approval-watcher';
import { buttonClass } from '@/ui/button';

export async function CaptainPendingScreen({ status }: { status: 'pending' | 'rejected' }) {
  const t = await getT(messages);
  const locale = await getLocale();
  const whatsapp = whatsappUrl({ phone: publicConfig.ownerWhatsapp });
  if (captainWorkspaceEnabled()) return <main dir={localeDir(locale)} className="mx-auto grid min-h-dvh w-full max-w-3xl content-start gap-stack p-card text-start sm:p-section">
    <header className="glass flex min-h-16 items-center rounded-card px-page-x py-stack"><h1 id="approval-title" className="text-md font-bold">{t(status === 'rejected' ? 'rejectedTitle' : 'title')}</h1></header>
    <section aria-labelledby="approval-title" className="glass-strong grid gap-card-gap rounded-card p-card">
      <Hourglass aria-hidden className="size-10 text-muted" />
      <p className="text-muted">{t(status)}</p>
      {status === 'rejected' && whatsapp && <RowLink href={whatsapp}>{t('support')}</RowLink>}
      {status === 'pending' && <ApprovalWatcher />}
      {status === 'pending' && <p className="text-sm text-muted">{t('wait')}</p>}
      {status === 'pending' && <RowLink href="/demo">{t('demo')}</RowLink>}
      {status === 'pending' && whatsapp && <RowLink href={whatsapp}>{t('waitSupport')}</RowLink>}
      <PushToggleCard />
      <SignOutButton variant="danger" className="min-h-12 w-full border border-line !bg-surface !text-ink" />
    </section>
  </main>;
  return <main dir={localeDir(locale)} className="flex min-h-dvh items-center justify-center p-section text-start">
    <section className="glass-strong w-full max-w-lg space-y-section rounded-card p-section" aria-labelledby="approval-title">
      <div className="glow mx-auto flex size-20 items-center justify-center rounded-full bg-lime/10 text-lime motion-safe:animate-pulse motion-reduce:animate-none">
        <Hourglass aria-hidden className="size-10" />
      </div>
      <h1 id="approval-title" className="text-2xl font-bold">{t(status === 'rejected' ? 'rejectedTitle' : 'title')}</h1>
      <p className="text-muted">{t(status)}</p>
      {status === 'rejected' && whatsapp && <a href={whatsapp}
        className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-12 items-center justify-center px-page-x font-bold" })}>{t('support')}</a>}
      {status === 'pending' && <ApprovalWatcher />}
      {status === 'pending' && <p className="text-sm text-muted">{t('wait')}</p>}
      {status === 'pending' && <RowLink href="/demo">{t('demo')}</RowLink>}
      {status === 'pending' && whatsapp && <RowLink href={whatsapp}>{t('waitSupport')}</RowLink>}
      <PushToggleCard />
      <SignOutButton variant="danger" className="min-h-12 w-full" />
    </section>
  </main>;
}
