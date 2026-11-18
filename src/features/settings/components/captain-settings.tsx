'use client';
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { PageBarTitle } from '@/ui/page-bar-title';
import { demoExpiry, useDemoExpiry } from '@/features/demo';
import { SubscriptionEntry } from '@/features/billing';
import { messages as legacyMessages } from '../messages';
import { messages } from '../workspace/messages';
import { loadCaptainSettings } from '../data/workspace-settings';
import type { SettingsProfile } from '../schema';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { useTimezone } from '@/core/timezone/client';
import { localDate } from '@/lib/dates';
import { ramadanSettingsVisible } from '@/lib/ramadan-calendar';
import { SectionNav, selectedSection } from './captain/section-nav';
import { SectionHeading } from './captain/section-heading';
import { InviteSection } from './captain/invite-section';
import { SecuritySection } from './captain/security-section';
import { PreferencesSection } from './captain/preferences-section';
import { CaptainPhoneSettingsMenu } from './captain/phone-settings-menu';
import { messages as phoneMessages } from '../captain-phone/messages';
import { buttonClass } from '@/ui/button';

const Profile = dynamic(() => import('./captain-profile-card').then(m => m.CaptainProfileCard), { loading: () => <LoadingState variant="detail" /> });
const PaymentMethods = dynamic(() => import('./payment-methods-card').then(m => m.PaymentMethodsCard), { loading: () => <LoadingState variant="detail" /> });
const FoodPrices = dynamic(() => import('@/features/meal-plans').then(m => m.FoodPricesEntry), { loading: () => <LoadingState variant="detail" /> });
const PublicPage = dynamic(() => import('./public-page-settings').then(m => m.PublicPageSettings), { loading: () => <LoadingState variant="detail" /> });
const Ramadan = dynamic(() => import('./ramadan-settings').then(m => m.RamadanSettings), { loading: () => <LoadingState variant="detail" /> });

export function CaptainSettings({ signOut }: { signOut?: ReactNode }) {
  const t = useT(messages), legacy = useT(legacyMessages), phone = useT(phoneMessages), demo = useDemoExpiry();
  const query = useSearchParams();
  const section = selectedSection(query?.get('section') ?? null);
  const overview = !query?.has('section');
  const overviewQuery = new URLSearchParams(query?.toString());
  overviewQuery.delete('section');
  const overviewHref = overviewQuery.size ? `?${overviewQuery}` : '/captain/settings';
  const { now } = useCalendarClock(), timezone = useTimezone();
  const loader = useCallback(() => loadCaptainSettings(), []);
  const resource = useResource('settings:captain:workspace', loader);
  const profile = resource.data;
  const setEdited = (next: SettingsProfile) => { void resource.mutate(() => next, async () => {}); };

  return <section className="space-y-card-gap">
    <PageBarTitle title={legacy('settings')} />
    {!profile ? resource.error ? <ErrorState message={legacy('couldnTLoadSettings')} retryLabel={t('retry')} onRetry={() => void resource.retry()} />
      : <LoadingState variant="detail" /> :
      <div className="grid items-start gap-card-gap max-md:grid-cols-1! min-[760px]:grid-cols-[minmax(0,1fr)_minmax(0,3.4fr)]">
        {overview && <CaptainPhoneSettingsMenu profile={profile} query={query?.toString() ?? ''} timezone={timezone} signOut={signOut} />}
        <div className="hidden md:contents"><SectionNav section={section} query={query?.toString() ?? ''} /></div>
        {!overview && <Link href={overviewHref} className={buttonClass({ variant: 'secondary', block: false, className: 'justify-self-start md:hidden!' })}>{phone('back')}</Link>}
        <section key={section} id={`settings-${section}`}
          className={`glass min-w-0 space-y-card-gap rounded-card p-card${overview ? ' max-md:hidden' : ''}`}>
          <SectionHeading section={section} />
          {section === 'profile' && <Profile workspace profile={profile} onSave={setEdited} />}
          {section === 'page' && <PublicPage profile={profile} onSave={setEdited} />}
          {section === 'invite' && <InviteSection profile={profile} onSave={setEdited} />}
          {section === 'language' && <>
            <PreferencesSection profile={profile} onSave={setEdited} />
            {now && ramadanSettingsVisible(localDate(now, timezone)) && <Ramadan />}
          </>}
          {section === 'subscription' && <><SubscriptionEntry /><PaymentMethods /><FoodPrices /></>}
          {section === 'security' && <SecuritySection profile={profile} onSave={setEdited}
            signOut={signOut} canDelete={!demo && !demoExpiry(profile)} />}
        </section>
      </div>}
  </section>;
}
