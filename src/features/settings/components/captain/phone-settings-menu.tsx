import { useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Bell, Copy, CreditCard, FileText, Link2, MessageCircle, Pencil, Plug } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { DEFAULT_TIMEZONE } from '@/lib/dates';
import { Button, buttonClass, clickableClass } from '@/ui/button';
import { RowChevron } from '@/ui/row-chevron';
import { connectedToolsMessages } from '@/features/ai-connect';
import { messages } from '../../captain-phone/messages';
import { messages as sections } from '../../captain-sections/messages';
import { messages as settings } from '../../messages';
import type { SettingsProfile } from '../../schema';
import { messages as workspace } from '../../workspace/messages';
import type { Section } from './section-nav';

const PushToggle = dynamic(() => import('@/features/notifications').then(module => module.PushToggleCard));
const phoneMedia = '(width < 48rem)';
function subscribeToPhone(notify: () => void) {
  const media = window.matchMedia(phoneMedia);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}

export function CaptainPhoneSettingsMenu({ profile, query, timezone, signOut, connectedTools }: {
  profile: SettingsProfile; query: string; timezone: string; signOut?: ReactNode; connectedTools?: boolean;
}) {
  const t = useT(messages), sectionT = useT(sections), preferences = useT(workspace);
  const legacy = useT(settings), locale = useLocale();
  const tools = useT(connectedToolsMessages);
  const slug = profile.public_slug;
  const phone = useSyncExternalStore(subscribeToPhone, () => window.matchMedia(phoneMedia).matches, () => false);
  const [copyStatus, setCopyStatus] = useState<'copied' | 'copyFailed'>();
  const rowClass = `${clickableClass} flex min-h-14 min-w-0 items-center gap-stack text-sm hover:bg-ink/5 focus-visible:ring-inset`;
  async function copyInvite() {
    if (!slug) return;
    try {
      await navigator.clipboard.writeText(`https://kochivo.site/c/${slug}`);
      setCopyStatus('copied');
    } catch { setCopyStatus('copyFailed'); }
  }
  function href(section: Section, hash = '') {
    const params = new URLSearchParams(query);
    params.set('section', section);
    return `?${params}${hash}`;
  }
  const languageAndZone = t('languageAndZone', { language: preferences(locale === 'en' ? 'english' : 'arabic'),
    zone: timezone === DEFAULT_TIMEZONE ? preferences('cairo') : timezone });
  const accountRows = [
    { url: href('subscription'), Icon: CreditCard, label: t('subscription') },
    { url: href('security'), Icon: FileText, label: t('security') },
    ...(connectedTools ? [{ url: href('connected-tools'), Icon: Plug, label: tools('connectedTools') }] : []),
  ];
  return <div className="flex min-h-[calc(100dvh-var(--captain-content-clearance)-max(var(--spacing-card),var(--safe-top))-var(--spacing-card)-4rem-var(--spacing-stack))] min-w-0 flex-col gap-card-gap md:hidden">
    <section className="glass flex items-center gap-card-gap rounded-card p-card">
      <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-surface-raised font-display text-title font-bold ring-2 ring-inset ring-lime">{profile.full_name.trim().slice(0, 1)}</span>
      <div className="min-w-0 flex-1">
        {slug ? <Link className="flex min-h-12 min-w-0 flex-col justify-center hover:text-ink focus-visible:ring-2 focus-visible:ring-lime"
          href={`/c/${slug}`} target="_blank" rel="noreferrer">
          <h2 className="wrap-break-word text-md font-bold">{profile.full_name}</h2>
          <bdi className="truncate text-xs text-muted">{legacy('publicPreview', { slug })}</bdi>
        </Link> : <h2 className="wrap-break-word text-md font-bold">{profile.full_name}</h2>}
      </div>
      <Link href={href('profile')} className={buttonClass({ variant: 'secondary', block: false, className: 'shrink-0 px-stack text-row' })}>
        <Pencil aria-hidden className="size-4" />{t('edit')}
      </Link>
    </section>
    <nav aria-label={sectionT('sections')} className="space-y-card-gap">
      <div className="glass overflow-hidden rounded-card">
        <Link href={href('page')} className={`${rowClass} px-card`}>
          <Link2 aria-hidden className="size-5 shrink-0 text-muted" />
          <span className="flex-1">{sectionT('page')}</span>
          <span className="text-xs text-muted">{t(slug ? 'publicOn' : 'publicOff')}</span><RowChevron />
        </Link>
        <div className="flex items-center border-t border-line-soft px-card">
          <Link href={href('invite')} className={`${rowClass} flex-1`}>
            <Copy aria-hidden className="size-5 shrink-0 text-muted" />
            <span className="flex-1">{t('invite')}</span><RowChevron />
          </Link>
          {slug && <Button variant="ghost" block={false} className="ms-stack min-w-12 shrink-0 px-inline text-xs text-muted"
            onClick={copyInvite}>{t('copy')}</Button>}
        </div>
        {copyStatus && <p role={copyStatus === 'copied' ? 'status' : 'alert'} className="px-card pb-inline text-xs text-muted">{legacy(copyStatus)}</p>}
      </div>
      <div className="glass overflow-hidden rounded-card">
        <div className="group flex items-center gap-inline px-card">
          <Link href={href('language', '#settings-notifications')} className={`${rowClass} flex-1`}>
            <Bell aria-hidden className="size-5 shrink-0 text-muted" />
            <span className="flex-1">{t('notifications')}</span>
            <RowChevron className="group-has-[[role=switch]]:hidden" />
          </Link>
          {phone && <div className="max-w-1/2 [&>section]:border-0 [&>section]:bg-none! [&>section]:p-0
            [&>section]:shadow-none [&>section>button]:min-w-12 [&>section>button]:justify-center
            [&>section>button>span:first-child]:sr-only [&>section>p]:sr-only">
            <PushToggle />
          </div>}
        </div>
        <Link href={href('language')} className={`${rowClass} border-t border-line-soft px-card`}>
          <MessageCircle aria-hidden className="size-5 shrink-0 text-muted" />
          <span className="min-w-0 flex-1">{t('language')}</span>
          <bdi className="max-w-1/2 truncate text-xs text-muted">{languageAndZone}</bdi><RowChevron />
        </Link>
      </div>
      <div className="glass overflow-hidden rounded-card">
        {accountRows.map(({ url, Icon, label }) => <Link key={url} href={url}
          className={`${rowClass} border-t border-line-soft px-card first:border-t-0`}>
          <Icon aria-hidden className="size-5 shrink-0 text-muted" />
          <span className="min-w-0 flex-1">{label}</span>
          <RowChevron />
        </Link>)}
      </div>
    </nav>
    {signOut && <div className="mt-auto [&_button]:min-h-13! [&_button]:w-full [&_button]:rounded-control! [&_button]:border-danger/30! [&_button]:text-danger!">{signOut}</div>}
  </div>;
}
