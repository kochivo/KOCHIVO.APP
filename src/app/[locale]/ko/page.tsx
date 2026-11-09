import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { getKoActor } from '@/features/ko-account';
import { koPilotAvailable } from '@/features/ko-entry';
import { KoChat, koPreviewMessages } from '@/features/ko-preview';

export default async function KoPage() {
  if (!await koPilotAvailable()) notFound();
  const actor = await getKoActor();
  if (!actor) notFound();
  const t = await getT(koPreviewMessages);
  return <main className="mx-auto w-full max-w-xl px-4 pb-8 pt-[var(--safe-top)]">
    <section className="glass-strong overflow-hidden rounded-card border border-line">
      <header className="flex items-center justify-between gap-3 border-b border-line p-4">
        <h1 className="font-display text-xl font-extrabold">{t('accountChatTitle')}</h1>
        <Link href={actor.role === 'captain' ? '/captain' : '/player'}
          className="flex min-h-12 items-center rounded-control border border-line px-3 text-sm">{t('home')}</Link>
      </header>
      <KoChat role={actor.role} account />
    </section>
  </main>;
}
