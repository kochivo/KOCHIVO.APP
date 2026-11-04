import { Hourglass } from 'lucide-react';
import { getLocale, getT } from '@/core/i18n/server';
import { localeDir } from '@/core/i18n/locale';
import { PushToggleCard } from '@/features/notifications';
import { publicConfig } from '@/lib/public-config';
import { whatsappUrl } from '@/lib/whatsapp';
import { SignOutButton } from '@/features/auth';
import { messages } from '../messages';

export async function CaptainPendingScreen({ status }: { status: 'pending' | 'rejected' }) {
  const t = await getT(messages);
  const locale = await getLocale();
  const whatsapp = whatsappUrl({ phone: publicConfig.ownerWhatsapp });
  return <main dir={localeDir(locale)} className="flex min-h-dvh items-center justify-center p-6 text-start">
    <section className="glass-strong w-full max-w-lg space-y-6 rounded-card p-8" aria-labelledby="approval-title">
      <div className="glow mx-auto flex size-20 items-center justify-center rounded-full bg-lime/10 text-lime motion-safe:animate-pulse motion-reduce:animate-none">
        <Hourglass aria-hidden className="size-10" />
      </div>
      <h1 id="approval-title" className="text-2xl font-bold">{t(status === 'rejected' ? 'rejectedTitle' : 'title')}</h1>
      <p className="text-muted">{t(status)}</p>
      {status === 'rejected' && whatsapp && <a href={whatsapp}
        className="flex min-h-12 items-center justify-center rounded-control border border-line px-6 font-bold">{t('support')}</a>}
      <PushToggleCard />
      <SignOutButton variant="danger" className="min-h-12 w-full" />
    </section>
  </main>;
}
