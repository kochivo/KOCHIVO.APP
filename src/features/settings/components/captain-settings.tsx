'use client';
import { ChevronLeft, Pencil } from 'lucide-react';
import { WorkspaceAvatar } from './workspace-avatar';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { Button } from '@/ui/button';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { PageBarTitle } from '@/ui/page-bar-title';
import { demoExpiry, useDemoExpiry } from '@/features/demo';
import { SubscriptionEntry } from '@/features/billing';
const FoodPricesEntry = dynamic(() => import('@/features/meal-plans').then(module => module.FoodPricesEntry));
import { messages as legacyMessages } from '../messages';
import { messages } from '../workspace/messages';
import { deletionRequestedAt } from '../deletion';
import { loadCaptainSettings } from '../data/workspace-settings';
import type { SettingsProfile } from '../schema';
import { WorkspaceFact } from './workspace-fact';
import { WorkspaceSheet } from './workspace-sheet';
import { WorkspacePreferences } from './workspace-preferences';
import { WorkspacePageCard } from './workspace-page-card';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { useTimezone } from '@/core/timezone/client';
import { localDate } from '@/lib/dates';
import { ramadanSettingsVisible } from '@/lib/ramadan-calendar';

const Profile = dynamic(() => import('./captain-profile-card').then(m => m.CaptainProfileCard), { loading: () => <LoadingState variant="detail" /> });
const PaymentMethods = dynamic(() => import('./payment-methods-card').then(m => m.PaymentMethodsCard), { loading: () => <LoadingState variant="detail" /> });
const Invite = dynamic(() => import('./invite-message-form').then(m => m.InviteMessageForm));
const Export = dynamic(() => import('./export-card').then(m => m.ExportCard));
const Delete = dynamic(() => import('./delete-account-card').then(m => m.DeleteAccountCard));
const Options = dynamic(() => import('./workspace-options').then(m => m.WorkspaceOptions));
const PublicPage = dynamic(() => import('./public-page-settings').then(m => m.PublicPageSettings), { loading: () => <LoadingState variant="detail" /> });
type Panel = 'profile' | 'invite' | 'download' | 'delete' | 'more';
const Ramadan = dynamic(() => import('./ramadan-settings').then(m => m.RamadanSettings), { loading: () => <LoadingState variant="detail" /> });
const card = 'glass rounded-card border border-line-soft px-page-x py-page-y';
const heading = 'mb-inline font-display text-title font-semibold';
export function CaptainSettings({ signOut }: { signOut?: ReactNode }) {
  const t = useT(messages), legacy = useT(legacyMessages), demo = useDemoExpiry();
  const { now } = useCalendarClock(), timezone = useTimezone();
  const loader = useCallback(() => loadCaptainSettings(), []);
  const resource = useResource('settings:captain:workspace', loader);
  const [panel, setPanel] = useState<Panel | null>(null);
  const profile = resource.data;
  const setEdited = (next: SettingsProfile) => { void resource.mutate(() => next, async () => {}); };
  return <section className="space-y-card-gap">
    <PageBarTitle title={legacy('settings')} />
    {!profile ? resource.error ? <ErrorState message={legacy('couldnTLoadSettings')} retryLabel={t('retry')} onRetry={() => void resource.retry()} />
      : <LoadingState variant="detail" /> : <>
      <div className="grid items-start gap-card-gap min-[760px]:grid-cols-[minmax(0,1fr)_minmax(0,4fr)]">
        <nav aria-label={legacy('settings')} className="glass overflow-hidden rounded-card">
          {([
            ['profile', t('account')], ['page', t('page')], ['language', t('language')],
            ['subscription', t('subscription')], ['security', t('security')],
          ] as const).map(([id, label]) => <a key={id} href={`#settings-${id}`}
            className="press flex min-h-14 items-center justify-between gap-inline border-t border-line-soft px-card text-sm text-muted first:border-0 first:bg-surface-raised first:font-bold first:text-ink">
            {label}<ChevronLeft aria-hidden className="dir-icon size-4 shrink-0" />
          </a>)}
        </nav>
        <div className="grid min-w-0 gap-card-gap">
          <section id="settings-profile" className="glass flex min-h-14 flex-wrap items-center gap-card-gap rounded-card p-card">
            <WorkspaceAvatar profile={profile} />
            <div className="min-w-0 flex-1">
              <h2 className="text-title font-bold"><bdi>{profile.full_name}</bdi></h2>
              {profile.location && <p className="text-sm text-muted">{profile.location}</p>}
            </div>
            <Button variant="secondary" onClick={() => setPanel('profile')}><Pencil aria-hidden className="size-4" />{t('edit')}</Button>
          </section>
          <div id="settings-page" className="space-y-card-gap">
            <WorkspacePageCard profile={profile} edit={() => setPanel('profile')} />
            <PublicPage profile={profile} onSave={setEdited} />
            <section className={card}><h2 className={heading}>{t('invite')}</h2><p className="text-row leading-relaxed text-muted">{profile.invite_message || t('unset')}</p>
              <Button variant="secondary" className="mt-stack" onClick={() => setPanel('invite')}>{t('editInvite')}</Button></section>
          </div>
          <div id="settings-language"><WorkspacePreferences profile={profile} update={setEdited} /></div>
          <div id="settings-subscription"><SubscriptionEntry /></div>
          {now && ramadanSettingsVisible(localDate(now, timezone)) && <Ramadan />}
          <PaymentMethods />
          <FoodPricesEntry />
          <section id="settings-security" className={card}><h2 className={heading}>{t('security')}</h2><div>
            <WorkspaceFact label={t('whatsapp')}><span dir="ltr">{profile.social?.whatsapp?.replace('https://wa.me/', '+') || profile.phone || t('unset')}</span></WorkspaceFact>
            <WorkspaceFact label={t('download')}><Button variant="secondary" className="min-h-12 rounded-full" onClick={() => setPanel('download')}>{t('downloadAction')}</Button></WorkspaceFact>
            {!demo && !demoExpiry(profile) && <WorkspaceFact label={t('delete')} danger><Button variant="secondary" className="min-h-12 rounded-full text-danger" onClick={() => setPanel('delete')}>{t('deleteAction')}</Button></WorkspaceFact>}
          </div><Button variant="secondary" className="mt-inline min-h-12 rounded-control text-muted" onClick={() => setPanel('more')}>{t('more')}</Button></section>
          <div className="[&_button]:min-h-12 [&_button]:w-full [&_button]:rounded-control! [&_button]:bg-surface! [&_button]:text-danger! [&_button]:shadow-none!">{signOut}</div>
        </div>
      </div>
      {panel && <WorkspaceSheet title={t(panel)} onClose={() => setPanel(null)}>
        {panel === 'profile' && <Profile profile={profile} onSave={setEdited} quiet />}
        {panel === 'invite' && <Invite initialMessage={profile.invite_message} onSave={setEdited} />}
        {panel === 'download' && <Export />}
        {panel === 'delete' && <Delete requestedAt={profile.deletion_requested_at} onChange={due => setEdited({ ...profile, deletion_requested_at: due && deletionRequestedAt(due) })} />}
        {panel === 'more' && <Options />}
      </WorkspaceSheet>}
    </>}
  </section>;
}
