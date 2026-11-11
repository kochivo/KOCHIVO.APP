import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import type { CoachRequestStatus } from '@/lib/coach-request-status';
import { loadPublicCoach } from '../data/public-profile';
import { coachSignupHref } from '../slug';
import { messages } from '../messages';

export async function CoachPage({ slug, requested }: { slug: string; requested?: CoachRequestStatus }) {
  const t = await getT(messages);
  const coach = await loadPublicCoach(slug);
  if (!coach) notFound();
  const keys = ['whatsapp', 'instagram', 'tiktok', 'facebook', 'youtube', 'x'] as const;
  const links = keys.flatMap(key => {
    const href = coach.social[key];
    if (!href) return [];
    try { const url = new URL(href); return url.protocol === 'https:' ? [{ key, href: url.href }] : []; }
    catch { return []; }
  });
  return <main className="mesh flex min-h-dvh items-center justify-center p-6 pt-[max(1.5rem,var(--safe-top))]">
    <article className="glass-strong w-full max-w-xl space-y-6 rounded-card p-6 text-start md:p-10">
      <p className="font-display text-sm font-bold ltr:tracking-widest text-ink">{t('brand')}</p>
      {coach.avatar ? (
        // Already unoptimized, so next/image would only add client JS to this public page.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coach.avatar} alt="" width={112} height={112} className="size-28 rounded-full object-cover" />) :
        <span aria-hidden className="glass flex size-28 items-center justify-center rounded-full text-4xl font-bold">{coach.full_name.slice(0, 1)}</span>}
      <h1 className="text-4xl font-extrabold">{coach.full_name}</h1>
      <p className="whitespace-pre-wrap text-muted">{coach.bio || t('noBio')}</p>
      {coach.location && <p className="flex items-center gap-2"><MapPin aria-hidden className="size-5" />{coach.location}</p>}
      {links.length ? <ul className="flex flex-wrap gap-3">{links.map(({ key, href }) =>
        <li key={key}><a href={href} rel="noopener noreferrer" target="_blank" className="glass flex min-h-12 items-center rounded-control px-4">{t(key)}</a></li>)}</ul> :
        <p className="text-sm text-muted">{t('noSocial')}</p>}
      {requested ? <div role="status" className="glass space-y-4 rounded-control p-4">
        <p>{t(requested)}</p>
        {requested === 'member' && <Link href="/player" className="flex min-h-12 items-center justify-center rounded-control bg-lime px-6 py-4 font-bold text-on-lime">{t('openApp')}</Link>}
      </div> :
        <Link href={coachSignupHref(slug)} className="flex min-h-12 items-center justify-center rounded-control bg-lime px-6 py-4 font-bold text-on-lime">{t('train')}</Link>}
    </article>
  </main>;
}
