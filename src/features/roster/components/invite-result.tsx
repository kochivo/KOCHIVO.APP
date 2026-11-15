'use client';
import { useState } from 'react';
import { Copy } from 'lucide-react';
import { KoSend } from '@/ui/icons/ko-send';
import { useLocale, useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { formatNumber } from '@/lib/format';
import { inviteUrl } from '../invite';
import { normalizeWhatsapp } from '../invite-plan';
import type { InvitePackage, PlayerInvite } from '../invite-plan';
import { messages } from '../invites/messages';
import { messages as pageMessages } from '../invites/page-messages';
import { buttonClass } from '@/ui/button';

export function InviteResult({ input, pkg, code, captainFirstName, onAnother }: {
  input: PlayerInvite; pkg?: InvitePackage; code: string; captainFirstName: string; onAnother?: () => void;
}) {
  const t = useT(messages), p = useT(pageMessages), locale = useLocale();
  const [status, setStatus] = useState('');
  const url = inviteUrl(code);
  const phone = normalizeWhatsapp(input.whatsapp) ?? '';
  const share = `https://wa.me/${phone}?text=${encodeURIComponent(t('share', { captain: captainFirstName, link: url }))}`;
  async function copy() {
    try { await navigator.clipboard.writeText(url); setStatus(t('copied')); }
    catch { setStatus(t('copyFailed')); }
  }
  return <section className="space-y-5">
    <header><h1 className="text-2xl font-bold">{t('ready', { name: input.name })}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{input.gate && input.formIds?.length ? p('gatedReady') : t('readyHint')}</p></header>
    <div className="glass-strong flex flex-col items-center gap-4 rounded-[24px] p-6 text-center">
      <span className="glass flex size-16 items-center justify-center rounded-[20px] text-xl font-bold">{input.name.trim().split(/\s+/).slice(0,2).map(part => part[0]).join(' ')}</span>
      <div><b className="text-lg">{input.name}</b><p className="mt-1 text-sm text-muted">{pkg?.name ?? t('custom')}</p>
        {!!input.formIds?.length && <p className="mt-1 text-xs text-muted">{p(input.gate ? 'assessmentCount' : 'optionalCount', { n: formatNumber(input.formIds.length, locale) })}</p>}</div>
      <div className="flex w-full items-end gap-2"><label className="block min-w-0 flex-1 space-y-2 text-start"><span className="sr-only">{t('link')}</span>
        <input readOnly dir="ltr" value={url} onFocus={event => event.currentTarget.select()} className="min-h-12 w-full rounded-control border border-line bg-bg px-3 text-sm text-ink" /></label>
        <Button variant="secondary" className="min-h-12" onClick={copy} aria-label={t('copy')}><Copy aria-hidden className="size-5" /></Button></div>
    </div>
    <div className="space-y-2">
      <a href={share} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: 'primary', block: false, className: "press flex min-h-14 cursor-pointer items-center justify-center gap-2 px-4 font-bold focus-visible:ring-2 focus-visible:ring-lime" })}><KoSend aria-hidden className="size-5" />{t('send')}</a>
      <Button variant="secondary" className="min-h-12 w-full" onClick={copy}>{t('copy')}</Button>
      {onAnother && <Button variant="secondary" className="min-h-12 w-full" onClick={onAnother}>{p('another')}</Button>}
    </div>
    <p role="status" className="text-sm text-muted">{status}</p>
  </section>;
}
