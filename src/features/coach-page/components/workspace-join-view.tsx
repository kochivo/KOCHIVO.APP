'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button, buttonClass } from '@/ui/button';
import { PageBarTitle } from '@/ui/page-bar-title';
import type { loadCaptainSlug } from '../data/captain-slug';
import { loadJoinRequests } from '../data/join-requests';
import { messages } from '../messages';
import { joinPhoneMessages } from '../join/messages';
import { CopyLinkButton } from './copy-link-button-entry';
import { JoinRequestsList } from './join-requests-list-entry';

export function WorkspaceJoinView({ initialRequests, initialLink, retryLinkAction, phone, now }: {
  initialRequests: Awaited<ReturnType<typeof loadJoinRequests>>;
  initialLink: Awaited<ReturnType<typeof loadCaptainSlug>>;
  retryLinkAction: typeof loadCaptainSlug;
  phone: boolean; now: number;
}) {
  const t = useT(messages), phoneT = useT(joinPhoneMessages), locale = useLocale();
  const [recoveredRequests, setRequests] = useState<typeof initialRequests>();
  const [recoveredLink, setLink] = useState<typeof initialLink>();
  const [requestsPending, startRequests] = useTransition();
  const [linkPending, startLink] = useTransition();
  const requests = initialRequests.error ? recoveredRequests ?? initialRequests : initialRequests;
  const link = initialLink.error ? recoveredLink ?? initialLink : initialLink;
  const url = !link.error && link.slug ? `https://kochivo.site/c/${link.slug}` : null;
  return <>
    <PageBarTitle title={t('pending')} phoneHide />
    {phone && <header className="mb-card-gap flex min-h-12 items-center gap-stack md:hidden">
      <Link href="/captain" aria-label={phoneT('back')} className={buttonClass({ variant: 'secondary', block: false, className: 'grid size-12 shrink-0 place-items-center px-0' })}>
        <ChevronRight aria-hidden className="size-5 ltr:rotate-180" />
      </Link>
      <div><h1 className="text-md font-bold">{t('pending')}</h1>
        {requests.data && <p className="text-micro text-muted">{phoneT('waiting', { n: formatNumber(requests.data.length, locale) })}</p>}
      </div>
    </header>}
    <div className="grid items-start gap-card-gap min-[760px]:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)]">
      {requests.error ? <div className="glass space-y-stack rounded-card p-card">
        <p role="alert" className="text-danger">{requests.error}</p>
        <Button variant="secondary" block={false} disabled={requestsPending} onClick={() => startRequests(async () => {
          try { setRequests(await loadJoinRequests()); } catch { setRequests(undefined); }
        })}>{t('retry')}</Button>
      </div>
        : <JoinRequestsList rows={requests.data ?? []} workspace phone={phone} now={now} />}
      <aside className="cut-corner glass space-y-stack p-card">
        <h2 className="text-md font-bold">{t('inviteLink')}</h2>
        <p className="text-xs text-muted">{t('inviteDescription')}</p>
        {link.error ? <>
          <p role="alert" className="text-danger">{t('linkLoadFailed')}</p>
          <Button variant="secondary" block={false} disabled={linkPending} onClick={() => startLink(async () => {
            try { setLink(await retryLinkAction()); } catch { setLink(undefined); }
          })}>{t('retry')}</Button>
        </> : url ? <>
          <p dir="ltr" className="recessed break-all rounded-control p-stack text-start text-sm font-semibold">{url}</p>
          <div className="flex flex-wrap items-start gap-inline">
            <CopyLinkButton url={url} label={t('copyJoinLink')} />
            <a href={`https://wa.me/?text=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer"
              className={buttonClass({ variant: 'secondary', block: false })}>{t('shareInvite')}</a>
          </div>
        </> : <p className="text-sm text-muted">{t('choosePageLink')}</p>}
      </aside>
    </div>
  </>;
}
