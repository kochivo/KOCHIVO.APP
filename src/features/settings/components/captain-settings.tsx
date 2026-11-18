'use client';
import { useCallback, useEffect, useRef } from 'react';
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
import { ConnectedTools } from '@/features/ai-connect';

const Profile = dynamic(() => import('./captain-profile-card').then(m => m.CaptainProfileCard), { loading: () => <LoadingState variant="detail" /> });
const PaymentMethods = dynamic(() => import('./payment-methods-card').then(m => m.PaymentMethodsCard), { loading: () => <LoadingState variant="detail" /> });
const FoodPrices = dynamic(() => import('@/features/meal-plans').then(m => m.FoodPricesEntry), { loading: () => <LoadingState variant="detail" /> });
const PublicPage = dynamic(() => import('./public-page-settings').then(m => m.PublicPageSettings), { loading: () => <LoadingState variant="detail" /> });
const Ramadan = dynamic(() => import('./ramadan-settings').then(m => m.RamadanSettings), { loading: () => <LoadingState variant="detail" /> });

export function CaptainSettings({ signOut, connectedTools }: {
  signOut?: ReactNode; connectedTools?: { userId: string; url: string } | null;
}) {
  const t = useT(messages), legacy = useT(legacyMessages), phone = useT(phoneMessages), demo = useDemoExpiry();
  const query = useSearchParams();
  const section = selectedSection(query?.get('section') ?? null, !!connectedTools);
  const overview = !query?.has('section');
  const overviewQuery = new URLSearchParams(query?.toString());
  overviewQuery.delete('section');
  const overviewHref = overviewQuery.size ? `?${overviewQuery}` : '/captain/settings';
  const { now } = useCalendarClock(), timezone = useTimezone();
  const loader = useCallback(() => loadCaptainSettings(), []);
  const resource = useResource('settings:captain:workspace', loader);
  const profile = resource.data;
  const hasProfile = Boolean(profile);
  const root = useRef<HTMLElement>(null);
  const activeRow = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!hasProfile || !window.matchMedia('(width < 48rem)').matches) return;
    if (!overview) root.current?.querySelector<HTMLElement>('#settings-heading')?.focus({ preventScroll: true });
    else if (activeRow.current) {
      document.getElementById(activeRow.current)?.focus();
      activeRow.current = undefined;
    }
  }, [overview, section, hasProfile]);
  const setEdited = (next: SettingsProfile) => { void resource.mutate(() => next, async () => {}); };

  return <section ref={root} className="space-y-card-gap" onClickCapture={event => {
    if (!(event.target instanceof Element) || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const row = event.target.closest<HTMLElement>('[data-settings-row]');
    if (row) activeRow.current = row.id;
  }}>
    <PageBarTitle title={legacy('settings')} />
    {profile && Boolean(resource.error) && <ErrorState message={legacy('couldnTLoadSettings')} retryLabel={t('retry')} onRetry={() => void resource.retry()} />}
    {!profile ? resource.error ? <ErrorState message={legacy('couldnTLoadSettings')} retryLabel={t('retry')} onRetry={() => void resource.retry()} />
      : <LoadingState variant="detail" /> :
      <div className="grid items-start gap-card-gap max-md:grid-cols-1! min-[760px]:grid-cols-[minmax(0,1fr)_minmax(0,3.4fr)]">
        {overview && <CaptainPhoneSettingsMenu profile={profile} query={query?.toString() ?? ''} timezone={timezone}
          connectedTools={!!connectedTools} signOut={signOut} />}
        <div className="hidden md:contents"><SectionNav section={section} query={query?.toString() ?? ''} connectedTools={!!connectedTools} /></div>
        {!overview && section !== 'connected-tools' && <Link href={overviewHref} className={buttonClass({
          variant: 'secondary', block: false, className: 'justify-self-start md:hidden!',
        })}>{phone('back')}</Link>}
        <section key={section} id={`settings-${section}`}
          className={`min-w-0 space-y-card-gap ${section === 'connected-tools' ? '' : 'glass rounded-card p-card'}${overview ? ' max-md:hidden' : ''}`}>
          <SectionHeading section={section} overviewHref={overviewHref} />
          {section === 'profile' && <Profile workspace profile={profile} onSave={setEdited} />}
          {section === 'page' && <PublicPage profile={profile} onSave={setEdited} />}
          {section === 'invite' && <InviteSection profile={profile} onSave={setEdited} />}
          {section === 'language' && <>
            <PreferencesSection profile={profile} onSave={setEdited} />
            {now && ramadanSettingsVisible(localDate(now, timezone)) && <Ramadan />}
          </>}
          {section === 'subscription' && <><SubscriptionEntry /><PaymentMethods /><FoodPrices /></>}
          {section === 'connected-tools' && connectedTools && <ConnectedTools {...connectedTools} />}
          {section === 'security' && <SecuritySection profile={profile} onSave={setEdited}
            signOut={signOut} canDelete={!demo && !demoExpiry(profile)} />}
        </section>
      </div>}
  </section>;
}
