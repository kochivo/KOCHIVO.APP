import Link from 'next/link';
import { getT } from '@/core/i18n/server';
import { GlassCard } from '@/ui';
import { ensureCaptainSlug } from '../data/captain-slug';
import { messages } from '../messages';
import { CopyLinkButton } from './copy-link-button-entry';
import { buttonClass } from '@/ui/button';

export async function CoachLinkCard() {
  const [t, result] = await Promise.all([getT(messages), ensureCaptainSlug()]);
  return <GlassCard className="min-w-0 space-y-card-gap p-card">
    <div className="min-w-0 space-y-inline">
      <h2 className="text-lg font-bold">{t('pageLink')}</h2>
      <p className="text-sm text-muted">{t('pageLinkHint')}</p>
    </div>
    {result.error ? <p role="alert" className="text-sm text-danger">{t('linkLoadFailed')}</p> : result.slug ? <>
      <div dir="ltr" className="min-w-0 break-all rounded-control border border-line bg-surface-raised p-stack text-start text-sm">
        {t('pageLinkPreview', { slug: result.slug })}
      </div>
      <CopyLinkButton url={`https://kochivo.site/c/${result.slug}`} />
    </> : <div className="space-y-stack">
      <p className="text-sm text-muted">{t('choosePageLink')}</p>
      <Link href="/captain/settings" className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-page-x text-sm font-bold" })}>{t('openSettings')}</Link>
    </div>}
  </GlassCard>;
}
