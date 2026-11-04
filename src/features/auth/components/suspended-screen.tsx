import { getLocale, getT } from '@/core/i18n/server';
import { localeDir } from '@/core/i18n/locale';
import { messages } from '../messages';

import { whatsappUrl } from '@/lib/whatsapp';
import { SignOutButton } from './sign-out-button';
import { publicConfig } from '@/lib/public-config';

export async function SuspendedScreen() {
  const t = await getT(messages);
  const direction = localeDir(await getLocale());
  const whatsapp = whatsappUrl({ phone: publicConfig.ownerWhatsapp });
  return <main dir={direction} className="flex min-h-dvh items-center justify-center p-6 pt-[max(1.5rem,var(--safe-top))] text-start">
    <section className="glass-strong w-full max-w-md space-y-6 rounded-card p-8" aria-labelledby="suspended-title">
      <h1 id="suspended-title" className="text-2xl font-bold">{t('yourAccountIsPaused')}</h1>
      <p className="text-muted">{t('contactSupportOnWhatsAppToRestore')}</p>
      {whatsapp && <a className="flex min-h-12 items-center justify-center rounded-control border border-line px-6 font-bold text-ink"
        href={whatsapp}>{t('contactSupportOnWhatsApp')}</a>}
      <SignOutButton />
    </section>
  </main>;
}
