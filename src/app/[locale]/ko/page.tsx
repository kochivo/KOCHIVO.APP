import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { getKoActor } from '@/features/ko-account';
import { koPilotAvailable } from '@/features/ko-entry/server';
import { KoChat } from '@/features/ko-preview';
import { koPreviewMessages } from '@/features/ko-core';
import { buttonClass } from '@/ui/button';

export default async function KoPage() {
  if (!await koPilotAvailable()) notFound();
  const actor = await getKoActor();
  if (!actor) notFound();
  const t = await getT(koPreviewMessages);
  return <main className="mx-auto flex w-full max-w-xl flex-col px-page-x pb-section pt-[var(--safe-top)]"
    style={{ blockSize: 'var(--visible-viewport-height, 100dvh)' }}>
    <section className="glass-strong flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-line">
      <header className="flex shrink-0 items-center justify-between gap-stack border-b border-line p-card">
        <h1 className="font-display text-xl font-extrabold">{t('accountChatTitle')}</h1>
        <Link href={actor.role === 'captain' ? '/captain' : '/player'}
          className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-12 items-center px-stack text-sm" })}>{t('home')}</Link>
      </header>
      <KoChat role={actor.role} account />
    </section>
  </main>;
}
