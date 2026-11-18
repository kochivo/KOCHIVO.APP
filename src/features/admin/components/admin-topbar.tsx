'use client';
import { useEffect, useRef } from 'react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { messages } from '../messages';
import { messages as dashboardMessages } from '../dashboard/messages';
import { signOutAdmin } from '../data/sign-out';
import { clearDeviceRole } from '@/core/pwa/device-role';

export function AdminTopbar({ search, pending, onSearch, onExport }: {
  search: string; pending: boolean; onSearch: (search: string) => void; onExport: () => void;
}) {
  const t = useT(messages); const d = useT(dashboardMessages); const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); input.current?.focus(); }
    };
    document.addEventListener('keydown', shortcut); return () => document.removeEventListener('keydown', shortcut);
  }, []);
  return <header className="glass flex flex-wrap items-center gap-stack rounded-card p-card">
    <div className="w-32 shrink-0">
      {/* A plain img keeps next/image out of the admin first load; the logo is a fixed static file. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-primary.png" width={1374} height={387} alt={d('logo')} className="h-auto w-full [[data-theme=light]_&]:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-primary-light.png" width={1374} height={387} alt={d('logo')} className="hidden h-auto w-full [[data-theme=light]_&]:block" />
    </div>
    <h1 className="rounded-full border border-line px-stack py-inline text-row font-semibold">{d('admin')}</h1>
    <form className="order-last flex w-full gap-inline min-[1100px]:order-none min-[1100px]:w-auto min-[1100px]:flex-1" onSubmit={event => {
      event.preventDefault(); const value = new FormData(event.currentTarget).get('search'); onSearch(typeof value === 'string' ? value : '');
    }}>
      <label className="min-w-0 flex-1"><span className="sr-only">{t('searchLabel')}</span>
        <input ref={input} key={search} name="search" defaultValue={search} placeholder={t('searchPlaceholder')}
          className="min-h-12 w-full rounded-full border border-line bg-bg/50 px-stack text-row focus-visible:ring-2 focus-visible:ring-lime" />
      </label>
      <Button variant="secondary" type="submit" disabled={pending}>{t('search')}</Button>
      <kbd className="num hidden self-center text-micro text-muted min-[1100px]:block">{d('shortcut')}</kbd>
    </form>
    <div className="ms-auto flex flex-wrap gap-inline">
      <Button variant="secondary" disabled={pending} onClick={onExport}>{d('export')}</Button>
      <form action={signOutAdmin} onSubmit={clearDeviceRole}><Button type="submit" variant="danger" className="min-h-12">{t('signOut')}</Button></form>
    </div>
  </header>;
}
