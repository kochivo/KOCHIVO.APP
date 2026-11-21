import type { ReactNode } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import type { CoachRequestStatus } from '@/lib/coach-request-status';
import { coachSignupHref } from '../slug';
import type { PublicCoach, PublicT } from './public-types';
import { httpsSocialUrl } from './public-social-url';
import { PublicHero } from './public-hero';
import { PublicSteps } from './public-steps';
import { PublicAppPreview } from './public-app-preview';
import { PublicAbout } from './public-about';
import { PublicSignup } from './public-signup';
import { PublicDock } from './public-dock';
import './public-page.css';
import type { Translator } from '@/core/i18n/messages';
import type { messages as sectionMessages } from '../sections/messages';
import { PublicNumbers } from './public-numbers';
import { PublicWaitlist, type WaitlistLabels } from './public-waitlist';
import { PublicWaitlistProvider } from './public-waitlist-provider';
import { buttonClass } from '@/ui/button';

function waitlistLabels(t?: Translator<typeof sectionMessages>): WaitlistLabels {
  const keys = ['waitlist', 'waitlisted', 'member', 'failure', 'pending'] as const;
  return Object.fromEntries(keys.map(key => [key, t ? t(key) : ''])) as WaitlistLabels;
}

export function PublicCoachLayout({ coach, slug, requested, t, pricing, sectionsT }: {
  coach: PublicCoach; slug: string; requested?: CoachRequestStatus; t: PublicT; pricing: ReactNode;
  sectionsT?: Translator<typeof sectionMessages>;
}) {
  const signup = coachSignupHref(slug);
  const whatsapp = httpsSocialUrl(coach.social.whatsapp);
  const accepting = coach.page?.accepting !== false;
  const action = !accepting ? <PublicWaitlist labels={waitlistLabels(sectionsT)} /> : <PublicSignup href={signup} label={t('requestJoin')} />;
  const layout = <div className="public-coach min-h-dvh text-start">
    <header className="border-b border-line-soft">
      <div className="public-wrap flex min-h-20 items-center justify-between gap-section">
        <Link href="/" aria-label={t('brand')} className="inline-flex min-h-12 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-primary.png" alt={t('brand')} width={85} height={24} className="theme-dark-only" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-primary-light.png" alt={t('brand')} width={85} height={24} className="theme-light-only" />
        </Link>
        <Link href="/login" className="inline-flex min-h-12 items-center text-sm text-muted hover:text-ink">{t('playerLogin')}</Link>
      </div>
    </header>
    <main className="public-wrap">
      <PublicHero coach={coach} signup={signup} whatsapp={whatsapp} requested={requested} t={t} action={action} sectionsT={sectionsT} />
      <div data-slot="numbers">{sectionsT && <PublicNumbers stats={coach.stats ?? null} years={coach.page?.years_experience ?? null} t={sectionsT} />}</div>
      <PublicSteps t={t} />
      {pricing}
      <PublicAppPreview t={t} />
      <PublicAbout coach={coach} t={t} sectionsT={sectionsT} />
      {!requested && <section className="public-close public-section relative isolate overflow-hidden">
        <span className="public-slash" aria-hidden="true" />
        <div className="glass-featured relative space-y-section rounded-card p-section md:p-section">
          <h2 className="public-heading">{t('readyTitle')}</h2><p className="max-w-lg text-muted">{t('readyBody')}</p>
          {action}
        </div>
      </section>}
    </main>
    <footer className="public-wrap pb-[calc(7rem+var(--safe-bottom))] pt-section text-sm text-muted md:pb-section">
      <Link href="/" className="inline-flex min-h-12 items-center">{t('madeOn')}</Link>
    </footer>
    {!requested && <PublicDock>
      {action}
      {whatsapp && <a href={whatsapp} aria-label={t('contactWhatsapp')} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-12 min-w-12 items-center justify-center px-page-x" })}>
        <MessageCircle aria-hidden strokeWidth={1.5} className="size-5" />
      </a>}
    </PublicDock>}
  </div>;
  return accepting ? layout : <PublicWaitlistProvider key={slug} slug={slug}>{layout}</PublicWaitlistProvider>;
}
