import 'server-only';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getT } from '@/core/i18n/server';
import { messages } from './messages';
import { koPilotAvailable } from './config';

export async function KoAccountLink({ player = false }: { player?: boolean }) {
  if (!await koPilotAvailable()) return null;
  if (player) {
    const path = (await headers()).get('x-kochivo-path') ?? '';
    if (/^\/player\/(?:workout|onboarding)(?:\/|$)/.test(path)) return null;
  }
  const t = await getT(messages);
  return <Link href="/ko" prefetch={false} aria-label={t('open')}
    className="fixed start-[max(1rem,var(--safe-start))] bottom-[calc(var(--nav-clearance)+0.5rem)] z-30 grid size-16 place-items-center rounded-card border border-lime/30 bg-bg bg-[url('/ko-preview/welcome.png')] bg-contain bg-center bg-no-repeat shadow-xl lg:bottom-6" />;
}
