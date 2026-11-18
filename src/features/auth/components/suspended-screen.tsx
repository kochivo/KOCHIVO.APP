import { getLocale, getT } from '@/core/i18n/server';
import { localeDir } from '@/core/i18n/locale';
import { messages } from '../messages';

import { whatsappUrl } from '@/lib/whatsapp';
import { SignOutButton } from './sign-out-button';
import { publicConfig } from '@/lib/public-config';
import { buttonClass } from '@/ui/button';

export async function SuspendedScreen() {
  const t = await getT(messages);
  const direction = localeDir(await getLocale());
  const whatsapp = whatsappUrl({ phone: publicConfig.ownerWhatsapp });
  return <main dir={direction} className="flex min-h-dvh items-center justify-center p-section pt-[max(1.5rem,var(--safe-top))] text-start">
    <section className="glass-strong w-full max-w-md space-y-section rounded-card p-section" aria-labelledby="suspended-title">
      <h1 id="suspended-title" className="text-2xl font-bold">{t('yourAccountIsPaused')}</h1>
      <p className="text-muted">{t(whatsapp ? 'contactSupportOnWhatsAppToRestore' : 'contactSupportByEmailToRestore')}</p>
      <a className={buttonClass({ variant: 'primary', block: false, className: 'flex min-h-12 items-center justify-center px-page-x font-bold' })}
        href={whatsapp ?? 'mailto:support@kochivo.site'}>{t(whatsapp ? 'contactSupportOnWhatsApp' : 'contactSupportByEmail')}</a>
      <SignOutButton variant="secondary" />
    </section>
  </main>;
}
