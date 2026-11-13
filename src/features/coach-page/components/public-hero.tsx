import { BadgeCheck, MapPin, MessageCircle } from 'lucide-react';
import type { CoachRequestStatus } from '@/lib/coach-request-status';
import type { PublicCoach, PublicT } from './public-types';
import { PublicSignup } from './public-signup';
import { PublicRequestStatus } from './public-request-status';

export function PublicHero({ coach, signup, whatsapp, requested, t }: {
  coach: PublicCoach; signup: string; whatsapp: string | null; requested?: CoachRequestStatus; t: PublicT;
}) {
  const [first, ...rest] = coach.full_name.trim().split(/\s+/);
  const tagline = coach.bio?.trim().split(/\n\s*\n/)[0] || t('noBio');
  return <section className="public-hero public-section grid items-center gap-12 md:grid-cols-[1.15fr_1fr]">
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-2 text-lime"><BadgeCheck aria-hidden strokeWidth={1.5} className="size-5" />{t('verified')}</span>
        {coach.location && <span className="flex items-center gap-2 text-muted"><MapPin aria-hidden strokeWidth={1.5} className="size-4" />{coach.location}</span>}
      </div>
      <h1 id="public-coach-name" className="public-name font-display font-extrabold">
        <span className="block">{first}</span>{rest.length > 0 && <span className="block text-lime">{rest.join(' ')}</span>}
      </h1>
      <p className="max-w-xl whitespace-pre-wrap text-lg leading-relaxed text-muted">{tagline}</p>
      <div data-slot="specialties" />
      {requested ? <PublicRequestStatus requested={requested} t={t} /> : <div className="hidden flex-wrap items-center gap-3 md:flex">
        <PublicSignup href={signup} label={t('requestJoin')} />
        {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="glass inline-flex min-h-12 items-center gap-2 rounded-full px-6">
          <MessageCircle aria-hidden strokeWidth={1.5} className="size-5" />{t('contactWhatsapp')}
        </a>}
      </div>}
      <div data-slot="spots" />
    </div>
    <div className="relative isolate mx-auto w-full max-w-sm px-6 py-8">
      <span className="public-slash" aria-hidden="true" />
      <div className="glass-strong public-portrait relative flex aspect-[4/5] rotate-[-3deg] items-center justify-center overflow-hidden rounded-card">
        {coach.avatar ? (
          // Keep the existing unoptimized portrait approach on the public route.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coach.avatar} alt="" width={384} height={480} className="size-full object-cover" />
        ) : <span aria-hidden="true" className="font-display text-9xl font-extrabold text-lime">{coach.full_name.slice(0, 1)}</span>}
        <span className="absolute start-0 end-0 bottom-0 bg-bg-deep/90 p-6 font-bold">{coach.full_name}</span>
      </div>
    </div>
  </section>;
}
